// Original vector compositions and local WebP exports; no downloaded or generated imagery.
import { writeFileSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
const text = (x, y, t, size = 20, fill = '#bac8dc') =>
  `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="${fill}">${t}</text>`;
const shell = (title, subtitle, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><radialGradient id="bg"><stop stop-color="#27364b"/><stop offset="1" stop-color="#080c12"/></radialGradient><linearGradient id="metal" x2=".3" y2="1"><stop stop-color="#f0f4fc"/><stop offset=".45" stop-color="#879cb7"/><stop offset=".65" stop-color="#d6e0ee"/><stop offset="1" stop-color="#415774"/></linearGradient><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#667d9c" opacity=".2"/></pattern></defs><rect width="1200" height="800" fill="url(#bg)"/><rect width="1200" height="800" fill="url(#grid)"/>${text(76, 83, 'ARTIFICIALS / VISUAL LAB', 15)}${text(76, 151, title, 42, '#f0f3fa')}${text(76, 197, subtitle, 20)}${body}${text(76, 742, 'ORIGINAL TEACHING SCHEMATIC / NOT A MODEL BENCHMARK', 13)}</svg>`;
const sampling =
  [0.52, 0.24, 0.13, 0.07, 0.03, 0.01]
    .map(
      (p, i) =>
        `<rect x="${115 + i * 80}" y="${565 - p * 460}" width="48" height="${p * 460}" rx="7" fill="url(#metal)" opacity="${i < 3 ? 1 : 0.35}"/><path d="M${139 + i * 80} 590Q${750} ${270 + i * 48} 1015 ${300 + i * 60}" fill="none" stroke="#9aafcc" stroke-width="${i < 3 ? 2 : 1}" opacity="${i < 3 ? 0.7 : 0.2}"/><circle cx="1015" cy="${300 + i * 60}" r="${i < 3 ? 12 : 5}" fill="${i < 3 ? 'url(#metal)' : '#40536e'}"/>`,
    )
    .join('') + text(115, 635, 'SCORES → ELIGIBILITY → SELECTION', 16);
const vectors = `<g transform="translate(614 510)"><ellipse rx="325" ry="145" fill="#142132" stroke="#6c829f"/><ellipse rx="215" ry="96" fill="none" stroke="#7590b1" stroke-dasharray="6 10"/><path d="M-425 0H425M-170 180 170-180" stroke="#7084a0" stroke-width="2"/><path d="M0 0 310-80" stroke="url(#metal)" stroke-width="17"/><path d="m295-101 31 18-28 25" fill="none" stroke="#edf3fc" stroke-width="10"/><path d="M0 0-130-211" stroke="url(#metal)" stroke-width="17"/><path d="m-145-187 6-36 28 23" fill="none" stroke="#edf3fc" stroke-width="10"/><path d="M98-25A100 100 0 0 0-52-84" fill="none" stroke="#b9c9df" stroke-width="2" stroke-dasharray="5 7"/><circle r="13" fill="#e3edf9"/></g>${text(265, 325, 'DIRECTION', 16)}${text(936, 466, 'LENGTH', 16)}${text(110, 664, 'COSINE / DOT PRODUCT / DISTANCE', 16)}`;
const jobs = [
  ['A', 0, 2],
  ['B', 0, 8],
  ['C', 2, 3],
  ['D', 5, 6],
  ['E', 8, 2],
  ['F', 10, 4],
];
const queues =
  jobs
    .map(
      ([id, start, length], i) =>
        text(98, 310 + i * 56, id, 20) +
        `<path d="M150 ${304 + i * 56}H${150 + start * 65}" stroke="#7188a6" stroke-width="2" stroke-dasharray="7 6"/><rect x="${150 + start * 65}" y="${286 + i * 56}" width="${length * 65}" height="30" rx="6" fill="url(#metal)"/><circle cx="${150 + (start + length) * 65}" cy="${301 + i * 56}" r="5" fill="#f1f5ff"/>`,
    )
    .join('') +
  `<path d="M150 641H1060" stroke="#7188a6"/>${text(145, 677, '0', 15)}${text(1000, 677, '14 TICKS', 15)}`;
for (const [file, title, subtitle, body] of [
  [
    'lab-sampling',
    'Before the next word',
    'A probability distribution becomes one selected continuation.',
    sampling,
  ],
  ['lab-vectors', 'What does nearby mean?', 'Same coordinates. Different comparisons.', vectors],
  [
    'lab-queues',
    'Inside the serving queue',
    'Waiting and working are different parts of response time.',
    queues,
  ],
]) {
  const svg = shell(title, subtitle, body),
    path = 'public/editorial/' + file;
  writeFileSync(path + '.svg', svg);
  const image = await loadImage(Buffer.from(svg));
  for (const [suffix, w, h] of [
    ['', 1200, 800],
    ['-small', 640, 427],
  ]) {
    const c = createCanvas(w, h);
    c.getContext('2d').drawImage(image, 0, 0, w, h);
    writeFileSync(path + suffix + '.webp', c.toBuffer('image/webp', 90));
  }
  console.log(path);
}
