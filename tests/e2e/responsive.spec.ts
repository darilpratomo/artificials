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

for (const width of [320, 375, 430, 768]) {
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
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
    await page.getByRole('button', { name: 'Close menu' }).click();
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
