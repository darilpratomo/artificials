import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

type Entry = [string, string, string, number, 0 | 1, string];

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

/** Pick real profiles from the generated directory, so the test follows live data. */
async function directory(page: Page): Promise<Entry[]> {
  const response = await page.request.get('/data/models/directory.json');
  expect(response.ok()).toBe(true);
  return (await response.json()).models as Entry[];
}
const money = (text: string) => Number(text.replace(/[^0-9.]/g, ''));

test('a tested model shows its standing, prices and every analysis tab', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const [slug, name] = (await directory(page)).find((entry) => entry[4] === 1)!;
  await page.goto(`/models/${slug}`);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page).toHaveTitle(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  await expect(page.getByRole('tab')).toHaveCount(5);
  await expect(page.locator('.skill-rows li').first()).toBeVisible();

  // Tabs follow the ARIA pattern: arrow keys move between them and update the URL.
  await page.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Performance' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tab', { name: 'Performance' })).toBeFocused();
  await expect(page).toHaveURL(/tab=performance/);
  await expect(page.locator('.result-card').first()).toBeVisible();

  await page.getByRole('tab', { name: 'Pricing' }).click();
  const tiles = page.locator('.price-tiles');
  if (await tiles.count()) {
    // The calculator must match the list price shown above it.
    const input = money(
      await tiles.locator('div', { hasText: 'Input' }).first().locator('strong').innerText(),
    );
    await page.getByLabel('Tokens sent').fill('10000000');
    await page.getByLabel('Tokens written').fill('0');
    await page.getByLabel('Requests per day').fill('1');
    const perRequest = money(await page.locator('.calc-results dd').first().innerText());
    expect(Math.abs(perRequest - input * 10)).toBeLessThan(0.01);
    await expect(page.getByRole('button', { name: 'Custom' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }

  await page.getByRole('tab', { name: 'Providers' }).click();
  const rows = page.locator('.provider-row:not(.provider-head)');
  await expect(rows.first()).toBeVisible();
  const showAll = page.getByRole('button', { name: /Show all \d+ providers/ });
  if (await showAll.count()) {
    const total = Number((await showAll.innerText()).match(/\d+/)![0]);
    await showAll.click();
    await expect(rows).toHaveCount(total);
  }

  await page.getByRole('tab', { name: 'Tokens & context' }).click();
  await expect(page.locator('.fit-list li')).toHaveCount(4);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('the profile passes automated accessibility checks', async ({ page }) => {
  const [slug] = (await directory(page)).find((entry) => entry[4] === 1)!;
  await page.goto(`/models/${slug}`);
  await expect(page.locator('.skill-rows li').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('.profile-page')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test('an untested model explains what is missing instead of showing empty charts', async ({
  page,
}) => {
  const [slug] = (await directory(page)).find((entry) => entry[4] === 0 && entry[3] >= 2)!;
  await page.goto(`/models/${slug}?tab=performance`);
  await expect(page.getByRole('heading', { name: 'Not tested yet' })).toBeVisible();
  await page.getByRole('tab', { name: 'Overview' }).click();
  await expect(page.getByText('No published benchmark covers this model yet.')).toBeVisible();
});

test('an unknown model offers a way back to the catalog', async ({ page }) => {
  await page.goto('/models/definitely-not-a-real-model-0000');
  await expect(page.getByRole('heading', { name: 'We couldn’t find that model.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse models' })).toHaveAttribute(
    'href',
    '/models',
  );
});

test('rankings open the profile of a tested model', async ({ page }) => {
  await page.goto('/leaderboard');
  const link = page.locator('.benchmark-row h3 a').first();
  await expect(link).toBeVisible();
  const name = await link.innerText();
  await link.click();
  await expect(page).toHaveURL(/\/models\/[a-z0-9-]+$/);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
});
