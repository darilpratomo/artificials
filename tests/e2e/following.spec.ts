import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { MakerPage } from '../../shared/maker-pages';
import type { FollowList, Kind } from '../../src/lib/following';

const KEY = 'artificials-following-v1';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

/** Rewrites what the browser remembers about each followed entry of a kind, as time passing would. */
async function remember<K extends Kind>(
  page: Page,
  kind: K,
  change: (entry: FollowList[K][number]) => FollowList[K][number],
) {
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), KEY);
  saved[kind] = saved[kind].map(change);
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
    KEY,
    JSON.stringify(saved),
  ] as const);
}

const header = (page: Page) => page.locator('header.site-header');
const section = (page: Page, name: string | RegExp) =>
  page.locator('.following-section').filter({ has: page.getByRole('heading', { level: 2, name }) });
const summary = (page: Page) => page.locator('#following-summary');

test('a followed model shows what changed until it is marked as seen', async ({ page }) => {
  await page.goto('/models/claude-opus-5');
  await expect(header(page).getByRole('link', { name: 'Following', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  const following = page.getByRole('button', { name: 'Following', exact: true });
  await expect(following).toHaveAttribute('aria-pressed', 'true');
  await expect(following).toBeEnabled();
  await header(page).getByRole('link', { name: 'Following: 1' }).click();

  await expect(page).toHaveURL(/\/following$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What you follow.');
  const card = section(page, /^Models/).locator('.following-card');
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('heading', { level: 3 })).toHaveText('Claude Opus 5');
  await expect(summary(page)).toHaveText('Nothing changed since you last looked.');
  await expect(card.locator('.following-figure.is-changed')).toHaveCount(0);

  // The price and hosts the visitor saw were different from today's.
  await remember(page, 'models', (model) => ({
    ...model,
    seen: { ...model.seen, price: model.seen.price! * 2, hosts: model.seen.hosts + 3 },
  }));
  await page.reload();
  await expect(summary(page)).toHaveText('1 of 1 changed since you last looked.');
  await expect(card.locator('.following-figure.is-changed')).toHaveCount(2);
  await expect(card.locator('.following-figure').first()).toContainText('Down from $');
  await expect(card.locator('.following-count-chip')).toHaveText('Changed');

  await card.getByRole('button', { name: 'Mark as seen: Claude Opus 5' }).click();
  await expect(card.locator('.following-figure.is-changed')).toHaveCount(0);
  await expect(summary(page)).toHaveText('Nothing changed since you last looked.');
  await expect(card.getByRole('heading', { level: 3 })).toBeFocused();

  await card.getByRole('button', { name: 'Unfollow Claude Opus 5' }).click();
  await expect(page.getByRole('heading', { name: 'You don’t follow anything yet.' })).toBeFocused();
  await expect(header(page).locator('.following-count')).toHaveCount(0);
});

test('a followed maker lists its new models, each ready to follow', async ({ page }) => {
  const maker = (await (
    await page.request.get('/data/models/makers/anthropic.json')
  ).json()) as MakerPage;
  const [newest] = maker.lineup;
  await page.goto('/makers/anthropic');
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(header(page).getByRole('link', { name: 'Following: 1' })).toBeVisible();

  // When the visitor last looked, the newest model was not out yet.
  await remember(page, 'makers', (entry) => ({
    ...entry,
    seen: {
      ...entry.seen,
      models: entry.seen.models - 1,
      lineup: entry.seen.lineup.filter((slug) => slug !== newest.slug),
    },
  }));
  await page.goto('/following');
  const card = section(page, /^Makers/).locator('.following-card');
  await expect(card.getByRole('heading', { level: 3 })).toHaveText(maker.name);
  await expect(card.locator('.following-new h4')).toHaveText('A new model since you last looked');
  const row = card.locator('.following-new li');
  await expect(row).toHaveCount(1);
  await expect(row.getByRole('link', { name: newest.name, exact: true })).toHaveAttribute(
    'href',
    `/models/${newest.slug}`,
  );
  await expect(card.locator('.following-figure').first()).toContainText(
    `Up from ${maker.models - 1}`,
  );

  // Following the new model adds it to the models, without leaving the page.
  await row.getByRole('button', { name: `Follow: ${newest.name}` }).click();
  await expect(row.getByRole('button', { name: `Following: ${newest.name}` })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(header(page).getByRole('link', { name: 'Following: 2' })).toBeVisible();
  await expect(section(page, /^Models/).locator('.following-card')).toHaveCount(1);

  await card.getByRole('button', { name: `Mark as seen: ${maker.name}` }).click();
  await expect(card.locator('.following-new')).toHaveCount(0);
  await expect(card.locator('.following-figure.is-changed')).toHaveCount(0);
});

test('a followed test shows a new leader until it is marked as seen', async ({ page }) => {
  await page.goto('/tests/arena-text');
  const leader = (
    await page.locator('.test-glance .glance-tile').first().locator('small').first().innerText()
  ).split(',')[0];
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Following', exact: true })).toBeVisible();

  // Another model led when the visitor last looked, at a lower score.
  await remember(page, 'tests', (entry) => ({
    ...entry,
    seen: { ...entry.seen, leader: 'old-leader', leaderName: 'Old Leader', score: 1400 },
  }));
  await page.goto('/following');
  const card = section(page, /^Tests/).locator('.following-card');
  await expect(card.getByRole('heading', { level: 3 })).toHaveText('Arena text');
  const [top, best] = [
    card.locator('.following-figure').nth(0),
    card.locator('.following-figure').nth(1),
  ];
  await expect(top.locator('strong')).toHaveText(leader);
  await expect(top.locator('small')).toHaveText('Was Old Leader');
  await expect(best.locator('small')).toHaveText('Up from 1400');
  await expect(card.locator('.domain-key')).toBeVisible();

  await page.getByRole('button', { name: 'Mark all as seen' }).click();
  await expect(summary(page)).toHaveText('Nothing changed since you last looked.');
  await expect(summary(page)).toBeFocused();
  await expect(card.locator('.following-figure.is-changed')).toHaveCount(0);
});

test('a model page links to its RSS feed and names it for feed readers', async ({ page }) => {
  const feeds = page.locator('head link[rel="alternate"][type="application/rss+xml"]');
  await page.goto('/models/claude-opus-5');
  await expect(page.getByRole('link', { name: 'RSS feed' })).toHaveAttribute(
    'href',
    '/models/claude-opus-5/changes.xml',
  );
  await expect(page.locator('head #page-feed')).toHaveAttribute(
    'href',
    'https://artificials.net/models/claude-opus-5/changes.xml',
  );
  // Beside the site's own feed, which every page names.
  await expect(feeds).toHaveCount(2);
  await expect(feeds.first()).toHaveAttribute('href', '/changes.xml');
  // A page without a feed of its own names only the site's.
  await page.getByRole('link', { name: 'All models' }).click();
  await expect(page.locator('head #page-feed')).toHaveCount(0);
  await expect(feeds).toHaveCount(1);
  await expect(feeds).toHaveAttribute('href', '/changes.xml');
});

test('maker and test pages link to RSS feeds of their own', async ({ page, request }) => {
  for (const [path, name] of [
    ['/makers/anthropic', 'Anthropic'],
    ['/tests/arena-text', 'Arena text'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('link', { name: 'RSS feed' })).toHaveAttribute(
      'href',
      `${path}/changes.xml`,
    );
    await expect(page.locator('head #page-feed')).toHaveAttribute(
      'href',
      `https://artificials.net${path}/changes.xml`,
    );
    if (process.env.E2E_PRODUCTION !== '1') continue;
    // The feeds are written with the prerendered pages.
    const feed = await (await request.get(`${path}/changes.xml`)).text();
    expect(feed).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?><rss version="2.0"/);
    expect(feed).toContain(`<title>${name}: what changed — Artificials</title>`);
    expect(feed).toContain(
      `<atom:link href="https://artificials.net${path}/changes.xml" rel="self" type="application/rss+xml"/>`,
    );
  }
});

test('the privacy page clears everything followed', async ({ page }) => {
  await page.goto('/models/claude-opus-5');
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await page.goto('/tests/arena-text');
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await page.goto('/privacy');
  await expect(header(page).getByRole('link', { name: 'Following: 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear what you follow' }).click();
  await expect(
    page.getByRole('button', { name: 'Everything you follow is cleared' }),
  ).toBeVisible();
  await expect(header(page).getByRole('link', { name: 'Following', exact: true })).toBeVisible();
});

test('the following page is accessible and fits every width', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/following');
  await expect(page.getByRole('link', { name: 'Browse models' })).toHaveAttribute(
    'href',
    '/models',
  );
  for (const path of [
    '/models/claude-opus-5',
    '/models/gpt-5-5',
    '/makers/openai',
    '/tests/gpqa-diamond',
  ]) {
    await page.goto(path);
    await page.getByRole('button', { name: 'Follow', exact: true }).click();
  }
  await remember(page, 'models', (model) => ({ ...model, seen: { ...model.seen, index: null } }));
  await remember(page, 'makers', (maker) => ({
    ...maker,
    seen: { ...maker.seen, lineup: maker.seen.lineup.slice(2) },
  }));
  await page.goto('/following');
  await expect(page.locator('.following-card')).toHaveCount(4);
  await expect(page.locator('.following-section h2')).toHaveText([/^Models/, /^Makers/, /^Tests/]);
  const results = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
});

test('the following page stays out of search, and site feeds are named in heads', async ({
  request,
}) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const html = await (await request.get('/following')).text();
  expect(html).toContain('<title>What you follow — Artificials</title>');
  expect(html).toContain('<meta name="robots" content="noindex,follow">');
  // Every page names the site's feed once; the weekly recap names its own as well.
  const changes = await (await request.get('/changes')).text();
  expect(changes.match(/application\/rss\+xml/g)).toHaveLength(1);
  const weekly = await (await request.get('/weekly')).text();
  expect(weekly).toContain(
    '<link id="page-feed" rel="alternate" type="application/rss+xml" title="The week in AI models — Artificials" href="https://artificials.net/weekly.xml">',
  );
  expect(weekly.match(/application\/rss\+xml/g)).toHaveLength(2);
});
