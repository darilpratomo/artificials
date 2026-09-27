import type { Draw } from '../engine';
import {
  CATEGORIES,
  HUE,
  INK,
  additive,
  easeInOut,
  glow,
  label,
  lerp,
  random,
  rgba,
  span,
  spectrum,
  wash,
} from '../kit';

// The floor plan, in rack widths: rows of racks with aisles between them.
const ROWS = 6;
const PER_ROW = 16;
const RACK_W = 1;
const RACK_D = 1.3;
const GAP = 0.06;
const COLD = 1.1;
const HOT = 0.9;
const rowY = (row: number) => {
  let y = 0;
  for (let r = 0; r < row; r++) y += RACK_D + (r % 2 === 0 ? HOT : COLD);
  return y;
};
const HALL_W = PER_ROW * (RACK_W + GAP) + 1.4;
const HALL_H = rowY(ROWS - 1) + RACK_D;
// One server board fills a rack's footprint: eight GPUs, switches between them.
const BOARD = { x: 0.08, y: 0.1, w: 0.84, h: 1.1 };
const gpuAt = (column: number, row: number) => ({
  x: BOARD.x + 0.06 + column * 0.44,
  y: BOARD.y + 0.06 + row * 0.26,
  w: 0.28,
  h: 0.2,
});
const FOCUS = { row: 2, rack: 7, column: 0, slot: 1 };

/**
 * A zoom out, in powers of ten: one GPU, a server of eight, racks on a
 * network, and a whole hall with cold air in and hot air out.
 */
