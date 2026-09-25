import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LOGO_MATRIX } from '../../src/components/logo-matrix';

// Merged horizontal runs, so the count follows the artwork rather than a stale
// hard-coded number.
const RUN_COUNT = LOGO_MATRIX.reduce((total, row) => total + (row.match(/1+/g)?.length ?? 0), 0);

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
  await page.route('**/api/articles', (route) => route.fulfill({ json: { articles: [] } }));
});

test('header mark is drawn from the matrix and assembles into place', async ({ page }) => {
  await page.goto('/');
  const mark = page.locator('.site-header svg.pixel-logo');
  await expect(mark).toBeVisible();
  // Every block comes from the matrix; no empty cell may draw one.
  await expect(mark.locator('.pixel-block')).toHaveCount(RUN_COUNT);

  // It settles at the identity transform, fully opaque and in its grid cell.
  await expect
    .poll(
      async () => {
        const state = await mark
          .locator('rect')
          .first()
          .evaluate((el) => {
            const style = getComputedStyle(el);
            const matrix = style.transform;
            if (matrix === 'none') return { drift: 0, opacity: Number(style.opacity) };
            const [a, b, c, d, tx, ty] = matrix
              .slice(matrix.indexOf('(') + 1, -1)
              .split(',')
              .map(Number);
            return {
              drift: Math.max(
                Math.abs(a - 1),
                Math.abs(b),
                Math.abs(c),
                Math.abs(d - 1),
                Math.abs(tx),
                Math.abs(ty),
              ),
              opacity: Number(style.opacity),
            };
          });
        return state.drift < 0.01 && state.opacity > 0.99;
      },
      { timeout: 6000 },
    )
    .toBe(true);

  // The mark is square and does not distort the header lockup.
  const box = (await mark.boundingBox())!;
  expect(Math.abs(box.width - box.height)).toBeLessThan(1.5);
});

test('the mark disperses and reassembles on its own', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  const block = page.locator('.site-header svg.pixel-logo .pixel-block').first();
  const opacity = async () => Number(await block.evaluate((el) => getComputedStyle(el).opacity));

  // Wait out the first assembly.
  await expect.poll(opacity, { timeout: 8000 }).toBeGreaterThan(0.99);
  // The exit animation must dim the blocks again.
  await expect.poll(opacity, { timeout: 20000, intervals: [100] }).toBeLessThan(0.6);
  // And the next cycle must bring them back, so the motion is a loop rather
  // than a one-way fade that leaves the logo missing.
  await expect.poll(opacity, { timeout: 12000, intervals: [100] }).toBeGreaterThan(0.99);
});

test('the mark can be saved like any other logo image', async ({ page }) => {
  await page.goto('/');
  // Browsers only offer "Save image as" and long-press save on a real <img>.
  const file = page.locator('.site-header .pixel-logo-file');
  await expect(file).toHaveAttribute('src', '/brand/artificials-logo.png');
  // Comfortably larger than it is displayed, so a saved copy stays sharp, while
  // staying small enough that the page does not pay for a print-size file.
  await expect
    .poll(() => file.evaluate((el) => (el as HTMLImageElement).naturalWidth), { timeout: 8000 })
    .toBeGreaterThan(200);
  // It must cover the mark so a right-click lands on the image, not the page.
  const markBox = (await page.locator('.site-header svg.pixel-logo').boundingBox())!;
  const fileBox = (await file.boundingBox())!;
  expect(Math.abs(fileBox.width - markBox.width)).toBeLessThan(2);
  expect(Math.abs(fileBox.height - markBox.height)).toBeLessThan(2);

  // The downloadable file must really be a PNG, not a stale or missing path.
  const response = await page.request.get('/brand/artificials-logo.png');
  expect(response.status()).toBe(200);
  expect([...(await response.body()).subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
});

test('the wordmark uses the brand face', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.brand-name').first()).toHaveCSS(
    'font-family',
    'Michroma, Sora, sans-serif',
  );
  // The face must really load, not silently fall back.
  expect(await page.evaluate(() => document.fonts.check('16px Michroma'))).toBe(true);
});

test('reduced motion shows the finished mark with no animation', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  await page.goto('/');
  const block = page.locator('.site-header svg.pixel-logo .pixel-block').first();
  await expect(block).toBeAttached();
  const state = await block.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      opacity: Number(style.opacity),
      transform: style.transform,
      transition: style.transitionProperty,
    };
  });
  expect(state.opacity).toBe(1);
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(state.transform);
  expect(state.transition).toBe('none');
  await context.close();
});

test('blocks travel from scattered positions rather than only fading', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  const blocks = page.locator('.site-header svg.pixel-logo .pixel-block');
  await blocks.first().waitFor({ state: 'attached' });

  // Mid-flight the blocks must sit away from their final cells. A fade-only
  // animation would leave every transform at the identity.
  let widest = 0;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const offset = await blocks
      .evaluateAll((els) => {
        let furthest = 0;
        for (const el of els) {
          const matrix = getComputedStyle(el).transform;
          if (!matrix.startsWith('matrix')) continue;
          const values = matrix
            .slice(matrix.indexOf('(') + 1, -1)
            .split(',')
            .map(Number);
          const [tx, ty] = values.length === 16 ? [values[12], values[13]] : [values[4], values[5]];
          furthest = Math.max(furthest, Math.hypot(tx, ty));
        }
        return furthest;
      })
      .catch(() => 0);
    if (offset > widest) widest = offset;
    if (widest > 3) break;
    await page.waitForTimeout(20);
  }
  expect(widest).toBeGreaterThan(3);
});

