import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { WeekDirectory, WeekPage } from '../../shared/weekly';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

/** The live list of weeks and the latest week's page. */
async function weeks(page: Page) {
  const response = await page.request.get('/data/models/weekly.json');
  expect(response.ok()).toBe(true);
  const directory = (await response.json()) as WeekDirectory;
  const latest = (await (
    await page.request.get(`/data/models/weekly/${directory.latest}.json`)
  ).json()) as WeekPage;
  return { directory, latest };
}

test('the latest week shows its figures, highlights and every change', async ({ page }) => {
  const { directory, latest } = await weeks(page);
  await page.goto('/weekly');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The week in AI models.');
  const tiles = page.locator('.weekly-glance .glance-tile strong');
  await expect(tiles).toHaveText([
    String(latest.counts.releases),
    String(latest.counts.leaders),
    String(latest.counts.prices),
    String(latest.counts.indexed),
  ]);
  await expect(page.locator('.weekly-highlights li')).toHaveCount(latest.highlights.length);
  await expect(page.locator('.weekly-releases tbody tr')).toHaveCount(latest.releases.length);
  await expect(page.locator('.weekly-events .change-entry')).toHaveCount(
    latest.leaders.length + latest.prices.length + latest.indexed.length,
  );
  await expect(page.locator('.weekly-archive a')).toHaveCount(
    directory.weeks.length > 1 ? directory.weeks.length : 0,
  );
  // A week in progress never states the day its data is from.
  await expect(page.locator('.page-heading, main').first()).not.toContainText('through');

  if (latest.previous) {
    await page.getByRole('link', { name: 'Previous week' }).click();
    await expect(page).toHaveURL(new RegExp(`/weekly/${latest.previous}$`));
    await expect(page.getByRole('link', { name: 'Next week' })).toHaveAttribute(
      'href',
      `/weekly/${latest.week}`,
    );
  }
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
});

test('an unknown week says so', async ({ page }) => {
  await page.goto('/weekly/2020-01-06');
  await expect(
    page.getByRole('heading', { name: 'There is no recap for this week.' }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Week not found — Artificials');
});

test('the menus, the footer and What changed lead to the week', async ({ page }, info) => {
  await page.goto('/changes');
  await page.getByRole('link', { name: 'Each week on one page' }).click();
  await expect(page).toHaveURL(/\/weekly$/);
  await expect(
    page.locator('footer').getByRole('link', { name: 'This week', exact: true }),
  ).toHaveAttribute('href', '/weekly');
  await expect(
    page.locator('footer').getByRole('link', { name: 'Every test', exact: true }),
  ).toHaveAttribute('href', '/tests');
  test.skip(info.project.name !== 'desktop', 'The header menus show on wide screens');
  const header = page.locator('header.site-header');
  await header.getByRole('button', { name: 'Analysis', exact: true }).click();
  await header.getByRole('link', { name: /^This week/ }).click();
  await expect(page).toHaveURL(/\/weekly$/);
});

test('the week is accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/weekly');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test('weeks are in the initial HTML, with a card and a feed', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const directory = (await (await request.get('/data/models/weekly.json')).json()) as WeekDirectory;
  const html = await (await request.get('/weekly')).text();
  expect(html).toContain('id="week-data"');
  // The latest week's dated address is the one search engines keep.
  expect(html).toContain(
    `<link rel="canonical" href="https://artificials.net/weekly/${directory.latest}">`,
  );
  const image = `/og/weekly/${directory.latest}.png`;
  expect(html).toContain(`<meta property="og:image" content="https://artificials.net${image}">`);
  const card = await request.get(image);
  expect(card.ok()).toBe(true);
  expect(card.headers()['content-type']).toBe('image/png');
  const dated = await (await request.get(`/weekly/${directory.latest}`)).text();
  expect(dated).toContain('The week in AI models.');
  const feed = await (await request.get('/weekly.xml')).text();
  expect(feed).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?><rss version="2.0"/);
  expect(feed.match(/<item>/g) ?? []).toHaveLength(
    directory.weeks.filter((week) => week.complete).length,
  );
});
