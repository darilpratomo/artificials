import { INK, dotGrid, easeInOut, label, lines, rgba, spectrum, textWidth, wash } from './kit';

/** The dark ground under a chart, washed with one colour of the spectrum. */
export function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  ctx.fillStyle = INK.void;
  ctx.fillRect(0, 0, w, h);
  dotGrid(ctx, w, h, 30, INK.silver, 0.035);
  wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(hue), 0.1);
}

/** What the picture shows, in a line or two under it. */
export function note(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  text: string,
  alpha: number,
) {
  if (alpha > 0.01)
    lines(ctx, text, w / 2, h - 16, w - 32, {
      size: 12.5,
      color: INK.silver,
      align: 'center',
      alpha,
      from: 'bottom',
    });
}

export interface Entry {
  color: string;
  text: string;
}
/** A key of colours and names, in rows; returns its height. Draws nothing when `alpha` is 0. */
export function legend(
  ctx: CanvasRenderingContext2D,
  entries: Entry[],
  x: number,
  y: number,
  width: number,
  alpha: number,
) {
  const size = 11.5;
  let cx = x;
  let cy = y;
  for (const entry of entries) {
    const room = 14 + textWidth(ctx, entry.text, size);
    if (cx > x && cx + room > x + width) {
      cx = x;
      cy += 18;
    }
    if (alpha > 0.01) {
      ctx.fillStyle = rgba(entry.color, alpha);
      ctx.beginPath();
      ctx.arc(cx + 4, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, entry.text, cx + 14, cy, { size, color: INK.silver, alpha });
    }
    cx += room + 14;
  }
  return cy - y + 18;
}

export interface IntervalRow {
  name: string;
  color: string;
  score: number;
  low?: number;
  high?: number;
}

/**
 * Scores as rows of dots, each with the range it could really lie in: names
 * on the left, the scale below. The leader's range is shaded down every row,
 * and names outside it step back once the ranges show.
 */
export function intervalRows(
  ctx: CanvasRenderingContext2D,
  w: number,
  rows: IntervalRow[],
  area: { top: number; bottom: number },
  shown: { ranges: number; alpha?: number },
  format: (value: number) => string = (value) => `${value}`,
) {
  const alpha = shown.alpha ?? 1;
  if (alpha <= 0.01 || !rows.length) return;
  const ranges = easeInOut(shown.ranges);
  const size = w < 620 ? 11.5 : 12.5;
  const names = Math.min(
    w * 0.42,
    Math.max(...rows.map((row) => textWidth(ctx, row.name, size, 600))) + 8,
  );
  const lows = rows.map((row) => row.low ?? row.score);
  const highs = rows.map((row) => row.high ?? row.score);
  const pad = (Math.max(...highs) - Math.min(...lows)) * 0.06 || 1;
  const low = Math.min(...lows) - pad;
  const high = Math.max(...highs) + pad;
  const left = 16 + names + 12;
  const right = w - 20;
  const rowH = Math.min(34, (area.bottom - area.top - 20) / rows.length);
  const x = (value: number) => left + ((value - low) / (high - low)) * (right - left);
  const leader = rows[0];
  const inside = (row: IntervalRow) =>
    (row.high ?? row.score) >= (leader.low ?? leader.score) &&
    (row.low ?? row.score) <= (leader.high ?? leader.score);
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (ranges > 0.01 && leader.low !== undefined && leader.high !== undefined) {
    ctx.fillStyle = rgba(INK.silver, 0.08 * ranges);
    ctx.fillRect(x(leader.low), area.top, x(leader.high) - x(leader.low), rowH * rows.length);
  }
  rows.forEach((row, index) => {
    const y = area.top + index * rowH + rowH / 2;
    label(ctx, row.name, 16 + names, y, {
      size,
      weight: 600,
      color: INK.white,
      align: 'right',
      alpha: ranges > 0.5 && !inside(row) ? 0.6 : 1,
    });
    if (row.low !== undefined && row.high !== undefined && ranges > 0.01) {
      ctx.strokeStyle = rgba(row.color, 0.8 * ranges);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x(row.low), y);
      ctx.lineTo(x(row.high), y);
      ctx.moveTo(x(row.low), y - 4);
      ctx.lineTo(x(row.low), y + 4);
      ctx.moveTo(x(row.high), y - 4);
      ctx.lineTo(x(row.high), y + 4);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(row.color, 1);
    ctx.beginPath();
    ctx.arc(x(row.score), y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });
  // The scale under the rows: four or five round values.
  const spread = high - low;
  const step = [0.5, 1, 2, 4, 5, 10, 20, 25, 50].find((value) => spread / value <= 5) ?? 100;
  const axisY = area.top + rowH * rows.length + 14;
  for (let value = Math.ceil(low / step) * step; value <= high; value += step)
    label(ctx, format(value), x(value), axisY, {
      size: 10.5,
      face: 'mono',
      color: INK.muted,
      align: 'center',
    });
  ctx.restore();
}

/** How many rows reach into the first row's range. */
export const withinLeader = (rows: IntervalRow[]) =>
  rows.filter(
    (row) =>
      (row.high ?? row.score) >= (rows[0].low ?? rows[0].score) &&
      (row.low ?? row.score) <= (rows[0].high ?? rows[0].score),
  ).length;
