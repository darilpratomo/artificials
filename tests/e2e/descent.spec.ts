import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
});

/** Opens the journey once its fonts are in, so every label is drawn in its final face. */
async function open(page: Page) {
  await page.goto('/how-ai-works');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Scrolls a section to where a reader reads it: a chapter's step on the reading line, or a pause's middle. */
async function read(page: Page, id: string, step?: number) {
  await page.locator(`#${id}`).evaluate((section, step) => {
    const element =
      step === undefined ? section : section.querySelectorAll('.dsc-step')[step as number];
    const box = element.getBoundingClientRect();
    const line = step !== undefined && innerWidth < 1024 ? 0.78 : 0.5;
    scrollTo({
      top: box.top + scrollY + box.height / 2 - innerHeight * line,
      behavior: 'instant',
    });
  }, step);
}

/** A section's canvas, by the section's id or, for the opening, its class. */
const canvas = (page: Page, id: string) =>
  page.locator(`${id.startsWith('.') ? id : `#${id}`} canvas`);

const fingerprint = (page: Page, id: string) =>
  canvas(page, id)
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL())
    .then((url) => createHash('sha256').update(url).digest('hex'));

/** How many different colours a picture shows: a blank canvas shows one. */
const colours = (page: Page, id: string) =>
  canvas(page, id).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    const seen = new Set<number>();
    for (let i = 0; i < data.length; i += 4 * 97)
      seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    return seen.size;
  });

/** Waits until a picture has stopped changing, and returns it. */
async function still(page: Page, id: string) {
  let last = '';
  await expect
    .poll(
      async () => {
        const now = await fingerprint(page, id);
        const same = now === last;
        last = now;
        return same;
      },
      { message: `${id} settles`, intervals: [300] },
    )
    .toBe(true);
  return last;
}

async function moving(page: Page, id: string) {
  const before = await fingerprint(page, id);
  await page.waitForTimeout(250);
  return before !== (await fingerprint(page, id));
}

test('the journey opens with its question and every picture draws', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource'))
      errors.push(message.text());
  });
  await open(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How AI works');
  await expect(page.locator('.dsc-prompt-text')).toHaveText('Why is the sky blue?');
  await expect.poll(() => colours(page, '.dsc-opening')).toBeGreaterThan(12);

  const chapters = await page
    .locator('.dsc-scene')
    .evaluateAll((sections) => sections.map((section) => section.id));
  const pauses = await page
    .locator('.dsc-interlude')
    .evaluateAll((sections) => sections.map((section) => section.id));
  expect(chapters).toHaveLength(20);
  expect(pauses).toHaveLength(4);
  await expect(page.locator('.dsc-count').first()).toHaveText('Chapter 1 of 20');
  for (const id of chapters) {
    await read(page, id, 1);
    await expect
      .poll(() => colours(page, id), { message: `${id} draws its picture` })
      .toBeGreaterThan(12);
  }
  for (const id of [...pauses, 'the-answer']) {
    await read(page, id);
    await expect
      .poll(() => colours(page, id), { message: `${id} draws its picture` })
      .toBeGreaterThan(12);
  }
  await expect(page.getByRole('heading', { name: 'That is how AI works.' })).toBeVisible();
  await expect(page.locator('.dsc-references li')).toHaveCount(15);
  expect(errors).toEqual([]);
});

test('each step is one fixed picture: still when motion is reduced, and the same on the way back', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(page.getByRole('button', { name: 'Reduced motion' })).toBeDisabled();
  for (const id of ['attention', 'data-centre', 'precision']) {
    await read(page, id, 1);
    await expect.poll(() => colours(page, id)).toBeGreaterThan(12);
    const first = await still(page, id);
    // Nothing moves by itself.
    await page.waitForTimeout(600);
    expect(await fingerprint(page, id), `${id} holds still`).toBe(first);
    // The next step is another picture; coming back draws the first again exactly.
    await read(page, id, 2);
    await expect.poll(() => fingerprint(page, id)).not.toBe(first);
    await read(page, id, 1);
    await expect.poll(() => fingerprint(page, id), { message: `${id} returns` }).toBe(first);
  }
});

