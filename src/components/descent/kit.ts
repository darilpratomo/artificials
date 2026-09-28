/**
 * Drawing tools shared by every scene: the palette, easing, a seeded random
 * source, glows, labels and a small 3D projection. Everything is plain
 * Canvas 2D, with no dependency.
 */
import { clamp } from './engine';

export { clamp };

/**
 * The page's light: a spectrum from violet to red that the story walks down as
 * it goes deeper into the machine. Neighbouring hues are close, so they encode
 * depth, never categories; see CATEGORIES for colours shown side by side.
 */
export const HUE = {
  violet: '#8b7cf6',
  blue: '#4f8df7',
  cyan: '#38c6e6',
  green: '#3fcf9a',
  amber: '#f5b942',
  orange: '#f07a3a',
  red: '#ec5466',
} as const;
export const SPECTRUM = [HUE.violet, HUE.blue, HUE.cyan, HUE.green, HUE.amber, HUE.orange, HUE.red];
/**
 * Colours shown side by side as categories. Each pair keeps an OKLab distance
 * of at least 15 under normal vision and 15 under simulated colour blindness on
 * the page's background; each is at least 5.8:1 against it. Always labelled.
 */
export const CATEGORIES = [HUE.cyan, HUE.violet, HUE.amber, HUE.red] as const;
/** A second set that separates just as well, for scenes that need other hues. */
export const TRIAD = [HUE.blue, HUE.green, HUE.orange] as const;

export const INK = {
  white: '#f3f4f8',
  silver: '#b9bdc9',
  muted: '#7d8191',
  faint: '#3b3f4c',
  line: '#ffffff17',
  void: '#05060a',
  panel: '#0c0e15',
} as const;

// Easing and timing.
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Progress through part of a range: 0 before `start`, 1 after `end`. */
export const span = (p: number, start: number, end: number) =>
  clamp((p - start) / (end - start || 1));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** A gentle overshoot, for things that land. */
export const easeBack = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
/** A value that rises and falls once over [start, end]. */
export const bell = (p: number, start: number, end: number) =>
  Math.sin(span(p, start, end) * Math.PI);

/** A seeded random source, so every drawing is the same every time. */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A standard normal value from a random source. */
export function gaussian(next: () => number) {
  const u = Math.max(1e-9, next());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
}

