import type { Draw } from '../engine';
import {
  CATEGORIES,
  INK,
  additive,
  dotGrid,
  easeInOut,
  easeOut,
  glow,
  label,
  lerp,
  rgba,
  span,
  spectrum,
  wash,
} from '../kit';

const BLOCKS = 10;

/**
 * The transformer: the same block, attention then feed-forward, stacked many
 * times, with a running stream of numbers passing up through all of them.
 */
export function createTower(): Draw {
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.6, Math.max(w, h) * 0.6, spectrum(0.32), 0.13);

    const single = 1 - easeInOut(span(p, 0.1, 0.2));
    const build = span(p, 0.14, 0.31);
    const climb = easeInOut(span(p, 0.4, 0.88));
    const out = easeInOut(span(p, 0.86, 0.98));

    const narrow = w < 560;
    // One block is shown large; the stack takes the size that fits, with room
    // at the top for the scores that come out of it.
    const stacked = 1 - single;
    // The stack stands 6.6 units from its top face to its lowest corner, with
    // its name below it and the scores, 70 pixels of them, above.
    const unitStack = Math.min(w * (narrow ? 0.26 : 0.17), (h - 112) / 6.6);
    // Taken apart on a narrow picture, the block moves left so its two names
    // (118 pixels with their keys) fit beside it, 2.1 units from its centre.
    const singleX = w * (narrow ? 0.36 : 0.46);
    const unitSingle = Math.min(
      w * (narrow ? 0.22 : 0.15),
      h * 0.17,
      narrow ? (w - 8 - 118 - singleX) / 2.13 : Infinity,
    );
    const unit = lerp(unitSingle, unitStack, stacked);
    const cx = lerp(singleX, w * (narrow ? 0.5 : 0.46), stacked);
    const base = lerp(h * 0.6, h - unit - 34, stacked);
    const cos = Math.cos(Math.PI / 6);
    const sin = Math.sin(Math.PI / 6);
    const slab = unit * 0.16;
    // Taken apart, the two halves of a block sit well apart; stacked, they touch.
    const gapIn = unit * lerp(0.5, 0.05, stacked);
    const blockH = slab * 2 + gapIn;
    const pitch = lerp(blockH * 3.2, blockH + unit * 0.1, 1 - single);
    // A point in the block's own space, as the screen sees it.
    const iso = (x: number, y: number, z: number) => [
      cx + (x - y) * cos * unit,
      base - (x + y) * sin * unit - z,
    ];

    const face = (points: number[][], color: string, alpha: number) => {
      ctx.beginPath();
      points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = rgba(color, alpha);
      ctx.fill();
    };
    const box = (z: number, height: number, color: string, glowing: number, alpha: number) => {
      const s = 1;
      const top = [
        iso(-s, -s, z + height),
        iso(s, -s, z + height),
        iso(s, s, z + height),
        iso(-s, s, z + height),
      ];
      const left = [iso(-s, s, z), iso(s, s, z), iso(s, s, z + height), iso(-s, s, z + height)];
      const right = [iso(s, -s, z), iso(s, s, z), iso(s, s, z + height), iso(s, -s, z + height)];
      face(left, INK.panel, alpha);
      face(left, color, (0.16 + glowing * 0.25) * alpha);
      face(right, INK.panel, alpha);
      face(right, color, (0.26 + glowing * 0.3) * alpha);
      face(top, INK.panel, alpha);
      face(top, color, (0.32 + glowing * 0.45) * alpha);
      ctx.strokeStyle = rgba(color, (0.55 + glowing * 0.45) * alpha);
      ctx.lineWidth = 1;
      ctx.beginPath();
      top.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
    };

    const count = single > 0.5 ? 1 : BLOCKS;
    const stackTop = (BLOCKS - 1) * pitch + blockH;
    // The pulse's height on the stream as it climbs.
    const pulse = climb * stackTop;

    for (let index = 0; index < count; index++) {
      const drop =
        index === 0 ? 1 : easeOut(span(build, (index - 1) / BLOCKS, (index + 2) / BLOCKS));
      if (drop <= 0) continue;
      const z = index * pitch + (1 - drop) * h * 0.25;
      const alpha = Math.min(1, drop * 1.4) * (index === 0 ? 1 : 1 - single);
      const passed = span(pulse, z, z + blockH * 1.5);
      const lit = Math.sin(passed * Math.PI);
      box(z, slab, CATEGORIES[0], lit, alpha);
      box(z + slab + gapIn, slab, CATEGORIES[1], lit, alpha);
    }

    // The residual stream: a column of light through every block.
    const [sx, sy] = iso(0, 0, 0);
    const streamTop = sy - (count === 1 ? blockH : stackTop) - unit * 0.3;
    additive(ctx, () => {
      const height = sy - streamTop;
      for (let i = 0; i < 26; i++) {
        const phase = (t * 0.25 + i / 26) % 1;
        const y = sy + unit * 0.3 - phase * (height + unit * 0.3);
        glow(ctx, sx, y, 7, spectrum(0.2 + phase * 0.5), 0.35);
      }
      if (climb > 0 && climb < 1) glow(ctx, sx, sy - pulse, unit * 0.55, '#ffffff', 0.85);
    });
    ctx.strokeStyle = rgba(spectrum(0.3), 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy + unit * 0.3);
    ctx.lineTo(sx, streamTop);
    ctx.stroke();

    // One block, taken apart: what each half does.
    if (single > 0.02) {
      const [ax, ay] = iso(1, -1, slab / 2);
      const [, fy] = iso(1, -1, slab * 1.5 + gapIn);
      const labelX = Math.min(w - (narrow ? 126 : 250), ax + unit * 0.4);
      const note = (y: number, color: string, title: string, text: string) => {
        ctx.fillStyle = rgba(color, single);
        ctx.fillRect(labelX, y - 5, 10, 10);
        label(ctx, title, labelX + 18, y - 8, {
          size: 14,
          weight: 600,
          color: INK.white,
          alpha: single,
          face: 'display',
        });
        if (!narrow)
          label(ctx, text, labelX + 18, y + 10, { size: 12, color: INK.silver, alpha: single });
      };
      note(fy - unit * 0.1, CATEGORIES[1], 'Feed-forward', 'each position is processed on its own');
      note(ay + unit * 0.25, CATEGORIES[0], 'Attention', 'positions exchange information');
      // Below the block's lowest corner, a unit under its centre.
      label(ctx, 'one block', sx, sy + unit + 16, {
        size: 12,
        color: INK.muted,
        align: 'center',
        alpha: single,
      });
    }
    if (count > 1) {
      label(ctx, `${BLOCKS} blocks shown`, sx, sy + unit + 16, {
        size: 12,
        color: INK.muted,
        align: 'center',
        alpha: span(build, 0.6, 1),
      });
    }

    // Out of the top: a score for every token in the vocabulary.
    if (out > 0) {
      // Above the top face, whose far corner is a unit over its centre.
      const y = sy - stackTop - unit - 10;
      const fan = Math.min(w * 0.38, 260) * out;
      for (let i = 0; i < 48; i++) {
        const x = sx - fan / 2 + (i / 47) * fan;
        const height = (0.2 + 0.8 * Math.abs(Math.sin(i * 2.7))) * 36 * out;
        ctx.fillStyle = rgba(spectrum(0.35 + (i / 47) * 0.1), 0.35 + (i === 29 ? 0.6 : 0));
        ctx.fillRect(x - 1.5, y - height, 3, height);
      }
      label(ctx, 'a score for every token', sx, y - 50, {
        size: 12.5,
        color: INK.silver,
        align: 'center',
        alpha: out,
      });
    }
  };
}
