import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Videos } from '../../shared/videos';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

async function videos(page: import('@playwright/test').Page) {
  return (await (await page.request.get('/data/models/videos.json')).json()) as Videos;
}

test('the video boards rank text to video, image to video and editing', async ({ page }) => {
  const data = await videos(page);
  const board = (id: string) => data.boards.find((entry) => entry.id === id)!;
  const text = board('text-to-video');
  const overall = text.categories[0].entries;
  await page.goto('/video-models');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'The best AI video models, ranked by people.',
  );
  await expect(page.locator('.glance-sentences')).toContainText(text.models[overall[0].model].name);

  for (const [id, section] of [
    ['text-to-video', '#text-to-video'],
    ['image-to-video', '#image-to-video'],
    ['video-edit', '#video-editing'],
  ]) {
    const entries = board(id).categories[0].entries;
    const rows = page.locator(`${section} .score-rows li`);
    await expect(rows).toHaveCount(Math.min(20, entries.length));
    await expect(rows.first()).toContainText(board(id).models[entries[0].model].name);
  }

  // Only models with downloadable weights.
  const section = page.locator('#text-to-video');
  await section.getByRole('button', { name: 'Open weights', exact: true }).click();
  const open = overall.filter((entry) => text.models[entry.model].open);
  await expect(section.locator('.score-rows li')).toHaveCount(Math.min(20, open.length));

  await expect(page.locator('#makers .score-rows li').first()).toContainText(
    text.models[overall[0].model].maker,
  );
  await expect(page.locator('#progress .trend-line')).toHaveCount(text.progress.length);
  expect(await page.locator('#faq details').count()).toBeGreaterThanOrEqual(5);
  const sources = page.locator('.coding-sources');
  await sources.locator('summary').click();
  await expect(sources).toContainText('CC BY 4.0');
});

test('the video models page is accessible and fits every screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/video-models');
  await expect(page.locator('.glance-sentences')).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .include('.videos-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test('the video models data is in the initial HTML', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const html = await (await request.get('/video-models')).text();
  expect(html).toContain('id="videos-data"');
  expect(html).toContain('Text to video: overall');
});
