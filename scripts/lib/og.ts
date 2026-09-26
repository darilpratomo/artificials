/**
 * Link previews: 1200 × 630 cards drawn at build time, one per model with test
 * results and one per featured comparison, plus the site's default card. They
 * use the site's type, colours and maker logos, and every figure carries its
 * source, as the licences require. Nothing is fetched while drawing.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createCanvas,
  GlobalFonts,
  loadImage,
  Path2D,
  type Image,
  type SKRSContext2D,
} from '@napi-rs/canvas';
import { makerColor, makerLogo } from '../../shared/makers.ts';
import { SYMBOL_PATH } from '../../src/components/logo-symbol.ts';

export const WIDTH = 1200;
export const HEIGHT = 630;
const LEFT = 64;
const RIGHT = WIDTH - 64;
const INK = '#f3f4f7';
const MUTED = '#a3a6b2';
const FAINT = '#8e909b';
const DIM = '#7d818c';
const LINE = '#24252c';
const SURFACE = '#0b0c0f';
const PANEL = '#111217';
const SANS = 'Inter';
const BRAND = 'Michroma';

/** A figure on a card: what it is, the value, and a short note such as its source. */
export interface Stat {
  label: string;
  value: string | null;
  note?: string;
}

export interface CardModel {
  name: string;
  maker: string;
  makerId: string;
}

