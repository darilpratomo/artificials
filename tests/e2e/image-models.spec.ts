import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { Images } from '../../shared/images';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

async function images(page: import('@playwright/test').Page) {
  return (await (await page.request.get('/data/models/images.json')).json()) as Images;
}

test('the image boards rank models by category and weights', async ({ page }) => {
  const data = await images(page);
  const text = data.boards.find((board) => board.id === 'text-to-image')!;
  const overall = text.categories[0].entries;
  const leader = text.models[overall[0].model];
  await page.goto('/image-models');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'The best AI image models, ranked by people.',
  );
  await expect(page.locator('.glance-sentences')).toContainText(leader.name);

  const board = page.locator('#text-to-image');
  const rows = board.locator('.score-rows li');
  await expect(rows).toHaveCount(Math.min(20, overall.length));
  await expect(rows.first()).toContainText(leader.name);
  await expect(rows.first()).toContainText(String(Math.round(overall[0].rating)));

  // Every row shows its maker and its votes.
  await expect(rows.first()).toContainText(`${leader.maker}, `);

  // Showing every model, then a category.
  await board.getByRole('button', { name: `Show all ${overall.length}` }).click();
  await expect(rows).toHaveCount(overall.length);
  const second = text.categories[1];
  await board.getByRole('button', { name: second.label, exact: true }).click();
  await expect(board.getByRole('heading', { level: 3 })).toHaveText(
    `Text to image: ${second.label.toLowerCase()}`,
  );
  await expect(rows.first()).toContainText(text.models[second.entries[0].model].name);

  // Only models with downloadable weights.
  await board.getByRole('button', { name: 'Open weights', exact: true }).click();
  const open = second.entries.filter((entry) => text.models[entry.model].open);
  await expect(rows).toHaveCount(Math.min(20, open.length));
  for (const tag of await rows.locator('.score-tag:not(.is-new)').allTextContents())
    expect(tag).toBe('Open weights');

  // The categories, the makers and the progress chart.
  await expect(page.locator('.image-category')).toHaveCount(text.categories.length);
  await expect(page.locator('#makers .score-rows li').first()).toContainText(leader.maker);
  await expect(page.locator('#progress .trend-line')).toHaveCount(text.progress.length);

  // Image editing has its own board.
  const edit = data.boards.find((entry) => entry.id === 'image-edit')!;
  await expect(page.locator('#image-editing .score-rows li').first()).toContainText(
    edit.models[edit.categories[0].entries[0].model].name,
  );

  // Answers are marked up for search, and the sources are credited.
  expect(await page.locator('#faq details').count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('script[type="application/ld+json"]').last()).toBeAttached();
  const sources = page.locator('.coding-sources');
  await sources.locator('summary').click();
  await expect(sources).toContainText('Arena');
  await expect(sources).toContainText('CC BY 4.0');
});

test('the image models page is accessible and fits every screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/image-models');
  await expect(page.locator('.glance-sentences')).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .include('.images-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test('an image board downloads as a branded image', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Downloads are checked once, in desktop Chrome');
  await page.goto('/image-models');
  const board = page.locator('#text-to-image');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    board.getByRole('button', { name: /as an image/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^artificials-[a-z0-9-]+\.png$/);
  const bytes = readFileSync(await download.path());
  expect(String.fromCharCode(...bytes.subarray(1, 4))).toBe('PNG');
});

test('the image models data is in the initial HTML', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const html = await (await request.get('/image-models')).text();
  expect(html).toContain('id="images-data"');
  expect(html).toContain('Text to image: overall');
});
