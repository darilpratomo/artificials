import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { FLAGS, type Explorer } from '../../shared/model-overview';
import type { SearchIndex } from '../../shared/search';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

/** A widely offered tested model, so the search is checked against the live data. */
async function someModel(page: Page) {
  const response = await page.request.get('/data/models/explorer.json');
  expect(response.ok()).toBe(true);
  const { models } = (await response.json()) as Explorer;
  return models.find((row) => row[9] & FLAGS.tested && row[7] >= 10)!;
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Search Artificials' });
const field = (page: Page) =>
  dialog(page).getByRole('combobox', { name: 'Search models, pages, guides and lessons' });

test('the header search finds a model and opens it from the keyboard', async ({ page }) => {
  const [, name] = await someModel(page);
  await page.goto('/leaderboard');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
  // Before anything is typed, it suggests the main pages.
  await expect(dialog(page).getByRole('option').first()).toContainText('Model rankings');
  await expect(dialog(page).getByRole('option')).toHaveCount(6);

  await field(page).fill(name);
  const models = dialog(page).getByRole('group', { name: 'Models' });
  await expect(models.getByRole('option').first()).toBeVisible();
  await expect(models).toContainText(name);
  await field(page).press('ArrowDown');
  await field(page).press('ArrowUp');
  const chosen = await dialog(page).locator('[role="option"][aria-selected="true"] b').innerText();
  await field(page).press('Enter');
  await expect(page).toHaveURL(/\/models\/[a-z0-9-]+$/);
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(chosen);
});

test('pages, guides, lessons and tools are found as well', async ({ page }) => {
  const index = (await (await page.request.get('/data/models/search.json')).json()) as SearchIndex;
  const tool = index.entries.find(([kind]) => kind === 'tool')!;
  const lesson = index.entries.find(([kind]) => kind === 'lesson')!;
  await page.goto('/');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await field(page).fill('what changed');
  await expect(
    dialog(page).getByRole('group', { name: 'Pages' }).getByRole('option').first(),
  ).toContainText('What changed');
  await field(page).fill(lesson[2]);
  await expect(dialog(page).getByRole('group', { name: 'Lessons' })).toContainText(lesson[2]);
  await field(page).fill('zzzz qqqq');
  await expect(dialog(page)).toContainText('Nothing matches “zzzz qqqq”.');

  await field(page).fill(tool[2]);
  await dialog(page)
    .getByRole('group', { name: 'Free tools' })
    .getByRole('option', { name: new RegExp(tool[2]) })
    .click();
  await expect(page).toHaveURL(new RegExp(`${tool[1]}$`));
});

test('shortcuts open and close the search, and focus returns', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(dialog(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
  // A slash in the field is text, and the shortcut closes the search again.
  await page.keyboard.type('/');
  await expect(field(page)).toHaveValue('/');
  await page.keyboard.press('Control+k');
  await expect(dialog(page)).toBeHidden();

  await page.keyboard.press('/');
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();

  const button = page.getByRole('button', { name: 'Search', exact: true });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Close search' }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(button).toBeFocused();
});

test('the search fits every screen and is accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const [, name] = await someModel(page);
  await page.goto('/changes');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await field(page).fill(name.split(' ')[0]);
  await expect(dialog(page).getByRole('option').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('.site-search')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const box = (await dialog(page).boundingBox())!;
    expect(box.x, `${width}px`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${width}px`).toBeLessThanOrEqual(width);
    expect(box.y + box.height, `${width}px`).toBeLessThanOrEqual(800);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
});
