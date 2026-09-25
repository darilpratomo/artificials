/**
 * Generates the downloadable brand files from the same smooth symbol the site
 * renders (src/components/logo-symbol.ts), so a saved logo can never drift from
 * the one on screen.
 *
 * Outputs to public/brand/:
 *   artificials-logo.svg        mark only, scalable
 *   artificials-logo.png        mark only, 240px, edge to edge (the page's copy)
 *   artificials-logo-large.png  mark only, 960px, edge to edge (print reuse and
 *                               the mark drawn on shared chart images)
 *   artificials-mark.png        mark only, 252px, used as the browser icon
 *   artificials-lockup.svg      mark plus the ARTIFICIALS wordmark
 * and public/favicon.svg        rounded dark tile, for the browser tab
 *
 * Run with: node scripts/build-logo.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const ROOT = new URL('..', import.meta.url);
const OUT = new URL('public/brand/', ROOT);
/** The symbol's grid, shared with the pixel matrix the header animates. */
const COLUMNS = 40;
const ROWS = 35;

/** Read the symbol from the TypeScript module so there is one source of truth. */
async function loadSymbol() {
  const source = await readFile(new URL('src/components/logo-symbol.ts', ROOT), 'utf8');
  const match = source.match(/SYMBOL_PATH =\s*'([^']+)'/);
  if (!match) throw new Error('No SYMBOL_PATH found in logo-symbol.ts');
  return match[1];
}

/**
 * Flattens the path into closed polygons. The symbol uses only M, L, A and Z,
 * with circular arcs, so that is all this reads.
 */
function polygons(path, steps = 24) {
  const tokens = path.match(/[MLAZ]|-?\d*\.?\d+/g);
  const shapes = [];
  let shape = [];
  let x = 0;
  let y = 0;
  for (let index = 0; index < tokens.length;) {
    const command = tokens[index++];
    const number = () => Number(tokens[index++]);
    if (command === 'M' || command === 'L') {
      x = number();
      y = number();
      if (command === 'M' && shape.length) shapes.push(shape);
      if (command === 'M') shape = [];
      shape.push([x, y]);
    } else if (command === 'A') {
      const radius = number();
      number(); // ry equals rx for these circular corners
      number(); // no rotation
      const large = number();
      const sweep = number();
      const tx = number();
      const ty = number();
      // Endpoint to centre conversion (SVG 1.1, appendix F.6), for a circle.
      const hx = (x - tx) / 2;
      const hy = (y - ty) / 2;
      const r = Math.max(radius, Math.hypot(hx, hy));
      const root = Math.sqrt(Math.max(0, (r * r - hx * hx - hy * hy) / (hx * hx + hy * hy)));
      const sign = large === sweep ? -1 : 1;
      const cx = sign * root * hy + (x + tx) / 2;
      const cy = -sign * root * hx + (y + ty) / 2;
      const start = Math.atan2(y - cy, x - cx);
      let turn = Math.atan2(ty - cy, tx - cx) - start;
      if (sweep && turn < 0) turn += Math.PI * 2;
      if (!sweep && turn > 0) turn -= Math.PI * 2;
      for (let step = 1; step <= steps; step += 1) {
        const angle = start + (turn * step) / steps;
        shape.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }
      x = tx;
      y = ty;
    } else if (command === 'Z') {
      shapes.push(shape);
      shape = [];
    }
  }
  if (shape.length) shapes.push(shape);
  return shapes;
}

/**
 * Coverage of each pixel, 0 to 1: 16 sample rows per pixel, each filled with
 * exact horizontal coverage, so edges are smooth without any dependency.
 */
function rasterize(shapes, width, height, scale, left, top) {
  const SAMPLES = 16;
  const coverage = new Float32Array(width * height);
  const edges = shapes.flatMap((shape) =>
    shape.map((point, index) => {
      const next = shape[(index + 1) % shape.length];
      return [
        left + point[0] * scale,
        top + point[1] * scale,
        left + next[0] * scale,
        top + next[1] * scale,
      ];
    }),
  );
  for (let row = 0; row < height; row += 1) {
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      const sy = row + (sample + 0.5) / SAMPLES;
      const crossings = [];
      for (const [x1, y1, x2, y2] of edges)
        if (y1 <= sy !== y2 <= sy) crossings.push(x1 + ((sy - y1) * (x2 - x1)) / (y2 - y1));
      crossings.sort((a, b) => a - b);
      for (let index = 0; index + 1 < crossings.length; index += 2) {
        const from = Math.max(0, crossings[index]);
        const to = Math.min(width, crossings[index + 1]);
        for (let column = Math.floor(from); column < Math.ceil(to); column += 1) {
          const share = Math.min(to, column + 1) - Math.max(from, column);
          if (share > 0) coverage[row * width + column] += share / SAMPLES;
        }
      }
    }
  }
  return coverage;
}

