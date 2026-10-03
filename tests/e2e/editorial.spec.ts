import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { EDITORIAL_VISUAL_LABS } from '../../shared/editorial-visual-labs';
import { EDITORIAL_VISUAL_STORIES } from '../../shared/editorial-visual-stories';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (r) => r.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (r) => r.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (r) => r.fulfill({ status: 503, json: {} }));
});

test('all seven visual guides retain full content and fit narrow screens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const article of [...EDITORIAL_VISUAL_STORIES, ...EDITORIAL_VISUAL_LABS]) {
    await page.goto('/news/' + article.slug);
    await expect(page.locator('h1')).toHaveText(article.title);
    await expect(page.locator('.article-visual')).toHaveCount(2);
    await page.locator('.article-hero-image img').evaluate((img: HTMLImageElement) => img.decode());
    for (const figure of await page.locator('.article-visual').all()) {
      await figure.scrollIntoViewIfNeeded();
      const bounds = await page.evaluate(() => ({
        viewport: innerWidth,
        doc: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(bounds.doc).toBeLessThanOrEqual(bounds.viewport);
      expect(bounds.body).toBeLessThanOrEqual(bounds.viewport);
    }
    const audit = await new AxeBuilder({ page }).include('.article-page').analyze();
    expect(audit.violations).toEqual([]);
  }
  await page.goto('/news/read-an-ai-benchmark');
  await expect(page.locator('.article-visual')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('budget and workload controls change real plotted values', async ({ page }) => {
  await page.goto('/news/visual-guide-model-price-capability-frontier');
  const slider = page.getByRole('slider', { name: 'Price ceiling per 1M total tokens' });
  await slider.focus();
  await slider.press('Home');
  await expect(page.locator('.av-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.locator('.article-visual').first()).toContainText('10 of 10');
  const prices = page.locator('.av-bars strong');
  const before = await prices.allTextContents();
  await page.getByRole('button', { name: '1:1 Balanced' }).click();
  await expect.poll(() => prices.allTextContents()).not.toEqual(before);
});

test('switching benchmark skills changes the ordered scores and preserves configurations', async ({
  page,
}) => {
  await page.goto('/news/visual-guide-benchmark-rankings-by-task');
  const figure = page.locator('.article-visual').first();
  const before = await figure.locator('.av-bars strong').allTextContents();
  await figure.getByRole('button', { name: 'Mathematics', exact: true }).click();
  await expect.poll(() => figure.locator('.av-bars strong').allTextContents()).not.toEqual(before);
  await expect(figure.locator('.av-bars li')).toHaveCount(8);
  await expect(figure).toContainText('score / 100');
});

test('manual stages, cache arithmetic and missing-evidence behavior are keyboard accessible', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/news/visual-guide-prefill-decode-kv-cache');
  await expect(page.getByRole('button', { name: 'Play sequence' })).toBeDisabled();
  const decode = page.getByRole('button', { name: '04 Decode' });
  await decode.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.av-explanation h4')).toHaveText('Choose the next continuation');
  await page.getByRole('slider', { name: 'Simultaneous sequences' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.av-cache-number output')).toContainText('2.00');
  await page.goto('/news/visual-guide-retrieval-evidence-answer');
  await page.getByRole('checkbox', { name: /Current standard policy/ }).uncheck();
  await expect(page.locator('.av-answer')).toContainText('EVIDENCE MISSING');
  await expect(page.locator('.av-answer')).not.toContainText('12 days');
  await page.getByRole('checkbox', { name: /Current standard policy/ }).check();
  await expect(page.locator('.av-answer')).toContainText('12 days');
});

test('scroll motion reverses and pauses when manual control takes over', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/news/visual-guide-prefill-decode-kv-cache');
  const process = page.locator('.av-process');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.article-hero-image img').evaluate((img: HTMLImageElement) => img.decode());
  await process.scrollIntoViewIfNeeded();
  await page
    .getByRole('button', { name: 'Follow scroll' })
    .evaluate((button: HTMLButtonElement) => {
      if (button.getAttribute('aria-pressed') !== 'true') button.click();
    });
  const position = await process.evaluate((el) => el.getBoundingClientRect().top + scrollY);
  await page.evaluate(
    (top) => window.scrollTo({ top: top - innerHeight * 0.5, behavior: 'instant' }),
    position,
  );
  await page.waitForTimeout(120);
  const start = Number(await process.getAttribute('data-progress'));
  await page.evaluate(() => window.scrollBy({ top: 180, behavior: 'instant' }));
  await expect
    .poll(async () => Number(await process.getAttribute('data-progress')))
    .toBeGreaterThan(start);
  await page.evaluate(() => window.scrollBy({ top: -180, behavior: 'instant' }));
  // Mobile fractional scroll offsets can round to a neighbouring percentage.
  await expect
    .poll(async () => Math.abs(Number(await process.getAttribute('data-progress')) - start))
    .toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: '03 Cache' }).click();
  await expect(process).toHaveAttribute('data-progress', '50');
  await page.evaluate(() => window.scrollBy({ top: 120, behavior: 'instant' }));
  await expect(process).toHaveAttribute('data-progress', '50');
});

test('sampling controls change eligibility and the draw is manually inspectable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/news/visual-lab-temperature-top-p-token-sampling');
  const threshold = page.getByRole('slider', { name: 'Top-p threshold' });
  await threshold.focus();
  await threshold.press('Home');
  await expect(page.locator('.visual-lab').first()).toContainText('1 of 6 tokens retained');
  await threshold.press('End');
  await expect(page.locator('.visual-lab').first()).toContainText('6 of 6 tokens retained');
  await expect(page.getByRole('button', { name: 'Play replay' })).toBeDisabled();
  const draw = page.getByRole('slider', { name: 'Draw position' });
  await draw.focus();
  await draw.press('End');
  await expect(page.locator('.vl-result > strong')).toHaveText('book');
  await draw.press('Home');
  await expect(page.locator('.vl-result > strong')).toHaveText('door');
});

test('vector metrics reorder the same candidates and normalization aligns rankings', async ({
  page,
}) => {
  await page.goto('/news/visual-lab-vector-similarity-search-geometry');
  const figure = page.locator('.visual-lab').nth(1);
  await expect(figure.locator('.av-status')).toContainText('Nearest candidate: B');
  await figure.getByRole('button', { name: 'Dot product', exact: true }).click();
  await expect(figure.locator('.av-status')).toContainText('Nearest candidate: A');
  await figure.getByRole('button', { name: 'Normalize candidates: off' }).click();
  await expect(figure.locator('.av-status')).toContainText('Nearest candidate: B');
  await figure.getByRole('button', { name: 'Euclidean', exact: true }).click();
  await expect(figure.locator('.av-status')).toContainText('Nearest candidate: B');
});

test('queue policies change completion and the replay reaches an exact finished state', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/news/visual-lab-ai-serving-queues-continuous-batching');
  await expect(page.getByLabel('Completion ticks')).toHaveText('14 ticks');
  await page.getByRole('button', { name: 'Fixed batches', exact: true }).click();
  await expect(page.getByLabel('Completion ticks')).toHaveText('18 ticks');
  const tick = page.getByRole('slider', { name: 'Queue tick' });
  await tick.focus();
  await tick.press('End');
  await expect(page.locator('.vl-job-card.completed')).toHaveCount(6);
  await tick.press('Home');
  await expect(page.locator('.vl-job-card.active')).toHaveCount(2);
  await expect(page.locator('.vl-job-card.waiting')).toHaveCount(4);
});
