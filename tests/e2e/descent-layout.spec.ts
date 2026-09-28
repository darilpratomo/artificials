import { test, expect, type Browser } from '@playwright/test';

/**
 * Every picture in How AI works is drawn on a canvas, where the browser cannot
 * see overlapping or clipped words. These tests record what each picture draws
 * (every piece of text and every box, in CSS pixels, from its latest frame) and
 * check that, at phone, tablet and desktop sizes, no text runs off the picture,
 * lands on other text, straddles the edge of a box or hides under the controls.
 */

interface Mark {
  kind: 'text' | 'box';
  text?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  alpha: number;
}

/** Runs in the page before any script: wraps the canvas calls that draw text and boxes. */
function instrument() {
  const draws = new Map<HTMLCanvasElement, Mark[]>();
  (window as unknown as { __dscDraws: typeof draws }).__dscDraws = draws;
  const proto = CanvasRenderingContext2D.prototype;
  type Path = {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    moves: number;
    arcs: number;
    rects: number;
    other: number;
  };
  const paths = new WeakMap<CanvasRenderingContext2D, Path>();
  const alphaOf = (style: unknown) => {
    if (typeof style !== 'string') return 1;
    const match = style.match(/^rgba\(([^)]+)\)/);
    return match ? Number(match[1].split(',')[3]) : 1;
  };
  const toCss = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const m = ctx.getTransform();
    const dpr = ctx.canvas.width / (ctx.canvas.clientWidth || ctx.canvas.width);
    return [(m.a * x + m.c * y + m.e) / dpr, (m.b * x + m.d * y + m.f) / dpr];
  };
  const box = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
    const points = [toCss(ctx, x0, y0), toCss(ctx, x1, y0), toCss(ctx, x0, y1), toCss(ctx, x1, y1)];
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  };
  // What a clip leaves visible: boxes are cut to it, and text wholly outside it is not drawn.
  type Area = { x0: number; y0: number; x1: number; y1: number } | null;
  const clips = new WeakMap<CanvasRenderingContext2D, Area>();
  const saved = new WeakMap<CanvasRenderingContext2D, Area[]>();
  const push = (ctx: CanvasRenderingContext2D, mark: Mark) => {
    if (!ctx.canvas.isConnected) return;
    const clip = clips.get(ctx);
    if (clip) {
      const x0 = Math.max(mark.x, clip.x0);
      const y0 = Math.max(mark.y, clip.y0);
      const x1 = Math.min(mark.x + mark.w, clip.x1);
      const y1 = Math.min(mark.y + mark.h, clip.y1);
      if (x1 <= x0 || y1 <= y0) return;
      if (mark.kind === 'box') mark = { ...mark, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    draws.get(ctx.canvas)?.push(mark);
  };
  const extend = (
    ctx: CanvasRenderingContext2D,
    kind: 'moves' | 'arcs' | 'rects' | 'other',
    ...xy: number[]
  ) => {
    const path = paths.get(ctx);
    if (!path) return;
    path[kind] += 1;
    for (let i = 0; i < xy.length; i += 2) {
      const [x, y] = toCss(ctx, xy[i], xy[i + 1]);
      path.x0 = Math.min(path.x0, x);
      path.y0 = Math.min(path.y0, y);
      path.x1 = Math.max(path.x1, x);
      path.y1 = Math.max(path.y1, y);
    }
  };
  const wrap = <K extends keyof CanvasRenderingContext2D>(
    name: K,
    before: (ctx: CanvasRenderingContext2D, ...args: number[]) => void,
  ) => {
    const original = proto[name] as unknown as (...args: unknown[]) => unknown;
    (proto as unknown as Record<string, unknown>)[name] = function (
      this: CanvasRenderingContext2D,
      ...args: unknown[]
    ) {
      before(this, ...(args as number[]));
      return original.apply(this, args);
    };
  };
  // A frame starts when the whole canvas is cleared.
  wrap('clearRect', (ctx, x, y) => {
    if (x === 0 && y === 0 && ctx.canvas.isConnected) draws.set(ctx.canvas, []);
  });
  wrap('save', (ctx) => {
    if (!saved.has(ctx)) saved.set(ctx, []);
    saved.get(ctx)!.push(clips.get(ctx) ?? null);
  });
  wrap('restore', (ctx) => clips.set(ctx, saved.get(ctx)?.pop() ?? null));
  wrap('clip', (ctx) => {
    const path = paths.get(ctx);
    if (!path) return;
    const clip = clips.get(ctx);
    clips.set(ctx, {
      x0: Math.max(path.x0, clip?.x0 ?? -Infinity),
      y0: Math.max(path.y0, clip?.y0 ?? -Infinity),
      x1: Math.min(path.x1, clip?.x1 ?? Infinity),
      y1: Math.min(path.y1, clip?.y1 ?? Infinity),
    });
  });
  wrap('beginPath', (ctx) =>
    paths.set(ctx, {
      x0: Infinity,
      y0: Infinity,
      x1: -Infinity,
      y1: -Infinity,
      moves: 0,
      arcs: 0,
      rects: 0,
      other: 0,
    }),
  );
  wrap('moveTo', (ctx, x, y) => extend(ctx, 'moves', x, y));
  wrap('lineTo', (ctx, x, y) => extend(ctx, 'other', x, y));
  wrap('arcTo', (ctx, x1, y1, x2, y2) => extend(ctx, 'arcs', x1, y1, x2, y2));
  wrap('rect', (ctx, x, y, w, h) => extend(ctx, 'rects', x, y, x + w, y + h));
  wrap('arc', (ctx, x, y, r) => extend(ctx, 'other', x - r, y - r, x + r, y + r));
  // Rounded rectangles (one move and four corners) and rectangles count as boxes.
  const shape = (ctx: CanvasRenderingContext2D, style: unknown) => {
    const path = paths.get(ctx);
    if (
      !path ||
      path.other ||
      !((path.moves === 1 && path.arcs === 4) || (path.rects === 1 && !path.moves))
    )
      return;
    push(ctx, {
      kind: 'box',
      x: path.x0,
      y: path.y0,
      w: path.x1 - path.x0,
      h: path.y1 - path.y0,
      alpha: ctx.globalAlpha * alphaOf(style),
    });
  };
  wrap('fill', (ctx) => shape(ctx, ctx.fillStyle));
  wrap('stroke', (ctx) => shape(ctx, ctx.strokeStyle));
  wrap('fillRect', (ctx, x, y, w, h) =>
    push(ctx, {
      kind: 'box',
      ...box(ctx, x, y, x + w, y + h),
      alpha: ctx.globalAlpha * alphaOf(ctx.fillStyle),
    }),
  );
  wrap('strokeRect', (ctx, x, y, w, h) =>
    push(ctx, {
      kind: 'box',
      ...box(ctx, x, y, x + w, y + h),
      alpha: ctx.globalAlpha * alphaOf(ctx.strokeStyle),
    }),
  );
  const fillText = proto.fillText;
  proto.fillText = function (
    this: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth?: number,
  ) {
    const m = this.measureText(text);
    push(this, {
      kind: 'text',
      text,
      ...box(
        this,
        x - m.actualBoundingBoxLeft,
        y - m.actualBoundingBoxAscent,
        x + m.actualBoundingBoxRight,
        y + m.actualBoundingBoxDescent,
      ),
      alpha: this.globalAlpha * alphaOf(this.fillStyle),
    });
    return maxWidth === undefined
      ? fillText.call(this, text, x, y)
      : fillText.call(this, text, x, y, maxWidth);
  };
}

/** What is wrong with one frame of one picture, in words. */
function problems(marks: Mark[], width: number, height: number, controls: Mark | null) {
  const found: string[] = [];
  const texts = marks.filter((mark) => mark.kind === 'text' && mark.alpha >= 0.35 && mark.w > 0);
  const boxes = marks.filter(
    (mark) =>
      mark.kind === 'box' &&
      mark.alpha >= 0.3 &&
      mark.w >= 8 &&
      mark.h >= 8 &&
      !(mark.w >= width * 0.9 && mark.h >= height * 0.9),
  );
  const overlap = (a: Mark, b: Mark) =>
    Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inside = (a: Mark, b: Mark) =>
    a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1;
  const name = (mark: Mark) => `“${mark.text}”`;
  texts.forEach((text, index) => {
    if (text.x < -1 || text.y < -1 || text.x + text.w > width + 1 || text.y + text.h > height + 1)
      found.push(`${name(text)} runs off the picture`);
    for (const other of texts.slice(index + 1)) {
      const same =
        other.text === text.text &&
        Math.abs(other.x - text.x) < 1 &&
        Math.abs(other.y - text.y) < 1;
      if (!same && overlap(text, other) > 6) found.push(`${name(text)} overlaps ${name(other)}`);
    }
    // Text belongs inside a box or clear of it, never across its edge, nor
    // over a good part of a small one, such as a tile in a row.
    for (const shape of boxes)
      if (
        !inside(text, shape) &&
        (overlap(text, shape) > text.w * text.h * 0.15 ||
          overlap(text, shape) > shape.w * shape.h * 0.2)
      )
        found.push(
          `${name(text)} straddles a box at ${Math.round(shape.x)},${Math.round(shape.y)}`,
        );
    if (controls && overlap(text, controls) > 4) found.push(`${name(text)} is under the controls`);
  });
  return [...new Set(found)];
}

/** The pages of moving pictures. */
const PAGES = ['/how-ai-works', '/how-benchmarks-work', '/race'];

/**
 * Visits every chapter's steps with motion reduced, or, with `between`, the
 * midpoints between its steps with the pictures moving, where one part of a
 * picture gives way to the next. It also checks that no picture slips under
 * the site's header.
 */
async function audit(
  browser: Browser,
  path: string,
  width: number,
  height: number,
  between = false,
) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: between ? 'no-preference' : 'reduce',
  });
  const page = await context.newPage();
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.addInitScript(instrument);
  await page.route('**/api/config', (route) => route.fulfill({ json: { auth: false } }));
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.goto(path);
  await page.waitForSelector('.dsc-outro');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const chapters = await page
    .locator('.dsc-scene')
    .evaluateAll((sections) =>
      sections.map((s) => [s.id, s.querySelectorAll('.dsc-step').length] as const),
    );
  const report: string[] = [];
  for (const [id, steps] of chapters) {
    const places = between
      ? Array.from({ length: steps - 1 }, (_, step) => step + 0.5)
      : Array.from({ length: steps }, (_, step) => step);
    for (const place of places) {
      const result = await page.locator(`#${id}`).evaluate(async (section, place) => {
        const centres = [...section.querySelectorAll('.dsc-step')].map((step) => {
          const box = step.getBoundingClientRect();
          return box.top + scrollY + box.height / 2;
        });
        const step = Math.floor(place);
        const centre =
          centres[step] + ((centres[step + 1] ?? centres[step]) - centres[step]) * (place - step);
        const line = innerWidth < 1024 ? 0.78 : 0.5;
        const canvas = section.querySelector('canvas')!;
        const draws = (window as unknown as { __dscDraws: Map<HTMLCanvasElement, unknown[]> })
          .__dscDraws;
        draws.delete(canvas);
        scrollTo({ top: centre - innerHeight * line, behavior: 'instant' });
        // Wait for the picture to be drawn at its new place, and, while it
        // moves, to glide there.
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        for (let tries = 0; tries < 90 && !draws.has(canvas); tries++) {
          dispatchEvent(new Event('resize'));
          await frame();
        }
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
          await new Promise((resolve) => setTimeout(resolve, 700));
        await frame();
        const picture = canvas.getBoundingClientRect();
        const controls = section.querySelector('.dsc-controls > *')?.getBoundingClientRect();
        const header = document.querySelector('header.site-header')?.getBoundingClientRect();
        return {
          covered: header && header.bottom > 0 ? Math.round(header.bottom - picture.top) : 0,
          marks: draws.get(canvas) ?? [],
          width: picture.width,
          height: picture.height,
          controls: controls
            ? {
                kind: 'box',
                x: controls.left - picture.left,
                y: controls.top - picture.top,
                w: controls.width,
                h: controls.height,
                alpha: 1,
              }
            : null,
        };
      }, place);
      if (result.covered > 1)
        report.push(
          `${path} ${width}×${height} ${id} step ${place + 1}: the header covers the picture’s top by ${result.covered}px`,
        );
      for (const problem of problems(
        result.marks as Mark[],
        result.width,
        result.height,
        result.controls as Mark | null,
      ))
        report.push(`${path} ${width}×${height} ${id} step ${place + 1}: ${problem}`);
    }
  }
  await context.close();
  return report;
}

for (const [width, height] of [
  [360, 640],
  [375, 548],
  [390, 664],
  [430, 740],
  [768, 1024],
  [1024, 768],
  [1280, 720],
  [1440, 900],
]) {
  test(`every picture keeps its words clear at ${width}×${height}`, async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'Each size is set here; one project is enough');
    test.setTimeout(120_000);
    const report = (
      await Promise.all(PAGES.map((path) => audit(browser, path, width, height)))
    ).flat();
    expect(report, report.join('\n')).toEqual([]);
  });
}

for (const path of PAGES)
  test(`${path}: the pictures stay clear between their steps, while they move, on a phone`, async ({
    browser,
  }, info) => {
    test.skip(info.project.name !== 'desktop', 'The size is set here; one project is enough');
    test.setTimeout(180_000);
    const report = await audit(browser, path, 390, 664, true);
    expect(report, report.join('\n')).toEqual([]);
  });