let root = '';
/** Registers the site's fonts once, from the installed font packages. */
export function setup(projectRoot: string) {
  if (root) return;
  root = projectRoot;
  const modules = resolve(projectRoot, 'node_modules');
  GlobalFonts.registerFromPath(
    resolve(modules, '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
    SANS,
  );
  GlobalFonts.registerFromPath(
    resolve(modules, '@fontsource/michroma/files/michroma-latin-400-normal.woff'),
    BRAND,
  );
}

const logos = new Map<string, Promise<Image>>();
function logo(makerId: string) {
  const path = makerLogo(makerId);
  if (!logos.has(path)) logos.set(path, loadImage(readFileSync(resolve(root, 'public' + path))));
  return logos.get(path)!;
}

/** The largest size, down to `min`, at which the text fits the width. */
function fit(
  ctx: SKRSContext2D,
  text: string,
  weight: number,
  size: number,
  width: number,
  min = 24,
) {
  let current = size;
  ctx.font = `${weight} ${current}px ${SANS}`;
  while (current > min && ctx.measureText(text).width > width) {
    current -= 2;
    ctx.font = `${weight} ${current}px ${SANS}`;
  }
  return current;
}

/** Cuts text to the width with an ellipsis, in the current font. */
function clip(ctx: SKRSContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** Splits text into lines that fit the width, in the current font. */
function wrap(ctx: SKRSContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Background, the Artificials lockup and a label, like the site's header. */
function frame(label: string) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = SURFACE;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(
    WIDTH * 0.78,
    HEIGHT * 0.3,
    0,
    WIDTH * 0.78,
    HEIGHT * 0.3,
    620,
  );
  glow.addColorStop(0, 'rgba(207, 212, 222, 0.07)');
  glow.addColorStop(1, 'rgba(207, 212, 222, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // The mark, from the same outline as the site's logo (a 40 × 35 grid).
  ctx.save();
  ctx.translate(LEFT, 44);
  ctx.scale(0.94, 0.94);
  ctx.fillStyle = INK;
  ctx.fill(new Path2D(SYMBOL_PATH));
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.font = `22px ${BRAND}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('ARTIFICIALS', LEFT + 52, 70);
  ctx.fillStyle = MUTED;
  ctx.font = `500 20px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(label, RIGHT, 68);
  ctx.textAlign = 'left';
  return { canvas, ctx };
}

/** The data credit, which the sources' licences require, and the address. */
function footer(ctx: SKRSContext2D, credit: string) {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LEFT, 552);
  ctx.lineTo(RIGHT, 552);
  ctx.stroke();
  ctx.fillStyle = FAINT;
  ctx.font = `400 17px ${SANS}`;
  ctx.fillText(clip(ctx, credit, 820), LEFT, 590);
  ctx.fillStyle = INK;
  ctx.font = `600 20px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText('artificials.net', RIGHT, 590);
  ctx.textAlign = 'left';
}

/** A maker's logo on the light tile the site uses, so dark marks stay visible. */
async function tile(ctx: SKRSContext2D, makerId: string, x: number, y: number, size: number) {
  ctx.fillStyle = '#f6f7f9';
  roundRect(ctx, x, y, size, size, size * 0.22);
  ctx.fill();
  const inset = size * 0.2;
  ctx.drawImage(await logo(makerId), x + inset, y + inset, size - inset * 2, size - inset * 2);
}

/** The maker's colour, always drawn beside its logo or name. */
function accent(ctx: SKRSContext2D, makerId: string, x: number, y: number, height: number) {
  ctx.fillStyle = makerColor(makerId);
  roundRect(ctx, x, y, 6, height, 3);
  ctx.fill();
}

/** One model: logo, name, maker and three figures. */
export async function modelCard(model: CardModel, stats: Stat[], credit: string) {
  const { canvas, ctx } = frame('AI model profile');
  await tile(ctx, model.makerId, LEFT, 128, 112);
  accent(ctx, model.makerId, LEFT + 136, 134, 100);
  ctx.fillStyle = INK;
  fit(ctx, model.name, 600, 64, RIGHT - (LEFT + 164), 36);
  ctx.fillText(clip(ctx, model.name, RIGHT - (LEFT + 164)), LEFT + 164, 194);
  ctx.fillStyle = MUTED;
  ctx.font = `400 28px ${SANS}`;
  ctx.fillText(clip(ctx, model.maker || 'Maker not reported', 700), LEFT + 164, 236);
  const width = (RIGHT - LEFT - 2 * 20) / 3;
  for (const [index, stat] of stats.slice(0, 3).entries()) {
    const x = LEFT + index * (width + 20);
    ctx.fillStyle = PANEL;
    roundRect(ctx, x, 296, width, 212, 20);
    ctx.fill();
    ctx.strokeStyle = '#23242b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = FAINT;
    ctx.font = `500 21px ${SANS}`;
    ctx.fillText(clip(ctx, stat.label, width - 56), x + 28, 346);
    ctx.fillStyle = stat.value ? INK : DIM;
    fit(ctx, stat.value ?? 'Not reported', 600, stat.value ? 54 : 34, width - 56, 26);
    ctx.fillText(clip(ctx, stat.value ?? 'Not reported', width - 56), x + 28, 422);
    if (stat.note) {
      ctx.fillStyle = FAINT;
      ctx.font = `400 19px ${SANS}`;
      ctx.fillText(clip(ctx, stat.note, width - 56), x + 28, 468);
    }
  }
  footer(ctx, credit);
  return canvas.toBuffer('image/png');
}

/** Two models head to head, each figure on its own row, the better value bright. */
export async function comparisonCard(
  models: [CardModel, CardModel],
  rows: { label: string; values: [string | null, string | null]; best: number[] }[],
  credit: string,
) {
  const { canvas, ctx } = frame('Head to head');
  const half = (RIGHT - LEFT) / 2 - 70;
  for (const [index, model] of models.entries()) {
    const right = index === 1;
    const x = right ? RIGHT - 96 : LEFT;
    await tile(ctx, model.makerId, x, 118, 96);
    accent(ctx, model.makerId, right ? x - 22 : x + 116, 124, 84);
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillStyle = INK;
    fit(ctx, model.name, 600, 44, half, 26);
    ctx.fillText(clip(ctx, model.name, half), right ? RIGHT : LEFT, 268);
    ctx.fillStyle = MUTED;
    ctx.font = `400 24px ${SANS}`;
    ctx.fillText(clip(ctx, model.maker || 'Maker not reported', half), right ? RIGHT : LEFT, 304);
  }
  ctx.textAlign = 'left';
  // The "vs" between the two, on the centre line.
  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.arc(WIDTH / 2, 176, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2c2d35';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `600 24px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('VS', WIDTH / 2, 185);
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const y = 380 + index * 60;
    ctx.strokeStyle = '#1c1d23';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LEFT, y - 40);
    ctx.lineTo(RIGHT, y - 40);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = FAINT;
    ctx.font = `500 21px ${SANS}`;
    ctx.fillText(row.label, WIDTH / 2, y);
    for (const [side, value] of row.values.entries()) {
      ctx.textAlign = side === 0 ? 'left' : 'right';
      ctx.fillStyle =
        value === null ? DIM : row.best.includes(side) || !row.best.length ? INK : DIM;
      ctx.font = `${row.best.includes(side) ? 700 : 600} 34px ${SANS}`;
      ctx.fillText(value ?? '—', side === 0 ? LEFT : RIGHT, y + 4);
    }
  }
  ctx.textAlign = 'left';
  footer(ctx, credit);
  return canvas.toBuffer('image/png');
}

