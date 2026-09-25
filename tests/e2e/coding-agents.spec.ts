import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { Coding } from '../../shared/coding';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

async function coding(page: import('@playwright/test').Page) {
  return (await (await page.request.get('/data/models/coding.json')).json()) as Coding;
}

test('agent results rank agent and model pairs, filter by builder and by model', async ({
  page,
}) => {
  const data = await coding(page);
  const results = data.agentTests[0].results;
  await page.goto('/coding-agents');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Coding agents and the models inside them.',
  );
  await expect(page.locator('.glance-sentences')).toContainText(results[0].agent);

  const rows = page.locator('#leaderboard .agent-board li');
  await expect(rows).toHaveCount(Math.min(15, results.length));
  await expect(rows.first()).toContainText(results[0].agent);
  await expect(rows.first()).toContainText(`${results[0].score.toFixed(1)}%`);

  // Agents built by the model's maker only.
  await page.getByRole('button', { name: 'Built by the model’s maker' }).click();
  const own = results.filter((row) => row.own);
  await expect(rows).toHaveCount(Math.min(15, own.length));
  await expect(rows.first()).toContainText(own[0].agent);

  // One model, every agent that ran it.
  await page.getByRole('button', { name: 'All agents' }).click();
  await page.getByRole('combobox', { name: 'Show one model' }).click();
  const model = results[0].name;
  const count = results.filter((row) => row.name === model).length;
  await page.getByRole('option', { name: `${model} (${count} agents)` }).click();
  await expect(rows).toHaveCount(count);
  await expect(page.locator('#leaderboard h3')).toHaveText(`${model}, agent by agent`);
});

test('agent gaps, the agent list, model tests and questions', async ({ page }) => {
  const data = await coding(page);
  const results = data.agentTests[0].results;
  await page.goto('/coding-agents');

  // Opening a model lists every agent that ran it.
  const first = page.locator('#agent-effect .effect-rows > li').first();
  await first.locator('summary').click();
  const name = (await first.locator('.effect-name b').innerText()).trim();
  await expect(first.locator('.effect-agents li')).toHaveCount(
    results.filter((row) => row.name === name).length,
  );

  const agents = new Set(results.map((row) => row.agent)).size;
  const list = page.locator('#agents .agent-list li');
  await expect(list).toHaveCount(Math.min(12, agents));
  await page.getByRole('button', { name: `Show all ${agents} agents` }).click();
  await expect(list).toHaveCount(agents);

  // Coding tests stay separate: one test per chart.
  const tests = page.locator('#models');
  await tests.getByRole('combobox', { name: 'Choose a coding test to rank' }).click();
  await page.getByRole('option', { name: data.tests[2].label, exact: true }).click();
  await expect(tests.locator('h3')).toHaveText(data.tests[2].label);
  await expect(
    tests.getByRole('link', { name: `All ${data.tests[2].rows.length} results` }),
  ).toHaveAttribute('href', `/leaderboard?category=${data.tests[2].id}`);

  await expect(page.locator('#faq details').first()).toBeVisible();
  expect(await page.locator('#faq details').count()).toBeGreaterThanOrEqual(8);
  // Sources name the licences and when the data was retrieved.
  const sources = page.locator('.coding-sources');
  await sources.locator('summary').click();
  await expect(sources).toContainText('Apache-2.0');
  await expect(sources).toContainText('CC BY 4.0');
  await expect(sources).toContainText('CC BY-NC 4.0');
  await expect(sources).toContainText('Retrieved');
});

test('a second agent benchmark, cost per task and task length', async ({ page }) => {
  const data = await coding(page);
  await page.goto('/coding-agents');
  // Switching the agent benchmark changes every agent section at once.
  const second = data.agentTests[1];
  await page
    .locator('#leaderboard')
    .getByRole('button', { name: second.source.name, exact: true })
    .click();
  const rows = page.locator('#leaderboard .agent-board li');
  await expect(rows.first()).toContainText(second.results[0].agent);
  await expect(page.locator('#agents .agent-list li')).toHaveCount(
    Math.min(12, new Set(second.results.map((row) => row.agent)).size),
  );

  // Cost per task: every configuration a source ran, with its usage.
  const cost = page.locator('#cost');
  await cost.scrollIntoViewIfNeeded();
  const first = data.costTests[0];
  await expect(cost.locator('h3')).toHaveText(`${first.label}: score against cost per task`);
  await expect(cost.locator('tbody tr')).toHaveCount(Math.min(12, first.rows.length));
  await expect(cost.locator('tbody tr').first()).toContainText(first.rows[0].name);
  await cost.getByRole('combobox', { name: 'Choose a test with task costs' }).click();
  await page.getByRole('option', { name: data.costTests[1].label, exact: true }).click();
  await expect(cost.locator('h3')).toHaveText(
    `${data.costTests[1].label}: score against cost per task`,
  );

  // Task length: METR's time horizons, longest first.
  const length = page.locator('#task-length');
  await length.scrollIntoViewIfNeeded();
  await expect(length.locator('.metric-bars li')).toHaveCount(
    Math.min(15, data.timeHorizons!.results.length),
  );
  await expect(length.locator('.metric-bars li').first()).toContainText(
    data.timeHorizons!.results[0].name,
  );
});

test('the coding agents page is accessible and fits every screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/coding-agents');
  await expect(page.locator('#leaderboard .agent-board li').first()).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .include('.coding-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test('every coding chart downloads as a branded image', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Downloads are checked once, in desktop Chrome');
  await page.goto('/coding-agents');
  for (const section of [
    '#leaderboard',
    '#agent-effect',
    '#cost',
    '#task-length',
    '#models',
    '#price',
  ]) {
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

test('the coding data is in the initial HTML for search engines', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const html = await (await request.get('/coding-agents')).text();
  expect(html).toContain('id="coding-data"');
  expect(html).toContain('Terminal-Bench 2.0');
  expect(html).toContain('"@type":"FAQPage"');
});
