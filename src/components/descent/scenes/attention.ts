import type { Draw } from '../engine';
import {
  CATEGORIES,
  INK,
  additive,
  curvePoint,
  dotGrid,
  easeInOut,
  glow,
  label,
  lerp,
  rgba,
  roundRect,
  span,
  spectrum,
  textWidth,
  wash,
} from '../kit';
import { PIECES } from './tokens';

/**
 * Illustrative weights for one attention head: each row is a position, each
 * column an earlier position it looks at, and every row adds up to one.
 */
export const HEAD: number[][] = [
  [1],
  [0.55, 0.45],
  [0.2, 0.3, 0.5],
  [0.1, 0.1, 0.35, 0.45],
  [0.08, 0.1, 0.05, 0.62, 0.15],
  [0.35, 0.1, 0.05, 0.2, 0.2, 0.1],
];

/**
 * Attention: each position looks back at the positions before it and takes a
 * weighted share of what they carry. Several heads look for different things.
 */
export function createAttention(): Draw {
  const words = PIECES.map(([text]) => text.trim());
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.55, Math.max(w, h) * 0.6, spectrum(0.28), 0.12);

    const focus = easeInOut(span(p, 0.1, 0.32));
    const heads = easeInOut(span(p, 0.42, 0.62));
    const grid = easeInOut(span(p, 0.76, 0.96));

    const size = Math.max(13, Math.min(22, w / 34));
    const widths = words.map((word) => textWidth(ctx, word, size, 600, 'display') + size * 1.2);
    const gap = Math.max(8, Math.min(26, w * 0.025));
    const rowWidth = widths.reduce((sum, width) => sum + width, 0) + gap * (words.length - 1);
    const rowY = h * lerp(0.62, 0.9, grid);
    let x = w / 2 - rowWidth / 2;
    const chips = words.map((word, index) => {
      const chip = { word, x, cx: x + widths[index] / 2, width: widths[index], index };
      x += widths[index] + gap;
      return chip;
    });
    const chipH = size * 1.9;
    const reach = Math.min(h * 0.4, rowWidth * 0.55);

    // Arcs above the row: how much one position draws from each earlier one.
    const arc = (
      from: number,
      to: number,
      weight: number,
      color: string,
      alpha: number,
      below = false,
    ) => {
      if (alpha <= 0.01 || weight <= 0.001) return;
      const a = chips[from];
      const b = chips[to];
      const y = below ? rowY + chipH / 2 : rowY - chipH / 2;
      const distance = Math.abs(a.cx - b.cx);
      const lift = (below ? 1 : -1) * Math.max(18, (distance / rowWidth) * reach * 1.6);
      const mx = (a.cx + b.cx) / 2;
      ctx.strokeStyle = rgba(color, Math.min(1, 0.25 + weight * 1.2) * alpha);
      ctx.lineWidth = 1 + weight * 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.cx, y);
      ctx.quadraticCurveTo(mx, y + lift, a.cx, y);
      ctx.stroke();
      ctx.lineCap = 'butt';
      // What the earlier word carries flows to the one looking at it.
      const phase = (t * 0.5 + to * 0.17) % 1;
      const [px, py] = curvePoint(b.cx, y, mx, y + lift, a.cx, y, phase);
      additive(ctx, () =>
        glow(ctx, px, py, 4 + weight * 10, color, alpha * Math.sin(phase * Math.PI)),
      );
    };

    // The arcs fade before the grid of weights takes their place.
    const arcsAlpha = 1 - easeInOut(span(p, 0.7, 0.78));
    // Head one: "blue" finds what it describes.
    HEAD[4].forEach((weight, to) => arc(4, to, weight, CATEGORIES[1], focus * arcsAlpha));
    // Head two: every word looks at the one just before it.
    for (let from = 1; from < words.length; from++)
      arc(from, from - 1, 0.45, CATEGORIES[0], heads * arcsAlpha, true);
    // Head three: everything keeps the question word in view.
    for (let from = 1; from < words.length; from++)
      if (from !== 4) arc(from, 0, 0.3, CATEGORIES[2], heads * arcsAlpha * 0.9);

    chips.forEach((chip) => {
      const color = spectrum(chip.index / 6);
      const active = chip.index === 4 ? focus : 0;
      roundRect(ctx, chip.x, rowY - chipH / 2, chip.width, chipH, size * 0.4);
      ctx.fillStyle = rgba(INK.panel, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.55 + active * 0.45);
      ctx.lineWidth = 1.2 + active;
      ctx.stroke();
      if (active > 0)
        additive(ctx, () => glow(ctx, chip.cx, rowY, chip.width, color, active * 0.35));
      label(ctx, chip.word, chip.cx, rowY, {
        size,
        weight: 600,
        face: 'display',
        color: INK.white,
        align: 'center',
      });
    });

    // A key for the heads.
    if (heads > 0.05) {
      const keys: [string, string][] = [
        [CATEGORIES[1], 'head 1: what is being described'],
        [CATEGORIES[0], 'head 2: the word just before'],
        [CATEGORIES[2], 'head 3: the question word'],
      ];
      const kx = Math.max(16, w / 2 - Math.min(w * 0.45, 330));
      keys.forEach(([color, text], index) => {
        const ky = 26 + index * 22;
        ctx.fillStyle = rgba(color, heads * arcsAlpha);
        ctx.fillRect(kx, ky - 4, 14, 8);
        label(ctx, text, kx + 22, ky, { size: 12.5, color: INK.silver, alpha: heads * arcsAlpha });
      });
    }

    // Every position's row of weights: the attention pattern, with the future masked.
    if (grid > 0) {
      const n = words.length;
      const cell = Math.min((w * 0.62) / (n + 1.6), (h * 0.62) / (n + 1.4));
      const left = w / 2 - (cell * (n + 1.6)) / 2 + cell * 1.6;
      const top = h * 0.12 + cell * 0.9;
      words.forEach((word, index) => {
        label(ctx, word, left + index * cell + cell / 2, top - cell * 0.35, {
          size: Math.min(13, cell * 0.3),
          color: INK.silver,
          align: 'center',
          alpha: grid,
        });
        label(ctx, word, left - cell * 0.2, top + index * cell + cell / 2, {
          size: Math.min(13, cell * 0.3),
          color: INK.silver,
          align: 'right',
          alpha: grid,
        });
      });
      HEAD.forEach((row, r) => {
        const fill = easeInOut(span(grid, r * 0.08, 0.5 + r * 0.08));
        for (let c = 0; c < n; c++) {
          const x0 = left + c * cell;
          const y0 = top + r * cell;
          if (c > r) {
            // A position cannot look ahead: those cells stay empty.
            ctx.strokeStyle = rgba(INK.silver, 0.08 * grid);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x0 + 4, y0 + cell - 4);
            ctx.lineTo(x0 + cell - 4, y0 + 4);
            ctx.stroke();
            continue;
          }
          const weight = row[c] * fill;
          roundRect(ctx, x0 + 2, y0 + 2, cell - 4, cell - 4, 5);
          ctx.fillStyle = rgba(CATEGORIES[1], 0.08 + weight * 0.92);
          ctx.fill();
          if (cell > 34 && fill > 0.6)
            label(ctx, row[c].toFixed(2), x0 + cell / 2, y0 + cell / 2, {
              size: Math.min(12, cell * 0.24),
              face: 'mono',
              color: row[c] > 0.4 ? '#0b0c10' : INK.white,
              align: 'center',
              alpha: span(fill, 0.6, 1),
            });
        }
      });
      label(ctx, 'each row adds up to 1; the future is masked', w / 2, top + n * cell + 22, {
        size: 12,
        color: INK.muted,
        align: 'center',
        alpha: grid,
      });
    }
    label(ctx, 'Illustrative weights', 16, h - 16, {
      size: 11.5,
      color: INK.muted,
      align: 'left',
      baseline: 'alphabetic',
      alpha: Math.max(focus, grid) * 0.9,
    });
  };
}
