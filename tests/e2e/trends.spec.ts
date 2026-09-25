import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { Trends } from '../../shared/trends';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

async function trends(page: import('@playwright/test').Page) {
  return (await (await page.request.get('/data/models/trends.json')).json()) as Trends;
}

test('trends summarise the frontier and draw every section', async ({ page }) => {
  const data = await trends(page);
  await page.goto('/trends');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How AI is changing.');
  await expect(page.locator('.glance-sentences')).toContainText(data.leaders[0].name);
  for (const id of [
    'frontier',
    'open-weights',
    'countries',
    'cost',
    'context',
    'scale',
    'releases',
  ])
    await expect(page.locator(`#${id} svg`).first()).toBeAttached();

  // The legend hides and shows a maker's line.
  const frontier = page.locator('#frontier .trend-chart');
  const lines = frontier.locator('.trend-line');
  await expect(lines).toHaveCount(data.frontier.length);
  const first = frontier.getByRole('button', { name: data.frontier[0].label, exact: true });
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(lines).toHaveCount(data.frontier.length - 1);
  await first.click();
  await expect(lines).toHaveCount(data.frontier.length);

  // The keyboard reaches every record and names its model.
  const chart = frontier.getByRole('img', { name: 'Highest capability index to date, by maker' });
  await chart.focus();
  await page.keyboard.press('ArrowRight');
  await expect(frontier.locator('.chart-tooltip')).toBeVisible();

  // Each maker's best model, highest first.
  await expect(page.locator('#frontier .metric-bars li').first()).toContainText(
    data.leaders[0].name,
  );
  // Releases per month: one column for each of the last 24 months.
  await expect(page.locator('#releases .column-bar')).toHaveCount(data.releases.length);
});

test('the trends page is accessible and fits every screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/trends');
  await expect(page.locator('.glance-sentences')).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .include('.trends-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test('every trend chart downloads as a branded image', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Downloads are checked once, in desktop Chrome');
  await page.goto('/trends');
  for (const section of ['#frontier', '#cost', '#context', '#scale', '#releases']) {
    const scope = page.locator(section);
    await scope.scrollIntoViewIfNeeded();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      scope
        .getByRole('button', { name: /as an image/ })
        .first()
        .click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^artificials-[a-z0-9-]+\.png$/);
    const bytes = readFileSync(await download.path());
    expect(String.fromCharCode(...bytes.subarray(1, 4))).toBe('PNG');
  }
});

test('the trends data is in the initial HTML', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const html = await (await request.get('/trends')).text();
  expect(html).toContain('id="trends-data"');
  expect(html).toContain('Highest capability index to date, by maker');
});
