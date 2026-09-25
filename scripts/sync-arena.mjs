/**
 * Fetches Arena's image and video leaderboards from the dataset Arena
 * publishes on Hugging Face under CC BY 4.0, and keeps a compact snapshot of
 * each group, public/data/image-arena.json and public/data/video-arena.json:
 *
 *   - every model and category from the latest publication,
 *   - the date each model first appeared on the board,
 *   - each organisation's best overall score at the end of every month.
 *
 * The dataset's licence is checked first, and the files are read at the
 * revision that check saw. A group whose fetch fails, or whose board shrinks
 * sharply, keeps its previous snapshot; the script then exits with an error,
 * so the workflow reports it while the site keeps the last valid data.
 *
 * Run with: node scripts/sync-arena.mjs
 */
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATASET_URL, arenaRevision, readTable } from './lib/arena-dataset.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
/** Arena's boards, grouped by page: the id the site uses and the dataset's config name. */
const GROUPS = [
  {
    file: 'image-arena.json',
    url: 'https://arena.ai/leaderboard/text-to-image',
    boards: [
      { id: 'text-to-image', config: 'text_to_image', minimum: 30 },
      { id: 'image-edit', config: 'image_edit', minimum: 20 },
    ],
  },
  {
    file: 'video-arena.json',
    url: 'https://arena.ai/leaderboard/text-to-video',
    boards: [
      { id: 'text-to-video', config: 'text_to_video', minimum: 20 },
      { id: 'image-to-video', config: 'image_to_video', minimum: 20 },
      { id: 'video-edit', config: 'video_edit', minimum: 5 },
    ],
  },
];
const round = (value) => Math.round(value * 10) / 10;
const text = (value) => (typeof value === 'string' ? value.trim() : '');

async function readBoard({ id, config, minimum }, revision) {
  const latest = await readTable(config, 'latest', revision, 5_000_000);
  const full = await readTable(config, 'full', revision, 30_000_000);

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

const checkedAt = new Date().toISOString();
const revision = await arenaRevision();

let failed = false;
for (const group of GROUPS) {
  const file = resolve(root, 'public/data', group.file);
  try {
    let previous;
    try {
      previous = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const arenas = {};
    for (const arena of group.boards) {
      const board = await readBoard(arena, revision);
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
        url: group.url,
        dataUrl: DATASET_URL,
        license: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        checkedAt,
        revision,
      },
      arenas,
    };
    const staging = resolve(root, `.${group.file}.tmp`);
    await writeFile(staging, JSON.stringify(snapshot) + '\n');
    await rename(staging, file);
    console.log(
      `Arena refreshed: ${group.boards
        .map(
          ({ id }) =>
            `${id} ${arenas[id].rows.filter((row) => row.category === 'overall').length} models (${arenas[id].published})`,
        )
        .join(', ')}.`,
    );
  } catch (error) {
    failed = true;
    console.error(`${group.file} not updated: ${error.message}`);
  }
}
if (failed) process.exitCode = 1;
