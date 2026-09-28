import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Race } from '../../shared/race';
import type { Scoring } from '../../shared/scoring';

const race = JSON.parse(readFileSync('public/data/models/race.json', 'utf8')) as Race;
const scoring = JSON.parse(readFileSync('public/data/models/scoring.json', 'utf8')) as Scoring;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForSelector('.dsc-outro');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Scrolls a section to where a reader reads it: a chapter's step on the reading line, or a pause's middle. */
async function read(page: Page, id: string, step?: number) {
  await page.locator(`#${id}`).evaluate((section, step) => {
    const element =
      step === undefined ? section : section.querySelectorAll('.dsc-step')[step as number];
    const box = element.getBoundingClientRect();
    const line = step !== undefined && innerWidth < 1024 ? 0.78 : 0.5;
    scrollTo({ top: box.top + scrollY + box.height / 2 - innerHeight * line, behavior: 'instant' });
  }, step);
}

const canvas = (page: Page, id: string) => page.locator(`#${id} canvas`);
const fingerprint = (page: Page, id: string) =>
  canvas(page, id)
    .evaluate((element) => (element as HTMLCanvasElement).toDataURL())
    .then((url) => createHash('sha256').update(url).digest('hex'));
/** How many different colours a picture shows: a blank canvas shows one. */
const colours = (page: Page, id: string) =>
  canvas(page, id).evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const { data } = target.getContext('2d')!.getImageData(0, 0, target.width, target.height);
    const seen = new Set<number>();
    for (let i = 0; i < data.length; i += 4 * 97)
      seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    return seen.size;
  });

async function everyPictureDraws(page: Page) {
  const ids = await page
    .locator('.dsc-scene, .dsc-interlude, .dsc-finale')
    .evaluateAll((sections) => sections.map((section) => section.id));
  for (const id of ids) {
    await read(page, id, (await page.locator(`#${id} .dsc-step`).count()) > 1 ? 1 : undefined);
    await expect
      .poll(() => colours(page, id), { message: `${id} draws its picture` })
      .toBeGreaterThan(12);
  }
}

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource'))
      errors.push(message.text());
  });
  return errors;
}

test('the AI race draws every picture and says what its data says', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/race');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The AI race');
  await expect(page.locator('.dsc-scene')).toHaveCount(6);
  await expect(page.locator('.dsc-interlude')).toHaveCount(1);
  await everyPictureDraws(page);
  const { facts } = race;
  await expect(page.locator('#records')).toContainText(
    `${facts.records} records by ${facts.holders} makers`,
  );
  await expect(page.locator('#records')).toContainText(facts.latest.name);
  if (facts.openLag)
    await expect(page.locator('#open')).toContainText(`${facts.openLag.months} months earlier`);
  if (facts.cheaper)
    await expect(page.locator('#price')).toContainText(
      `${Math.round(facts.cheaper.factor)} times cheaper`,
    );
  // The leaders link to their models.
  const leader = [...race.models].sort((a, b) => b.index - a.index)[0];
  if (leader.slug)
    await expect(
      page.locator('#field').getByRole('link', { name: leader.name, exact: true }),
    ).toHaveAttribute('href', `/models/${leader.slug}`);
  await expect(page.getByRole('heading', { name: 'Sources and method' })).toBeAttached();
  expect(errors).toEqual([]);
});

test('how AI benchmarks work draws every picture and shows real results', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/how-benchmarks-work');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How AI benchmarks work');
  await expect(page.locator('.dsc-scene')).toHaveCount(7);
  await expect(page.locator('.dsc-interlude')).toHaveCount(2);
  await everyPictureDraws(page);
  const best = scoring.gpqa.rows[0];
  await expect(page.locator('#hundreds')).toContainText(
    `${best.score.toFixed(1)}%, by ${best.name}`,
  );
  await expect(page.locator('#scale')).toContainText(`Today ${scoring.index.rows[0].name} leads`);
  await expect(page.locator('.dsc-references li')).toHaveCount(6);
  await expect(page.locator('.dsc-checks li')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('each step is one fixed picture: still, and the same on the way back', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [path, chapters] of [
    ['/race', ['records', 'price']],
    ['/how-benchmarks-work', ['question', 'votes']],
  ] as const) {
    await open(page, path);
    await expect(page.getByRole('button', { name: 'Reduced motion' })).toBeDisabled();
    for (const id of chapters) {
      await read(page, id, 1);
      await expect.poll(() => colours(page, id)).toBeGreaterThan(12);
      let first = '';
      await expect
        .poll(
          async () => {
            const now = await fingerprint(page, id);
            const same = now === first;
            first = now;
            return same;
          },
          { intervals: [300] },
        )
        .toBe(true);
      await page.waitForTimeout(500);
      expect(await fingerprint(page, id), `${id} holds still`).toBe(first);
      await read(page, id, 2);
      await expect.poll(() => fingerprint(page, id)).not.toBe(first);
      await read(page, id, 1);
      await expect.poll(() => fingerprint(page, id), { message: `${id} returns` }).toBe(first);
    }
  }
});

test('both pages pass an accessibility check and fit every width', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/race', '/how-benchmarks-work']) {
    await open(page, path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map(
        ({ id, nodes }) => `${path} ${id}: ${nodes.map((node) => node.target)}`,
      ),
    ).toEqual([]);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 860 });
      const first = await page.locator('.dsc-scene').first().getAttribute('id');
      await read(page, first!, 1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${path} fits ${width}px`,
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
});

test('the menus lead to both pages', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The header menus show on wide screens');
  await page.goto('/');
  const header = page.locator('header.site-header');
  await header.getByRole('button', { name: 'Analysis', exact: true }).click();
  await expect(header.locator('.nav-group.is-open a[href="/race"]')).toContainText('The AI race');
  await header.getByRole('button', { name: 'Resources', exact: true }).click();
  await expect(header.locator('.nav-group.is-open a[href="/how-benchmarks-work"]')).toContainText(
    'How AI benchmarks work',
  );
});

test('both pages are prerendered with their data, readable before any script runs', async ({
  browser,
}) => {
  test.skip(
    process.env.E2E_PRODUCTION !== '1',
    'Prerendered HTML is produced by the release build.',
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const [path, title, data, chapters] of [
    ['/race', 'The AI race', 'race-data', 6],
    ['/how-benchmarks-work', 'How AI benchmarks work', 'scoring-data', 7],
  ] as const) {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://artificials.net${path}`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index,follow,max-image-preview:large',
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('.dsc-scene')).toHaveCount(chapters);
    await expect(page.locator(`script#${data}`)).toHaveCount(1);
  }
  await context.close();
});
