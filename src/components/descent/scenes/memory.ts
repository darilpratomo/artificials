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

/** A 70-billion-parameter model at 16 bits, and an H100 SXM's memory bandwidth. */
export const MEMORY_EXAMPLE = { gigabytes: 140, terabytesPerSecond: 3.35 };
export const readMilliseconds = () =>
  (MEMORY_EXAMPLE.gigabytes / (MEMORY_EXAMPLE.terabytesPerSecond * 1000)) * 1000;

/**
 * Memory, the real bottleneck: to write each token the chip must read every
 * weight from its memory stacks, so the arithmetic mostly waits; serving many
 * requests with each read keeps it busy.
 */
export function createMemory(): Draw {
  const next = random(132);
  const flicker = Array.from({ length: 132 }, () => next() * Math.PI * 2);
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(0.7), 0.13);

    const read = span(p, 0.12, 0.42);
    const sum = easeInOut(span(p, 0.46, 0.62));
    const batch = easeInOut(span(p, 0.72, 0.9));
    const wide = w >= 620;

    // The package: the compute die in the middle, memory stacks either side.
    const dieW = Math.min(w * (wide ? 0.34 : 0.5), h * 0.62);
    const dieH = dieW * 0.86;
    const dieX = w / 2 - dieW / 2;
    const dieY = h * (wide ? 0.44 : 0.4) - dieH / 2;
    const stackW = dieW * 0.26;
    const stackH = dieH * 0.28;
    const stacks = [0, 1, 2].flatMap((row) => [
      {
        x: dieX - stackW - dieW * 0.12,
        y: dieY + row * (dieH / 3) + (dieH / 3 - stackH) / 2,
        side: -1,
      },
      {
        x: dieX + dieW + dieW * 0.12,
        y: dieY + row * (dieH / 3) + (dieH / 3 - stackH) / 2,
        side: 1,
      },
    ]);

    // The lanes between memory and compute, with data moving in.
    for (const stack of stacks) {
      const from = stack.side < 0 ? stack.x + stackW : stack.x;
      const to = stack.side < 0 ? dieX : dieX + dieW;
      for (let lane = 0; lane < 6; lane++) {
        const y = stack.y + ((lane + 0.5) / 6) * stackH;
        ctx.strokeStyle = rgba(HUE.cyan, 0.18);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(from, y);
        ctx.lineTo(to, y);
        ctx.stroke();
        const moving = read > 0 || batch > 0 ? 1 : 0.35;
        additive(ctx, () => {
          for (let packet = 0; packet < 2; packet++) {
            const phase = (t * 0.9 + lane * 0.17 + packet * 0.5 + stack.y * 0.001) % 1;
            glow(ctx, lerp(from, to, phase), y, 5, HUE.cyan, moving * 0.85);
          }
        });
      }
      roundRect(ctx, stack.x, stack.y, stackW, stackH, 6);
      ctx.fillStyle = rgba(INK.panel, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(HUE.cyan, 0.6);
      ctx.stroke();
      // Each stack is layers of memory dies, one on another.
      for (let layer = 1; layer < 8; layer++) {
        const y = stack.y + (layer / 8) * stackH;
        ctx.strokeStyle = rgba(HUE.cyan, 0.22);
        ctx.beginPath();
        ctx.moveTo(stack.x + 5, y);
        ctx.lineTo(stack.x + stackW - 5, y);
        ctx.stroke();
      }
    }

    roundRect(ctx, dieX, dieY, dieW, dieH, 10);
    ctx.fillStyle = rgba(INK.panel, 1);
    ctx.fill();
    ctx.strokeStyle = rgba(HUE.amber, 0.6);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // 132 streaming multiprocessors: mostly waiting while weights stream in,
    // busy once each read serves many requests.
    const cols = 12;
    const rows = 11;
    const cw = (dieW - 16) / cols;
    const ch = (dieH - 16) / rows;
    for (let index = 0; index < cols * rows; index++) {
      const c = index % cols;
      const r = Math.floor(index / cols);
      const waiting = 0.1 + 0.3 * Math.max(0, Math.sin(t * 3 + flicker[index])) ** 8;
      const busy = batch * (0.55 + 0.45 * Math.sin(t * 6 + flicker[index]));
      const color = batch > 0.05 ? CATEGORIES[index % 4] : HUE.amber;
      ctx.fillStyle = rgba(color, Math.max(waiting, busy));
      ctx.fillRect(dieX + 8 + c * cw + 1.5, dieY + 8 + r * ch + 1.5, cw - 3, ch - 3);
    }

    label(ctx, 'compute', dieX + dieW / 2, dieY - 16, {
      size: 12.5,
      color: INK.silver,
      align: 'center',
    });
    label(ctx, 'memory', stacks[0].x + stackW / 2, stacks[0].y - 14, {
      size: 12.5,
      color: INK.silver,
      align: 'center',
    });
    label(ctx, 'memory', stacks[1].x + stackW / 2, stacks[1].y - 14, {
      size: 12.5,
      color: INK.silver,
      align: 'center',
    });

    // Reading every weight for each token.
    const infoY = dieY + dieH + (wide ? 56 : 40);
    if (read > 0 && sum < 0.5) {
      const alpha = Math.min(read * 4, 1 - sum * 2);
      const gb = Math.round(read * MEMORY_EXAMPLE.gigabytes);
      label(
        ctx,
        `weights read for this token: ${gb} of ${MEMORY_EXAMPLE.gigabytes} GB`,
        w / 2,
        infoY,
        {
          size: 14,
          face: 'mono',
          color: INK.white,
          align: 'center',
          alpha,
        },
      );
      label(ctx, 'the arithmetic units mostly wait', w / 2, infoY + 24, {
        size: 12.5,
        color: INK.silver,
        align: 'center',
        alpha,
      });
    }
    // The sum: how long one full read takes, and what that allows.
    if (sum > 0 && batch < 0.6) {
      const alpha = sum * (1 - span(batch, 0.2, 0.6));
      const ms = readMilliseconds();
      label(
        ctx,
        `${MEMORY_EXAMPLE.gigabytes} GB ÷ ${MEMORY_EXAMPLE.terabytesPerSecond} TB/s ≈ ${ms.toFixed(0)} ms per token`,
        w / 2,
        infoY,
        {
          size: Math.min(18, w / 34),
          weight: 600,
          face: 'mono',
          color: INK.white,
          align: 'center',
          alpha,
        },
      );
      label(
        ctx,
        `at most about ${Math.round(1000 / ms)} tokens a second for one reader`,
        w / 2,
        infoY + 26,
        {
          size: 13,
          color: INK.silver,
          align: 'center',
          alpha,
        },
      );
    }
    if (batch > 0) {
      const keys = ['request 1', 'request 2', 'request 3', 'request 4'];
      const left = w / 2 - Math.min(w * 0.44, 300);
      const step = Math.min(w * 0.22, 150);
      keys.forEach((text, index) => {
        const x = left + index * step;
        ctx.fillStyle = rgba(CATEGORIES[index], batch);
        ctx.fillRect(x, infoY - 4, 10, 8);
        label(ctx, text, x + 16, infoY, { size: 12.5, color: INK.silver, alpha: batch });
      });
      label(ctx, 'one read of the weights serves many requests at once', w / 2, infoY + 26, {
        size: 13,
        color: INK.white,
        align: 'center',
        alpha: batch,
      });
    }
  };
}
