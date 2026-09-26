import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Comparisons } from '../../shared/compare';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

/** The featured comparisons, so assertions follow the live data rather than fixed names. */
async function featured(page: Page) {
  const response = await page.request.get('/data/models/comparisons.json');
  expect(response.ok()).toBe(true);
  return ((await response.json()) as Comparisons).featured;
}

const path = (slugs: string[]) => '/compare/' + slugs.join('-vs-');

test('a comparison shows both models, the summary and every result', async ({ page }) => {
  const [pair] = await featured(page);
  await page.goto(path(pair.slugs));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(pair.names.join(' vs '));
  await expect(page).toHaveTitle(
    new RegExp(`^${pair.names[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} vs`),
  );
  await expect(page.locator('.vs-model')).toHaveCount(2);
  await expect(page.locator('.vs-tile')).toHaveCount(4);
  await expect(page.locator('.vs-tile').first()).toContainText('Capability index');
  await expect(page.locator('.vs-lead')).toHaveCount(2);
  // Every row of the table has one value per model.
  const cells = await page
    .locator('.comparison-table tbody tr:not(.comparison-section)')
    .evaluateAll((rows) => rows.map((row) => row.querySelectorAll('td').length));
  expect(cells.length).toBeGreaterThan(20);
  expect(new Set(cells)).toEqual(new Set([2]));
  await expect(page.locator('.data-footnote')).toContainText('models.dev');
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
});

test('the picker opens a comparison, and its controls change it', async ({ page }) => {
  const [first, second, third] = await featured(page);
  const [a, b] = first.slugs;
  const [nameA, nameB] = first.names;
  const other = [...second.slugs, ...third.slugs].find((slug) => !first.slugs.includes(slug))!;
  const otherName = [...second.names, ...third.names][
    [...second.slugs, ...third.slugs].indexOf(other)
  ];
  await page.goto('/compare');
  await expect(page.getByRole('button', { name: 'Compare', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: 'First model' }).fill(nameA);
  await page
    .getByRole('option', { name: new RegExp(nameA) })
    .first()
    .click();
  await page.getByRole('combobox', { name: 'Second model' }).fill(nameB);
  await page
    .getByRole('option', { name: new RegExp(nameB) })
    .first()
    .click();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path([a, b])}$`));

  await page.getByRole('button', { name: 'Swap sides' }).click();
  await expect(page).toHaveURL(new RegExp(`${path([b, a])}$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${nameB} vs ${nameA}`);

  await page.getByRole('button', { name: 'Add a model' }).click();
  await page.getByRole('combobox', { name: 'Add a model' }).fill(otherName);
  await page
    .getByRole('option', { name: new RegExp(otherName) })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`${path([b, a, other])}$`));
  await expect(page.locator('.vs-model')).toHaveCount(3);

  await page.getByRole('button', { name: `Remove ${nameB}` }).click();
  await expect(page).toHaveURL(new RegExp(`${path([a, other])}$`));

  await page.getByRole('button', { name: `Change ${otherName}` }).click();
  await page.getByRole('combobox', { name: `Replace ${otherName}` }).fill(nameB);
  await page
    .getByRole('option', { name: new RegExp(nameB) })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`${path([a, b])}$`));
});

test('sharing copies the address and saves a branded image', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'Phones share through the share sheet instead');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const [pair] = await featured(page);
  await page.goto(path(pair.slugs));
  await page.getByRole('button', { name: 'Share link' }).click();
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    new URL(path(pair.slugs), page.url()).toString(),
  );
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /as an image/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^artificials-[a-z0-9-]+-vs-[a-z0-9-]+\.png$/);
});

test('models link to comparisons, and a shortlist becomes a shareable page', async ({ page }) => {
  const [pair] = await featured(page);
  const [a, b] = pair.slugs;
  await page.goto(`/models/${a}`);
  const peer = page.locator('.peer-compare').first();
  await expect(peer).toHaveAttribute('href', new RegExp(`^/compare/${a}-vs-[a-z0-9-]+$`));
  await page.getByRole('button', { name: 'Add to comparison' }).click();
  await page.goto(`/models/${b}`);
  await page.getByRole('button', { name: 'Add to comparison' }).click();
  await page.goto('/compare');
  await expect(page.getByRole('link', { name: 'Share this comparison' })).toHaveAttribute(
    'href',
    path([a, b]),
  );
});

test('invalid and unknown comparisons say what is wrong', async ({ page }) => {
  await page.goto('/compare/gpt-6-astra-vs-gpt-6-astra');
  await expect(
    page.getByRole('heading', { name: 'This comparison address is not valid.' }),
  ).toBeVisible();
  await page.goto('/compare/gpt-6-astra-vs-definitely-not-a-model-0000');
  await expect(
    page.getByRole('heading', { name: 'We couldn’t find one of these models.' }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Comparison not found — Artificials');
});

test('the comparison page is accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const [pair] = await featured(page);
  await page.goto(path(pair.slugs));
  await expect(page.locator('.vs-tile').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('.comparison-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
  await page.goto('/compare');
  await expect(page.locator('.featured-comparisons li').first()).toBeVisible();
  const landing = await new AxeBuilder({ page })
    .include('.comparison-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(landing.violations.map((violation) => violation.id)).toEqual([]);
});

test('featured comparisons are in the initial HTML', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const { featured: pairs } = (await (
    await request.get('/data/models/comparisons.json')
  ).json()) as Comparisons;
  const html = await (await request.get(path(pairs[0].slugs))).text();
  expect(html).toContain('id="compare-data"');
  expect(html).toContain(`<h1>${pairs[0].names.join(' vs ')}</h1>`);
  const landing = await (await request.get('/compare')).text();
  expect(landing).toContain('id="comparisons-data"');
  expect(landing).toContain(`href="${path(pairs[0].slugs)}"`);
});
