import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { ModelOverview } from '../../shared/model-overview';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { auth: false, ai: false, billing: false } }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (route) => route.fulfill({ status: 503, json: {} }));
});

/** The generated overview, so assertions follow the live data rather than fixed names. */
async function overview(page: Page): Promise<ModelOverview> {
  const response = await page.request.get('/data/models/overview.json');
  expect(response.ok()).toBe(true);
  return response.json();
}

test('the home page leads with model data, not the other sections', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const data = await overview(page);
  await page.goto('/');
  for (const name of ['Leaders right now', 'Rankings', 'Score, price and time', 'New releases'])
    await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
  // Learn AI, Tools and Studio stay in the header only.
  for (const id of ['#home-tools', '#home-academy', '.journey', '.studio-home'])
    await expect(page.locator(id)).toHaveCount(0);
  const header = page.locator('header');
  if (await header.getByRole('link', { name: 'Tools', exact: true }).isVisible()) {
    await expect(header.getByRole('link', { name: 'Learn AI', exact: true })).toBeVisible();
    await expect(header.getByRole('link', { name: /^Studio/ })).toBeVisible();
  }
  // Every leader card names its test and says what kind of figure it is.
  const cards = page.locator('.highlight-card');
  await expect(cards).toHaveCount(data.highlights.length);
  await expect(cards.first()).toContainText(data.highlights[0].detail);
  await expect(cards.first().locator('.highlight-kind')).toHaveText('Test result');
  // The newest release is in the live band and at the top of the timeline.
  const newest = data.releases.find((release) => release.notable)!;
  await expect(page.locator('.live-band')).toContainText(newest.name);
  await expect(page.locator('.timeline-link').first()).toHaveText(newest.name);
  expect(errors).toEqual([]);
});

test('the ranking chart switches tests, sizes and views', async ({ page }) => {
  const data = await overview(page);
  await page.goto('/');
  const panel = page.locator('#rankings');
  await panel.scrollIntoViewIfNeeded();
  const rows = panel.locator('.rank-column, .rank-row');
  await expect(rows.first()).toBeVisible();
  const initial = await rows.count();
  expect([15, 25]).toContain(initial);
  await expect(rows.first().locator('.rank-hit')).toHaveAttribute(
    'aria-label',
    new RegExp(`^1\\. ${data.index[0].name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
  );

  await panel.getByRole('combobox', { name: 'How many models to show' }).click();
  await page.getByRole('option', { name: 'Top 50' }).click();
  await expect(rows).toHaveCount(50);

  // A single test loads on demand and never mixes with the index.
  const tests = page.waitForResponse('**/data/models/tests.json');
  await panel.getByRole('combobox', { name: 'Choose what to rank by' }).click();
  await page.getByRole('option', { name: 'Reasoning: GPQA Diamond' }).click();
  await tests;
  await expect(panel.getByRole('heading', { level: 3, name: 'GPQA Diamond' })).toBeVisible();
  await expect(rows.first()).toBeVisible();
  await expect(panel.locator('.dash-foot')).toContainText('Epoch AI');

  await panel.getByRole('button', { name: 'Show table' }).click();
  await expect(panel.locator('table tbody tr')).toHaveCount(50);
  await expect(panel.getByRole('button', { name: 'Show chart' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the price chart supports the keyboard and opens a model', async ({ page }) => {
  const data = await overview(page);
  // The chart's keyboard order: cheapest first, higher score first on ties.
  const order = data.index
    .filter((point) => point.price)
    .sort((a, b) => a.price!.blended - b.price!.blended || b.index - a.index);
  const target = order.findIndex((point) => point.slug);
  await page.goto('/');
  const panel = page.locator('#value');
  await panel.scrollIntoViewIfNeeded();
  const chart = panel.getByRole('group', { name: /Capability index against price/ });
  await expect(chart).toBeVisible();
  await expect(panel.locator('.scatter-frontier')).toHaveCount(1);
  await chart.focus();
  await page.keyboard.press('Home');
  for (let step = 0; step < target; step += 1) await page.keyboard.press('ArrowRight');
  await expect(panel.locator('.scatter-frame [aria-live="polite"]')).toContainText(
    order[target].name,
  );
  await expect(panel.locator('.scatter-tooltip')).toContainText(order[target].name);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/models/${order[target].slug}$`));

  await page.goto('/');
  await page.locator('#value').scrollIntoViewIfNeeded();
  await page.locator('#value').getByRole('button', { name: 'Release date' }).click();
  await expect(
    page.locator('#value').getByRole('heading', { name: 'Capability index over time' }),
  ).toBeVisible();
  await page.locator('#value').getByRole('button', { name: 'Context window' }).click();
  await expect(page.locator('#value .scatter-frontier')).toHaveCount(0);
});

