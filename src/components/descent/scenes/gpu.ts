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
  rgba,
  roundRect,
  span,
  spectrum,
  wash,
} from '../kit';

/**
 * Why GPUs: a CPU has a few powerful cores, a GPU thousands of simple ones.
 * For a job made of many identical sums, the many win. Then, inside the GPU,
 * a tensor core does a small matrix product in one step.
 */
export function createGpu(): Draw {
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(0.64), 0.13);

    // Both chips are there from the start; the work begins as the reader scrolls.
    const intro = 1;
    const cpuWork = span(p, 0.16, 0.98);
    const gpuWork = easeInOut(span(p, 0.46, 0.6));
    const zoom = easeInOut(span(p, 0.7, 0.86));
    const burst = span(p, 0.84, 0.98);

    const wide = w >= 620;
    const chips = wide
      ? {
          cpu: { x: w * 0.06, y: h * 0.2, w: w * 0.36, h: h * 0.54 },
          gpu: { x: w * 0.5, y: h * 0.2, w: w * 0.44, h: h * 0.54 },
        }
      : {
          cpu: { x: w * 0.08, y: h * 0.08, w: w * 0.84, h: h * 0.22 },
          gpu: { x: w * 0.08, y: h * 0.5, w: w * 0.84, h: h * 0.26 },
        };
    const job = 768;
    const panel = (box: { x: number; y: number; w: number; h: number }, color: string) => {
      roundRect(ctx, box.x, box.y, box.w, box.h, 16);
      ctx.fillStyle = rgba(INK.panel, 0.95);
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.45);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };
    const bar = (
      box: { x: number; y: number; w: number; h: number },
      done: number,
      color: string,
      text: string,
    ) => {
      const y = box.y + box.h + 22;
      ctx.fillStyle = rgba(INK.silver, 0.14);
      ctx.fillRect(box.x, y, box.w, 6);
      ctx.fillStyle = rgba(color, 0.95);
      ctx.fillRect(box.x, y, box.w * done, 6);
      label(ctx, text, box.x, y + 20, { size: 12.5, color: INK.silver });
      label(ctx, `${Math.round(done * 100)}% of the job`, box.x + box.w, y + 20, {
        size: 12.5,
        face: 'mono',
        color: INK.white,
        align: 'right',
      });
    };

    const hide = 1 - zoom;
    ctx.save();
    ctx.globalAlpha = intro * hide;

    // The CPU: eight large cores, each with its own control and cache.
    const { cpu, gpu } = chips;
    panel(cpu, HUE.blue);
    const cols = wide ? 2 : 4;
    const rows = wide ? 4 : 2;
    const pad = 12;
    const cw = (cpu.w - pad * (cols + 1)) / cols;
    const chh = (cpu.h - pad * (rows + 1)) / rows;
    const cpuDone = cpuWork * 0.1;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = cpu.x + pad + c * (cw + pad);
        const y = cpu.y + pad + r * (chh + pad);
        const busy =
          cpuWork > 0 && cpuWork < 1 ? 0.5 + 0.5 * Math.sin(t * 7 + r * 1.3 + c * 2.1) : 0;
        roundRect(ctx, x, y, cw, chh, 8);
        ctx.fillStyle = rgba(HUE.blue, 0.08 + busy * 0.3);
        ctx.fill();
        ctx.strokeStyle = rgba(HUE.blue, 0.4 + busy * 0.5);
        ctx.stroke();
        // Inside a core: control logic, cache and a few arithmetic units.
        ctx.fillStyle = rgba(INK.silver, 0.12);
        ctx.fillRect(x + 6, y + 6, cw * 0.45, chh * 0.4);
        ctx.fillRect(x + 6, y + chh * 0.55, cw - 12, chh * 0.35);
        for (let u = 0; u < 3; u++) {
          ctx.fillStyle = rgba(HUE.amber, 0.25 + busy * 0.6);
          ctx.fillRect(x + cw * 0.55 + u * (cw * 0.13), y + 6, cw * 0.1, chh * 0.4);
        }
      }
    label(ctx, 'CPU', cpu.x + 14, cpu.y - 14, {
      size: 14,
      weight: 650,
      color: INK.white,
      face: 'display',
    });
    bar(cpu, cpuDone, HUE.blue, '8 powerful cores');

    // The GPU: a grid of simple cores, all working at once.
    panel(gpu, HUE.amber);
    const gc = wide ? 32 : 30;
    const gr = wide ? 24 : 12;
    const gw = (gpu.w - 20) / gc;
    const gh = (gpu.h - 20) / gr;
    for (let r = 0; r < gr; r++)
      for (let c = 0; c < gc; c++) {
        const x = gpu.x + 10 + c * gw;
        const y = gpu.y + 10 + r * gh;
        // A diagonal wave lights every core as the job runs.
        const wave = span(gpuWork * 1.4 - (c / gc + r / gr) * 0.2, 0, 0.25);
        const lit = gpuWork > 0 && gpuWork < 1 ? Math.sin(wave * Math.PI) : 0;
        const idle = 0.12 + 0.08 * Math.sin(t * 2 + r * 0.7 + c * 0.4);
        ctx.fillStyle = rgba(HUE.amber, gpuWork >= 1 ? 0.28 : idle + lit * 0.85);
        ctx.fillRect(x + 1, y + 1, gw - 2, gh - 2);
      }
    if (gpuWork > 0 && gpuWork < 1)
      additive(ctx, () =>
        glow(
          ctx,
          gpu.x + gpu.w / 2,
          gpu.y + gpu.h / 2,
          gpu.w * 0.6,
          HUE.amber,
          Math.sin(gpuWork * Math.PI) * 0.35,
        ),
      );
    label(ctx, 'GPU', gpu.x + 14, gpu.y - 14, {
      size: 14,
      weight: 650,
      color: INK.white,
      face: 'display',
    });
    bar(gpu, gpuWork, HUE.amber, `${gc * gr} simple cores shown`);
    label(
      ctx,
      wide
        ? `The same job for both: ${job} independent sums. Illustrative, not to scale.`
        : 'Illustrative, not to scale.',
      w / 2,
      h - 22,
      {
        size: 12,
        color: INK.muted,
        align: 'center',
      },
    );
    ctx.restore();

    // Inside one part of the GPU: a tensor core multiplies two small matrices in one step.
    if (zoom > 0) {
      ctx.save();
      ctx.globalAlpha = zoom;
      const unit = Math.min(w, h) * (wide ? 0.085 : 0.11);
      const ox = w * 0.5;
      const oy = h * 0.5 - unit * 0.6;
      const cos = Math.cos(Math.PI / 6);
      const sin = Math.sin(Math.PI / 6);
      // x runs along the output's columns, y down its rows, z along the shared inner size.
      const iso = (x: number, y: number, z: number) => [
        ox + (x - z) * cos * unit,
        oy + (x + z) * sin * unit + y * unit,
      ];
      const n = 4;
      const cell = (
        x: number,
        y: number,
        z: number,
        color: string,
        alpha: number,
        face: 'front' | 'left' | 'top',
      ) => {
        const corners =
          face === 'front'
            ? [iso(x, y, z), iso(x + 1, y, z), iso(x + 1, y + 1, z), iso(x, y + 1, z)]
            : face === 'left'
              ? [iso(x, y, z), iso(x, y, z + 1), iso(x, y + 1, z + 1), iso(x, y + 1, z)]
              : [iso(x, y, z), iso(x + 1, y, z), iso(x + 1, y, z + 1), iso(x, y, z + 1)];
        ctx.beginPath();
        corners.forEach(([px, py], index) => (index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath();
        ctx.fillStyle = rgba(color, alpha * 0.3);
        ctx.fill();
        ctx.strokeStyle = rgba(color, alpha * 0.85);
        ctx.lineWidth = 1;
        ctx.stroke();
      };
      // The two inputs on two faces of a cube, the output on its front.
      for (let i = 0; i < n; i++)
        for (let k = 0; k < n; k++) cell(0, i, k, CATEGORIES[0], 1, 'left');
      for (let k = 0; k < n; k++)
        for (let j = 0; j < n; j++) cell(j, 0, k, CATEGORIES[1], 1, 'top');
      // Every product at once: 64 points of light inside the cube, then added
      // up along the inner direction into the output face.
      const collapse = easeInOut(span(burst, 0.45, 0.9));
      const flash =
        burst > 0 && burst < 0.5
          ? Math.sin(span(burst, 0, 0.5) * Math.PI)
          : collapse > 0
            ? 1 - collapse
            : 0;
      additive(ctx, () => {
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++)
            for (let k = 0; k < n; k++) {
              const z = lerp(k + 0.5, 0, collapse);
              const [px, py] = iso(j + 0.5, i + 0.5, z);
              glow(ctx, px, py, unit * 0.32, HUE.amber, Math.max(flash, burst > 0 ? 0.2 : 0) * 0.9);
            }
      });
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) cell(j, i, 0, HUE.amber, lerp(0.25, 1, collapse), 'front');
      label(ctx, 'input', iso(0, n + 0.3, n / 2)[0] - 8, iso(0, n + 0.3, n / 2)[1] + 8, {
        size: 12.5,
        color: INK.silver,
        align: 'right',
      });
      label(ctx, 'weights', iso(n / 2, -0.5, n)[0] + 10, iso(n / 2, -0.5, n)[1] - 10, {
        size: 12.5,
        color: INK.silver,
      });
      label(ctx, 'output', iso(n + 0.2, n, 0)[0] + 10, iso(n + 0.2, n, 0)[1], {
        size: 12.5,
        color: INK.silver,
      });
      label(ctx, '64 multiplications and their sums, in a single step', w / 2, h - 30, {
        size: 13,
        color: INK.white,
        align: 'center',
        alpha: span(burst, 0.1, 0.4),
      });
      ctx.restore();
    }
  };
}
