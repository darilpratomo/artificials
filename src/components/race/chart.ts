import type { Race } from '../../../shared/race';
import { INK, label, rgba, textWidth } from '../descent/kit';

export const day = (date: string) => Date.parse(`${date}T00:00:00Z`);
const YEAR = 365.25 * 864e5;

/** Where the chart sits in the picture, and how dates and values map onto it. */
export interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
  start: number;
  end: number;
  low: number;
  high: number;
  x: (time: number) => number;
  y: (value: number) => number;
}

/**
 * A time chart: release date across, a value up. Values run on a log scale
 * when `log` is set, as prices do.
 */
export function plot(
  box: { left: number; right: number; top: number; bottom: number },
  start: number,
  end: number,
  low: number,
  high: number,
  log = false,
): Plot {
  const scale = log ? Math.log10 : (value: number) => value;
  const [a, b] = [scale(low), scale(high)];
  return {
    ...box,
    start,
    end,
    low,
    high,
    x: (time) => box.left + ((time - start) / (end - start)) * (box.right - box.left),
    y: (value) => box.bottom - ((scale(value) - a) / (b - a)) * (box.bottom - box.top),
  };
}

/** The race's time span: from the start of its first year to a little after its last model. */
export function timeSpan(race: Race) {
  const first = day(race.models[0].date);
  const last = day(race.models.at(-1)!.date);
  const start = Date.UTC(new Date(first).getUTCFullYear(), 0, 1);
  return { start, end: last + 0.06 * (last - start) };
}

/** The chart's frame inside a picture, leaving room for axis labels and a note below. */
export function frame(w: number, h: number, extra = { top: 0, bottom: 0 }) {
  const narrow = w < 620;
  return {
    left: narrow ? 34 : 48,
    right: w - (narrow ? 12 : 24),
    top: 24 + extra.top,
    bottom: h - 70 - extra.bottom,
  };
}

/** Years along the bottom, values up the side, faint lines across. */
export function axes(
  ctx: CanvasRenderingContext2D,
  p: Plot,
  ticks: number[],
  format: (value: number) => string,
  alpha = 1,
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;
  for (const value of ticks) {
    const y = p.y(value);
    ctx.strokeStyle = rgba(INK.silver, 0.08);
    ctx.beginPath();
    ctx.moveTo(p.left, y);
    ctx.lineTo(p.right, y);
    ctx.stroke();
    label(ctx, format(value), p.left - 6, y, {
      size: 10.5,
      face: 'mono',
      color: INK.muted,
      align: 'right',
    });
  }
  const first = new Date(p.start).getUTCFullYear();
  const last = new Date(p.end).getUTCFullYear();
  for (let year = first; year <= last; year++) {
    const time = Date.UTC(year, 0, 1);
    const x = p.x(time);
    if (x < p.left - 1 || x > p.right) continue;
    ctx.strokeStyle = rgba(INK.silver, 0.08);
    ctx.beginPath();
    ctx.moveTo(x, p.top);
    ctx.lineTo(x, p.bottom);
    ctx.stroke();
    // The year's name sits in the middle of its stretch when the whole year shows.
    const middle = p.x(Math.min(time + YEAR / 2, p.end - YEAR * 0.05));
    if (middle - x > textWidth(ctx, `${year}`, 11) / 2 + 2)
      label(ctx, `${year}`, middle, p.bottom + 16, {
        size: 11,
        color: INK.muted,
        align: 'center',
      });
  }
  ctx.strokeStyle = rgba(INK.silver, 0.25);
  ctx.beginPath();
  ctx.moveTo(p.left, p.bottom);
  ctx.lineTo(p.right, p.bottom);
  ctx.stroke();
  ctx.restore();
}

/** Round values for gridlines, from `low` to `high`. */
export function ticks(low: number, high: number, step: number) {
  const values: number[] = [];
  for (let value = Math.ceil(low / step) * step; value <= high; value += step) values.push(value);
  return values;
}

/** A price as the page states it: whole cents above a dollar, three places below a dime. */
export const dollars = (value: number) =>
  `$${value >= 1 ? value.toFixed(2).replace(/\.00$/, '') : value.toFixed(value < 0.1 ? 3 : 2)}`;

/** A month and year, as in "Mar 2024". */
export const month = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
