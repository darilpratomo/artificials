import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Changes } from '../../shared/changes';
import type { History } from '../../shared/history';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

/** The page's own data, so assertions follow the live changes rather than fixed names. */
async function changes(page: Page) {
  const response = await page.request.get('/data/models/changes.json');
  expect(response.ok()).toBe(true);
  return (await response.json()) as Changes;
}

/** The first day of the last `days` days, counting the data's own day. */
function firstDay(until: string, days: number) {
  const start = new Date(`${until}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start.toISOString().slice(0, 10);
}

test('changes are listed by day, and the filters narrow them', async ({ page }) => {
  const data = await changes(page);
  await page.goto('/changes');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What changed, day by day.');
  const entries = page.locator('.change-entry');
  await expect(entries).toHaveCount(data.events.length);
  await expect(page.getByRole('button', { name: `All ${data.events.length}` })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // Days run newest first, one heading each.
  const days = [...new Set(data.events.map((event) => event.day))];
  await expect(page.locator('.changes-days time')).toHaveCount(days.length);
  expect(
    await page
      .locator('.changes-days time')
      .evaluateAll((times) => times.map((time) => time.getAttribute('datetime'))),
  ).toEqual(days);

  for (const [kind, tab, label] of [
    ['release', 'Releases', 'New release'],
    ['leader', 'Leaders', 'New leader'],
    ['index', 'Index', 'Joined the index'],
    ['price', 'Prices', 'Price change'],
  ] as const) {
    const count = data.events.filter((event) => event.kind === kind).length;
    await page.getByRole('button', { name: `${tab} ${count}`, exact: true }).click();
    await expect(entries).toHaveCount(count);
    if (count) await expect(entries.locator('.change-kind').first()).toHaveText(label);
    else await expect(page.locator('.changes-empty')).toBeVisible();
  }

  await page.getByRole('button', { name: /^All / }).click();
  await page.getByRole('button', { name: 'Last 7 days' }).click();
  const week = data.events.filter((event) => event.day >= firstDay(data.until, 7)).length;
  await expect(entries).toHaveCount(week);
  await expect(page.getByRole('button', { name: `All ${week}`, exact: true })).toBeVisible();

  await expect(page.getByRole('link', { name: 'RSS feed' })).toHaveAttribute(
    'href',
    '/changes.xml',
  );
  await expect(page.locator('.data-footnote')).toContainText('models.dev');
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
});

test('the menus and the footer link to the changes', async ({ page }, info) => {
  await page.goto('/');
  await expect(
    page.locator('footer').getByRole('link', { name: 'What changed', exact: true }),
  ).toHaveAttribute('href', '/changes');
  if (info.project.name === 'desktop') {
    const header = page.locator('header.site-header');
    await header.getByRole('button', { name: 'Analysis', exact: true }).click();
    await header.getByRole('link', { name: /^What changed/ }).click();
  } else {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('link', { name: /^What changed/ })
      .click();
  }
  await expect(page).toHaveURL(/\/changes$/);
});

test('a model whose listed price changed shows each change', async ({ page }) => {
  const response = await page.request.get('/data/history.json');
  expect(response.ok()).toBe(true);
  const history = (await response.json()) as History;
  const changed = Object.entries(history.prices).find(([, points]) => points.length > 1);
  test.skip(!changed, 'No listed price has changed yet');
  const [slug, points] = changed!;
  await page.goto(`/models/${slug}?tab=pricing`);
  const card = page.getByRole('region', { name: 'Price changes' });
  await expect(card).toBeVisible();
  await expect(card.locator('li')).toHaveCount(points.length - 1);
  await expect(card.locator('li time').first()).toHaveAttribute('datetime', points.at(-1)![0]);
});

test('the changes page is accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/changes');
  await expect(page.locator('.change-entry').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('.changes-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test('the changes are in the initial HTML and in the feed', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const data = (await (await request.get('/data/models/changes.json')).json()) as Changes;
  const html = await (await request.get('/changes')).text();
  expect(html).toContain('id="changes-data"');
  expect(html).toContain('What changed, day by day.');
  expect(html).toContain('href="/changes.xml"');

  const feed = await request.get('/changes.xml');
  expect(feed.ok()).toBe(true);
  const xml = await feed.text();
  expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?><rss version="2.0"/);
  expect(xml.match(/<item>/g) ?? []).toHaveLength(Math.min(data.events.length, 100));
  expect(xml).toContain('<link>https://artificials.net/changes</link>');
  // Nothing in the feed says when the data was fetched.
  expect(xml).not.toContain('lastBuildDate');
  if (data.events.length)
    expect(xml).toContain(
      `<pubDate>${new Date(`${data.events[0].day}T00:00:00Z`).toUTCString()}</pubDate>`,
    );
  const home = await (await request.get('/')).text();
  expect(home).toContain('type="application/rss+xml"');
});
