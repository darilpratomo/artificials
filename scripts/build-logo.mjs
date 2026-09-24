/**
 * Generates the downloadable brand files from the same pixel matrix the site
 * renders, so a saved logo can never drift from the one on screen.
 *
 * Outputs to public/brand/:
 *   artificials-logo.svg        mark only, scalable, currentColor-free
 *   artificials-logo.png        mark only, 256px, transparent (linked by the page)
 *   artificials-logo-large.png  mark only, 1024px, for print reuse
 *   artificials-mark.png        mark only, 256px, used as the browser icon
 *   artificials-lockup.svg      mark plus the ARTIFICIALS wordmark
 * and public/favicon.svg        rounded dark tile, for the browser tab
 *
 * Run with: node scripts/build-logo.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const ROOT = new URL('..', import.meta.url);
const OUT = new URL('public/brand/', ROOT);

/** Read the matrix from the TypeScript module so there is one source of truth. */
async function loadMatrix() {
  const source = await readFile(new URL('src/components/logo-matrix.ts', ROOT), 'utf8');
  const body = source.slice(source.indexOf('LOGO_MATRIX = ['), source.indexOf('] as const;'));
  const rows = [...body.matchAll(/'([01]+)'/g)].map((match) => match[1]);
  if (!rows.length) throw new Error('No matrix rows found in logo-matrix.ts');
  const width = rows[0].length;
  if (rows.some((row) => row.length !== width))
    throw new Error('Matrix rows have inconsistent lengths');
  return rows;
}

/** Merge horizontal runs so the SVG holds a few rectangles, not hundreds. */
function runsOf(row) {
  const runs = [];
  let start = -1;
  for (let index = 0; index <= row.length; index += 1) {
    const active = row[index] === '1';
    if (active && start === -1) start = index;
    if (!active && start !== -1) {
      runs.push([start, index - start]);
      start = -1;
    }
  }
  return runs;
}

function markSvg(matrix, { color = '#ffffff', padding = 1 } = {}) {
  const columns = matrix[0].length;
  const rows = matrix.length;
  const rects = matrix
    .flatMap((row, y) =>
      runsOf(row).map(
        ([x, width]) => `<rect x="${x + padding}" y="${y + padding}" width="${width}" height="1"/>`,
      ),
    )
    .join('');
  const size = columns + padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${rows + padding * 2}" width="${size * 32}" height="${(rows + padding * 2) * 32}" fill="${color}" shape-rendering="crispEdges" role="img" aria-label="Artificials"><title>Artificials</title>${rects}</svg>`;
}

function lockupSvg(matrix, { color = '#ffffff' } = {}) {
  const columns = matrix[0].length;
  const rows = matrix.length;
  const rects = matrix
    .flatMap((row, y) =>
      runsOf(row).map(([x, width]) => `<rect x="${x}" y="${y}" width="${width}" height="1"/>`),
    )
    .join('');
  // The wordmark is text, so the file stays small and editable. Viewers without
  // the font fall back to a generic sans-serif rather than losing the word.
  const gap = 6;
  const textX = columns + gap;
  const width = textX + 78;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${rows}" width="${width * 16}" height="${rows * 16}" role="img" aria-label="Artificials"><title>Artificials</title><g fill="${color}" shape-rendering="crispEdges">${rects}</g><text x="${textX}" y="${rows / 2}" fill="${color}" font-family="Michroma, Sora, 'Helvetica Neue', Arial, sans-serif" font-size="7.4" letter-spacing="0.18" dominant-baseline="central">ARTIFICIALS</text></svg>`;
}

/**
 * Browser tabs sit on light and dark chrome alike, so the favicon carries its
 * own dark tile rather than relying on a transparent white mark that would
 * vanish against a light tab strip.
 */
function faviconSvg(matrix, { mark = '#f5f5f7', tile = '#0a0a0d' } = {}) {
  const columns = matrix[0].length;
  const rows = matrix.length;
  const pad = 3;
  const size = columns + pad * 2;
  const rects = matrix
    .flatMap((row, y) =>
      runsOf(row).map(
        ([x, width]) => `<rect x="${x + pad}" y="${y + pad}" width="${width}" height="1"/>`,
      ),
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${rows + pad * 2}"><rect width="${size}" height="${rows + pad * 2}" rx="6" fill="${tile}"/><g fill="${mark}" shape-rendering="crispEdges">${rects}</g></svg>`;
}

/* --- Minimal PNG writer: no dependency needed for flat pixel art. --- */
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

/** Renders the matrix as a transparent RGBA PNG at the requested pixel scale. */
function markPng(matrix, { scale, color = [255, 255, 255], padding = 1 } = {}) {
  const columns = matrix[0].length + padding * 2;
  const rows = matrix.length + padding * 2;
  const width = columns * scale;
  const height = rows * scale;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0; // No per-row filter; the art is flat.
    offset += 1;
    const sourceRow = matrix[Math.floor(y / scale) - padding];
    for (let x = 0; x < width; x += 1) {
      const column = Math.floor(x / scale) - padding;
      const on = sourceRow && sourceRow[column] === '1';
      raw[offset] = on ? color[0] : 0;
      raw[offset + 1] = on ? color[1] : 0;
      raw[offset + 2] = on ? color[2] : 0;
      raw[offset + 3] = on ? 255 : 0;
      offset += 4;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const matrix = await loadMatrix();
await mkdir(OUT, { recursive: true });

const files = [
  ['artificials-logo.svg', Buffer.from(markSvg(matrix))],
  ['artificials-lockup.svg', Buffer.from(lockupSvg(matrix))],
  // 1024px for anyone saving the logo to reuse it at print size.
  ['artificials-logo-large.png', markPng(matrix, { scale: 44 })],
  // The copy the page links for right-click saving. Pixel art has no detail to
  // lose, so a small file is indistinguishable and costs far fewer bytes.
  ['artificials-logo.png', markPng(matrix, { scale: 11 })],
  ['artificials-mark.png', markPng(matrix, { scale: 11 })],
];

for (const [name, data] of files) {
  await writeFile(new URL(name, OUT), data);
  console.log(`${name.padEnd(26)} ${(data.length / 1024).toFixed(1)} KB`);
}

// The tab icon lives at the site root, not under /brand.
const favicon = Buffer.from(faviconSvg(matrix));
await writeFile(new URL('public/favicon.svg', ROOT), favicon);
console.log(`${'favicon.svg'.padEnd(26)} ${(favicon.length / 1024).toFixed(1)} KB`);
console.log(`\nGenerated from a ${matrix[0].length}x${matrix.length} matrix.`);
