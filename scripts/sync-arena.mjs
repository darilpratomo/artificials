/**
 * Fetches Arena's image leaderboards, text to image and image editing, from
 * the dataset Arena publishes on Hugging Face under CC BY 4.0, and keeps a
 * compact snapshot in public/data/image-arena.json:
 *
 *   - every model and category from the latest publication,
 *   - the date each model first appeared on the board,
 *   - each organisation's best overall score at the end of every month.
 *
 * The dataset's licence is checked first, and the files are read at the
 * revision that check saw. A failed fetch, a changed licence or a board that
 * shrinks sharply keeps the previous snapshot and exits with an error, so the
 * workflow reports it while the site keeps the last valid data.
 *
 * Run with: node scripts/sync-arena.mjs
 */
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parquetReadObjects } from 'hyparquet';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = resolve(root, 'public/data/image-arena.json');
const DATASET = 'lmarena-ai/leaderboard-dataset';
/** Arena's boards, by the id the site uses and the dataset's config name. */
const ARENAS = [
  { id: 'text-to-image', config: 'text_to_image', minimum: 30 },
  { id: 'image-edit', config: 'image_edit', minimum: 20 },
];
/** Hugging Face serves dataset files from its own CDN hosts. */
const HOSTS = /(^|\.)(huggingface\.co|hf\.co)$/;

/**
 * Downloads a file, following redirects only to Hugging Face's own hosts, and
 * refuses anything larger than `maxBytes`.
 */
async function download(url, maxBytes, hops = 4) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    redirect: 'manual',
    headers: { 'user-agent': 'Artificials-arena/1.0 (+https://artificials.net/about)' },
  });
  if (response.status >= 300 && response.status < 400) {
    const next = new URL(response.headers.get('location') ?? '', url);
    if (next.protocol !== 'https:' || !HOSTS.test(next.hostname) || hops === 0)
      throw Error(`Refused a redirect to ${next.hostname}`);
    return download(next.href, maxBytes, hops - 1);
  }
  if (!response.ok) throw Error(`Arena dataset returned ${response.status}: ${url}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw Error(`Arena file too large: ${url}`);
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}

const round = (value) => Math.round(value * 10) / 10;
const text = (value) => (typeof value === 'string' ? value.trim() : '');

async function readBoard({ id, config, minimum }, revision) {
  const table = async (split, maxBytes) => {
    const bytes = await download(
      `https://huggingface.co/datasets/${DATASET}/resolve/${revision}/${config}/${split}-00000-of-00001.parquet`,
      maxBytes,
    );
    const rows = await parquetReadObjects({
      file: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    // Every row must carry what the page shows; anything else means the
    // format changed and needs a look before it is published.
    for (const row of rows) {
      if (
        !text(row.model_name) ||
        !text(row.category) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(text(row.leaderboard_publish_date)) ||
        ![row.rating, row.rating_lower, row.rating_upper].every(Number.isFinite)
      )
        throw Error(`Unexpected ${config} ${split} row: ${JSON.stringify(row).slice(0, 200)}`);
    }
    return rows;
  };
  const latest = await table('latest', 5_000_000);
  const full = await table('full', 30_000_000);

  const published = latest.reduce(
    (last, row) => (row.leaderboard_publish_date > last ? row.leaderboard_publish_date : last),
    '',
  );
  const rows = latest
    .filter((row) => row.leaderboard_publish_date === published)
    .map((row) => ({
      model: text(row.model_name),
      organization: text(row.organization),
      license: text(row.license),
      category: text(row.category),
      rating: round(row.rating),
      lower: round(row.rating_lower),
      upper: round(row.rating_upper),
      // Parquet stores these as 64-bit integers.
      votes: Number(row.vote_count),
      rank: Number(row.rank),
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.rank - b.rank || b.rating - a.rating);
  const overall = rows.filter((row) => row.category === 'overall');
  if (overall.length < minimum) throw Error(`${id}: ${overall.length} models on the board`);

  // The first publication each current model appears in, in any category.
  const current = new Set(rows.map((row) => row.model));
  const firstSeen = {};
  for (const row of full) {
    const model = text(row.model_name);
    const date = row.leaderboard_publish_date;
    if (current.has(model) && (!firstSeen[model] || date < firstSeen[model]))
      firstSeen[model] = date;
  }

  // Each organisation's best overall score at the last publication of each month.
  const lastOfMonth = new Map();
  for (const row of full) {
    if (row.category !== 'overall') continue;
    const month = row.leaderboard_publish_date.slice(0, 7);
    if ((lastOfMonth.get(month) ?? '') < row.leaderboard_publish_date)
      lastOfMonth.set(month, row.leaderboard_publish_date);
  }
  const history = [...lastOfMonth.values()].sort().map((date) => {
    const best = new Map();
    for (const row of full) {
      if (row.category !== 'overall' || row.leaderboard_publish_date !== date) continue;
      const organization = text(row.organization);
      if (!best.has(organization) || row.rating > best.get(organization).rating)
        best.set(organization, {
          organization,
          model: text(row.model_name),
          rating: round(row.rating),
        });
    }
    return { date, best: [...best.values()].sort((a, b) => b.rating - a.rating) };
  });

  return { published, rows, firstSeen, history };
}

let previous;
try {
  previous = JSON.parse(await readFile(file, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const checkedAt = new Date().toISOString();
const meta = JSON.parse(
  (
    await download(
      `https://huggingface.co/api/datasets/${DATASET}?expand%5B%5D=cardData&expand%5B%5D=sha`,
      1_000_000,
    )
  ).toString('utf8'),
);
if (meta.cardData?.license !== 'cc-by-4.0')
  throw Error('Arena leaderboard licence changed; review before republishing');
if (!/^[0-9a-f]{40}$/.test(meta.sha ?? '')) throw Error('Arena dataset revision missing');

const arenas = {};
for (const arena of ARENAS) {
  const board = await readBoard(arena, meta.sha);
  const before = previous?.arenas?.[arena.id]?.rows.filter((row) => row.category === 'overall');
  const now = board.rows.filter((row) => row.category === 'overall');
  if (before && now.length < before.length * 0.75)
    throw Error(`${arena.id}: ${now.length} models (was ${before.length})`);
  arenas[arena.id] = board;
}

const snapshot = {
  version: 1,
  source: {
    id: 'arena',
    name: 'Arena',
    url: 'https://arena.ai/leaderboard/text-to-image',
    dataUrl: `https://huggingface.co/datasets/${DATASET}`,
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    checkedAt,
    revision: meta.sha,
  },
  arenas,
};
const staging = resolve(root, '.image-arena.tmp');
await writeFile(staging, JSON.stringify(snapshot) + '\n');
await rename(staging, file);
console.log(
  `Image arenas refreshed: ${ARENAS.map(
    ({ id }) =>
      `${id} ${arenas[id].rows.filter((row) => row.category === 'overall').length} models (${arenas[id].published})`,
  ).join(', ')}.`,
);
