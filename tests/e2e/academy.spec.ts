import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/catalog/summary', (route) =>
    route.fulfill({ json: JSON.parse(readFileSync('public/data/catalog-summary.json', 'utf8')) }),
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: { auth: false, supportEmail: 'support@artificials.net' },
    }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (route) => route.fulfill({ status: 503, json: {} }));
});

test('curriculum filters, lesson practice, quiz, downloads, and saved progress work together', async ({
  page,
}) => {
  await page.goto('/learn');
  await expect(page.locator('.module-lessons li')).toHaveCount(36);
  await page.getByRole('combobox', { name: 'Filter academy by topic' }).click();
  await page.getByRole('option', { name: /^Projects/ }).click();
  await expect(page.locator('.module-lessons li')).toHaveCount(4);
  await page.getByRole('searchbox', { name: 'Search academy lessons' }).fill('impossible-query');
  await expect(page.getByRole('heading', { name: 'No lessons found.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('link', { name: 'Start learning', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What AI actually does');
  await expect(
    page.getByRole('button', { name: 'Mark lesson complete', exact: true }),
  ).toBeDisabled();
  await page.getByRole('radio', { name: 'Sending a new prediction request', exact: true }).check();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.locator('.quiz-feedback')).toContainText('Not quite');
  await page
    .getByRole('radio', { name: 'Optimizing parameters on training examples', exact: true })
    .check();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.locator('.quiz-feedback')).toContainText('That’s right');
  await expect(
    page.getByRole('button', { name: 'Mark lesson complete', exact: true }),
  ).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I have worked through the practice task.' }).check();
  await page.getByRole('button', { name: 'Mark lesson complete', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Mark as incomplete', exact: true })).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .py', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('what-ai-actually-does.py');
  expect(readFileSync((await download.path())!, 'utf8')).toContain('def route(message):');
  await page.goto('/learn');
  await expect(page.locator('.academy-progress')).toContainText('1 / 36 completed');
  await page.getByRole('link', { name: 'Continue learning', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Define a useful AI task');
});

test('interactive labs calculate real outcomes and reset', async ({ page }) => {
  await page.goto('/learn/precision-recall-and-thresholds');
  await expect(page.locator('.lab-results')).toContainText('67%');
  await page.getByRole('slider', { name: 'Decision threshold', exact: true }).press('End');
  await expect(page.locator('.lab-results')).toContainText('N/A');
  await page.getByRole('button', { name: 'Reset lab', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Decision threshold', exact: true })).toHaveValue(
    '0.5',
  );
  await page.goto('/learn/neurons-and-activations');
  await expect(page.locator('.neuron-equation')).toContainText('0.668');
  await page.getByRole('slider', { name: 'Weight', exact: true }).press('Home');
  await expect(page.locator('.neuron-equation')).toContainText('0.198');
  await page.goto('/learn/not-a-lesson');
  await expect(page.getByRole('heading', { name: 'Lesson not found.' })).toBeVisible();
});

test('brand profiles use icons and public articles omit the byline and captions', async ({
  page,
}) => {
  await page.goto('/news/read-an-ai-benchmark');
  await expect(page.locator('.author-badge')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Official Artificials author' })).toHaveCount(0);
  await expect(page.locator('figcaption')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Artificials on Instagram' })).toHaveAttribute(
    'href',
    'https://www.instagram.com/artificialsnet',
  );
  await expect(page.getByRole('link', { name: 'Artificials on X', exact: true })).toHaveAttribute(
    'href',
    'https://x.com/artificialsnet',
  );
  await page.goto('/');
  await expect(page.locator('.hero-board-list li')).toHaveCount(5);
  // The home page credits each chart's data beside the chart, with no separate sources block.
  await expect(page.locator('.dash-method')).toHaveCount(0);
});

test('academy, lesson reader, and labs are accessible without horizontal page overflow', async ({
  page,
}) => {
  test.setTimeout(120000);
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of [
    '/learn',
    '/learn/precision-recall-and-thresholds',
    '/learn/project-local-ai-api-and-database',
  ]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect
      .soft(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
        route,
      )
      .toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      route,
    ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  }
});

test('selection controls keep readable labels inside their cards at every screen size', async ({
  page,
}) => {
  await page.goto('/learn/define-a-useful-ai-task');
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.quiz-option')).toHaveCount(3);
    for (const label of await page.locator('.quiz-option, .practice-confirm').all()) {
      const geometry = await label.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const input = el.querySelector('input')!.getBoundingClientRect();
        const text = el.querySelector('span')!.getBoundingClientRect();
        return {
          width: box.width,
          inputWidth: input.width,
          inputRight: input.right,
          textWidth: text.width,
          textLeft: text.left,
          textRight: text.right,
          right: box.right,
        };
      });
      expect(geometry.inputWidth, `control at ${width}px`).toBeLessThanOrEqual(20);
      expect(geometry.textWidth, `label at ${width}px`).toBeGreaterThan(geometry.width * 0.6);
      expect(geometry.textLeft).toBeGreaterThan(geometry.inputRight);
      expect(geometry.textRight).toBeLessThanOrEqual(geometry.right);
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('.quiz-option').nth(1).locator('span').click();
  await expect(page.getByRole('radio').nth(1)).toBeChecked();
  await page.locator('.practice-confirm span').click();
  await expect(page.getByRole('checkbox')).toBeChecked();
});
