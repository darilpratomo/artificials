import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { TestDirectory, TestPage } from '../../shared/test-pages';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

/** The live list of tests, and the page of the one with the most models. */
async function tests(page: Page) {
  const response = await page.request.get('/data/models/test-pages.json');
  expect(response.ok()).toBe(true);
  const directory = (await response.json()) as TestDirectory;
  const widest = [...directory.tests].sort((a, b) => b.models - a.models)[0];
  const detail = (await (
    await page.request.get(`/data/models/test-pages/${widest.id}.json`)
  ).json()) as TestPage;
  return { directory, detail };
}

test('the tests list opens each test’s page', async ({ page }) => {
  const { directory } = await tests(page);
  await page.goto('/tests');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What each test measures.');
  await expect(page.locator('.test-card')).toHaveCount(directory.tests.length);
  const [first] = directory.tests;
  await page.locator(`a[href="/tests/${first.id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/tests/${first.id}$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(first.label);
  await expect(page).toHaveTitle(
    `${first.label} leaderboard: every AI model’s score — Artificials`,
  );
});

test('a test’s page ranks every model and credits its publisher', async ({ page }) => {
  const { detail } = await tests(page);
  await page.goto(`/tests/${detail.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(detail.label);
  await expect(page.locator('.test-glance .glance-tile')).toHaveCount(4);
  await expect(page.locator('.test-source')).toContainText(detail.sourceInfo.name);
  await expect(page.locator('.test-source')).toContainText(detail.sourceInfo.license);
  const rows = page.locator('.test-results tbody tr');
  await expect(rows).toHaveCount(Math.min(25, detail.rows.length));
  // Every rank is a chip of one width, the top spot's gold, with no icon: the column stays even.
  const firsts = detail.rows.slice(0, 25).filter((row) => row.rank === 1).length;
  await expect(page.locator('.test-results .rank-chip.is-first')).toHaveCount(firsts);
  await expect(page.locator('.test-results td[data-label="Rank"] svg')).toHaveCount(0);
  const chips = await page.locator('.test-results .rank-chip').evaluateAll((elements) =>
    elements.slice(0, 12).map((element) => {
      const box = element.getBoundingClientRect();
      return [Math.round(box.left), Math.round(box.width)];
    }),
  );
  expect(new Set(chips.map(([left]) => left)).size).toBe(1);
  expect(new Set(chips.map(([, width]) => width)).size).toBe(1);
  if (detail.rows.length > 25) {
    await page.getByRole('button', { name: `Show all ${detail.models} models` }).click();
    await expect(rows).toHaveCount(detail.rows.length);
  }
  await expect(page.locator('.test-makers tbody tr')).toHaveCount(detail.makers.length);
  await expect(page.locator('.test-leaders li')).toHaveCount(detail.leaders.length);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
});

test('a test with published ranges says how many models sit inside the leader’s', async ({
  page,
}) => {
  const test = (await (
    await page.request.get('/data/models/test-pages/arena-text.json')
  ).json()) as TestPage;
  await page.goto('/tests/arena-text');
  const tile = page.locator('.test-glance .glance-tile').first();
  await expect(tile.locator('.test-near')).toHaveText(
    test.nearTop
      ? `${test.nearTop} ${test.nearTop === 1 ? 'other model' : 'other models'} within its margin`
      : 'No other model within its margin',
  );
  await expect(page.locator('.test-leaders .test-margin')).toHaveCount(
    test.leaders.filter((change) => change.withinMargin).length,
  );
});

test('an unknown test says so', async ({ page }) => {
  await page.goto('/tests/not-a-test-0000');
  await expect(page.getByRole('heading', { name: 'We couldn’t find this test.' })).toBeVisible();
  await expect(page).toHaveTitle('Test not found — Artificials');
});

test('the rankings, maker pages and search lead to tests', async ({ page }) => {
  await page.goto('/leaderboard?category=gpqa-diamond');
  await page.getByRole('link', { name: /^Open the GPQA Diamond page/ }).click();
  await expect(page).toHaveURL(/\/tests\/gpqa-diamond$/);

  const makers = (await (await page.request.get('/data/models/makers.json')).json()) as {
    makers: { slug: string }[];
  };
  await page.goto(`/makers/${makers.makers[0].slug}`);
  const link = page.locator('.maker-tests tbody th a').first();
  const href = await link.getAttribute('href');
  expect(href).toMatch(/^\/tests\/[a-z0-9-]+$/);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));

  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Search Artificials' });
  await dialog.getByRole('combobox').fill('gpqa');
  // The search loads its lists when it first opens, which takes longer under a full test run.
  await expect(
    dialog.getByRole('group', { name: 'Tests' }).getByRole('option').first(),
  ).toContainText('GPQA Diamond', { timeout: 15_000 });
});

test('test pages are accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { detail } = await tests(page);
  for (const path of ['/tests', `/tests/${detail.id}`]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((violation) => violation.id),
      path,
    ).toEqual([]);
  }
});

test('test pages are in the initial HTML', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const html = await (await request.get('/tests/gpqa-diamond')).text();
  expect(html).toContain('id="test-data"');
  expect(html).toContain('id="tests-data"');
  expect(html).toContain(
    '<link rel="canonical" href="https://artificials.net/tests/gpqa-diamond">',
  );
  expect(html).toContain('<h1 class="test-title">GPQA Diamond</h1>');
  const index = await (await request.get('/tests')).text();
  expect(index).toContain('href="/tests/gpqa-diamond"');
  // Each test and the list have link previews of their own.
  for (const [page, image] of [
    [html, '/og/tests/gpqa-diamond.png'],
    [index, '/og/tests.png'],
  ]) {
    expect(page).toContain(`<meta property="og:image" content="https://artificials.net${image}">`);
    const card = await request.get(image);
    expect(card.ok(), image).toBe(true);
    expect(card.headers()['content-type']).toBe('image/png');
  }
});
