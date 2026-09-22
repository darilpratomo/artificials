import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const summary = JSON.parse(readFileSync('public/data/catalog-summary.json', 'utf8'));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  // Suppress the one-per-session logo intro so it never covers the page under
  // test. The intro has its own suite.
  await page.addInitScript(() => sessionStorage.setItem('artificialsIntroPlayed', 'true'));
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
  const wordmark = await page.locator('.footer-brand-echo').boundingBox();
  expect(Math.abs(wordmark!.x + wordmark!.width / 2 - width / 2)).toBeLessThan(2);
  expect(wordmark!.width).toBeLessThanOrEqual(170);
  expect((await page.locator('.footer-wordmark').boundingBox())!.height).toBeLessThanOrEqual(166);
  await expect(page.locator('.footer-wordmark')).toHaveText('');
  await expect(page.locator('.brand-name')).toHaveText(['Artificials', 'Artificials']);
  await expect(page.locator('.brand-name').first()).toHaveCSS('font-family', 'Sora, sans-serif');
  await expect(page.locator('img[src="/logo.svg"]')).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator('.brand-mark')
        .first()
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
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

test('island and horizontal motion pass through intermediate positions and settle', async ({
  page,
}) => {
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

  await page.locator('.journey').evaluate((el) =>
    scrollTo({
      top:
        scrollY +
        el.getBoundingClientRect().top +
        (el.clientHeight - (el.querySelector('.journey-sticky') as HTMLElement).clientHeight) * 0.4,
      behavior: 'instant',
    }),
  );
  const track = page.locator('.journey-track');
  await expect
    .poll(() => track.evaluate((el) => -new DOMMatrix(getComputedStyle(el).transform).m41))
    .toBeGreaterThan(100);
  const motion = await page.evaluate(async () => {
    const rail = document.querySelector('.journey-track')!;
    const start = -new DOMMatrix(getComputedStyle(rail).transform).m41;
    scrollTo({ top: scrollY + 64, behavior: 'instant' });
    const samples: number[] = [];
    for (let i = 0; i < 10; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      samples.push(-new DOMMatrix(getComputedStyle(rail).transform).m41 - start);
    }
    return { start, samples };
  });
  expect(motion.samples.some((x) => x > 1 && x < 60)).toBe(true);
  for (let i = 1; i < motion.samples.length; i++)
    expect(motion.samples[i]).toBeGreaterThanOrEqual(motion.samples[i - 1] - 0.1);
  await expect
    .poll(() => track.evaluate((el) => -new DOMMatrix(getComputedStyle(el).transform).m41))
    .toBeCloseTo(motion.start + 64, 0);
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
    ['/models', '.catalog-search'],
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
