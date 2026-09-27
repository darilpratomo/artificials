import type { Draw } from '../engine';
import { INK, additive, glow, lerp, mixHex, random, span, wash } from '../kit';

/**
 * Between parts: light falling through the dark, its colour turning from the
 * part just read to the part ahead.
 */
export function createInterlude(from: string, to: string, seed: number): Draw {
  const next = random(seed);
  const motes = Array.from({ length: 90 }, () => ({
    x: next(),
    offset: next(),
    speed: 0.04 + next() * 0.1,
    size: 0.6 + next() * 1.8,
    drift: (next() - 0.5) * 0.04,
  }));
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    const turn = span(p, 0.1, 0.9);
    const color = mixHex(from, to, turn);
    wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.55, color, 0.16);
    additive(ctx, () => {
      for (const mote of motes) {
        // Falling with time, and further with the scroll.
        const y = ((mote.offset + t * mote.speed + p * 0.6) % 1) * (h + 40) - 20;
        const x = (mote.x + Math.sin(t * 0.3 + mote.offset * 9) * mote.drift) * w;
        const hue = mixHex(from, to, lerp(turn, y / h, 0.35));
        glow(ctx, x, y, mote.size * 5, hue, 0.6);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x - mote.size * 0.5, y - mote.size * 0.5, mote.size, mote.size);
      }
    });
  };
}
