import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Costs } from '../../shared/costs';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

async function costs(page: Page) {
  const response = await page.request.get('/data/models/costs.json');
  expect(response.ok()).toBe(true);
  return (await response.json()) as Costs;
}

/** What the page shows as a month, from the table's first row. */
const firstMonth = (page: Page) =>
  page.locator('.cost-table tbody tr').first().locator('td[data-label="Per month"]');

test('a workload prices every model, and the address keeps it', async ({ page }) => {
  const { rows } = await costs(page);
  const indexed = rows.filter((row) => row[7] !== null);
  await page.goto('/cost-calculator');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What your workload costs on each model.',
  );
  await expect(page.getByRole('button', { name: 'Chat reply' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.cost-glance .glance-tile')).toHaveCount(3);
  await expect(page.locator('.cost-table tbody tr')).toHaveCount(Math.min(25, indexed.length));

  // A month for the cheapest model on the index, at 1,500 in and 500 out, 100 a day.
  const cheapest = Math.min(
    ...indexed.map((row) => ((1500 * row[4] + 500 * row[5]) / 1_000_000) * 100 * 30),
  );
  await expect(firstMonth(page)).toHaveText(
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(cheapest),
  );

  // Ten times the requests cost ten times as much, and the address says so.
  const before = await firstMonth(page).innerText();
  await page.getByRole('spinbutton', { name: /^Requests per day/ }).fill('1000');
  await expect(page).toHaveURL(/day=1000/);
  await expect(firstMonth(page)).not.toHaveText(before);
  await page.getByRole('button', { name: 'Summarize a long report' }).click();
  await expect(page).toHaveURL(/in=30000.*out=1000|out=1000.*in=30000/);

  await page.getByRole('button', { name: 'Every priced model' }).click();
  await expect(page.locator('.cost-page')).toContainText(`${rows.length} models`);
  await page.getByRole('button', { name: 'Most capable first' }).click();
  await expect(page).toHaveURL(/sort=index/);
  await page.getByRole('searchbox', { name: 'Find a model or maker' }).fill('zzzz-none');
  await expect(page.locator('.cost-note')).toContainText('No model matches');

  // The address reopens the same calculation.
  const shared = page.url();
  await page.goto(shared.replace(/[?&]sort=index/, ''));
  await expect(page.getByRole('spinbutton', { name: /^Tokens sent/ })).toHaveValue('30000');
  await expect(page.getByRole('spinbutton', { name: /^Requests per day/ })).toHaveValue('1000');

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}px`,
    ).toBe(true);
  }
});

test('a model’s own calculator opens the comparison with its numbers', async ({ page }) => {
  await page.goto('/models/claude-opus-5?tab=pricing');
  await page.getByRole('link', { name: /Compare this workload across every model/ }).click();
  await expect(page).toHaveURL(/\/cost-calculator\?in=1500&out=500&day=100$/);
  await expect(page.getByRole('button', { name: 'Chat reply' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the calculator is in the menus and the footer, and is accessible', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/cost-calculator');
  await expect(page.locator('.cost-table tbody tr').first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
  await expect(
    page.locator('footer').getByRole('link', { name: 'Cost calculator', exact: true }),
  ).toHaveAttribute('href', '/cost-calculator');
  test.skip(info.project.name !== 'desktop', 'The header menus show on wide screens');
  const header = page.locator('header.site-header');
  await header.getByRole('button', { name: 'Resources', exact: true }).click();
  await expect(header.locator('.nav-group.is-open [role="group"]')).toHaveCount(2);
  await expect(header.getByRole('link', { name: /^Cost calculator/ })).toHaveAttribute(
    'href',
    '/cost-calculator',
  );
});

test('the calculator is in the initial HTML', async ({ request }) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Requires production prerendering');
  const html = await (await request.get('/cost-calculator')).text();
  expect(html).toContain('id="costs-data"');
  expect(html).toContain('What your workload costs on each model.');
  expect(html).toContain(
    '<meta property="og:image" content="https://artificials.net/og/cost-calculator.png">',
  );
  const card = await request.get('/og/cost-calculator.png');
  expect(card.ok()).toBe(true);
});
