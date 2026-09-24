import { makerColor, makerLogo } from '../../../shared/makers';
import { linearTicks, logTicks, niceDomain, timeTicks } from './scale';

/**
 * Share images: charts redrawn on a canvas at a fixed, crisp size, with the
 * Artificials lockup and a faint watermark, so a saved chart always carries
 * its name, its data source and where it came from. Nothing is screenshotted;
 * every mark is drawn from the same data the page shows.
 */

const WIDTH = 1600;
const EXPORT_SCALE = 2.5;
const INK = '#f3f4f7';
const MUTED = '#a3a6b2';
const FAINT = '#6b7080';
const GRID = '#24252c';
const SURFACE = '#0b0c0f';
const SANS = '"Inter Variable", Inter, "Helvetica Neue", Arial, sans-serif';
const BRAND = 'Michroma, Sora, "Helvetica Neue", Arial, sans-serif';
const BRAND_MARK = '/brand/artificials-symbol-large.png';

export interface ShareFrame {
  title: string;
  subtitle?: string;
  /** Data credit, required by the sources' licences, such as "Epoch AI (CC BY 4.0)". */
  source: string;
}

export interface ShareBar {
  name: string;
  makerId: string;
  value: number;
  highlight?: boolean;
}

export interface ShareRow {
  label: string;
  detail?: string;
  value: string;
  /** Bar length from 0 to 1, when the row has one. */
  fraction?: number;
  makerId?: string;
  /** Bar colour when it is not the maker's. */
  color?: string;
}

export interface SharePoint {
  name: string;
  makerId: string;
  maker: string;
  x: number;
  y: number;
  highlight?: boolean;
}

const images = new Map<string, Promise<HTMLImageElement | null>>();
function image(src: string) {
  let request = images.get(src);
  if (!request) {
    request = new Promise((resolve) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => resolve(null);
      element.src = src;
    });
    images.set(src, request);
  }
  return request;
}

async function fontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all([
    document.fonts.load(`600 40px ${SANS}`),
    document.fonts.load(`400 20px ${SANS}`),
    document.fonts.load(`26px ${BRAND}`),
  ]).catch(() => undefined);
}

function canvas(height: number) {
  const element = document.createElement('canvas');
  element.width = Math.round(WIDTH * EXPORT_SCALE);
  element.height = Math.round(height * EXPORT_SCALE);
  const context = element.getContext('2d')!;
  context.scale(EXPORT_SCALE, EXPORT_SCALE);
  context.fillStyle = SURFACE;
  context.fillRect(0, 0, WIDTH, height);
  return { element, context };
}