test('the controls change their pictures and say what they chose', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);

  await read(page, 'prediction', 1);
  const warm = await still(page, 'prediction');
  const temperature = page.getByRole('slider', { name: 'Temperature' });
  await temperature.focus();
  await temperature.press('End');
  await expect(page.locator('#prediction output')).toHaveText('2.0');
  await expect.poll(() => fingerprint(page, 'prediction')).not.toBe(warm);

  await read(page, 'many-gpus', 0);
  const seventy = await still(page, 'many-gpus');
  await expect(page.getByRole('button', { name: '70B' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '405B' }).click();
  await expect(page.getByRole('button', { name: '405B' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '70B' })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => fingerprint(page, 'many-gpus')).not.toBe(seventy);

  await read(page, 'compute', 2);
  const all = await still(page, 'compute');
  const gpus = page.getByRole('slider', { name: 'GPUs' });
  await expect(page.locator('#compute output')).toHaveText('16,384: 11 weeks');
  await gpus.focus();
  await gpus.press('Home');
  await expect(page.locator('#compute output')).toHaveText('1: 3,520 years');
  await expect(gpus).toHaveAttribute('aria-valuetext', '1 GPU: about 3,520 years');
  await expect.poll(() => fingerprint(page, 'compute')).not.toBe(all);
});

test('the motion can be paused and resumed, and the rail follows the reader', async ({
  page,
}, info) => {
  await open(page);
  await read(page, 'layers', 2);
  await expect.poll(() => colours(page, 'layers')).toBeGreaterThan(12);
  await expect.poll(() => moving(page, 'layers'), { message: 'the picture moves' }).toBe(true);

  await page.getByRole('button', { name: 'Pause motion' }).click();
  await expect(page.getByRole('button', { name: 'Play motion' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const held = await still(page, 'layers');
  await page.waitForTimeout(600);
  expect(await fingerprint(page, 'layers'), 'the paused picture holds').toBe(held);

  await page.getByRole('button', { name: 'Play motion' }).click();
  await expect(page.getByRole('button', { name: 'Pause motion' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect.poll(() => moving(page, 'layers'), { message: 'it moves again' }).toBe(true);

  test.skip(info.project.name !== 'desktop', 'The rail shows on wide screens');
  const rail = page.getByRole('navigation', { name: 'Chapters' });
  await expect(rail.getByRole('link')).toHaveCount(20);
  await expect(rail.getByRole('link', { name: 'Layers' })).toHaveAttribute('aria-current', 'step');
  await rail.getByRole('link', { name: 'Memory' }).click();
  await expect(page).toHaveURL(/#memory$/);
  await expect(rail.getByRole('link', { name: 'Memory' })).toHaveAttribute('aria-current', 'step');
  await expect(rail.locator('[aria-current]')).toHaveCount(1);
});

test('the page fits every screen and passes an accessibility check', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  for (const [id, step] of [
    ['tokens', 0],
    ['tokens', 1],
  ] as const) {
    await read(page, id, step);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target)}`),
    ).toEqual([]);
  }
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 860 });
    for (const id of ['tokens', 'gpus', 'data-centre', 'judgment']) {
      await read(page, id, 2);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${id} fits ${width}px`,
      ).toBe(true);
      // The picture stays in place at the top while its words scroll.
      const stage = (await page.locator(`#${id} .dsc-stage`).boundingBox())!;
      expect(stage.width, `${id} picture at ${width}px`).toBeGreaterThan(200);
      expect(Math.abs(stage.y) < 100, `${id} picture held at ${width}px`).toBe(true);
    }
  }
});

test('the menu leads to the journey, the one guide to how AI works', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The header menus show on wide screens');
  await page.goto('/');
  const header = page.locator('header.site-header');
  await header.getByRole('button', { name: 'Resources', exact: true }).click();
  const menu = header.locator('.nav-group.is-open');
  await expect(menu.locator('a[href="/how-ai-works"]')).toContainText(
    'An animated journey down to the silicon',
  );
  await expect(menu.getByRole('link', { name: /How AI works/ })).toHaveCount(1);
});

test('the journey is prerendered, readable before any script runs', async ({ browser }) => {
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
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'index,follow,max-image-preview:large',
  );
  await expect(page).toHaveTitle(/^How AI works — An animated journey/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How AI works');
  await expect(page.locator('.dsc-scene')).toHaveCount(20);
  for (const title of ['Words become pieces', 'The real bottleneck', 'Inside the data centre'])
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
  await context.close();
});
