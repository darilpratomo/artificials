import type { Draw } from '../engine';
import {
  CATEGORIES,
  HUE,
  INK,
  additive,
  dot,
  dotGrid,
  easeInOut,
  easeOut,
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

/** GELU, the bend many language models use, in its common tanh form. */
export const gelu = (x: number) =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

export const NEURON = {
  inputs: [0.9, -0.4, 0.6, 0.2],
  weights: [0.8, -0.5, 0.3, 1.1],
  bias: -0.2,
};
export const neuronSum = () =>
  NEURON.inputs.reduce((sum, x, index) => sum + x * NEURON.weights[index], NEURON.bias);

const format = (value: number) => (value < 0 ? `−${Math.abs(value).toFixed(2)}` : value.toFixed(2));

/**
 * One artificial neuron: inputs times weights, added up, bent by an
 * activation function. Then it turns out to be one of a field of thousands.
 */
export function createNeuron(): Draw {
  const next = random(33);
  // The field the neuron belongs to: columns of neurons, each linked to a few in
  // the next column. The middle one, at the centre, is ours.
  const COLS = 17;
  const ROWS = 11;
  const field = Array.from({ length: COLS * ROWS }, (_, index) => ({
    column: index % COLS,
    row: Math.floor(index / COLS),
    jitter: (next() - 0.5) * 0.5,
    phase: next() * Math.PI * 2,
    speed: 0.8 + next() * 1.8,
    links: [Math.floor(next() * ROWS), Math.floor(next() * ROWS)],
  }));
  const ours = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2);

  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.45, h * 0.5, Math.max(w, h) * 0.55, spectrum(0.2), 0.12);

    const weigh = easeInOut(span(p, 0.12, 0.34));
    const carry = span(p, 0.36, 0.5);
    const sum = easeInOut(span(p, 0.48, 0.57));
    const bend = easeInOut(span(p, 0.55, 0.65));
    const zoom = easeInOut(span(p, 0.72, 0.98));

    // Zooming out: the neuron shrinks to one point in a field of them.
    const scale = lerp(1, 0.12, zoom);
    const originX = w * 0.5;
    const originY = h * 0.5;
    const sx = (x: number) => originX + (x - originX) * scale;
    const sy = (y: number) => originY + (y - originY) * scale;

    if (zoom > 0) {
      const at = (column: number, row: number, jitter = 0) => [
        w * (0.06 + (0.88 * column) / (COLS - 1)),
        h *
          (0.08 +
            (0.84 *
              (row +
                jitter *
                  (row === Math.floor(ROWS / 2) && column === Math.floor(COLS / 2) ? 0 : 1))) /
              (ROWS - 1)),
      ];
      ctx.lineWidth = 1;
      for (const cell of field) {
        if (cell.column === COLS - 1) continue;
        const [x1, y1] = at(cell.column, cell.row, cell.jitter);
        for (const row of cell.links) {
          const target = field[row * COLS + cell.column + 1];
          const [x2, y2] = at(target.column, target.row, target.jitter);
          ctx.strokeStyle = rgba(spectrum(0.2 + (cell.column / COLS) * 0.15), 0.14 * zoom);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
      additive(ctx, () => {
        field.forEach((cell, index) => {
          const [x, y] = at(cell.column, cell.row, cell.jitter);
          const flicker = 0.35 + 0.65 * Math.max(0, Math.sin(t * cell.speed + cell.phase));
          const mine = index === ours;
          glow(
            ctx,
            x,
            y,
            mine ? 22 : 7,
            mine ? HUE.violet : spectrum(0.18 + (cell.column / COLS) * 0.2),
            zoom * (mine ? 1 : flicker * 0.75),
          );
          dot(ctx, x, y, mine ? 3.2 : 1.6, '#ffffff', zoom * (mine ? 1 : flicker * 0.85));
        });
      });
      // Ours, marked, so it can still be found among the rest.
      const [x, y] = at(Math.floor(COLS / 2), Math.floor(ROWS / 2));
      ctx.strokeStyle = rgba(HUE.violet, span(zoom, 0.6, 1));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 12 + Math.sin(t * 2) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      label(ctx, 'our neuron', x, y - 24, {
        size: 12.5,
        color: INK.white,
        align: 'center',
        alpha: span(zoom, 0.7, 1),
      });
    }
    const alpha = 1 - span(zoom, 0.55, 1);
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    const narrow = w < 560;
    const inputX = w * (narrow ? 0.09 : 0.13);
    const bodyX = w * (narrow ? 0.36 : 0.44);
    const bodyY = h * 0.5;
    const spread = Math.min(h * 0.62, 320);
    const inputs = NEURON.inputs.map((value, index) => ({
      value,
      weight: NEURON.weights[index],
      x: inputX,
      y: bodyY - spread / 2 + (index * spread) / 3,
    }));
    const radius = Math.max(18, Math.min(34, w * 0.035)) * lerp(1, 0.8, zoom);
    const bodyR = radius * 1.5;

    // The weights: thicker for a stronger weight, coloured by its sign.
    inputs.forEach((input, index) => {
      const color = input.weight >= 0 ? CATEGORIES[0] : CATEGORIES[3];
      const width = lerp(1, 1.5 + Math.abs(input.weight) * 5, weigh);
      ctx.strokeStyle = rgba(weigh > 0.05 ? color : INK.silver, lerp(0.25, 0.75, weigh));
      ctx.lineWidth = width * scale;
      ctx.beginPath();
      ctx.moveTo(sx(input.x + radius), sy(input.y));
      ctx.lineTo(sx(bodyX - bodyR), sy(bodyY));
      ctx.stroke();
      // Each input travels along its weight and arrives multiplied.
      if (carry > 0 && carry < 1) {
        const phase = easeInOut(span(carry, index * 0.08, 0.7 + index * 0.08));
        const x = lerp(input.x + radius, bodyX - bodyR, phase);
        const y = lerp(input.y, bodyY, phase);
        additive(ctx, () =>
          glow(ctx, sx(x), sy(y), 14 * scale, color, 0.9 * Math.sin(phase * Math.PI)),
        );
        label(ctx, format(input.value * input.weight), sx(x), sy(y) - 16, {
          size: 12,
          face: 'mono',
          color: INK.white,
          align: 'center',
          alpha: Math.sin(phase * Math.PI) * alpha,
        });
      }
      if (weigh > 0.3 && !narrow) {
        const mx = lerp(input.x + radius, bodyX - bodyR, 0.52);
        const my = lerp(input.y, bodyY, 0.52);
        label(ctx, `×${format(input.weight)}`, sx(mx), sy(my) - 12, {
          size: 12,
          face: 'mono',
          color: INK.silver,
          align: 'center',
          alpha: span(weigh, 0.3, 1),
        });
      }
    });

    // The inputs.
    inputs.forEach((input, index) => {
      roundRect(
        ctx,
        sx(input.x - radius),
        sy(input.y - radius),
        radius * 2 * scale,
        radius * 2 * scale,
        radius * scale,
      );
      ctx.fillStyle = rgba(INK.panel, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(spectrum(0.1 + index * 0.05), 0.8);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      label(ctx, format(input.value), sx(input.x), sy(input.y), {
        size: Math.round(radius * 0.52),
        face: 'mono',
        color: INK.white,
        align: 'center',
      });
      if (!narrow)
        label(ctx, `input ${index + 1}`, sx(input.x - radius - 10), sy(input.y), {
          size: 11.5,
          color: INK.muted,
          align: 'right',
        });
    });

    // The body adds everything up, with a bias.
    const total = neuronSum();
    additive(ctx, () =>
      glow(ctx, sx(bodyX), sy(bodyY), bodyR * 2.6 * scale, HUE.violet, 0.2 + sum * 0.6),
    );
    ctx.beginPath();
    ctx.arc(sx(bodyX), sy(bodyY), bodyR * scale, 0, Math.PI * 2);
    ctx.fillStyle = rgba(INK.panel, 1);
    ctx.fill();
    ctx.strokeStyle = rgba(HUE.violet, 0.9);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    label(ctx, sum > 0.5 ? format(total) : 'Σ', sx(bodyX), sy(bodyY), {
      size: Math.round(bodyR * (sum > 0.5 ? 0.42 : 0.7)),
      face: sum > 0.5 ? 'mono' : 'display',
      weight: 600,
      color: INK.white,
      align: 'center',
    });
    if (sum > 0.05)
      label(
        ctx,
        narrow
          ? `${format(total - NEURON.bias)} ${NEURON.bias < 0 ? '−' : '+'} ${Math.abs(NEURON.bias).toFixed(2)} = ${format(total)}`
          : `sum of products ${format(total - NEURON.bias)}, plus bias ${format(NEURON.bias)}`,
        sx(bodyX),
        sy(bodyY + bodyR + 22),
        {
          size: 12,
          color: INK.silver,
          align: 'center',
          alpha: sum,
        },
      );

    // The bend: an activation function turns the sum into the output.
    const plotX = w * (narrow ? 0.52 : 0.6);
    const plotW = w * (narrow ? 0.42 : 0.26);
    const plotH = Math.min(h * 0.42, plotW * 0.9);
    const plotY = bodyY - plotH / 2;
    const reveal = easeOut(span(p, 0.44, 0.54));
    if (reveal > 0) {
      ctx.save();
      ctx.globalAlpha = alpha * reveal;
      roundRect(ctx, sx(plotX), sy(plotY), plotW * scale, plotH * scale, 14 * scale);
      ctx.fillStyle = rgba(INK.panel, 0.9);
      ctx.fill();
      ctx.strokeStyle = rgba(INK.silver, 0.14);
      ctx.lineWidth = 1;
      ctx.stroke();
      const range = 3;
      const px = (x: number) => sx(plotX + ((x + range) / (range * 2)) * plotW);
      const py = (y: number) => sy(plotY + plotH * 0.78 - (y / range) * plotH * 0.62);
      ctx.strokeStyle = rgba(INK.silver, 0.18);
      ctx.beginPath();
      ctx.moveTo(px(-range), py(0));
      ctx.lineTo(px(range), py(0));
      ctx.moveTo(px(0), py(-0.6));
      ctx.lineTo(px(0), py(range));
      ctx.stroke();
      ctx.strokeStyle = rgba(HUE.amber, 0.95);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const x = -range + (i / 60) * range * 2;
        if (i === 0) ctx.moveTo(px(x), py(gelu(x)));
        else ctx.lineTo(px(x), py(gelu(x)));
      }
      ctx.stroke();
      label(ctx, 'activation (GELU)', sx(plotX + 12), sy(plotY + 16), {
        size: 11.5,
        color: INK.muted,
      });
      // The sum slides along the curve to become the output.
      if (bend > 0) {
        const x = lerp(-range, total, bend);
        const y = gelu(x);
        additive(ctx, () => glow(ctx, px(x), py(y), 16 * scale, HUE.amber, 0.9));
        dot(ctx, px(x), py(y), 4 * scale, '#ffffff');
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = rgba(HUE.amber, 0.5 * bend);
        ctx.beginPath();
        ctx.moveTo(px(x), py(0));
        ctx.lineTo(px(x), py(y));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
    // The output leaves the neuron.
    if (bend > 0.6) {
      const out = span(bend, 0.6, 1);
      // Beside the curve, or beneath it where the screen is narrow.
      const x = narrow ? sx(plotX + plotW / 2) : sx(plotX + plotW + 26);
      const y = narrow ? sy(plotY + plotH + 24) : sy(bodyY);
      label(ctx, format(gelu(total)), x, y, {
        size: narrow ? 15 : 20,
        weight: 650,
        face: 'mono',
        color: INK.white,
        align: narrow ? 'center' : 'left',
        alpha: out * alpha,
      });
      label(ctx, 'output', x, y + 20, {
        size: 11.5,
        color: INK.muted,
        align: narrow ? 'center' : 'left',
        alpha: out * alpha,
      });
    }
    ctx.restore();
  };
}