/** The art is wider than it is tall, but icons and saved files are square. */
const SIDE = Math.max(COLUMNS, ROWS);
const OFFSET_X = (SIDE - COLUMNS) / 2;
const OFFSET_Y = (SIDE - ROWS) / 2;

function markSvg(symbol, { color = '#ffffff', padding = 1 } = {}) {
  const size = SIDE + padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 24}" height="${size * 24}" fill="${color}" role="img" aria-label="Artificials"><title>Artificials</title><path transform="translate(${padding + OFFSET_X} ${padding + OFFSET_Y})" d="${symbol}"/></svg>`;
}

function lockupSvg(symbol, { color = '#ffffff' } = {}) {
  // The wordmark is text, so the file stays small and editable. Viewers without
  // the font fall back to a generic sans-serif rather than losing the word.
  const gap = 6;
  const textX = COLUMNS + gap;
  const width = textX + 78;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${ROWS}" width="${width * 16}" height="${ROWS * 16}" role="img" aria-label="Artificials"><title>Artificials</title><path fill="${color}" d="${symbol}"/><text x="${textX}" y="${ROWS / 2}" fill="${color}" font-family="Michroma, Sora, 'Helvetica Neue', Arial, sans-serif" font-size="7.4" letter-spacing="0.18" dominant-baseline="central">ARTIFICIALS</text></svg>`;
}

/**
 * Browser tabs sit on light and dark chrome alike, so the favicon carries its
 * own dark tile rather than relying on a transparent white mark that would
 * vanish against a light tab strip.
 */
function faviconSvg(symbol, { mark = '#f5f5f7', tile = '#0a0a0d' } = {}) {
  const pad = 4;
  const size = SIDE + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="${tile}"/><path fill="${mark}" transform="translate(${pad + OFFSET_X} ${pad + OFFSET_Y})" d="${symbol}"/></svg>`;
}

/* --- Minimal PNG writer: no dependency needed for a one-colour mark. --- */
function crc32(bytes) {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const body = Buffer.concat([head.subarray(4), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, data, tail]);
}

/**
 * Renders the symbol as a square, transparent PNG. A white mark only varies in
 * opacity, so each pixel is one palette index: white at one of `levels`
 * opacities. 32 levels are indistinguishable at the edges and keep the page's
 * copy to about two kilobytes.
 */
function markPng(symbol, { scale, padding = 1, levels = 256 } = {}) {
  const size = (SIDE + padding * 2) * scale;
  const coverage = rasterize(
    polygons(symbol),
    size,
    size,
    scale,
    (padding + OFFSET_X) * scale,
    (padding + OFFSET_Y) * scale,
  );
  const raw = Buffer.alloc((size + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const offset = y * (size + 1);
    raw[offset] = 0; // No filter: flat runs compress best as they are.
    for (let x = 0; x < size; x += 1)
      raw[offset + 1 + x] = Math.round(Math.min(1, coverage[y * size + x]) * (levels - 1));
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 3; // palette
  const palette = Buffer.alloc(levels * 3, 255);
  const opacity = Buffer.from(
    Array.from({ length: levels }, (_, index) => Math.round((index * 255) / (levels - 1))),
  );
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('PLTE', palette),
    chunk('tRNS', opacity),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const symbol = await loadSymbol();
await mkdir(OUT, { recursive: true });

const files = [
  ['artificials-logo.svg', Buffer.from(markSvg(symbol))],
  ['artificials-lockup.svg', Buffer.from(lockupSvg(symbol))],
  // Edge to edge, like the drawn mark, so the image and the SVG line up.
  // About 1000px for anyone saving the logo to reuse it at print size.
  ['artificials-logo-large.png', markPng(symbol, { scale: 24, padding: 0 })],
  // The copy the page shows and links for right-click saving: sharp at three
  // times its on-screen size, and small enough to cost almost nothing.
  ['artificials-logo.png', markPng(symbol, { scale: 6, padding: 0, levels: 32 })],
  ['artificials-mark.png', markPng(symbol, { scale: 6, levels: 32 })],
];

for (const [name, data] of files) {
  await writeFile(new URL(name, OUT), data);
  console.log(`${name.padEnd(26)} ${(data.length / 1024).toFixed(1)} KB`);
}

// The tab icon lives at the site root, not under /brand.
const favicon = Buffer.from(faviconSvg(symbol));
await writeFile(new URL('public/favicon.svg', ROOT), favicon);
console.log(`${'favicon.svg'.padEnd(26)} ${(favicon.length / 1024).toFixed(1)} KB`);
