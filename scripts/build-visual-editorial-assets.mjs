// Original code-drawn editorial artwork. No external images or image-generation API.
// Run manually when reviewing this collection, not during catalog refreshes.
import { readFileSync, writeFileSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
const data = JSON.parse(readFileSync('shared/editorial-visual-data.json', 'utf8'));
const text = (x, y, value, size = 18, fill = '#b8c5d8') =>
  `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" fill="${fill}">${value}</text>`;
const shell = (title, subtitle, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><radialGradient id="bg"><stop stop-color="#263349"/><stop offset="1" stop-color="#080b10"/></radialGradient><linearGradient id="silver" x2="1" y2="1"><stop stop-color="#e8f0fb"/><stop offset="1" stop-color="#6982a6"/></linearGradient><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#627189" opacity=".2"/></pattern><filter id="glow"><feGaussianBlur stdDeviation="10"/></filter></defs><rect width="1200" height="800" fill="url(#bg)"/><rect width="1200" height="800" fill="url(#grid)"/>${text(85, 100, 'ARTIFICIALS / VISUAL EXPLAINER', 15)}${text(85, 166, title, 42, '#eef3fc')}${text(85, 211, subtitle, 20)}${body}${text(85, 741, 'EXPLORE  /  CHANGE AN ASSUMPTION  /  FOLLOW THE EVIDENCE', 13)}</svg>`;
const dots = data.price.rows.map((r) => ({
  x: 180 + ((Math.log10(r.price.blended) + 0.25) / 1.65) * 780,
  y: 635 - ((r.index - 110) / 60) * 330,
}));
const price = `<path d="M145 280V660H1090" stroke="#778aa6" fill="none"/>${[0, 1, 2, 3].map((i) => `<path d="M145 ${315 + i * 105}H1090" stroke="#718097" opacity=".2"/>`).join('')}<path d="${[
  ...dots,
]
  .sort((a, b) => a.x - b.x || a.y - b.y)
  .filter((p, i, points) => !points.slice(0, i).some((other) => other.y <= p.y))
  .map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`)
  .join(
    ' ',
  )}" stroke="#536a8b" stroke-width="2" fill="none" stroke-dasharray="8 9"/>${dots.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="26" fill="#bfdaff" opacity=".16"/><circle cx="${p.x}" cy="${p.y}" r="8" fill="url(#silver)"/>`).join('')}${text(159, 278, 'CAPABILITY', 12)}${text(900, 693, 'TOKEN PRICE →', 12)}`;
const matrix =
  data.benchmark.rows
    .slice(0, 5)
    .map(
      (r, i) =>
        `<circle cx="122" cy="${320 + i * 69}" r="16" fill="#9eb6d8" opacity="${1 - i * 0.12}"/>` +
        Object.values(r.scores)
          .map(
            (score, j) =>
              `<rect x="${185 + j * 237}" y="${292 + i * 69}" width="209" height="49" rx="9" fill="#b8cbe6" opacity="${score / 140}"/>${text(205 + j * 237, 325 + i * 69, score.toFixed(1), 20, '#090e16')}`,
          )
          .join(''),
    )
    .join('') +
  ['CODING', 'MATH', 'REASONING', 'LANGUAGE']
    .map((t, i) => text(185 + i * 237, 265, t, 13))
    .join('');
const inference = `<path d="M150 422H1060M827 485V568H592V485" stroke="#b7cce9" fill="none" stroke-width="3"/>${['PROMPT', 'PREFILL', 'KV CACHE', 'DECODE'].map((t, i) => `<rect x="${94 + i * 254}" y="345" width="205" height="155" rx="24" fill="#152031" stroke="#9aaecb"/>${text(120 + i * 254, 438, t, 19, '#e8f0fb')}`).join('')}${Array.from({ length: 12 }, (_, i) => `<rect x="${132 + i * 81}" y="620" width="57" height="17" rx="5" fill="${i < 8 ? '#c8d9f1' : '#29394f'}"/>`).join('')}${text(140, 593, 'REUSABLE STATE', 13)}`;
const retrieval = `<path d="M310 344L588 447M310 466L588 447M310 588L588 447M688 447H947" stroke="#778da9" fill="none" stroke-width="3"/>${['CURRENT POLICY', 'ARCHIVED POLICY', 'OTHER PLAN'].map((t, i) => `<rect x="96" y="${300 + i * 122}" width="230" height="88" rx="15" fill="${i === 0 ? '#2b405b' : '#121b29'}" stroke="${i === 0 ? '#d7e6fc' : '#4e607a'}"/>${text(119, 351 + i * 122, t, 16)}`).join('')}<circle cx="633" cy="447" r="73" fill="#19263a" stroke="#d2e2f9"/><path d="m605 445 21 21 35-40" fill="none" stroke="#eef4ff" stroke-width="6"/><rect x="910" y="353" width="205" height="188" rx="22" fill="#172438" stroke="#a6bddb"/>${text(940, 419, '12 DAYS', 30, '#f1f5fc')}${text(938, 468, 'SUPPORTED', 16)}${text(938, 496, 'BY THE SOURCE', 13)}`;
for (const [file, title, subtitle, body] of [
  [
    'visual-frontier',
    'The price–capability frontier',
    'A model choice is a set of constraints.',
    price,
  ],
  [
    'visual-skills',
    'One model. Several abilities.',
    'Change the question before reading the rank.',
    matrix,
  ],
  [
    'visual-inference',
    'Inside a streaming answer',
    'Follow the prompt, the loop, and the growing cache.',
    inference,
  ],
  [
    'visual-evidence',
    'From a question to evidence',
    'A fictional policy example, made inspectable.',
    retrieval,
  ],
]) {
  const path = 'public/editorial/' + file;
  writeFileSync(path + '.svg', shell(title, subtitle, body));
  const image = await loadImage(Buffer.from(shell(title, subtitle, body)));
  for (const [suffix, width, height] of [
    ['', 1200, 800],
    ['-small', 640, 427],
  ]) {
    const canvas = createCanvas(width, height);
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    writeFileSync(path + suffix + '.webp', canvas.toBuffer('image/webp', 90));
  }
  console.log(path);
}
