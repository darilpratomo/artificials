import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { MakerDirectory, MakerPage } from '../../shared/maker-pages';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

/** The live list of makers, and the page of the one ranked first. */
async function makers(page: Page) {
  const response = await page.request.get('/data/models/makers.json');
  expect(response.ok()).toBe(true);
  const directory = (await response.json()) as MakerDirectory;
  const first = directory.makers[0];
  const detail = (await (
    await page.request.get(`/data/models/makers/${first.slug}.json`)
  ).json()) as MakerPage;
  return { directory, first, detail };
}

test('the makers list opens each maker’s page', async ({ page }) => {
  const { directory, first } = await makers(page);
  await page.goto('/makers');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Who makes the models.');
  await expect(page.locator('.maker-card')).toHaveCount(directory.makers.length);
  await page.locator('.maker-card').first().click();
  await expect(page).toHaveURL(new RegExp(`/makers/${first.slug}$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(first.name);
  await expect(page).toHaveTitle(
    `${first.name} AI models: benchmarks, prices and releases — Artificials`,
  );
});

test('a maker’s page shows its standing, every test and every model', async ({ page }) => {
  const { detail } = await makers(page);
  await page.goto(`/makers/${detail.slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(detail.name);
  await expect(page.locator('.maker-glance .glance-tile')).toHaveCount(4);
  await expect(page.locator('.maker-skills li')).toHaveCount(detail.areas.length);
  await expect(page.locator('.maker-tests tbody tr')).toHaveCount(detail.results.length);

  const rows = page.locator('.maker-models tbody tr');
  const shown = Math.min(15, detail.lineup.length);
  await expect(rows).toHaveCount(shown);
  if (detail.lineup.length > 15) {
    await page.getByRole('button', { name: `Show all ${detail.lineup.length} models` }).click();
    await expect(rows).toHaveCount(detail.lineup.length);
  }
  await expect(page.locator('.data-footnote')).toContainText('models.dev');

  // A model in the list opens its own page, which links back to the maker.
  const [model] = detail.lineup;
  await rows.first().getByRole('link', { name: model.name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/models/${model.slug}$`));
  await page.locator('.profile-maker').getByRole('link', { name: detail.name }).click();
  await expect(page).toHaveURL(new RegExp(`/makers/${detail.slug}$`));

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
});

test('an unknown maker says so', async ({ page }) => {
  await page.goto('/makers/not-a-maker-0000');
  await expect(page.getByRole('heading', { name: 'We couldn’t find this maker.' })).toBeVisible();
  await expect(page).toHaveTitle('Maker not found — Artificials');
});

test('the search, the menus and the market lead to makers', async ({ page }, info) => {
  const { first } = await makers(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Search Artificials' });
  await dialog.getByRole('combobox').fill(first.name);
  const option = dialog.getByRole('group', { name: 'Makers' }).getByRole('option').first();
  await expect(option).toContainText(first.name);
  await dialog.getByRole('combobox').press('Enter');
  await expect(page).toHaveURL(new RegExp(`/makers/${first.slug}$`));

  await expect(
    page.locator('footer').getByRole('link', { name: 'Model makers', exact: true }),
  ).toHaveAttribute('href', '/makers');
  await page.goto('/market');
  await expect(
    page.locator('.market-list').getByRole('link', { name: first.name }),
  ).toHaveAttribute('href', `/makers/${first.slug}`);
  test.skip(info.project.name !== 'desktop', 'The header menus show on wide screens');
  const header = page.locator('header.site-header');
  await header.getByRole('button', { name: 'Analysis', exact: true }).click();
  await header.getByRole('link', { name: /^Model makers/ }).click();
  await expect(page).toHaveURL(/\/makers$/);
});

test('maker pages are accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { first } = await makers(page);
  for (const path of ['/makers', `/makers/${first.slug}`]) {
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

test('maker pages are in the initial HTML', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const { makers: list } = (await (
    await request.get('/data/models/makers.json')
  ).json()) as MakerDirectory;
  const html = await (await request.get(`/makers/${list[0].slug}`)).text();
  expect(html).toContain('id="maker-data"');
  expect(html).toContain('id="makers-data"');
  expect(html).toContain(
    `<link rel="canonical" href="https://artificials.net/makers/${list[0].slug}">`,
  );
  const index = await (await request.get('/makers')).text();
  expect(index).toContain('id="makers-data"');
  expect(index).toContain(`href="/makers/${list[0].slug}"`);
});