// Colour.
const parsed = new Map<string, [number, number, number]>();
export function rgb(hex: string): [number, number, number] {
  let value = parsed.get(hex);
  if (!value) {
    value = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
    parsed.set(hex, value);
  }
  return value;
}
export function rgba(hex: string, alpha: number) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${clamp(alpha).toFixed(3)})`;
}
export function mixHex(a: string, b: string, t: number) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const c = (x: number, y: number) =>
    Math.round(lerp(x, y, clamp(t)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}
/** A colour along the spectrum: 0 is violet, 1 is red. */
export function spectrum(t: number) {
  const x = clamp(t) * (SPECTRUM.length - 1);
  const i = Math.min(SPECTRUM.length - 2, Math.floor(x));
  return mixHex(SPECTRUM[i], SPECTRUM[i + 1], x - i);
}

// Glow: a soft round light, drawn from a cached sprite for speed.
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(color: string) {
  let canvas = sprites.get(color);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, rgba(color, 1));
    gradient.addColorStop(0.25, rgba(color, 0.55));
    gradient.addColorStop(0.6, rgba(color, 0.12));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    sprites.set(color, canvas);
  }
  return canvas;
}
export function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 1,
) {
  if (alpha <= 0.002 || radius <= 0.2) return;
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * clamp(alpha);
  ctx.drawImage(sprite(color), x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = previous;
}
/** Draws `paint` with light adding up, as glows do. */
export function additive(ctx: CanvasRenderingContext2D, paint: () => void) {
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  paint();
  ctx.globalCompositeOperation = previous;
}

// Shapes.
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
export function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
  alpha = 1,
) {
  if (alpha <= 0.002) return;
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
export function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 1,
) {
  if (alpha <= 0.002 || r <= 0) return;
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
/** A point along a quadratic curve from (x1, y1) to (x2, y2) through (cx, cy). */
export function curvePoint(
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  t: number,
) {
  const u = 1 - t;
  return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2];
}
export function arrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  color: string,
  alpha = 1,
) {
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - 0.45), y - size * Math.sin(angle - 0.45));
  ctx.lineTo(x - size * Math.cos(angle + 0.45), y - size * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

// Text.
const FACES = {
  display: '"Plus Jakarta Sans Variable", "Inter Variable", system-ui, sans-serif',
  body: '"Inter Variable", system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;
export interface LabelStyle {
  size?: number;
  weight?: number;
  color?: string;
  alpha?: number;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  face?: keyof typeof FACES;
  /** A colour laid behind the text, so the lines of a picture never run through it. */
  backing?: string;
}
export function font(size: number, weight = 500, face: keyof typeof FACES = 'body') {
  return `${weight} ${size}px ${FACES[face]}`;
}
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  {
    size = 13,
    weight = 500,
    color = INK.silver,
    alpha = 1,
    align = 'left',
    baseline = 'middle',
    face = 'body',
    backing,
  }: LabelStyle = {},
) {
  if (alpha <= 0.002) return;
  ctx.font = font(size, weight, face);
  if (backing) {
    const width = ctx.measureText(text).width;
    const left =
      align === 'center' ? x - width / 2 : align === 'right' || align === 'end' ? x - width : x;
    const top =
      baseline === 'middle'
        ? y - size * 0.62
        : baseline === 'top'
          ? y - size * 0.1
          : y - size * 0.9;
    roundRect(ctx, left - 5, top, width + 10, size * 1.24, 5);
    ctx.fillStyle = rgba(backing, alpha * 0.92);
    ctx.fill();
  }
  ctx.fillStyle = rgba(color, alpha);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
}
export function textWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  weight = 500,
  face: keyof typeof FACES = 'body',
) {
  ctx.font = font(size, weight, face);
  return ctx.measureText(text).width;
}
/** Breaks text into lines no wider than `width`. */
export function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  size: number,
  weight = 500,
  face: keyof typeof FACES = 'body',
) {
  ctx.font = font(size, weight, face);
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const longer = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(longer).width > width) {
      lines.push(line);
      line = word;
    } else line = longer;
  }
  return line ? [...lines, line] : lines;
}
/**
 * Text wrapped to `width`, its first line at `y`, or its last line when
 * `from` is 'bottom'. Returns the height the lines take.
 */
export function lines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  style: LabelStyle & { from?: 'top' | 'bottom' } = {},
) {
  const size = style.size ?? 13;
  const rows = wrap(ctx, text, width, size, style.weight, style.face);
  const leading = Math.round(size * 1.4);
  const first = style.from === 'bottom' ? y - (rows.length - 1) * leading : y;
  rows.forEach((row, index) => label(ctx, row, x, first + index * leading, style));
  return rows.length * leading;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const covers = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) *
  Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
/**
 * Room for labels that move. Placed in order of importance, each label fades
 * as far as it would cover one placed before it or leave the picture, so
 * words never pile up, and nothing jumps as they drift apart again.
 */
export function crowd(w: number, h: number, inset = 4) {
  const taken: { box: Box; weight: number }[] = [];
  const frame: Box = { x0: inset, y0: inset, x1: w - inset, y1: h - inset };
  return {
    /** Keeps a box clear, such as a caption. */
    keep(box: Box) {
      taken.push({ box, weight: 1 });
    },
    /** How visible a label in `box` may be, from 0 to 1; it then holds that much of its room. */
    place(box: Box, presence = 1) {
      const padded = { x0: box.x0 - 2, y0: box.y0 - 2, x1: box.x1 + 2, y1: box.y1 + 2 };
      const area = (padded.x1 - padded.x0) * (padded.y1 - padded.y0);
      let covered = area - covers(padded, frame);
      for (const other of taken) covered += covers(padded, other.box) * other.weight;
      const room = 1 - smooth(Math.min(1, covered / (area * 0.08)));
      taken.push({ box, weight: room * Math.min(1, presence * 1.5) });
      return room;
    },
  };
}

// Backgrounds.
/** A faint dot grid behind a picture. */
export function dotGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  gap: number,
  color: string = INK.silver,
  alpha = 0.07,
) {
  ctx.fillStyle = rgba(color, alpha);
  for (let y = gap / 2; y < h; y += gap)
    for (let x = gap / 2; x < w; x += gap) ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
}
/** A soft coloured light behind the picture. */
export function wash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 0.18,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgba(color, alpha));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

// A little 3D: rotate a point, then project it onto the screen.
export type Vec3 = [number, number, number];
export function rotateY([x, y, z]: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c + z * s, y, -x * s + z * c];
}
export function rotateX([x, y, z]: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x, y * c - z * s, y * s + z * c];
}
/** Screen position and scale of a point `distance` in front of the camera. */
export function project([x, y, z]: Vec3, cx: number, cy: number, focal: number, distance: number) {
  const depth = Math.max(0.05, z + distance);
  const scale = focal / depth;
  return { x: cx + x * scale, y: cy + y * scale, scale, depth };
}

/** The largest box of a given aspect ratio that fits, centred. */
export function fit(w: number, h: number, aspect: number, margin = 0) {
  const width = Math.min(w - margin * 2, (h - margin * 2) * aspect);
  const height = width / aspect;
  return { x: (w - width) / 2, y: (h - height) / 2, w: width, h: height };
}
