import type { Draw } from '../engine';
import { FORMATS, INT4_SCALE, WEIGHT, quantized, weightBytes } from '../../../lib/descent-math';
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
  rgba,
  roundRect,
  spectrum,
  wash,
} from '../kit';

/**
 * Smaller numbers: the same weight stored in fewer bits. The bits fall away,
 * the values it can take grow further apart, and the model shrinks until it
 * fits on one GPU.
 */
export function createQuantize(): Draw {
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.45, Math.max(w, h) * 0.6, spectrum(0.66), 0.12);

    // Which format, and how far into the change to the next one.
    // One format per step, each change eased on its own.
    const exact = p * (FORMATS.length - 1);
    const index = Math.min(FORMATS.length - 2, Math.floor(exact));
    const within = easeInOut(exact - index);
    const current = FORMATS[Math.round(exact)];
    const bits = lerp(FORMATS[index].bits, FORMATS[index + 1].bits, within);

    // The bits: sign, exponent and fraction; the ones being dropped fall away.
    const cell = Math.min((w * 0.86) / 32, 26);
    const rowW = cell * 32;
    const x0 = w / 2 - rowW / 2;
    const y0 = h * 0.24;
    const shape = (format: (typeof FORMATS)[number], position: number) =>
      format.exponent === 0
        ? CATEGORIES[3]
        : position < format.sign
          ? CATEGORIES[1]
          : position < format.sign + format.exponent
            ? CATEGORIES[0]
            : CATEGORIES[2];
    const from = FORMATS[index];
    const to = FORMATS[index + 1];
    for (let position = 0; position < 32; position++) {
      const inFrom = position < from.bits;
      const inTo = position < to.bits;
      if (!inFrom && !inTo) continue;
      // Leaving bits drop and fade; staying ones take their new colour.
      const leaving = inFrom && !inTo ? within : 0;
      const color = inTo && within > 0.5 ? shape(to, position) : shape(from, position);
      const x = x0 + position * cell;
      const y = y0 + leaving * leaving * h * 0.25;
      const alpha = 1 - leaving;
      roundRect(ctx, x + 2, y, cell - 4, cell * 1.3, 4);
      ctx.fillStyle = rgba(color, 0.3 * alpha);
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.9 * alpha);
      ctx.lineWidth = 1;
      ctx.stroke();
      // A sample bit pattern, for texture only.
      const bit = (position * 7 + 3) % 5 < 2 ? '1' : '0';
      label(ctx, bit, x + cell / 2, y + cell * 0.65, {
        size: Math.round(cell * 0.5),
        face: 'mono',
        color: INK.white,
        align: 'center',
        alpha: alpha * 0.85,
      });
    }
    label(ctx, `${current.name}: ${Math.round(bits)} bits`, w / 2, y0 - 22, {
      size: 15,
      weight: 600,
      face: 'display',
      color: INK.white,
      align: 'center',
    });
    // A key to the fields.
    const keys: [string, string][] =
      current.exponent === 0
        ? [[CATEGORIES[3], 'a whole number, times a shared scale']]
        : [
            [CATEGORIES[1], 'sign'],
            [CATEGORIES[0], 'exponent'],
            [CATEGORIES[2], 'fraction'],
          ];
    let kx = w / 2 - (keys.length > 1 ? 130 : 110);
    for (const [color, text] of keys) {
      ctx.fillStyle = rgba(color, 1);
      ctx.fillRect(kx, y0 + cell * 1.3 + 18, 9, 9);
      label(ctx, text, kx + 15, y0 + cell * 1.3 + 23, { size: 12, color: INK.silver });
      kx += text.length * 7 + 40;
    }

    // The number line: every value the format can hold near our weight.
    const lineY = h * 0.55;
    const lo = 0.55;
    const hi = 0.85;
    const lx = w * 0.1;
    const lw = w * 0.8;
    const at = (value: number) => lx + ((value - lo) / (hi - lo)) * lw;
    ctx.strokeStyle = rgba(INK.silver, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, lineY);
    ctx.lineTo(lx + lw, lineY);
    ctx.stroke();
    // The values a format can hold here: integer levels, or floats between 0.5 and 1.
    const ticks = (format: (typeof FORMATS)[number]) => {
      const values: number[] = [];
      if (format.exponent === 0)
        for (let level = -8; level <= 7; level++) values.push(level * INT4_SCALE);
      else if (format.mantissa <= 9)
        for (let value = 0.5; value <= 1; value += 2 ** (-1 - format.mantissa)) values.push(value);
      return values;
    };
    const drawTicks = (format: (typeof FORMATS)[number], alpha: number) => {
      if (alpha <= 0.01) return;
      if (format.mantissa > 9) {
        ctx.fillStyle = rgba(HUE.amber, 0.5 * alpha);
        ctx.fillRect(lx, lineY - 7, lw, 14);
        return;
      }
      for (const value of ticks(format)) {
        if (value < lo || value > hi) continue;
        ctx.strokeStyle = rgba(HUE.amber, 0.8 * alpha);
        ctx.beginPath();
        ctx.moveTo(at(value), lineY - 9);
        ctx.lineTo(at(value), lineY + 9);
        ctx.stroke();
      }
    };
    drawTicks(from, 1 - within);
    drawTicks(to, within);
    for (const value of [0.6, 0.7, 0.8])
      label(ctx, value.toFixed(1), at(value), lineY + 26, {
        size: 11.5,
        color: INK.muted,
        align: 'center',
      });
    // The weight, and where each format has to put it.
    const stored = lerp(quantized(from), quantized(to), within);
    ctx.strokeStyle = rgba('#ffffff', 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(at(WEIGHT), lineY - 30);
    ctx.lineTo(at(WEIGHT), lineY + 4);
    ctx.stroke();
    label(ctx, `the weight ${WEIGHT.toFixed(6)}`, at(WEIGHT), lineY - 42, {
      size: 12.5,
      face: 'mono',
      color: INK.white,
      align: 'center',
    });
    additive(ctx, () => glow(ctx, at(stored), lineY, 16, HUE.amber, 0.9 + 0.1 * Math.sin(t * 3)));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(at(stored), lineY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    label(
      ctx,
      `stored as ${stored.toFixed(6)}, off by ${Math.abs(stored - WEIGHT).toFixed(6)}`,
      w / 2,
      lineY + 52,
      {
        size: 13,
        face: 'mono',
        color: INK.silver,
        align: 'center',
      },
    );

    // What that does to a 70-billion-parameter model, against one GPU's memory.
    const barY = h * 0.8;
    const gb = weightBytes(70e9, bits) / 1e9;
    const scale = (w * 0.8) / 280;
    ctx.fillStyle = rgba(INK.silver, 0.1);
    ctx.fillRect(lx, barY, 280 * scale, 16);
    ctx.fillStyle = rgba(CATEGORIES[0], 0.85);
    ctx.fillRect(lx, barY, gb * scale, 16);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = rgba('#ffffff', 0.7);
    ctx.beginPath();
    ctx.moveTo(lx + 80 * scale, barY - 10);
    ctx.lineTo(lx + 80 * scale, barY + 26);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'one GPU: 80 GB', lx + 80 * scale, barY + 40, {
      size: 11.5,
      color: INK.silver,
      align: 'center',
    });
    label(
      ctx,
      `a 70B model: ${Math.round(gb)} GB${gb <= 80 ? ', fits on one GPU' : ''}`,
      lx,
      barY - 14,
      {
        size: 13,
        weight: 600,
        color: INK.white,
      },
    );
  };
}
