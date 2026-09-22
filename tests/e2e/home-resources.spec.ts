import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  // Suppress the one-per-session logo intro so it never covers the page under
  // test. The intro has its own suite.
  await page.addInitScript(() => sessionStorage.setItem('artificialsIntroPlayed', 'true'));
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { auth: false, ai: false, billing: false } }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (route) => route.fulfill({ status: 503, json: {} }));
  await page.route('**/api/catalog/summary', (route) =>
    route.fulfill({ json: JSON.parse(readFileSync('public/data/catalog-summary.json', 'utf8')) }),
  );
});

test('homepage tool filters open working tools without downloading conversion engines early', async ({
  page,
}) => {
  const engines: string[] = [];
  page.on('request', (request) => {
    if (
      /pdf\.worker|word\.worker|mammoth|docx-pdf|\/pdf-[^/]+\.js|\/images-[^/]+\.js/.test(
        request.url(),
      )
    )
      engines.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('.hero-actions a[href="/tools"]')).toBeVisible();
  await expect(page.locator('.hero-actions a[href="/learn"]')).toBeVisible();
  const tools = page.getByRole('region', { name: 'Big ideas. Smaller files.' });
  await tools.scrollIntoViewIfNeeded();
  await expect(tools.locator('.home-tool-link')).toHaveCount(6);
  await tools.getByRole('button', { name: 'Documents', exact: true }).click();
  await expect(tools.locator('.home-tool-link')).toHaveCount(2);
  await expect(tools.getByRole('button', { name: 'Documents', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(engines).toEqual([]);
  await tools.getByRole('heading', { name: 'PDF to Word', exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/pdf-to-word$/);
  await expect(page.getByRole('heading', { level: 1, name: 'PDF to Word' })).toBeVisible();
});

test('learning paths expose real lesson details and work with a keyboard', async ({ page }) => {
  await page.goto('/');
  const academy = page.getByRole('region', { name: 'Don’t just use AI. Understand it.' });
  await academy.scrollIntoViewIfNeeded();
  await expect(academy.getByRole('heading', { name: 'What AI actually does' })).toBeVisible();
  const python = academy.getByRole('button', { name: /Get hands-on with Python/ });
  await python.focus();
  await page.keyboard.press('Enter');
  await expect(python).toHaveAttribute('aria-pressed', 'true');
  await expect(academy.getByRole('link', { name: 'Open this lesson' })).toHaveAttribute(
    'href',
    '/learn/python-values-and-collections',
  );
  await academy.getByRole('button', { name: /Build your first AI project/ }).click();
  await expect(
    academy.getByRole('heading', { name: 'Project: search your own study notes' }),
  ).toBeVisible();
  await academy.getByRole('link', { name: 'Open this lesson' }).click();
  await expect(page).toHaveURL(/\/learn\/project-search-your-notes$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'search your own study notes',
  );
});

test('homepage sections are accessible and stay inside narrow screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const selector of ['.signal-hero', '#home-tools', '#home-academy']) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${width} / ${selector}`,
      ).toBe(true);
    }
  }
  const result = await new AxeBuilder({ page })
    .include('.home-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await expect(page.locator('.home-studio-status')).toContainText('AI GENERATION COMING SOON');
});

test('Tools and Learn AI are discoverable in initial HTML', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const response = await request.get('/');
  const html = await response.text();
  expect(html).toContain('id="home-tools"');
  expect(html).toContain('id="home-academy"');
  expect(html).toContain('href="/tools/compress-image"');
  expect(html).toContain('href="/learn/what-ai-actually-does"');
  expect(html).toContain('Explore AI, learn Python &amp; use free file tools');
});
