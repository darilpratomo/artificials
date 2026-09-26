import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Finder } from '../../shared/finder';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

async function finder(page: import('@playwright/test').Page) {
  return (await (await page.request.get('/data/models/finder.json')).json()) as Finder;
}

test('the finder ranks models for a task, within the needs chosen', async ({ page }) => {
  const data = await finder(page);
  await page.goto('/model-finder');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Find the right model for the job.',
  );
  // The first task is chosen, and its best model leads.
  const first = data.tasks[0];
  const test0 = data.tests.find((entry) => entry.id === first.tests[0])!;
  await expect(page.getByRole('radio', { name: new RegExp(first.label) })).toBeChecked();
  await expect(page.locator('.finder-pick.is-best')).toContainText(
    data.models[test0.rows[0][0]][1],
  );

  // Choosing a task changes the ranking and the address, so the result can be shared.
  const coding = data.tasks.find((task) => task.id === 'coding')!;
  await page.getByRole('radio', { name: /^Coding/ }).check();
  await expect(page).toHaveURL(/task=coding/);
  const codingTest = data.tests.find((entry) => entry.id === coding.tests[0])!;
  await expect(
    page.getByRole('heading', { level: 2, name: `Ranked by ${codingTest.label}` }),
  ).toBeVisible();

  // Needs narrow the models: with open weights, every pick has downloadable weights.
  await page.getByRole('checkbox', { name: 'Open weights' }).check();
  await expect(page).toHaveURL(/open=1/);
  for (const tags of await page.locator('.finder-pick .finder-tags').allTextContents())
    expect(tags).toContain('Open weights');

  // Another test for the same task.
  if (coding.tests.length > 1) {
    const other = data.tests.find((entry) => entry.id === coding.tests[1])!;
    await page.getByRole('button', { name: other.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`test=${other.id}`));
  }
});

test('when nothing fits, the finder says so and clears the needs', async ({ page }) => {
  await page.goto('/model-finder?task=coding&budget=0.3&context=1000000&open=1&images=1&tools=1');
  const empty = page.locator('.finder-empty');
  if (await empty.count()) {
    await expect(page.locator('.finder-count')).toHaveText(
      'No tested model meets all of these needs.',
    );
    await empty.getByRole('button', { name: 'Clear the requirements' }).click();
    await expect(page).not.toHaveURL(/budget=/);
    await expect(page.locator('.finder-pick').first()).toBeVisible();
  }
});

test('the finder is accessible and fits every screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/model-finder?task=math');
  await expect(page.locator('.finder-pick').first()).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .include('.finder-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test('the finder data is in the initial HTML', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const html = await (await request.get('/model-finder')).text();
  expect(html).toContain('id="finder-data"');
  expect(html).toContain('What will you use it for?');
});