function wrap(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function clip(context: CanvasRenderingContext2D, text: string, width: number) {
  if (context.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && context.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

async function drawBrandMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha = 1,
) {
  const logo = await image(BRAND_MARK);
  context.save();
  context.globalAlpha = alpha;
  if (logo) {
    context.drawImage(logo, x, y, size, size);
  } else {
    context.fillStyle = INK;
    context.font = `700 ${Math.round(size * 0.72)}px ${SANS}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('A', x + size / 2, y + size / 2);
  }
  context.restore();
}

/** Mark plus wordmark, like the header. Returns the lockup's width. */
async function drawLockup(
  context: CanvasRenderingContext2D,
  right: number,
  top: number,
  height: number,
  alpha = 1,
) {
  const markWidth = height;
  context.save();
  context.globalAlpha = alpha;
  context.font = `${Math.round(height * 0.52)}px ${BRAND}`;
  const word = 'ARTIFICIALS';
  const textWidth = context.measureText(word).width;
  const gap = height * 0.32;
  const left = right - markWidth - gap - textWidth;
  await drawBrandMark(context, left, top, markWidth, alpha);
  context.textBaseline = 'middle';
  context.fillStyle = INK;
  context.fillText(word, left + markWidth + gap, top + height / 2 + 1);
  context.restore();
  return markWidth + gap + textWidth;
}

/** Title block, lockup and a faint centred watermark. Returns the y where content starts. */
async function drawHeader(context: CanvasRenderingContext2D, frame: ShareFrame, height: number) {
  const lockup = await drawLockup(context, WIDTH - 64, 56, 44);
  context.fillStyle = INK;
  context.font = `600 44px ${SANS}`;
  context.textBaseline = 'alphabetic';
  const titleWidth = WIDTH - 128 - lockup - 40;
  const titleLines = wrap(context, frame.title, titleWidth).slice(0, 2);
  let y = 92;
  for (const line of titleLines) {
    context.fillText(line, 64, y);
    y += 54;
  }
  if (frame.subtitle) {
    context.fillStyle = MUTED;
    context.font = `400 22px ${SANS}`;
    for (const line of wrap(context, frame.subtitle, WIDTH - 128).slice(0, 3)) {
      context.fillText(line, 64, y + 4);
      y += 32;
    }
  }
  // A watermark faint enough never to compete with the data.
  const size = Math.min(160, height * 0.2);
  await drawBrandMark(context, WIDTH / 2 - size / 2, height / 2 - size / 2 + 40, size, 0.05);
  return y + 24;
}

function drawFooter(context: CanvasRenderingContext2D, frame: ShareFrame, height: number) {
  context.strokeStyle = GRID;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(64, height - 64);
  context.lineTo(WIDTH - 64, height - 64);
  context.stroke();
  context.font = `400 19px ${SANS}`;
  context.fillStyle = MUTED;
  context.textBaseline = 'middle';
  context.fillText(
    clip(context, `Data: ${frame.source}. Analysis: Artificials.`, WIDTH - 480),
    64,
    height - 34,
  );
  context.textAlign = 'right';
  context.fillStyle = INK;
  context.font = `500 19px ${SANS}`;
  context.fillText('artificials.net', WIDTH - 64, height - 34);
  context.textAlign = 'left';
}

async function drawLogo(
  context: CanvasRenderingContext2D,
  makerId: string,
  x: number,
  y: number,
  size: number,
) {
  context.fillStyle = '#f6f7f9';
  context.beginPath();
  context.roundRect(x, y, size, size, size * 0.24);
  context.fill();
  const logo = await image(makerLogo(makerId));
  if (logo) {
    const inset = size * 0.18;
    context.drawImage(logo, x + inset, y + inset, size - inset * 2, size - inset * 2);
  }
}

/** Ranked columns, like the home page chart. */
export async function rankImage(
  frame: ShareFrame,
  bars: ShareBar[],
  unit: 'percent' | 'index',
  format: (value: number) => string,
) {
  await fontsReady();
  const items = bars.slice(0, 30);
  const height = 1000;
  const { element, context } = canvas(height);
  const top = await drawHeader(context, frame, height);
  const plotTop = top + 30;
  const plotBottom = height - 330;
  const left = 110;
  const right = WIDTH - 64;
  const values = items.map((item) => item.value);
  const [min, max] =
    unit === 'percent'
      ? [0, Math.min(100, niceDomain(0, Math.max(...values), 5)[1])]
      : niceDomain(Math.min(...values) - 2, Math.max(...values), 4);
  const y = (value: number) =>
    plotBottom - ((value - min) / (max - min || 1)) * (plotBottom - plotTop);
  context.font = `400 18px ${SANS}`;
  context.textBaseline = 'middle';
  for (const tick of linearTicks(min, max, 4).ticks.filter((t) => t >= min && t <= max)) {
    context.strokeStyle = GRID;
    context.setLineDash([4, 6]);
    context.beginPath();
    context.moveTo(left, y(tick));
    context.lineTo(right, y(tick));
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = FAINT;
    context.textAlign = 'right';
    context.fillText(unit === 'index' ? tick.toFixed(0) : `${tick}%`, left - 14, y(tick));
  }
  context.textAlign = 'left';
  const step = (right - left) / items.length;
  const barWidth = Math.min(64, step * 0.68);
  const logoSize = Math.min(38, step * 0.8);
  const dimmed = items.some((item) => item.highlight);
  for (const [index, item] of items.entries()) {
    const center = left + step * index + step / 2;
    const barTop = y(item.value);
    context.globalAlpha = dimmed && !item.highlight ? 0.38 : 1;
    context.fillStyle = makerColor(item.makerId);
    context.beginPath();
    context.roundRect(center - barWidth / 2, barTop, barWidth, plotBottom - barTop, [5, 5, 0, 0]);
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = dimmed && !item.highlight ? MUTED : INK;
    context.font = `600 ${items.length > 20 ? 16 : 19}px ${SANS}`;
    context.textAlign = 'center';
    context.fillText(format(item.value), center, barTop - 16);
    await drawLogo(context, item.makerId, center - logoSize / 2, plotBottom + 14, logoSize);
    context.save();
    context.translate(center + 4, plotBottom + 22 + logoSize);
    context.rotate(-Math.PI * 0.28);
    context.textAlign = 'right';
    context.font = `${item.highlight ? 600 : 400} ${items.length > 20 ? 17 : 19}px ${SANS}`;
    context.fillStyle = item.highlight || !dimmed ? '#d5d7de' : MUTED;
    context.fillText(clip(context, item.name, 250), 0, 0);
    context.restore();
  }
  context.textAlign = 'left';
  drawFooter(context, frame, height);
  return element;
}

/** Labelled horizontal bars or plain value rows, for lists such as test results. */
export async function listImage(frame: ShareFrame, rows: ShareRow[]) {
  await fontsReady();
  const shown = rows.slice(0, 16);
  const rowHeight = 64;
  const headerGuess = 190 + (frame.subtitle ? 64 : 0);
  const height = Math.max(640, headerGuess + shown.length * rowHeight + 150);
  const { element, context } = canvas(height);
  let y = (await drawHeader(context, frame, height)) + 10;
  const hasLogos = shown.some((row) => row.makerId);
  const labelLeft = 64 + (hasLogos ? 58 : 0);
  const barLeft = 700;
  const barRight = WIDTH - 250;
  for (const row of shown) {
    if (row.makerId) await drawLogo(context, row.makerId, 64, y + 8, 42);
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    context.fillStyle = INK;
    context.font = `600 23px ${SANS}`;
    context.fillText(clip(context, row.label, barLeft - labelLeft - 30), labelLeft, y + 28);
    if (row.detail) {
      context.fillStyle = MUTED;
      context.font = `400 18px ${SANS}`;
      context.fillText(clip(context, row.detail, barLeft - labelLeft - 30), labelLeft, y + 52);
    }
    if (row.fraction !== undefined) {
      context.fillStyle = '#1c1d23';
      context.beginPath();
      context.roundRect(barLeft, y + 22, barRight - barLeft, 16, 8);
      context.fill();
      context.fillStyle = row.color ?? (row.makerId ? makerColor(row.makerId) : '#c9ccd4');
      context.beginPath();
      context.roundRect(
        barLeft,
        y + 22,
        Math.max(8, (barRight - barLeft) * Math.min(1, row.fraction)),
        16,
        8,
      );
      context.fill();
    }
    context.textAlign = 'right';
    context.fillStyle = INK;
    context.font = `600 24px ${SANS}`;
    context.fillText(row.value, WIDTH - 64, y + 36);
    context.textAlign = 'left';
    context.strokeStyle = GRID;
    context.beginPath();
    context.moveTo(64, y + rowHeight - 2);
    context.lineTo(WIDTH - 64, y + rowHeight - 2);
    context.stroke();
    y += rowHeight;
  }
  drawFooter(context, frame, height);
  return element;
}

/** Points by maker, with the frontier and shaded region the page shows. */
export async function scatterImage(
  frame: ShareFrame,
  points: SharePoint[],
  x: { kind: 'log' | 'time' | 'linear'; label: string; format: (value: number) => string },
  y: { label: string; format: (value: number) => string },
  options: {
    frontier?: 'cheapest' | 'record';
    quadrant?: boolean;
    /** Models placed by x only, drawn as rings along the bottom. */
    pending?: { name: string; makerId: string; x: number }[];
  } = {},
) {
  await fontsReady();
  const height = 1000;
  const { element, context } = canvas(height);
  let top = await drawHeader(context, frame, height);
  // Legend: makers by number of points.
  const makers = new Map<string, { name: string; count: number }>();
  for (const point of points) {
    const entry = makers.get(point.makerId) ?? { name: point.maker || 'Other', count: 0 };
    entry.count += 1;
    makers.set(point.makerId, entry);
  }
  context.font = `400 18px ${SANS}`;
  context.textBaseline = 'middle';
  let legendX = 64;
  for (const [id, entry] of [...makers].sort((a, b) => b[1].count - a[1].count).slice(0, 14)) {
    const width = context.measureText(entry.name).width + 34;
    if (legendX + width > WIDTH - 64) {
      legendX = 64;
      top += 30;
    }
    context.fillStyle = makerColor(id);
    context.beginPath();
    context.arc(legendX + 7, top, 7, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#c9ccd4';
    context.fillText(entry.name, legendX + 22, top);
    legendX += width + 14;
  }
  const plot = { left: 120, right: WIDTH - 70, top: top + 36, bottom: height - 150 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const pending = options.pending ?? [];
  const allX = [...xs, ...pending.map((point) => point.x)];
  let [x0, x1] = [Math.min(...allX), Math.max(...allX)];
  if (x.kind === 'log') [x0, x1] = [x0 / 1.4, x1 * 1.4];
  else {
    const pad = (x1 - x0) * 0.04 || 1;
    [x0, x1] = [x0 - pad, x1 + pad];
  }
  const [y0, y1] = niceDomain(Math.min(...ys), Math.max(...ys), 5);
  const sx = (value: number) =>
    plot.left +
    (x.kind === 'log'
      ? (Math.log10(value) - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0))
      : (value - x0) / (x1 - x0)) *
      (plot.right - plot.left);
  const sy = (value: number) =>
    plot.bottom - ((value - y0) / (y1 - y0 || 1)) * (plot.bottom - plot.top);
  if (options.quadrant) {
    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    };
    context.fillStyle = 'rgba(255,255,255,0.05)';
    context.fillRect(
      plot.left,
      plot.top,
      sx(median(xs)) - plot.left,
      sy(median(ys)) - plot.top,
    );
  }
  context.font = `400 17px ${SANS}`;
  for (const tick of linearTicks(y0, y1, 6).ticks.filter((t) => t >= y0 && t <= y1)) {
    context.strokeStyle = GRID;
    context.setLineDash([4, 6]);
    context.beginPath();
    context.moveTo(plot.left, sy(tick));
    context.lineTo(plot.right, sy(tick));
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = FAINT;
    context.textAlign = 'right';
    context.fillText(y.format(tick), plot.left - 12, sy(tick));
  }
  const xTicks =
    x.kind === 'log'
      ? logTicks(x0, x1, 9)
      : x.kind === 'time'
        ? timeTicks(x0, x1)
        : linearTicks(x0, x1, 6).ticks;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  for (const tick of xTicks) {
    context.fillStyle = FAINT;
    context.fillText(x.format(tick), sx(tick), plot.bottom + 12);
  }
  context.fillStyle = '#b5b8c2';
  context.fillText(x.label, (plot.left + plot.right) / 2, plot.bottom + 44);
  context.save();
  context.translate(40, (plot.top + plot.bottom) / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(y.label, 0, 0);
  context.restore();
  context.strokeStyle = '#3a3c46';
  context.beginPath();
  context.moveTo(plot.left, plot.bottom);
  context.lineTo(plot.right, plot.bottom);
  context.stroke();

  const ordered = [...points].sort((a, b) => a.x - b.x || b.y - a.y);
  const front: SharePoint[] = [];
  if (options.frontier) {
    let best = -Infinity;
    for (const point of ordered)
      if (point.y > best) {
        best = point.y;
        front.push(point);
      }
    context.strokeStyle = '#d5d7de';
    context.lineWidth = 2.5;
    context.setLineDash([2, 7]);
    context.lineCap = 'round';
    context.beginPath();
    front.forEach((point, index) => {
      if (!index) context.moveTo(sx(point.x), sy(point.y));
      else if (options.frontier === 'record') {
        context.lineTo(sx(point.x), sy(front[index - 1].y));
        context.lineTo(sx(point.x), sy(point.y));
      } else context.lineTo(sx(point.x), sy(point.y));
    });
    if (options.frontier === 'record' && front.length)
      context.lineTo(plot.right, sy(front[front.length - 1].y));
    context.stroke();
    context.setLineDash([]);
    context.lineWidth = 1;
  }
  const dimmed = points.some((point) => point.highlight);
  for (const point of [...points].sort((a, b) => Number(!!a.highlight) - Number(!!b.highlight))) {
    context.globalAlpha = dimmed && !point.highlight ? 0.3 : 1;
    context.fillStyle = makerColor(point.makerId);
    context.strokeStyle = point.highlight ? '#f0f0f3' : SURFACE;
    context.lineWidth = point.highlight ? 3 : 2.5;
    context.beginPath();
    context.arc(sx(point.x), sy(point.y), point.highlight ? 11 : 8, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.globalAlpha = 1;
  [...pending]
    .sort((a, b) => a.x - b.x)
    .forEach((point, index) => {
      context.fillStyle = SURFACE;
      context.strokeStyle = makerColor(point.makerId);
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(sx(point.x), plot.bottom - (index % 2 ? 28 : 13), 7, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    });
  if (pending.length) {
    context.font = `400 17px ${SANS}`;
    context.fillStyle = MUTED;
    context.textAlign = 'right';
    context.textBaseline = 'alphabetic';
    context.fillText('Rings: released, not scored yet', plot.right, plot.bottom - 44);
    context.textAlign = 'left';
  }
  // Direct labels for the highlight, the frontier and the top scores, without overlaps.
  const boxes: [number, number, number, number][] = [];
  context.font = `500 18px ${SANS}`;
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  const wanted = [
    ...points.filter((point) => point.highlight),
    ...[...front].sort((a, b) => b.y - a.y),
    ...[...points].sort((a, b) => b.y - a.y),
  ];
  const seen = new Set<string>();
  for (const point of wanted) {
    if (boxes.length >= 14 || seen.has(point.name)) continue;
    seen.add(point.name);
    const text = clip(context, point.name, 260);
    const width = context.measureText(text).width;
    for (const [dx, align] of [
      [14, 'left'],
      [-14 - width, 'left'],
    ] as const) {
      const bx = sx(point.x) + dx;
      const by = sy(point.y) - 12;
      const inside = bx > plot.left && bx + width < plot.right && by > plot.top;
      const clear = boxes.every(
        ([ox, oy, ow, oh]) => bx + width < ox || ox + ow < bx || by + 24 < oy || oy + oh < by,
      );
      if (inside && clear) {
        boxes.push([bx, by, width, 24]);
        context.textAlign = align;
        context.lineWidth = 5;
        context.strokeStyle = SURFACE;
        context.strokeText(text, bx, by + 12);
        context.fillStyle = '#e6e7ec';
        context.fillText(text, bx, by + 12);
        break;
      }
    }
  }
  drawFooter(context, frame, height);
  return element;
}

export function fileName(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `artificials-${slug || 'chart'}.png`;
}

/**
 * Saves the image: the share sheet on phones, where it can go straight to a
 * chat or social app, and a download everywhere else.
 */
export async function saveImage(element: HTMLCanvasElement, name: string, title: string) {
  const blob = await new Promise<Blob | null>((resolve) => element.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The image could not be created.');
  const file = new File([blob], name, { type: 'image/png' });
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
