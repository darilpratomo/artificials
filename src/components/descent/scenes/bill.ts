import type { Draw } from '../engine';
import {
  LLAMA_405B_GPU_HOURS,
  LLAMA_405B_GPUS,
  duration,
  trainingDays,
} from '../../../lib/descent-math';
import {
  HUE,
  INK,
  additive,
  easeInOut,
  glow,
  label,
  lerp,
  mixHex,
  random,
  rgba,
  span,
  spectrum,
  wash,
} from '../kit';

/** An H100 SXM's maximum power, from NVIDIA's specifications. */
export const GPU_WATTS = 700;
const SIDE = 128;

/**
 * The training bill: the published GPU hours for one large model, as years on
 * one GPU or weeks on sixteen thousand, and the power those GPUs can draw.
 */
export function createBill(): Draw {
  let cache: { size: number; dim: HTMLCanvasElement; lit: HTMLCanvasElement } | null = null;
  const grid = (size: number) => {
    if (cache?.size === size) return cache;
    const make = (alpha: number, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = Math.ceil(size);
      const ctx = canvas.getContext('2d')!;
      const cell = size / SIDE;
      ctx.fillStyle = rgba(color, alpha);
      for (let r = 0; r < SIDE; r++)
        for (let c = 0; c < SIDE; c++)
          ctx.fillRect(c * cell + cell * 0.15, r * cell + cell * 0.15, cell * 0.7, cell * 0.7);
      return canvas;
    };
    cache = { size, dim: make(0.14, INK.silver), lit: make(0.9, HUE.amber) };
    return cache;
  };
  const sparkle = random(16384);
  const sparks = Array.from({ length: 60 }, () => ({
    x: sparkle(),
    y: sparkle(),
    phase: sparkle() * 6,
  }));

  return (ctx, { w, h, p, t, input, reserve }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    const heat = easeInOut(span(p, 0.74, 0.92));
    wash(
      ctx,
      w * 0.5,
      h * 0.55,
      Math.max(w, h) * 0.6,
      mixHex(spectrum(0.8), HUE.red, heat),
      0.14 + heat * 0.1,
    );

    const count = 1;
    const fill = easeInOut(span(p, 0.48, 0.66));
    // The scroll lights one GPU, then all of them; the slider, once moved, decides.
    const gpus =
      input.gpus ?? (fill > 0 ? Math.max(1, Math.round(lerp(1, LLAMA_405B_GPUS, fill * fill))) : 1);
    const days = trainingDays(LLAMA_405B_GPU_HOURS, gpus);

    // The figures at the top, the note just above the slider, and the grid as
    // large as the space between them allows.
    const compact = h < 520;
    const titleY = compact ? 24 : h * 0.1;
    const subtitleY = titleY + (compact ? 25 : 30);
    const timeY = subtitleY + (compact ? 28 : 34);
    const noteY = h - reserve - 12;
    const top = timeY + (compact ? 38 : 52);
    const room = noteY - 22 - top;
    const size = Math.max(0, Math.min(w * 0.62, h * 0.52, room));
    const gx = w / 2 - size / 2;
    const gy = top + (room - size) / 2;
    const { dim, lit } = grid(size);
    ctx.drawImage(dim, gx, gy, size, size);
    // The first `gpus` cells, row by row, are lit.
    const full = Math.floor(gpus / SIDE);
    const part = gpus % SIDE;
    const cell = size / SIDE;
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy, size, full * cell);
    if (part) ctx.rect(gx, gy + full * cell, part * cell, cell);
    ctx.clip();
    ctx.globalAlpha = 0.55 + heat * 0.45;
    ctx.drawImage(lit, gx, gy, size, size);
    ctx.restore();
    if (gpus < 64) additive(ctx, () => glow(ctx, gx + cell / 2, gy + cell / 2, 26, HUE.amber, 0.9));
    if (heat > 0)
      additive(ctx, () => {
        glow(ctx, w / 2, gy + size / 2, size * 0.7, HUE.red, heat * 0.28);
        for (const spark of sparks) {
          const flicker = Math.max(0, Math.sin(t * 2.5 + spark.phase)) ** 6;
          glow(ctx, gx + spark.x * size, gy + spark.y * size, 10, HUE.amber, heat * flicker);
        }
      });
    label(
      ctx,
      `each dot is one GPU: ${gpus.toLocaleString('en-US')} of ${LLAMA_405B_GPUS.toLocaleString('en-US')}`,
      w / 2,
      noteY,
      {
        size: 12.5,
        color: INK.silver,
        align: 'center',
      },
    );

    // The published figure, counted up.
    const hours = LLAMA_405B_GPU_HOURS * count;
    label(ctx, `${(hours / 1e6).toFixed(2)} million GPU hours`, w / 2, titleY, {
      size: Math.min(34, w / 18),
      weight: 700,
      face: 'display',
      color: INK.white,
      align: 'center',
    });
    label(ctx, 'to train Llama 3.1 405B, as Meta reports it', w / 2, subtitleY, {
      size: 13,
      color: INK.silver,
      align: 'center',
      alpha: count,
    });
    const power = `${gpus.toLocaleString('en-US')} × ${GPU_WATTS} W ≈ ${((gpus * GPU_WATTS) / 1e6).toFixed(1)} MW`;
    label(
      ctx,
      heat > 0.3
        ? power
        : `on ${gpus.toLocaleString('en-US')} GPU${gpus === 1 ? '' : 's'}: about ${duration(days)}`,
      w / 2,
      timeY,
      {
        size: Math.min(17, w / 24),
        weight: 600,
        face: 'mono',
        color: INK.white,
        align: 'center',
        alpha: span(p, 0.2, 0.34),
      },
    );
    if (heat > 0.3)
      label(ctx, 'at full power, for the GPUs alone', w / 2, timeY + (compact ? 20 : 22), {
        size: 12.5,
        color: INK.silver,
        align: 'center',
        alpha: span(heat, 0.3, 0.6),
      });
  };
}
