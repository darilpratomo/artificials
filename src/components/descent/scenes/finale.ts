import type { Draw } from '../engine';
import { INK, additive, glow, label, lerp, rgba, span, spectrum, wash } from '../kit';

export const LAYERS = [
  'Your question',
  'Tokens',
  'Vectors',
  'Neurons',
  'Attention',
  'Transformer',
  'Next token',
  'Matrix maths',
  'GPU cores',
  'Memory',
  'Clusters',
  'Data centre',
];

/**
 * The whole way down and back: every layer on one line, and a pulse of light
 * that travels to the bottom and returns with the answer.
 */
export function createFinale(): Draw {
  return (ctx, { w, h, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    // Beside the words on a wide screen; on a narrow one, a quiet line of
    // points down the right edge, without names, clear of the words over it.
    const wide = w >= 900;
    const x = wide ? w * 0.74 : w - 16;
    const top = h * 0.14;
    const bottom = h * 0.88;
    wash(ctx, x, (top + bottom) / 2, Math.max(w, h) * 0.5, spectrum(0.5), 0.1);
    const reveal = 1;
    const alpha = wide ? 1 : 0.45;

    // The pulse goes down and comes back up, over and over.
    const cycle = (t * 0.12) % 1;
    const position = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
    const gap = (bottom - top) / (LAYERS.length - 1);
    ctx.strokeStyle = rgba(INK.silver, 0.18 * alpha);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, lerp(top, bottom, reveal));
    ctx.stroke();
    LAYERS.forEach((name, index) => {
      const shown = span(reveal, index / LAYERS.length, (index + 1) / LAYERS.length);
      if (shown <= 0) return;
      const y = top + index * gap;
      const depth = index / (LAYERS.length - 1);
      const color = spectrum(depth);
      const near = Math.max(0, 1 - Math.abs(position - depth) * (LAYERS.length - 1) * 0.8);
      additive(ctx, () =>
        glow(ctx, x, y, 14 + near * 26, color, (0.35 + near * 0.65) * shown * alpha),
      );
      ctx.fillStyle = rgba('#ffffff', (0.6 + near * 0.4) * shown * alpha);
      ctx.beginPath();
      ctx.arc(x, y, 3.5 + near * 2, 0, Math.PI * 2);
      ctx.fill();
      if (wide)
        label(ctx, name, x + (index % 2 ? -22 : 22), y, {
          size: 13.5,
          weight: 550,
          face: 'display',
          color: INK.white,
          align: index % 2 ? 'right' : 'left',
          alpha: shown * (0.55 + near * 0.45) * alpha,
        });
    });
    additive(ctx, () =>
      glow(ctx, x, lerp(top, bottom, position), 44, '#ffffff', 0.55 * reveal * alpha),
    );
  };
}
