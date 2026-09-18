import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const summary = JSON.parse(readFileSync('public/data/catalog-summary.json', 'utf8'));
test.beforeEach(async ({ page }) => {
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: { auth: false, billing: false, ai: false, supportEmail: 'support@artificials.net' },
    }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/catalog/summary', (route) => route.fulfill({ json: summary }));
  await page.route('**/api/articles', (route) => route.fulfill({ status: 503, json: {} }));
});

for (const width of [320, 375, 430, 768, 1180]) {
  test(`page stays inside ${width}px during scrolling and animation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    // Check at multiple animation phases and through all below-the-fold reveals.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 650) {
      await page.evaluate((top) => window.scrollTo({ top, left: 500, behavior: 'instant' }), y);
      await page.waitForTimeout(70);
      const bounds = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        left: scrollX,
      }));
      expect(bounds.scrollWidth, `document at y=${y}`).toBeLessThanOrEqual(width);
      expect(bounds.bodyWidth, `body at y=${y}`).toBeLessThanOrEqual(width);
      expect(bounds.left, `horizontal page movement at y=${y}`).toBe(0);
    }
    if (width <= 1100) {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
      await page.getByRole('button', { name: 'Close menu' }).click();
    }
    for (const route of [
      '/leaderboard?category=coding',
      '/leaderboard?category=image',
      '/news',
      '/news/read-an-ai-benchmark',
      '/contact',
      '/learn',
      '/learn/project-local-ai-api-and-database',
    ]) {
      await page.goto(route);
      if (route.startsWith('/leaderboard'))
        await expect(page.locator('.benchmark-row').first()).toBeVisible();
      if (route.startsWith('/news')) {
        await expect(page.locator('.article-cover').first()).toBeVisible();
        await expect
          .poll(() =>
            page
              .locator('.article-cover')
              .first()
              .evaluate((el) => (el as HTMLImageElement).naturalWidth),
          )
          .toBeGreaterThan(0);
      }
      if (route.startsWith('/learn'))
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (route === '/contact')
        await expect(page.getByRole('link', { name: 'support@artificials.net' })).toHaveAttribute(
          'href',
          'mailto:support@artificials.net',
        );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        route,
      ).toBeLessThanOrEqual(width);
    }
  });
}

test('benchmark categories search source data and recover from a failed load', async ({ page }) => {
  await page.route('**/data/benchmarks.json', (route) => route.fulfill({ status: 503, json: {} }), {
    times: 1,
  });
  await page.goto('/leaderboard');
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('button', { name: 'Coding', exact: true }).click();
  await expect(page.locator('.benchmark-row').first()).toBeVisible();
  const name = await page.locator('.benchmark-model h3').first().innerText();
  await page.getByRole('searchbox', { name: 'Search benchmark models' }).fill(name);
  await expect(page.locator('.benchmark-row')).toHaveCount(1);
  await expect(page.locator('.benchmark-row a')).toHaveAttribute(
    'href',
    /raw\.githubusercontent\.com\/LiveBench/,
  );
  await page.getByRole('button', { name: 'Image generation', exact: true }).click();
  await expect(page.locator('.benchmark-row').first()).toBeVisible();
  await expect(page.locator('.ranking-method')).toContainText('not human aesthetic preference');
  await expect(page.locator('.benchmark-row a').first()).toHaveAttribute(
    'href',
    'https://t2i-corebench.github.io/#leaderboard',
  );
});

test('hero uses portrait artwork on mobile and footer branding stays centered', async ({
  page,
}) => {
  await page.goto('/');
  const width = page.viewportSize()!.width;
  const artwork = page.locator('.hero-banner-art img');
  await expect
    .poll(() => artwork.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  expect(await artwork.evaluate((img) => (img as HTMLImageElement).currentSrc)).toContain(
    width <= 760 ? 'hero-mobile' : 'hero-engraved',
  );
  if (width <= 430) {
    const hero = await page.locator('.signal-hero').boundingBox();
    expect(hero!.height).toBeLessThanOrEqual(620);
  }
  for (const name of ['Artificials on Instagram', 'Artificials on X']) {
    const profile = page.getByRole('link', { name, exact: true });
    await expect(profile).toHaveText('');
    await expect
      .poll(() => profile.locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  const wordmark = await page.locator('.footer-wordmark span').boundingBox();
  expect(Math.abs(wordmark!.x + wordmark!.width / 2 - width / 2)).toBeLessThan(2);
  expect(wordmark!.width).toBeLessThan(width * 0.92);
});

test('scroll morphs the header and mobile navigation manages focus and closes on navigation', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => scrollTo({ top: 500, behavior: 'instant' }));
  await expect(page.locator('.site-header')).toHaveClass(/is-island/);
  await expect(page.locator('.header-surface')).toHaveCSS('border-radius', '40px');
  const bounds = await page.locator('.header-surface').boundingBox();
  expect(bounds!.x).toBeGreaterThan(5);
  expect(bounds!.y).toBeGreaterThanOrEqual(8);
  expect(bounds!.width).toBeLessThan(page.viewportSize()!.width);
  const trigger = page.getByRole('button', { name: 'Open menu' });
  if (await trigger.isVisible()) {
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Site navigation' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
    await menu.getByRole('link', { name: 'Get in touch' }).focus();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('link', { name: 'Artificials home' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
    await expect(page.locator('main')).not.toHaveAttribute('inert');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    await menu.getByRole('link', { name: /Learn AI/ }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.locator('.site-header')).not.toHaveClass(/menu-open/);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  }
});

test('vertical scrolling moves story panels sideways on desktop and mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const journey = page.locator('.journey');
  await expect(journey).toHaveAttribute('data-motion', 'horizontal');
  const scrollStory = async (fraction: number) => {
    await journey.evaluate((el, fraction) => {
      const rect = el.getBoundingClientRect();
      const sticky = el.querySelector('.journey-sticky') as HTMLElement;
      scrollTo({
        top: scrollY + rect.top + (rect.height - sticky.clientHeight) * fraction,
        behavior: 'instant',
      });
    }, fraction);
  };
  await scrollStory(0.5);
  await expect
    .poll(() =>
      page
        .locator('.journey-track')
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41),
    )
    .toBeLessThan(-100);
  expect((await page.locator('.journey-sticky').boundingBox())!.y).toBeCloseTo(0, 0);
  await scrollStory(1);
  await expect(journey.getByRole('link', { name: 'Enter the studio' })).toBeInViewport();
  await page.keyboard.press('Tab');
  for (const link of await journey.locator('.journey-panel .text-link').all()) {
    await link.focus();
    await expect(link).toBeInViewport({ ratio: 1 });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(journey).toHaveAttribute('data-motion', 'static');
  await expect(page.locator('.journey-track')).toHaveCSS('transform', 'none');
  await expect(page.locator('.journey-sticky')).not.toHaveCSS('position', 'sticky');
});
