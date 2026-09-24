import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ModelOverview } from '../../shared/model-overview';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { auth: false, ai: false, billing: false } }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

test('the models page compares real models, most capable first', async ({ page }) => {
  const data = (await (
    await page.request.get('/data/models/overview.json')
  ).json()) as ModelOverview;
  await page.goto('/models');
  await expect(page.getByRole('heading', { level: 1, name: 'Compare AI models.' })).toBeVisible();
  // The summary names the leaders, and every name opens its profile.
  const glance = page.locator('.glance-sentences');
  await expect(glance).toContainText(data.index[0].name);
  await expect(glance).toContainText('are the most capable models');
  await expect(page.locator('.hub-highlights .metric-bars')).toHaveCount(3);
  // The full list starts with the highest capability score, not a host's listing.
  await page.locator('#all-models').scrollIntoViewIfNeeded();
  const first = page
    .locator('#all-models .explorer-row:not(.explorer-head) .explorer-model a')
    .first();
  await expect(first).toHaveText(data.index.find((point) => point.slug)!.name);
  await expect(page.locator('.hub-faq details')).toHaveCount(9);
  // Provider listings stay one click away, and old filtered links still open them.
  await page.getByRole('button', { name: 'Provider listings' }).click();
  await expect(page).toHaveURL(/\/models\?view=listings$/);
  await page.getByRole('button', { name: 'Models', exact: true }).click();
  await expect(page).toHaveURL(/\/models$/);
});

test('the models page is accessible and fits narrow screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/models');
  await expect(page.locator('.glance-sentences')).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .include('.models-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