test('releases, search and the full list work without loading everything up front', async ({
  page,
}) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(new URL(request.url()).pathname));
  const data = await overview(page);
  await page.goto('/');
  await expect(page.locator('.timeline-entry').first()).toBeVisible();
  expect(requested).not.toContain('/data/models/explorer.json');

  // Timeline: known makers by default, every listing on request, more on demand.
  const entries = page.locator('.timeline-entry');
  const before = await entries.count();
  // The prerendered button responds once the app takes over the page, so retry the click.
  await expect(async () => {
    await page.getByRole('button', { name: /Show \d+ more releases/ }).click();
    expect(await entries.count()).toBeGreaterThan(before);
  }).toPass();
  await page.getByRole('button', { name: 'All listings' }).click();
  await expect(page.getByRole('button', { name: 'All listings' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Hero search: type, move with the keyboard, open the model.
  const search = page.getByRole('combobox', { name: 'Find a model' });
  await search.fill('claude');
  const options = page.getByRole('option');
  await expect(options.first()).toBeVisible();
  await search.press('ArrowDown');
  const chosen = await page.locator('[role="option"][aria-selected="true"] b').innerText();
  await search.press('Enter');
  await expect(page).toHaveURL(/\/models\/[a-z0-9-]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(chosen);

  // The full list loads when it comes into view and pages through every model.
  await page.goto('/');
  await page.locator('#all-models').scrollIntoViewIfNeeded();
  const rows = page.locator('.explorer-row:not(.explorer-head)');
  await expect(rows).toHaveCount(25);
  await expect(page.locator('.explorer-count')).toHaveText(
    `${data.counts.models.toLocaleString('en-US')} models`,
  );
  await page.getByRole('searchbox', { name: 'Search every model' }).fill('gpt');
  await expect(page.locator('.explorer-count')).toContainText('match');
  const matching = await page.locator('.explorer-count').innerText();
  await page.getByRole('button', { name: 'Tested', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tested', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.explorer-count')).not.toHaveText(matching);
  // Sorting by the index puts rated models first, highest score on top.
  await page.getByRole('combobox', { name: 'Sort models' }).click();
  await page.getByRole('option', { name: 'Highest capability index' }).click();
  const scores = (await rows.locator('[data-label="Index"]').allInnerTexts())
    .slice(0, 5)
    .map(Number);
  expect(scores.every((value) => value > 0)).toBe(true);
  expect([...scores].sort((a, b) => b - a)).toEqual(scores);
});

test('home sections are accessible and stay inside narrow screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const selector of ['.signal-hero', '#leaders', '#rankings', '#value', '#releases']) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${width} / ${selector}`,
      ).toBe(true);
    }
  }
  await page.locator('#all-models').scrollIntoViewIfNeeded();
  await expect(page.locator('.explorer-row').nth(1)).toBeVisible();
  const result = await new AxeBuilder({ page })
    .include('.home-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test('the full list pages through every model with numbered pages', async ({ page }) => {
  const data = await overview(page);
  await page.goto('/');
  await page.locator('#all-models').scrollIntoViewIfNeeded();
  const foot = page.locator('.explorer-foot > p');
  await expect(foot).toHaveText(`Showing 1–25 of ${data.counts.models.toLocaleString('en-US')}`);
  await page
    .getByRole('navigation', { name: 'Model list pages' })
    .getByRole('button', { name: 'Next' })
    .click();
  await expect(foot).toHaveText(`Showing 26–50 of ${data.counts.models.toLocaleString('en-US')}`);
  // The search box and both selects share one height, so the toolbar lines up.
  const heights = await page
    .locator('#all-models .explorer-controls > *')
    .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().height)));
  expect(new Set(heights).size).toBe(1);
});

test('the market, the time chart and the release timeline link up', async ({ page }) => {
  const data = await overview(page);
  await page.goto('/');
  const market = page.locator('#market');
  await market.scrollIntoViewIfNeeded();
  await expect(market.locator('.market-stats li')).toHaveCount(6);
  await expect(market.locator('.market-list').first().locator('li')).toHaveCount(
    data.market.makers.length,
  );
  // Newer releases without a score still show on the time chart, as rings.
  const value = page.locator('#value');
  await value.scrollIntoViewIfNeeded();
  await value.getByRole('button', { name: 'Release date' }).click();
  await expect(value.locator('.legend-pending')).toContainText('not scored yet');
  expect(await value.locator('.scatter-pending').count()).toBeGreaterThan(0);
  await page.getByRole('link', { name: 'Full release timeline' }).click();
  await expect(page).toHaveURL(/\/releases$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Every AI model release.' }),
  ).toBeVisible();
});

test('charts download as branded images', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Downloads are checked once, in desktop Chrome');
  await page.goto('/');
  for (const section of ['#rankings', '#value', '#leaders', '#market']) {
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
    const file = await download.path();
    const bytes = readFileSync(file);
    // A real PNG, drawn on a 1600-pixel layout and exported at a higher resolution.
    expect(String.fromCharCode(...bytes.subarray(1, 4))).toBe('PNG');
    expect(new DataView(bytes.buffer, bytes.byteOffset).getUint32(16)).toBeGreaterThanOrEqual(1600);
  }
});

test('model data is in the initial HTML for search engines', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const data = JSON.parse(
    readFileSync('public/data/models/overview.json', 'utf8'),
  ) as ModelOverview;
  const html = await (await request.get('/')).text();
  expect(html).toContain('Leaders right now');
  expect(html).toContain(data.highlights[0].title);
  expect(html).toContain('id="overview-data"');
  expect(html).toContain('AI model rankings, prices and new releases');
  expect(html).not.toContain('id="home-tools"');
  // Inline data can never close its own script element early.
  const inline = html.slice(html.indexOf('id="overview-data"'));
  expect(inline.slice(0, inline.indexOf('</script>'))).not.toContain('<');
});