export function createDatacenter(): Draw {
  const next = random(700);
  const twinkle = Array.from({ length: ROWS * PER_ROW * 8 }, () => next() * Math.PI * 2);
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(0.86), 0.12);

    const m = Math.min(w, h);
    const focusRackX = FOCUS.rack * (RACK_W + GAP);
    const focusRackY = rowY(FOCUS.row);
    const gpu = gpuAt(FOCUS.column, FOCUS.slot);
    const focus = { x: focusRackX + gpu.x + gpu.w / 2, y: focusRackY + gpu.y + gpu.h / 2 };
    const rackCentre = { x: focusRackX + RACK_W / 2, y: focusRackY + RACK_D / 2 };
    const hall = { x: HALL_W / 2 - 0.7, y: HALL_H / 2 };
    // Pixels per rack width at each step: a chip, a server, a few racks, the hall.
    const scales = [
      (0.62 * m) / gpu.w,
      (0.78 * m) / RACK_D,
      w / 5.2,
      Math.min(w / (HALL_W + 1), h / (HALL_H + 1.6)),
    ];
    const q = p * 3;
    const stage = Math.min(2, Math.floor(q));
    const within = easeInOut(q - stage);
    const scale = Math.exp(lerp(Math.log(scales[stage]), Math.log(scales[stage + 1]), within));
    const centres = [
      focus,
      rackCentre,
      { x: lerp(rackCentre.x, hall.x, 0.35), y: rackCentre.y },
      hall,
    ];
    const centre = {
      x: lerp(centres[stage].x, centres[stage + 1].x, within),
      y: lerp(centres[stage].y, centres[stage + 1].y, within),
    };
    const X = (x: number) => w / 2 + (x - centre.x) * scale;
    const Y = (y: number) => h / 2 + (y - centre.y) * scale;
    // Detail fades in and out with its size on screen.
    const detail = (pixels: number, from: number, to: number) => span(pixels, from, to);

    // The hall: cold aisles where air comes in, hot aisles where it leaves.
    const hallDetail = 1 - detail(scale, 90, 160);
    for (let row = 0; row < ROWS - 1; row++) {
      const top = rowY(row) + RACK_D;
      const height = row % 2 === 0 ? HOT : COLD;
      const cold = row % 2 === 1;
      const color = cold ? HUE.blue : HUE.orange;
      ctx.fillStyle = rgba(color, 0.06 + 0.06 * hallDetail);
      ctx.fillRect(X(-0.3), Y(top), (HALL_W - 0.8) * scale, height * scale);
      additive(ctx, () => {
        for (let k = 0; k < 18; k++) {
          const phase = (t * (cold ? 0.08 : 0.1) + k / 18) % 1;
          const x = cold ? lerp(-0.3, HALL_W - 1.1, phase) : lerp(HALL_W - 1.1, -0.3, phase);
          glow(
            ctx,
            X(x),
            Y(top + height * (0.3 + (0.4 * ((k * 7) % 5)) / 5)),
            3 + scale * 0.06,
            color,
            0.6,
          );
        }
      });
    }
    // The spine: switches at the end of the rows, joined to every row.
    const spineX = PER_ROW * (RACK_W + GAP) + 0.3;
    for (let row = 0; row < ROWS; row++) {
      const y = rowY(row) + RACK_D / 2;
      ctx.strokeStyle = rgba(CATEGORIES[1], 0.35);
      ctx.lineWidth = Math.max(1, scale * 0.03);
      ctx.beginPath();
      ctx.moveTo(X(0), Y(y));
      ctx.lineTo(X(spineX), Y(y));
      ctx.stroke();
      additive(ctx, () => {
        const phase = (t * 0.35 + row * 0.13) % 1;
        glow(ctx, X(lerp(0, spineX, phase)), Y(y), 3 + scale * 0.08, CATEGORIES[1], 0.9);
      });
      ctx.fillStyle = rgba(CATEGORIES[1], 0.5);
      ctx.fillRect(X(spineX - 0.2), Y(y - 0.3), 0.4 * scale, 0.6 * scale);
    }
    // Racks, each lit by its GPUs.
    for (let row = 0; row < ROWS; row++)
      for (let rack = 0; rack < PER_ROW; rack++) {
        const x = rack * (RACK_W + GAP);
        const y = rowY(row);
        const sx = X(x);
        const sy = Y(y);
        if (sx > w + 50 || sy > h + 50 || sx + scale < -50 || sy + RACK_D * scale < -50) continue;
        ctx.fillStyle = rgba(INK.panel, 1);
        ctx.fillRect(sx, sy, RACK_W * scale, RACK_D * scale);
        ctx.strokeStyle = rgba(INK.silver, 0.35);
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, RACK_W * scale, RACK_D * scale);
        // From afar, a rack is a block of light: its eight GPUs as dots.
        if (hallDetail > 0.01)
          for (let g = 0; g < 8; g++) {
            const cell = gpuAt(g % 2, Math.floor(g / 2));
            const index = (row * PER_ROW + rack) * 8 + g;
            const flicker = 0.55 + 0.45 * Math.sin(t * 2 + twinkle[index]);
            ctx.fillStyle = rgba(HUE.amber, hallDetail * flicker * 0.85);
            ctx.fillRect(
              X(x + cell.x + cell.w * 0.2),
              Y(y + cell.y + cell.h * 0.2),
              cell.w * 0.6 * scale,
              cell.h * 0.6 * scale,
            );
          }
      }

    // Close up: the server board in the focus rack.
    const boardDetail = detail(scale, 90, 160) * (1 - detail(scale, 1400, 2600));
    if (boardDetail > 0.01) {
      ctx.save();
      ctx.globalAlpha = boardDetail;
      const bx = focusRackX;
      const by = focusRackY;
      ctx.fillStyle = rgba('#0f1a14', 1);
      ctx.fillRect(X(bx + BOARD.x), Y(by + BOARD.y), BOARD.w * scale, BOARD.h * scale);
      ctx.strokeStyle = rgba(HUE.green, 0.4);
      ctx.strokeRect(X(bx + BOARD.x), Y(by + BOARD.y), BOARD.w * scale, BOARD.h * scale);
      // Switches between the two columns of GPUs, linked to each of them.
      const switches = [0, 1, 2, 3].map((index) => ({
        x: bx + 0.47,
        y: by + BOARD.y + 0.12 + index * 0.26,
      }));
      for (let g = 0; g < 8; g++) {
        const cell = gpuAt(g % 2, Math.floor(g / 2));
        const cx = bx + cell.x + cell.w / 2;
        const cy = by + cell.y + cell.h / 2;
        for (const sw of switches) {
          ctx.strokeStyle = rgba(HUE.cyan, 0.3);
          ctx.lineWidth = Math.max(1, scale * 0.004);
          ctx.beginPath();
          ctx.moveTo(X(cx), Y(cy));
          ctx.lineTo(X(sw.x + 0.03), Y(sw.y + 0.03));
          ctx.stroke();
          const phase = (t * 0.8 + g * 0.11 + sw.y) % 1;
          additive(ctx, () =>
            glow(
              ctx,
              X(lerp(cx, sw.x + 0.03, phase)),
              Y(lerp(cy, sw.y + 0.03, phase)),
              Math.max(2, scale * 0.012),
              HUE.cyan,
              0.8,
            ),
          );
        }
      }
      for (const sw of switches) {
        ctx.fillStyle = rgba(HUE.cyan, 0.6);
        ctx.fillRect(X(sw.x), Y(sw.y), 0.06 * scale, 0.06 * scale);
      }
      for (let g = 0; g < 8; g++) {
        const cell = gpuAt(g % 2, Math.floor(g / 2));
        ctx.fillStyle = rgba('#1a1408', 1);
        ctx.fillRect(X(bx + cell.x), Y(by + cell.y), cell.w * scale, cell.h * scale);
        ctx.strokeStyle = rgba(HUE.amber, 0.8);
        ctx.strokeRect(X(bx + cell.x), Y(by + cell.y), cell.w * scale, cell.h * scale);
        additive(ctx, () =>
          glow(
            ctx,
            X(bx + cell.x + cell.w / 2),
            Y(by + cell.y + cell.h / 2),
            cell.w * scale * 0.6,
            HUE.amber,
            0.25 + 0.1 * Math.sin(t * 3 + g),
          ),
        );
      }
      ctx.restore();
    }

    // Closest: one GPU, its compute in the middle and memory stacks at its sides.
    const chipDetail = detail(scale, 1400, 2600);
    if (chipDetail > 0.01) {
      ctx.save();
      ctx.globalAlpha = chipDetail;
      const gx = focusRackX + gpu.x;
      const gy = focusRackY + gpu.y;
      const dieX = gx + gpu.w * 0.28;
      const dieY = gy + gpu.h * 0.15;
      const dieW = gpu.w * 0.44;
      const dieH = gpu.h * 0.7;
      for (let side = 0; side < 2; side++)
        for (let k = 0; k < 3; k++) {
          const sx = side ? dieX + dieW + gpu.w * 0.04 : gx + gpu.w * 0.06;
          const sy = dieY + k * (dieH / 3) + dieH * 0.03;
          ctx.fillStyle = rgba(HUE.cyan, 0.25);
          ctx.fillRect(X(sx), Y(sy), gpu.w * 0.16 * scale, (dieH / 3 - dieH * 0.06) * scale);
          ctx.strokeStyle = rgba(HUE.cyan, 0.8);
          ctx.strokeRect(X(sx), Y(sy), gpu.w * 0.16 * scale, (dieH / 3 - dieH * 0.06) * scale);
        }
      const cols = 12;
      const rows = 11;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const flicker = 0.35 + 0.35 * Math.sin(t * 4 + r * 0.9 + c * 1.7);
          ctx.fillStyle = rgba(HUE.amber, flicker);
          ctx.fillRect(
            X(dieX + (c / cols) * dieW + dieW * 0.008),
            Y(dieY + (r / rows) * dieH + dieH * 0.008),
            (dieW / cols) * 0.84 * scale,
            (dieH / rows) * 0.84 * scale,
          );
        }
      ctx.restore();
    }

    // What we are looking at, at each distance.
    const captions: [string, number][] = [
      ['one GPU: compute in the middle, memory at its sides', 1 - span(q, 0.3, 0.7)],
      [
        'one server: eight GPUs, joined by fast links',
        Math.min(span(q, 0.7, 1), 1 - span(q, 1.3, 1.7)),
      ],
      ['racks, each tied into the network', Math.min(span(q, 1.7, 2), 1 - span(q, 2.3, 2.7))],
      ['a data hall: power in, cold air in, hot air out', span(q, 2.7, 3)],
    ];
    for (const [text, alpha] of captions)
      label(ctx, text, w / 2, h - 26, { size: 13.5, color: INK.white, align: 'center', alpha });
  };
}
