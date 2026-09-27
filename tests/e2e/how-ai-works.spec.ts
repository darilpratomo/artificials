import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/catalog/summary', (route) =>
    route.fulfill({ json: JSON.parse(readFileSync('public/data/catalog-summary.json', 'utf8')) }),
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { auth: false, supportEmail: 'support@artificials.net' } }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (route) => route.fulfill({ status: 503, json: {} }));
});

test('the journey connects interactive representations, generation, training and evidence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/how-ai-works');
  // WebKit's native smooth auto-scroll can outlast a locator click when moving
  // several chapters at once. Keep ambient/interactive animation enabled while
  // testing the controls; chapter-link scrolling is covered separately below.
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inside theintelligence.');
  await expect(page.locator('.ai-chapter')).toHaveCount(8);
  await page.getByRole('link', { name: 'Enter the model' }).click();
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(page.locator('.ai-input-sentence')).toHaveText('print("Hello, world!")');
  await page.getByRole('button', { name: 'Inspect token 3: Hello', exact: true }).click();
  await expect(page.locator('.ai-token-inspect strong')).toHaveText('Hello');
  await page.getByRole('button', { name: 'A savings bank', exact: true }).click();
  await expect(page.locator('.ai-semantic-map')).toHaveAttribute(
    'aria-label',
    /deposit, money, and account/,
  );
  await page.locator('.ai-word-line button').first().click();
  await expect(
    page.locator('.ai-attention-weights').getByText('100%', { exact: true }),
  ).toBeVisible();
  const temperature = page.getByRole('slider', { name: /Temperature/ });
  await temperature.focus();
  await temperature.press('End');
  await expect(temperature).toHaveValue('2');
  await expect(page.locator('.ai-probabilities strong').first()).toContainText('43.7');
  await page.getByRole('button', { name: 'Draw a token', exact: true }).click();
  await expect(page.locator('.ai-draw-result')).toContainText('Draw 1:');
  await expect(page.locator('.ai-probabilities .is-drawn')).toHaveCount(1);
  const loss = page.getByTestId('training-loss');
  const before = Number(await loss.textContent());
  await page.getByRole('button', { name: 'Take a learning step', exact: true }).click();
  expect(Number(await loss.textContent())).toBeLessThan(before);
  await page.getByRole('button', { name: 'Reset training', exact: true }).click();
  await expect(loss).toHaveText(before.toFixed(4));
  await page.getByRole('button', { name: 'Add a source', exact: true }).click();
  await expect(page.locator('.ai-answer-card')).toContainText('09:00 on Wednesdays');
  await page.getByRole('button', { name: /Usually no/ }).click();
  await expect(page.locator('.ai-check-feedback').first()).toContainText('Exactly.');
  await page.getByRole('button', { name: /probability is a fact-checking score/ }).click();
  await expect(page.locator('.ai-check-feedback').nth(1)).toContainText('Take another look.');
  await page.getByRole('button', { name: /Not necessarily/ }).click();
  await expect(page.locator('.ai-check-feedback').nth(1)).toContainText('Exactly.');
  await page.getByRole('button', { name: /No. The application/ }).click();
  await expect(page.locator('.ai-check-options .is-correct')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('keyboard controls, motion preferences and responsive layout remain usable', async ({
  page,
}) => {
  await page.goto('/how-ai-works');
  const motion = page.locator('.ai-motion-control');
  await motion.click();
  await expect(page.locator('.ai-story')).toHaveAttribute('data-paused', 'true');
  await motion.click();
  await expect(page.locator('.ai-story')).toHaveAttribute('data-paused', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(motion).toBeDisabled();
  await expect(page.locator('.ai-story')).toHaveAttribute('data-paused', 'true');
  expect(
    await page.locator('.ai-core-sphere svg').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.locator('.ai-story-controls a[href="#learning"]').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#learning$/);
  await expect(page.locator('.ai-story-controls a[href="#learning"]')).toHaveAttribute(
    'aria-current',
    'step',
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  const results = await new AxeBuilder({ page })
    .include('.ai-story')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('the complete chapter text and canonical link are available without JavaScript', async ({
  browser,
}) => {
  test.skip(
    process.env.E2E_PRODUCTION !== '1',
    'Prerendered HTML is produced by the release build.',
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/how-ai-works');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://artificials.net/how-ai-works',
  );
  await expect(page.locator('.ai-chapter')).toHaveCount(8);
  await expect(page.getByRole('heading', { name: /Human judgment/ })).toBeVisible();
  await context.close();
});
