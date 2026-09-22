import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LOGO_MATRIX } from '../../src/components/logo-matrix';

// Derived from the matrix itself, so editing the artwork updates the test
// rather than leaving a stale hard-coded count behind.
const ACTIVE_PIXELS = LOGO_MATRIX.join('')
  .split('')
  .filter((cell) => cell === '1').length;
const COLUMNS = LOGO_MATRIX[0].length;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/catalog/summary', (route) =>
    route.fulfill({ json: JSON.parse(readFileSync('public/data/catalog-summary.json', 'utf8')) }),
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: { auth: false, ai: false, billing: false, supportEmail: 'support@artificials.net' },
    }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (route) => route.fulfill({ json: { articles: [] } }));
});

test('intro assembles the logo from the matrix and then settles', async ({ page }) => {
  // Each test starts from a clean session so parallel workers cannot leave the
  // intro already marked as played.
  await page.addInitScript(() => sessionStorage.removeItem('artificialsIntroPlayed'));
  await page.goto('/');
  const intro = page.locator('.logo-intro');
  await expect(intro).toBeVisible();

  // Every drawn pixel must come from the matrix, and no empty cell may draw one.
  const pixels = intro.locator('.pixel');
  await expect(pixels).toHaveCount(ACTIVE_PIXELS);

  // The grid keeps the 21-column layout, so the proportions cannot drift.
  const columns = await intro
    .locator('.pixel-logo-grid')
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(COLUMNS);

  const first = pixels.first();
  // Pixels start scattered and scaled down, away from their final position.
  const startTransform = await first.evaluate((el) => getComputedStyle(el).transform);
  expect(startTransform).not.toBe('none');

  // Once assembled every pixel sits exactly at its grid cell, fully opaque.
  await expect(page.locator('.pixel-logo.is-assembled')).toBeVisible();
  await expect
    .poll(async () => first.evaluate((el) => getComputedStyle(el).opacity), { timeout: 4000 })
    .toBe('1');
  // Assert convergence rather than an exact string: the transition can still be
  // a fraction from its endpoint on the frame the value is read.
  await expect
    .poll(
      async () => {
        const matrix = await first.evaluate((el) => getComputedStyle(el).transform);
        if (matrix === 'none') return 0;
        const [a, b, c, d, tx, ty] = matrix
          .slice(matrix.indexOf('(') + 1, -1)
          .split(',')
          .map(Number);
        // Distance from the identity matrix: no scale, rotation or offset left.
        return Math.max(
          Math.abs(a - 1),
          Math.abs(b),
          Math.abs(c),
          Math.abs(d - 1),
          Math.abs(tx),
          Math.abs(ty),
        );
      },
      { timeout: 4000 },
    )
    .toBeLessThan(0.01);

  // The overlay clears itself; the real page must be usable afterwards.
  await expect(intro).toBeHidden({ timeout: 6000 });
  await expect(page.locator('.site-header')).toBeVisible();
  expect(await page.evaluate(() => document.body.classList.contains('intro-locked'))).toBe(false);
});

test('intro plays once per session and not on later navigation', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.removeItem('artificialsIntroPlayed'));
  await page.goto('/');
  await expect(page.locator('.logo-intro')).toBeVisible();
  await page.locator('.logo-intro-skip').click();
  await expect(page.locator('.logo-intro')).toBeHidden();
  expect(await page.evaluate(() => sessionStorage.getItem('artificialsIntroPlayed'))).toBe('true');

  // An in-app route change must not replay it. The footer link is visible at
  // every viewport, unlike the header nav which collapses on mobile.
  await page.locator('.site-footer a[href="/models"]').first().click();
  await expect(page).toHaveURL(/\/models$/);
  await expect(page.locator('.logo-intro')).toHaveCount(0);

  // Neither must a full reload within the same session.
  await page.goto('/');
  await expect(page.locator('.logo-intro')).toHaveCount(0);
  await expect(page.locator('.site-header')).toBeVisible();
});

test('reduced motion skips the assembling animation entirely', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: { auth: false, ai: false, billing: false, supportEmail: 'support@artificials.net' },
    }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (route) => route.fulfill({ json: { articles: [] } }));
  await page.goto('/');
  // No overlay, no scroll lock, and the page is immediately usable.
  await expect(page.locator('.logo-intro')).toHaveCount(0);
  await expect(page.locator('.site-header')).toBeVisible();
  expect(await page.evaluate(() => document.body.classList.contains('intro-locked'))).toBe(false);
  await context.close();
});

test('the mark stays a sensible size and never overflows the viewport', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.removeItem('artificialsIntroPlayed'));
  await page.goto('/');
  await page.waitForSelector('.pixel-logo');
  const box = await page.evaluate(() => {
    const grid = document.querySelector('.pixel-logo-grid')!.getBoundingClientRect();
    return { width: grid.width, height: grid.height, vw: window.innerWidth };
  });
  // A logo, not a wall: comfortably inside the viewport at every breakpoint.
  expect(box.width).toBeGreaterThan(80);
  expect(box.width).toBeLessThan(box.vw * 0.7);
  // The matrix is square, so the rendered grid must stay square too.
  expect(Math.abs(box.width - box.height)).toBeLessThan(1.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