test('the settled mark carries no leftover transform', async ({ page }) => {
  await page.goto('/');
  const blocks = page.locator('.site-header svg.pixel-logo .pixel-block');
  await blocks.first().waitFor({ state: 'attached' });

  // A block left with a transform keeps its own compositing layer, which shows
  // as hairline seams between rows, so every block must end with none.
  await expect
    .poll(
      async () =>
        blocks.evaluateAll((els) =>
          els.every((el) => {
            const style = getComputedStyle(el);
            return style.transform === 'none' && Number(style.opacity) > 0.99;
          }),
        ),
      { timeout: 8000 },
    )
    .toBe(true);
});

test('no frame shows the finished mark before the assembly starts', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  // Watch from the very first paint, including the prerendered markup that is
  // on screen before React takes over. That frame caused a visible flash.
  await page.addInitScript(() => {
    const frames: number[] = [];
    (window as unknown as { __frames: number[] }).__frames = frames;
    let ticks = 0;
    const tick = () => {
      const svg = document.querySelector('.site-header svg.pixel-logo');
      // Before React runs, the mark is plain <rect> elements; afterwards it is
      // <g class="pixel-block"> wrappers. Both must stay dim until the
      // assembly begins, so sample whichever is currently on screen.
      const shape = svg?.querySelector('.pixel-block') ?? svg?.querySelector(':scope > rect');
      if (shape) frames.push(Number(getComputedStyle(shape).opacity));
      if ((ticks += 1) < 40) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/');
  await page.waitForTimeout(900);
  const frames = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames);
  expect(frames.length).toBeGreaterThan(3);
  // Nothing may be fully painted until the blocks start arriving. A flash shows
  // as an opaque frame before the first block has begun to fade in.
  const firstArrival = frames.findIndex((value) => value > 0.05);
  const beforeArrival = firstArrival < 0 ? frames : frames.slice(0, firstArrival);
  expect(Math.max(0, ...beforeArrival)).toBeLessThan(0.5);
});

test('prerendered HTML carries the finished mark, not an animation frame', async ({ page }) => {
  // Visitors and crawlers see this markup before any JavaScript runs, so it
  // must hold the complete logo rather than a scattered starting state.
  const response = await page.request.get('/');
  const html = await response.text();
  expect(html).toContain('is-assembled');
  // The static markup holds the complete mark, never a mid-animation frame.
  expect(html).not.toContain('is-animated');
  // It is hidden from the first paint so the finished logo never flashes, and
  // a no-JavaScript visitor still sees it through the scripting:none fallback.
  expect(html).toContain('data-animates');
});

test('the logo still renders with JavaScript unavailable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  // The hold-until-ready rule targets elements only React creates, so the
  // static markup must still paint the complete mark for these visitors.
  const mark = page.locator('.site-header svg.pixel-logo');
  await expect(mark).toBeVisible();
  await expect(page.locator('.site-header svg.pixel-logo rect')).toHaveCount(RUN_COUNT);
  const box = (await mark.boundingBox())!;
  expect(box.width).toBeGreaterThan(20);
  await context.close();
});

test('blocks arrive in a continuous flow, with no lone flash', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  // Record how many blocks are visible on each frame. An uneven stagger lets
  // one block land far ahead of the rest, which reads as a blink followed by a
  // pause before the animation appears to start.
  await page.addInitScript(() => {
    const samples: number[][] = [];
    (window as unknown as { __arrivals: number[][] }).__arrivals = samples;
    const start = performance.now();
    const tick = () => {
      const svg = document.querySelector('.site-header svg.pixel-logo');
      if (svg) {
        const shapes = [...svg.querySelectorAll('.pixel-block, :scope > rect')];
        const visible = shapes.filter(
          (shape) => Number(getComputedStyle(shape).opacity) > 0.5,
        ).length;
        samples.push([Math.round(performance.now() - start), visible]);
      }
      if (samples.length < 70) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/');
  await page.waitForTimeout(1600);
  const samples = await page.evaluate(
    () => (window as unknown as { __arrivals: number[][] }).__arrivals,
  );

  const arriving = samples.filter(([, visible]) => visible > 0);
  expect(arriving.length).toBeGreaterThan(3);
  let longestPause = 0;
  for (let index = 1; index < arriving.length; index += 1) {
    if (arriving[index][1] > arriving[index - 1][1]) {
      longestPause = Math.max(longestPause, arriving[index][0] - arriving[index - 1][0]);
    }
  }
  // Blocks should keep arriving every frame or two, never stall for ~5 frames.
  expect(longestPause).toBeLessThan(60);
});

test('the brand mark costs very little to download', async ({ page }) => {
  const bytes: number[] = [];
  page.on('response', async (response) => {
    // Artificials' own mark only; model makers' logos live under /providers/.
    if (/^\/brand\/|favicon/.test(new URL(response.url()).pathname)) {
      try {
        bytes.push((await response.body()).length);
      } catch {
        /* Some responses cannot be read; they are not brand assets. */
      }
    }
  });
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const total = bytes.reduce((sum, value) => sum + value, 0);
  // The previous raster logos cost about 36 KB per visit. Drawing the mark from
  // the matrix should keep this far below that.
  expect(total).toBeLessThan(8000);
});

test('the resting mark is one solid shape, so no seams show between rows', async ({ page }) => {
  await page.goto('/');
  const mark = page.locator('.site-header svg.pixel-logo');
  const solid = mark.locator('.pixel-solid');
  await expect(solid).toHaveCount(1);
  await expect
    .poll(() => mark.evaluate((el) => el.classList.contains('is-settled')), { timeout: 6000 })
    .toBe(true);
  expect(await solid.evaluate((el) => getComputedStyle(el).visibility)).toBe('visible');
  expect(
    await mark
      .locator('.pixel-block')
      .first()
      .evaluate((el) => getComputedStyle(el).visibility),
  ).toBe('hidden');
});
