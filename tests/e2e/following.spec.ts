import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Followed } from '../../src/lib/following';

const KEY = 'artificials-following-v1';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

/** Rewrites what the browser remembers about each followed model, as time passing would. */
async function remember(page: Page, change: (model: Followed) => Followed) {
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), KEY);
  saved.models = saved.models.map(change);
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
    KEY,
    JSON.stringify(saved),
  ] as const);
}

const header = (page: Page) => page.locator('header.site-header');

test('a followed model shows what changed until it is marked as seen', async ({ page }) => {
  await page.goto('/models/claude-opus-5');
  await expect(
    header(page).getByRole('link', { name: 'Models you follow', exact: true }),
  ).toBeVisible();
  const follow = page.getByRole('button', { name: 'Follow', exact: true });
  await follow.click();
  const following = page.getByRole('button', { name: 'Following', exact: true });
  await expect(following).toHaveAttribute('aria-pressed', 'true');
  await expect(following).toBeEnabled();
  await header(page).getByRole('link', { name: 'Models you follow: 1' }).click();

  await expect(page).toHaveURL(/\/following$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The models you follow.');
  const card = page.locator('.following-card');
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('heading', { level: 2 })).toHaveText('Claude Opus 5');
  await expect(page.locator('#following-summary')).toHaveText(
    'Nothing changed since you last looked, across 1 model.',
  );
  await expect(card.locator('.following-figure.is-changed')).toHaveCount(0);

  // The price and hosts the visitor saw were different from today's.
  await remember(page, (model) => ({
    ...model,
    seen: { ...model.seen, price: model.seen.price! * 2, hosts: model.seen.hosts + 3 },
  }));
  await page.reload();
  await expect(page.locator('#following-summary')).toHaveText(
    '1 of 1 model changed since you last looked.',
  );
  await expect(card.locator('.following-figure.is-changed')).toHaveCount(2);
  await expect(card.locator('.following-figure').first()).toContainText('Down from $');
  await expect(card.locator('.following-count-chip')).toHaveText('2 changes');

  await card.getByRole('button', { name: 'Mark as seen: Claude Opus 5' }).click();
  await expect(card.locator('.following-figure.is-changed')).toHaveCount(0);
  await expect(page.locator('#following-summary')).toHaveText(
    'Nothing changed since you last looked, across 1 model.',
  );
  await expect(card.getByRole('heading', { level: 2 })).toBeFocused();

  await card.getByRole('button', { name: 'Unfollow Claude Opus 5' }).click();
  await expect(
    page.getByRole('heading', { name: 'You don’t follow any models yet.' }),
  ).toBeFocused();
  await expect(header(page).locator('.following-count')).toHaveCount(0);
});

test('the privacy page clears the followed models', async ({ page }) => {
  await page.goto('/models/claude-opus-5');
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await page.goto('/privacy');
  await expect(header(page).getByRole('link', { name: 'Models you follow: 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear followed models' }).click();
  await expect(page.getByRole('button', { name: 'Followed models cleared' })).toBeVisible();
  await expect(
    header(page).getByRole('link', { name: 'Models you follow', exact: true }),
  ).toBeVisible();
});

test('the following page is accessible and fits every width', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/following');
  await expect(page.getByRole('link', { name: 'Browse models' })).toHaveAttribute(
    'href',
    '/models',
  );
  for (const slug of ['claude-opus-5', 'gpt-5-5']) {
    await page.goto(`/models/${slug}`);
    await page.getByRole('button', { name: 'Follow', exact: true }).click();
  }
  await remember(page, (model) => ({ ...model, seen: { ...model.seen, index: null } }));
  await page.goto('/following');
  await expect(page.locator('.following-card')).toHaveCount(2);
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

test('the following page stays out of search', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const html = await (await request.get('/following')).text();
  expect(html).toContain('<title>Models you follow — Artificials</title>');
  expect(html).toContain('<meta name="robots" content="noindex,follow">');
});
