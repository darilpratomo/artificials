import type { Draw } from '../engine';
import { descend, loss } from '../../../lib/descent-math';
import {
  HUE,
  INK,
  additive,
  arrowHead,
  dot,
  easeInOut,
  glow,
  label,
  lerp,
  project,
  rgba,
  rotateX,
  rotateY,
  span,
  spectrum,
  wash,
  type Vec3,
} from '../kit';

const GRID = 34;
const RANGE = 1.2;

/**
 * Training as a walk downhill: height is the loss, the gradient points uphill,
 * and each step goes the other way. The path is real gradient descent on this
 * surface; a second walker from elsewhere gets stuck in a shallow dip.
 */
export function createLandscape(): Draw {
  const path = descend([-0.6, 1.0], 0.045, 90);
  const stuck = descend([-1.0, 0.3], 0.045, 90);
  const heights: number[][] = [];
  for (let i = 0; i <= GRID; i++) {
    heights.push([]);
    for (let j = 0; j <= GRID; j++) {
      const x = -RANGE + (i / GRID) * RANGE * 2;
      const y = -RANGE + (j / GRID) * RANGE * 2;
      heights[i].push(loss(x, y));
    }
  }
  const top = Math.max(...heights.flat());
  const bottom = Math.min(...heights.flat());

  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    wash(ctx, w * 0.5, h * 0.62, Math.max(w, h) * 0.6, spectrum(0.5), 0.13);

    const arrow = easeInOut(span(p, 0.16, 0.3));
    const walk = easeInOut(span(p, 0.4, 0.93));
    const settle = span(p, 0.9, 1);
    const scale = Math.min(w, h) * 0.36;
    const cx = w * 0.5;
    const cy = h * 0.56;
    const yaw = -0.7 + t * 0.035 + p * 0.5;
    const pitch = 1.02;
    // Surface coordinates: x and y across, loss up.
    const at = (x: number, y: number, z: number) => {
      const point: Vec3 = [x, -(z - 1.1) * 0.75, y];
      const turned = rotateX(rotateY(point, yaw), pitch - Math.PI / 2 + 0.35);
      return project(
        [turned[0] * scale, turned[1] * scale, turned[2] * scale],
        cx,
        cy,
        scale * 4,
        scale * 4,
      );
    };

    // The surface as a lit mesh, coloured by height: low is green, high is warm.
    const lineAt = (i: number, j: number) => {
      const x = -RANGE + (i / GRID) * RANGE * 2;
      const y = -RANGE + (j / GRID) * RANGE * 2;
      return at(x, y, heights[i][j]);
    };
    // Segments are grouped by height, so the mesh is a handful of strokes.
    const BANDS = 12;
    const bands: number[][] = Array.from({ length: BANDS }, () => []);
    const band = (value: number) =>
      Math.min(BANDS - 1, Math.floor(((value - bottom) / (top - bottom)) * BANDS));
    for (let i = 0; i <= GRID; i++)
      for (let j = 0; j < GRID; j++) {
        const a = lineAt(i, j);
        const b = lineAt(i, j + 1);
        bands[band(heights[i][j])].push(a.x, a.y, b.x, b.y);
        const c = lineAt(j, i);
        const d = lineAt(j + 1, i);
        bands[band(heights[j][i])].push(c.x, c.y, d.x, d.y);
      }
    ctx.lineWidth = 1;
    bands.forEach((segments, index) => {
      const level = index / (BANDS - 1);
      ctx.strokeStyle = rgba(spectrum(lerp(0.45, 0.95, level)), 0.2 + (1 - level) * 0.28);
      ctx.beginPath();
      for (let k = 0; k < segments.length; k += 4) {
        ctx.moveTo(segments[k], segments[k + 1]);
        ctx.lineTo(segments[k + 2], segments[k + 3]);
      }
      ctx.stroke();
    });

    const lift = 0.03;
    const walker = (
      route: [number, number, number][],
      progress: number,
      color: string,
      alpha: number,
    ) => {
      const exact = progress * (route.length - 1);
      const index = Math.floor(exact);
      const frac = exact - index;
      const [x1, y1, z1] = route[index];
      const [x2, y2, z2] = route[Math.min(route.length - 1, index + 1)];
      const here = at(lerp(x1, x2, frac), lerp(y1, y2, frac), lerp(z1, z2, frac) + lift);
      // The trail so far.
      ctx.strokeStyle = rgba(color, 0.85 * alpha);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let step = 0; step <= index; step++) {
        const [x, y, z] = route[step];
        const q = at(x, y, z + lift);
        if (step) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      }
      ctx.lineTo(here.x, here.y);
      ctx.stroke();
      additive(ctx, () =>
        glow(ctx, here.x, here.y, 26, color, alpha * (0.8 + 0.2 * Math.sin(t * 4))),
      );
      dot(ctx, here.x, here.y, 6, '#ffffff', alpha);
      return here;
    };

    // A walker from elsewhere that settles in a shallow dip, not the valley.
    if (walk > 0.2) walker(stuck, walk, INK.silver, 0.45 * span(walk, 0.2, 0.4));
    const ball = walker(path, walk, HUE.amber, 1);

    // The gradient at the start, and the step the other way.
    if (arrow > 0 && walk < 0.05) {
      const [x, y] = path[0];
      const e = 1e-4;
      const gx = (loss(x + e, y) - loss(x - e, y)) / (2 * e);
      const gy = (loss(x, y + e) - loss(x, y - e)) / (2 * e);
      const length = Math.hypot(gx, gy) || 1;
      const reach = 0.42 * arrow;
      const tip = (sign: number) => {
        const tx = x + (sign * gx * reach) / length;
        const ty = y + (sign * gy * reach) / length;
        return at(tx, ty, loss(tx, ty) + lift);
      };
      for (const [sign, color, text] of [
        [1, HUE.red, 'gradient: uphill'],
        [-1, HUE.green, 'step: downhill'],
      ] as const) {
        const end = tip(sign);
        ctx.strokeStyle = rgba(color, 0.95);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        arrowHead(ctx, end.x, end.y, Math.atan2(end.y - ball.y, end.x - ball.x), 11, color);
        label(ctx, text, end.x + 10, end.y - 10, { size: 12.5, color: INK.white, alpha: arrow });
      }
    }

    // The loss, step by step, in a small chart.
    const cw = Math.min(w * 0.3, 220);
    const ch = Math.min(h * 0.18, 110);
    const x0 = 22;
    const y0 = h - ch - 26;
    ctx.fillStyle = rgba(INK.panel, 0.85);
    ctx.fillRect(x0, y0, cw, ch);
    ctx.strokeStyle = rgba(INK.silver, 0.14);
    ctx.strokeRect(x0, y0, cw, ch);
    label(ctx, 'loss', x0 + 10, y0 + 14, { size: 11.5, color: INK.muted });
    label(ctx, 'training steps', x0 + cw - 10, y0 + ch - 10, {
      size: 11.5,
      color: INK.muted,
      align: 'right',
    });
    const shown = Math.floor(walk * (path.length - 1));
    ctx.strokeStyle = rgba(HUE.amber, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let step = 0; step <= shown; step++) {
      const px = x0 + 10 + (step / (path.length - 1)) * (cw - 20);
      const py = y0 + 22 + (1 - (path[step][2] - bottom) / (path[0][2] - bottom + 0.1)) * (ch - 36);
      if (step) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
    label(ctx, path[shown][2].toFixed(2), x0 + cw - 10, y0 + 14, {
      size: 12,
      face: 'mono',
      color: INK.white,
      align: 'right',
    });
    if (settle > 0)
      label(ctx, 'the lowest point this walk found', ball.x, ball.y - 30, {
        size: 12.5,
        color: INK.white,
        align: 'center',
        alpha: settle,
      });
  };
}
