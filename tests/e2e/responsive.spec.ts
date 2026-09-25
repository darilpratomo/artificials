import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const summary = JSON.parse(readFileSync('public/data/catalog-summary.json', 'utf8'));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: { auth: false, supportEmail: 'support@artificials.net' },
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
  // Tested models open their Artificials profile rather than an external table.
  const link = page.locator('.benchmark-row h3 a').first();
  await expect(link).toHaveAttribute('href', /^\/models\/[a-z0-9-]+$/);
  const name = await link.innerText();
  await page.getByRole('searchbox', { name: 'Search benchmark models' }).fill(name);
  await expect(page.locator('.benchmark-row').first()).toContainText(name);
  const matches = await page.locator('.benchmark-row').count();
  expect(matches).toBeGreaterThan(0);
  expect(matches).toBeLessThan(10);
  // The data provider is still credited, compactly, below the results.
  await expect(page.locator('.ranking-method')).toContainText('LiveBench');
  await page.getByRole('button', { name: 'Image generation', exact: true }).click();
  await expect(page.locator('.benchmark-row').first()).toBeVisible();
  await expect(page.locator('.ranking-method')).toContainText('not human aesthetic preference');
  await expect(page.locator('.ranking-method a').first()).toHaveAttribute(
    'href',
    'https://t2i-corebench.github.io/',
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
    width <= 760 ? 'hero-brand-mobile' : 'hero-brand',
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
  // The oversized footer watermark was removed; one mark in the footer lockup
  // is enough, so nothing should render a second copy down there.
  await expect(page.locator('.footer-wordmark')).toHaveCount(0);
  await expect(page.locator('.footer-brand-echo')).toHaveCount(0);
  await expect(page.locator('.brand-name')).toHaveText(['Artificials', 'Artificials']);
  await expect(page.locator('.brand-name').first()).toHaveCSS(
    'font-family',
    'Michroma, Sora, sans-serif',
  );
  await expect(page.locator('img[src="/logo.svg"]')).toHaveCount(0);
  // The mark is inline SVG, so assert it actually paints blocks and is square
  // rather than checking an image's naturalWidth.
  const mark = page.locator('.brand-mark').first();
  await expect(mark.locator('rect').first()).toBeAttached();
  const markBox = (await mark.boundingBox())!;
  expect(markBox.width).toBeGreaterThan(0);
  expect(Math.abs(markBox.width - markBox.height)).toBeLessThan(1.5);
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

test('portrait art fills the entire hero width at phone and tablet breakpoints', async ({
  page,
}) => {
  await page.goto('/');
  for (const width of [320, 375, 430, 500, 639, 640, 760]) {
    await page.setViewportSize({ width, height: 900 });
    const artwork = page.locator('.hero-banner-art img');
    await expect(artwork).toHaveCSS('object-fit', 'cover');
    const picture = await page.locator('.hero-banner-art picture').boundingBox();
    expect(picture!.x, `${width}px left edge`).toBeCloseTo(0, 0);
    expect(picture!.width, `${width}px full width`).toBeGreaterThanOrEqual(width);
    await expect(page.locator('.hero-banner-art picture')).toHaveCSS('mask-image', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
});

test('the header island passes through intermediate positions and settles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => scrollTo({ top: 60, behavior: 'instant' }));
  await expect
    .poll(() =>
      page
        .locator('.site-header')
        .evaluate((el) => Number((el as HTMLElement).style.getPropertyValue('--header-progress'))),
    )
    .toBeGreaterThan(0.49);
  const partial = await page.locator('.header-surface').boundingBox();
  expect(partial!.width).toBeLessThan(page.viewportSize()!.width);
  const headerFrames = await page.evaluate(async () => {
    scrollTo({ top: 180, behavior: 'instant' });
    const values: number[] = [];
    for (let i = 0; i < 12; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      values.push(
        Number(
          (document.querySelector('.site-header') as HTMLElement).style.getPropertyValue(
            '--header-progress',
          ),
        ),
      );
    }
    return values;
  });
  expect(headerFrames.some((p) => p > 0.52 && p < 0.97)).toBe(true);
  await expect
    .poll(() =>
      page
        .locator('.site-header')
        .evaluate((el) => Number((el as HTMLElement).style.getPropertyValue('--header-progress'))),
    )
    .toBe(1);
  expect((await page.locator('.header-surface').boundingBox())!.width).toBeLessThan(partial!.width);
});

test('custom dropdown stays within the viewport and supports keyboard selection', async ({
  page,
}) => {
  await page.goto('/learn');
  const select = page.getByRole('combobox', { name: 'Filter academy by topic' });
  await select.focus();
  await select.press('Enter');
  const popup = page.getByRole('listbox');
  await expect(popup).toBeVisible();
  const bounds = await popup.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await select.press('End');
  await select.press('Enter');
  await expect(page.locator('.module-lessons li')).toHaveCount(4);
  await expect(select).toBeFocused();
  await select.press('Enter');
  await select.press('Escape');
  await expect(popup).toHaveCount(0);
  await select.press('p');
  await expect(select).toContainText('Python');
  await select.press('Enter');
  await page.getByRole('heading', { level: 1 }).click();
  await expect(popup).toHaveCount(0);
});

test('search inputs have one border and editorial images stay compact', async ({ page }) => {
  for (const [path, selector] of [
    ['/models?view=listings', '.catalog-search'],
    ['/leaderboard', '.benchmark-search'],
    ['/news', '.search-field'],
    ['/learn', '.search-field'],
  ]) {
    await page.goto(path);
    const input = page.locator(`${selector} input`).first();
    await expect(input).toBeVisible();
    const style = await input.evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.borderTopWidth, margin: s.marginTop, background: s.backgroundColor };
    });
    expect(style).toEqual({ border: '0px', margin: '0px', background: 'rgba(0, 0, 0, 0)' });
  }
  await page.goto('/news');
  const image = page.locator('.learn-card .article-cover').first();
  await expect(image).toBeVisible();
  expect((await image.boundingBox())!.height).toBeLessThanOrEqual(206);
});

test('production HTML exposes article and lesson content before JavaScript', async ({
  request,
}) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Prerendered build only');
  for (const [path, title, text] of [
    ['/news/read-an-ai-benchmark', 'A benchmark is a signal.', 'Read beyond the position'],
    ['/learn/what-ai-actually-does', 'What AI actually does', 'Learning is not using'],
  ]) {
    const response = await request.get(path);
    const html = await response.text();
    expect(html).toContain(title);
    expect(html).toContain(text);
    expect(html).toContain(`rel="canonical" href="https://artificials.net${path}"`);
    expect(html).toContain('property="og:title"');
    expect(html).not.toContain('noindex');
  }
});

test('activating prerendered HTML preserves a visitor’s existing scroll position', async ({
  page,
}) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Prerendered build only');
  let activate!: () => void;
  const gate = new Promise<void>((resolve) => {
    activate = resolve;
  });
  await page.route('**/assets/index-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('.site-header')).toBeVisible();
  await page.evaluate(() => scrollTo({ top: 500, behavior: 'instant' }));
  expect(await page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(490);
  activate();
  await expect(page.locator('.site-header')).toHaveClass(/is-island/);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(490);
});
