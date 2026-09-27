import type { Draw } from '../engine';
import {
  CATEGORIES,
  HUE,
  INK,
  additive,
  dotGrid,
  easeInOut,
  glow,
  label,
  lerp,
  random,
  rgba,
  roundRect,
  span,
  spectrum,
  wash,
} from '../kit';

/**
 * Matrix multiplication, the operation under all the rest: one cell at a time,
 * slowly; then every remaining cell at once, as a GPU does; then at a real
 * layer's size.
 */
export function createMatmul(): Draw {
  const next = random(5);
  const A = Array.from({ length: 4 }, () =>
    Array.from({ length: 6 }, () => Math.floor(next() * 10)),
  );
  const B = Array.from({ length: 6 }, () =>
    Array.from({ length: 4 }, () => Math.floor(next() * 10)),
  );
  const C = A.map((row) =>
    B[0].map((_, j) => row.reduce((sum, value, k) => sum + value * B[k][j], 0)),
  );
  // The first row is worked one cell after another: the first slowly, to be
  // followed, the rest quicker.
  const BOUNDS = [0, 0.6, 0.75, 0.88, 1];

  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.55, h * 0.55, Math.max(w, h) * 0.6, spectrum(0.58), 0.13);

    const serial = span(p, 0.06, 0.52);
    const parallel = easeInOut(span(p, 0.54, 0.66));
    const grow = easeInOut(span(p, 0.74, 0.96));

    const s = Math.min(w / 12.5, h / 12.5, 56);
    const gap = s * 0.6;
    const total = 10 * s + gap;
    const x0 = w / 2 - total / 2;
    const y0 = h / 2 - total / 2 + s * 0.3;
    const ax = x0;
    const ay = y0 + 6 * s + gap;
    const bx = x0 + 6 * s + gap;
    const by = y0;
    const cx = bx;
    const cy = ay;

    const fade = 1 - grow;
    // At the end the three matrices become huge grids of cells.
    if (grow > 0) {
      const cells = 72;
      const size = Math.min(w, h) * 0.8;
      const left = w / 2 - size / 2;
      const top = h / 2 - size / 2 + 10;
      const tiny = size / cells;
      const light = random(8);
      for (let r = 0; r < cells; r++)
        for (let c = 0; c < cells; c++) {
          const value = light();
          const shimmer = 0.5 + 0.5 * Math.sin(t * 2 + (r * 7 + c * 3) * 0.3);
          ctx.fillStyle = rgba(
            spectrum(0.55 + value * 0.12),
            grow * (0.12 + value * 0.3 + shimmer * 0.12),
          );
          ctx.fillRect(left + c * tiny, top + r * tiny, tiny - 1, tiny - 1);
        }
      label(ctx, 'a real layer: thousands of rows and columns', w / 2, top - 18, {
        size: 13,
        color: INK.silver,
        align: 'center',
        alpha: grow,
      });
    }
    if (fade <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = fade;

    const grid = (
      matrix: number[][],
      x: number,
      y: number,
      highlight: (r: number, c: number) => number,
      color: string,
      name: string,
    ) => {
      matrix.forEach((row, r) =>
        row.forEach((value, c) => {
          const lit = highlight(r, c);
          roundRect(ctx, x + c * s + 2, y + r * s + 2, s - 4, s - 4, s * 0.16);
          ctx.fillStyle = rgba(INK.panel, 1);
          ctx.fill();
          ctx.fillStyle = rgba(color, 0.08 + lit * 0.5);
          ctx.fill();
          ctx.strokeStyle = rgba(color, 0.3 + lit * 0.6);
          ctx.lineWidth = 1;
          ctx.stroke();
          label(ctx, String(value), x + c * s + s / 2, y + r * s + s / 2, {
            size: Math.round(s * 0.36),
            face: 'mono',
            color: INK.white,
            align: 'center',
            alpha: 0.6 + lit * 0.4,
          });
        }),
      );
      label(ctx, name, x, y - 14, { size: 12.5, color: INK.silver });
    };

    // Which output cell of the first row is being worked, and how far.
    let cell = 0;
    while (cell < 3 && serial >= BOUNDS[cell + 1]) cell += 1;
    const within = serial >= 1 ? 1 : span(serial, BOUNDS[cell], BOUNDS[cell + 1]);
    const sweeping = serial > 0 && serial < 1;
    grid(
      A,
      ax,
      ay,
      (r) => (sweeping && r === 0 ? 1 : parallel > 0 && r > 0 ? parallel : 0),
      CATEGORIES[0],
      'inputs',
    );
    grid(
      B,
      bx,
      by,
      (_, c) => (sweeping && c === cell ? 1 : parallel > 0 ? parallel * 0.6 : 0),
      CATEGORIES[1],
      'weights',
    );

    // The output: cells appear as they are finished.
    C.forEach((row, r) =>
      row.forEach((value, c) => {
        const finished = r === 0 ? (serial >= 1 || c < cell ? 1 : 0) : parallel;
        const x = cx + c * s;
        const y = cy + r * s;
        roundRect(ctx, x + 2, y + 2, s - 4, s - 4, s * 0.16);
        ctx.fillStyle = rgba(INK.panel, 1);
        ctx.fill();
        ctx.fillStyle = rgba(HUE.amber, 0.1 + finished * 0.35);
        ctx.fill();
        ctx.strokeStyle = rgba(HUE.amber, 0.3 + finished * 0.6);
        ctx.stroke();
        if (finished > 0.5)
          label(ctx, String(value), x + s / 2, y + s / 2, {
            size: Math.round(s * (value >= 100 ? 0.3 : 0.36)),
            face: 'mono',
            color: INK.white,
            align: 'center',
          });
        // All at once: every remaining cell flashes together.
        if (r > 0 && parallel > 0 && parallel < 1)
          additive(ctx, () =>
            glow(ctx, x + s / 2, y + s / 2, s * 0.9, HUE.amber, Math.sin(parallel * Math.PI) * 0.9),
          );
      }),
    );
    label(ctx, 'outputs', cx + 4 * s, cy - 14, { size: 12.5, color: INK.silver, align: 'right' });

    // The cell being worked: pairs multiplied, then added up.
    if (sweeping) {
      const tx = cx + cell * s + s / 2;
      const ty = cy + s / 2;
      const pairs = 6;
      let sum = 0;
      for (let k = 0; k < pairs; k++) {
        const reach = easeInOut(span(within, k / (pairs + 1), (k + 1.2) / (pairs + 1)));
        if (reach <= 0) continue;
        sum += reach >= 1 ? A[0][k] * B[k][cell] : 0;
        const fromAx = ax + k * s + s / 2;
        const fromAy = ay + s / 2;
        const fromBx = bx + cell * s + s / 2;
        const fromBy = by + k * s + s / 2;
        additive(ctx, () => {
          glow(
            ctx,
            lerp(fromAx, tx, reach),
            lerp(fromAy, ty, reach),
            s * 0.35,
            CATEGORIES[0],
            0.9 * (1 - reach * 0.5),
          );
          glow(
            ctx,
            lerp(fromBx, tx, reach),
            lerp(fromBy, ty, reach),
            s * 0.35,
            CATEGORIES[1],
            0.9 * (1 - reach * 0.5),
          );
        });
      }
      if (cell === 0) {
        const products = A[0].map((value, k) => `${value}×${B[k][0]}`).join(' + ');
        label(ctx, `${products} = ${sum}`, w / 2, h - 34, {
          size: Math.max(11, Math.min(15, w / 60)),
          face: 'mono',
          color: INK.white,
          align: 'center',
        });
      }
    }
    if (parallel > 0)
      label(ctx, 'the other twelve cells, all at once', w / 2, h - 34, {
        size: 13,
        color: INK.silver,
        align: 'center',
        alpha: parallel,
      });
    ctx.restore();
  };
}
