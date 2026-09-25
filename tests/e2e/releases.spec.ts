import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

test('the release timeline filters by month, maker and search', async ({ page }) => {
  const response = await page.request.get('/data/models/timeline.json');
  const { entries } = (await response.json()) as {
    entries: { slug: string; name: string; date: string; notable: boolean }[];
  };
  const known = entries.filter((entry) => entry.notable);
  await page.goto('/releases');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Every AI model release.' }),
  ).toBeVisible();
  const count = page.locator('.explorer-count');
  await expect(count).toHaveText(`${known.length.toLocaleString('en-US')} releases`);
  // Newest first, and every entry opens its model page.
  const first = page.locator('.release-entry .release-title a').first();
  await expect(first).toHaveText(known[0].name);
  await expect(first).toHaveAttribute('href', `/models/${known[0].slug}`);

  const month = known[0].date.slice(0, 7);
  await page.locator('.month-bars button').last().click();
  const inMonth = known.filter((entry) => entry.date.startsWith(month)).length;
  await expect(count).toHaveText(`${inMonth} ${inMonth === 1 ? 'release' : 'releases'}`);
  await page.locator('.month-bars button').last().click();

  await page.getByRole('button', { name: 'Include every listing' }).click();
  await expect(count).toHaveText(`${entries.length.toLocaleString('en-US')} releases`);

  await page.getByRole('searchbox', { name: 'Search releases' }).fill('zzzz-no-such-model');
  await expect(page.getByText('No release matches.')).toBeVisible();
});

test('the release timeline is accessible and fits narrow screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/releases');
  await expect(page.locator('.release-entry').first()).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .include('.releases-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
