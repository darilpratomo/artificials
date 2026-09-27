import type { Draw } from '../engine';
import { TRAINING_BYTES_PER_PARAMETER, gpusToHold, weightBytes } from '../../../lib/descent-math';
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
  span,
  spectrum,
  wash,
} from '../kit';

const GPU_GB = 80;
const whole = (value: number) => Math.round(value).toLocaleString('en-US');

/**
 * Why so many GPUs: a large model does not fit in one GPU's memory, training
 * needs several times more, and many copies must keep their learning in step.
 */
export function createCluster(): Draw {
  return (ctx, { w, h, p, t, input }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(0.76), 0.13);

    const billions = input.model ?? 70;
    const parameters = billions * 1e9;
    const weightsGb = weightBytes(parameters, 16) / 1e9;
    const trainGb = (parameters * TRAINING_BYTES_PER_PARAMETER) / 1e9;
    const holdGpus = gpusToHold(weightsGb * 1e9);
    const trainGpus = gpusToHold(trainGb * 1e9);

    // The weights are there from the start, too tall for one GPU.
    const drop = 1;
    const split = easeInOut(span(p, 0.14, 0.31));
    const train = easeInOut(span(p, 0.5, 0.64));
    const ring = easeInOut(span(p, 0.72, 0.86));
    const wide = w >= 620;

    // Part one: the weights against one GPU's memory, then split across several.
    const partOne = 1 - train;
    if (partOne > 0.01) {
      ctx.save();
      ctx.globalAlpha = partOne;
      const floor = Math.min(h * 0.8, h - 100);
      const room = h * 0.58;
      // Heights are to scale: the block is the weights, a box is one GPU.
      const scale = Math.min(room / Math.max(weightsGb, GPU_GB), (room / GPU_GB) * 0.75);
      const boxH = GPU_GB * scale;
      const boxW = Math.min(w * 0.16, 110);
      const shown = split > 0.02 ? holdGpus : 1;
      const spacing = Math.min((w * 0.84) / shown, boxW + 18);
      const width = shown === 1 ? boxW : Math.min(boxW, spacing - 10);
      const left = w / 2 - (spacing * (shown - 1) + width) / 2;
      for (let index = 0; index < shown; index++) {
        const appear = index === 0 ? 1 : span(split, 0, 0.4);
        const x = left + index * spacing;
        roundRect(ctx, x, floor - boxH, width, boxH, 8);
        ctx.strokeStyle = rgba(HUE.amber, 0.7 * appear);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = rgba(INK.panel, 0.9 * appear);
        ctx.fill();
        if (index === 0 || appear > 0.5)
          label(ctx, `${GPU_GB} GB`, x + width / 2, floor + 16, {
            size: 11.5,
            color: INK.muted,
            align: 'center',
            alpha: appear,
          });
      }
      // The weights: one tall block, then one slice per GPU.
      const blockH = weightsGb * scale;
      const sliceH = blockH / shown;
      for (let index = 0; index < shown; index++) {
        const fromX = w / 2 - width / 2;
        const fromY = floor - blockH + index * sliceH - (1 - drop) * h * 0.4;
        const toX = left + index * spacing;
        const toY = floor - sliceH;
        const x = lerp(fromX, toX, split);
        const y = lerp(fromY, toY, split);
        roundRect(ctx, x + 4, y + 2, width - 8, sliceH - 4, 5);
        ctx.fillStyle = rgba(CATEGORIES[0], 0.5);
        ctx.fill();
        ctx.strokeStyle = rgba(CATEGORIES[0], 0.95);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // What does not fit, before the split.
      const over = weightsGb - GPU_GB;
      if (over > 0 && split < 0.5) {
        const alpha = drop * (1 - split * 2);
        const top = floor - blockH;
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = rgba(HUE.red, 0.9 * alpha);
        ctx.strokeRect(w / 2 - width / 2 - 6, top - 4, width + 12, over * scale + 4);
        ctx.setLineDash([]);
        label(
          ctx,
          `${whole(over)} GB does not fit`,
          w / 2 + width / 2 + 14,
          top + (over * scale) / 2,
          {
            size: 13,
            color: INK.white,
            alpha,
          },
        );
      }
      label(
        ctx,
        split > 0.5
          ? `${whole(weightsGb)} GB of weights across ${holdGpus} GPU${holdGpus === 1 ? '' : 's'}`
          : `${billions} billion parameters at 16 bits: ${whole(weightsGb)} GB`,
        w / 2,
        h * 0.12,
        { size: 15, weight: 600, face: 'display', color: INK.white, align: 'center', alpha: drop },
      );
      // Split layer by layer, the GPUs trade results constantly.
      if (split > 0.6 && shown > 1)
        additive(ctx, () => {
          for (let index = 0; index < shown - 1; index++) {
            const phase = (t * 1.2 + index * 0.3) % 1;
            const x = left + index * spacing + width + (spacing - width) * phase;
            glow(ctx, x, floor - boxH * 0.5, 7, HUE.cyan, span(split, 0.6, 1));
          }
        });
      ctx.restore();
    }

    // Part two: training keeps gradients and optimizer state too, and fills far more GPUs.
    if (train > 0 && ring < 0.99) {
      ctx.save();
      ctx.globalAlpha = train * (1 - ring);
      const parts: [string, number, string][] = [
        ['weights', 2, INK.silver],
        ['gradients', 2, CATEGORIES[3]],
        ['optimizer state', 12, CATEGORIES[1]],
      ];
      const barW = Math.min(w * 0.7, 520);
      const barX = w / 2 - barW / 2;
      const barY = h * 0.2;
      let x = barX;
      parts.forEach(([name, bytes, color], index) => {
        const width =
          (bytes / 16) * barW * easeInOut(span(train, index * 0.15, 0.55 + index * 0.15));
        roundRect(ctx, x, barY, Math.max(0, width - 3), 22, 5);
        ctx.fillStyle = rgba(color, 0.8);
        ctx.fill();
        ctx.fillStyle = rgba(color, 1);
        // The key: in a row, or stacked where the screen is narrow.
        const kx = wide ? barX + index * (barW / 3) : barX;
        const ky = wide ? barY + 40 : barY + 36 + index * 18;
        ctx.fillRect(kx, ky, 10, 10);
        label(ctx, `${name}: ${bytes} bytes`, kx + 16, ky + 5, {
          size: 12,
          color: INK.silver,
        });
        x += width;
      });
      label(ctx, `training: 16 bytes per parameter = ${whole(trainGb)} GB`, w / 2, barY - 18, {
        size: 15,
        weight: 600,
        face: 'display',
        color: INK.white,
        align: 'center',
      });
      // The GPUs it takes just to hold that, before anything else.
      const cols = Math.min(trainGpus, wide ? 14 : 9);
      const rows = Math.ceil(trainGpus / cols);
      const cell = Math.min((w * 0.8) / cols, (h * 0.46) / rows, 46);
      const gx = w / 2 - (cols * cell) / 2;
      const gy = h * 0.4;
      for (let index = 0; index < trainGpus; index++) {
        const appear = span(
          train,
          0.3 + (index / trainGpus) * 0.5,
          0.35 + (index / trainGpus) * 0.5,
        );
        const cx = gx + (index % cols) * cell;
        const cy = gy + Math.floor(index / cols) * cell;
        roundRect(ctx, cx + 3, cy + 3, cell - 6, cell - 6, 5);
        ctx.fillStyle = rgba(HUE.amber, 0.12 + appear * 0.3);
        ctx.fill();
        ctx.strokeStyle = rgba(HUE.amber, 0.3 + appear * 0.6);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      label(
        ctx,
        `at least ${trainGpus} GPUs of ${GPU_GB} GB, before counting activations`,
        w / 2,
        gy + rows * cell + 22,
        {
          size: 13,
          color: INK.silver,
          align: 'center',
          alpha: span(train, 0.5, 1),
        },
      );
      ctx.restore();
    }

    // Part three: many copies learn from different data and agree on each step.
    if (ring > 0) {
      const nodes = 8;
      const cx = w / 2;
      const cy = h * (wide ? 0.5 : 0.42);
      const radius = Math.min(w, h) * (wide ? 0.3 : 0.25);
      const position = (index: number) => {
        const angle = -Math.PI / 2 + (index / nodes) * Math.PI * 2;
        return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
      };
      ctx.strokeStyle = rgba(HUE.cyan, 0.3 * ring);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      // A cycle: compute on its own batch, then pass the gradients around the ring.
      const cycle = (t * 0.22) % 1;
      const passing = span(cycle, 0.35, 0.85);
      const agreed = span(cycle, 0.85, 1);
      for (let index = 0; index < nodes; index++) {
        const [x, y] = position(index);
        const busy = cycle < 0.35 ? 0.6 + 0.4 * Math.sin(t * 8 + index) : 0.3;
        roundRect(ctx, x - 22, y - 16, 44, 32, 7);
        ctx.fillStyle = rgba(INK.panel, ring);
        ctx.fill();
        ctx.fillStyle = rgba(CATEGORIES[index % 4], (0.12 + busy * 0.4) * ring);
        ctx.fill();
        ctx.strokeStyle = rgba(
          agreed > 0 ? '#ffffff' : CATEGORIES[index % 4],
          (0.6 + agreed * 0.4) * ring,
        );
        ctx.lineWidth = 1.2;
        ctx.stroke();
        label(ctx, `GPU ${index + 1}`, x, y, {
          size: 11,
          color: INK.white,
          align: 'center',
          alpha: ring,
        });
        // Gradients move one hop at a time to the next GPU.
        if (passing > 0 && passing < 1) {
          const hop = (passing * nodes) % 1;
          const [nx, ny] = position((index + 1) % nodes);
          additive(ctx, () =>
            glow(ctx, lerp(x, nx, hop), lerp(y, ny, hop), 8, CATEGORIES[3], ring),
          );
        }
        if (agreed > 0)
          additive(ctx, () =>
            glow(ctx, x, y, 34, '#ffffff', Math.sin(agreed * Math.PI) * 0.6 * ring),
          );
      }
      label(
        ctx,
        cycle < 0.35
          ? 'each GPU learns from a different batch'
          : cycle < 0.85
            ? 'gradients pass around the ring'
            : 'every copy takes the same step',
        cx,
        wide ? cy : cy + radius + 40,
        { size: 13, color: INK.white, align: 'center', alpha: ring },
      );
    }
  };
}