/** A headline on the left and a ranked panel on the right, for site-wide cards. */
async function headlineCard(
  label: string,
  headline: [string, string],
  text: string,
  panel: { title: string; rows: { makerIds: string[]; name: string; value?: string }[] },
  credit: string,
) {
  const { canvas, ctx } = frame(label);
  // Both lines share one size, the largest at which each fits beside the panel.
  const size = Math.min(...headline.map((line) => fit(ctx, line, 500, 80, 536, 48)));
  ctx.fillStyle = INK;
  ctx.font = `500 ${size}px ${SANS}`;
  ctx.fillText(headline[0], LEFT, 226);
  const silver = ctx.createLinearGradient(LEFT, 250, LEFT + 520, 330);
  silver.addColorStop(0, '#e0e2e9');
  silver.addColorStop(1, '#9ea3ad');
  ctx.fillStyle = silver;
  ctx.fillText(headline[1], LEFT, 314);
  ctx.fillStyle = '#bbc0cc';
  ctx.font = `400 25px ${SANS}`;
  for (const [index, line] of wrap(ctx, text, 500).slice(0, 3).entries())
    ctx.fillText(line, LEFT, 380 + index * 38);

  const x = 640;
  const width = RIGHT - x;
  ctx.fillStyle = PANEL;
  roundRect(ctx, x, 118, width, 404, 22);
  ctx.fill();
  ctx.strokeStyle = '#23242b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText(panel.title, x + 26, 164);
  for (const [index, row] of panel.rows.slice(0, 5).entries()) {
    const y = 190 + index * 64;
    if (index) {
      ctx.strokeStyle = '#1c1d23';
      ctx.beginPath();
      ctx.moveTo(x + 26, y);
      ctx.lineTo(RIGHT - 26, y);
      ctx.stroke();
    }
    let left = x + 26;
    for (const makerId of row.makerIds) {
      await tile(ctx, makerId, left, y + 13, 38);
      left += 44;
    }
    ctx.fillStyle = INK;
    ctx.font = `600 22px ${SANS}`;
    const space = RIGHT - 26 - (left + 8) - (row.value ? 90 : 0);
    ctx.fillText(clip(ctx, row.name, space), left + 8, y + 40);
    if (row.value) {
      ctx.textAlign = 'right';
      ctx.font = `600 24px ${SANS}`;
      ctx.fillText(row.value, RIGHT - 26, y + 40);
      ctx.textAlign = 'left';
    }
  }
  footer(ctx, credit);
  return canvas.toBuffer('image/png');
}

/** The site's default card: the headline and the top of the capability index. */
export function homeCard(
  models: number,
  top: { name: string; makerId: string; value: string }[],
  credit: string,
) {
  return headlineCard(
    'AI model rankings',
    ['Intelligence.', 'In perspective.'],
    `Test scores, prices and new releases for ${models.toLocaleString('en-US')} AI models, in one place.`,
    {
      title: 'Top of the capability index',
      rows: top.map(({ name, makerId, value }) => ({ makerIds: [makerId], name, value })),
    },
    credit,
  );
}

/** The comparison page's card, for any set of models without a card of its own. */
export function compareCard(pairs: { names: string[]; makerIds: string[] }[]) {
  return headlineCard(
    'Compare AI models',
    ['Side by side.', 'Beyond the hype.'],
    'Test results, prices, limits and features of any two or three AI models.',
    {
      title: 'Leading models compared',
      rows: pairs.map(({ names, makerIds }) => ({ makerIds, name: names.join(' vs ') })),
    },
    'Published test results and list prices, side by side.',
  );
}
