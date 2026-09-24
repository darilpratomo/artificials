import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLiveBench, parseImageBench } from './lib/benchmark-sources.ts';
import { parseEpoch, EPOCH_DATA_URL, EPOCH_URL } from './lib/epoch.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
async function get(url, maxBytes = 2_000_000) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(25000),
    redirect: 'error',
    headers: { 'user-agent': 'Artificials-benchmarks/1.0 (+https://artificials.net/about)' },
  });
  if (!response.ok) throw Error(`Benchmark source returned ${response.status}: ${url}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw Error('Benchmark response too large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = Buffer.concat(chunks);
  return {
    bytes,
    text: bytes.toString('utf8'),
    modified: response.headers.get('last-modified'),
  };
}
const checkedAt = new Date().toISOString();
// Pin both the table and category definitions to the same source revision.
const repo = 'LiveBench/new-livebench';
const commit = JSON.parse((await get(`https://api.github.com/repos/${repo}/commits/main`)).text);
if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw Error('Missing source revision');
const tree = JSON.parse(
  (await get(`https://api.github.com/repos/${repo}/git/trees/${commit.sha}?recursive=1`)).text,
);
if (tree.truncated) throw Error('Incomplete source file listing');
const releases = tree.tree
  .map((f) => /^public\/table_(\d{4}_\d{2}_\d{2})\.csv$/.exec(f.path)?.[1])
  .filter(Boolean)
  .sort();
const release = releases.at(-1);
if (!release) throw Error('Missing benchmark release');
const base = `https://raw.githubusercontent.com/${repo}/${commit.sha}/public`;
const tableUrl = `${base}/table_${release}.csv`;
const imageUrl = 'https://t2i-corebench.github.io/';
const [csv, groups, images, epochArchive] = await Promise.all([
  get(tableUrl),
  get(`${base}/categories_${release}.json`),
  get(imageUrl),
  // The archive is binary; its size cap is larger than the text sources'.
  get(EPOCH_DATA_URL, 12_000_000),
]);
const epoch = parseEpoch(new Uint8Array(epochArchive.bytes));
const categories = [
  ...parseLiveBench(csv.text, JSON.parse(groups.text), tableUrl),
  ...epoch.categories,
  parseImageBench(images.text, imageUrl + '#leaderboard'),
];
if (categories.length < 17 || categories.some((c) => c.rows.length < 5))
  throw Error('Unexpectedly small benchmark snapshot');
const snapshot = {
  version: 1,
  sources: [
    {
      id: 'livebench',
      name: 'LiveBench',
      url: 'https://livebench.ai/',
      dataUrl: tableUrl,
      checkedAt,
      edition: `Release ${release.replaceAll('_', '-')}`,
      sourceUpdatedAt: commit.commit.committer.date,
      license: 'Apache-2.0',
      licenseUrl:
        'https://github.com/LiveBench/LiveBench/blob/main/docs/DATASHEET.md#dataset-distribution',
    },
    {
      id: 'epoch',
      name: 'Epoch AI',
      url: EPOCH_URL,
      dataUrl: EPOCH_DATA_URL,
      checkedAt,
      edition: epoch.latestRun ? `Evaluations through ${epoch.latestRun}` : 'Benchmarking hub',
      sourceUpdatedAt: epoch.latestRun ? `${epoch.latestRun}T00:00:00.000Z` : null,
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    {
      id: 'corebench',
      name: 'T2I-CoReBench',
      url: imageUrl,
      dataUrl: imageUrl + '#leaderboard',
      checkedAt,
      edition: 'Gemini 2.5 Flash evaluator',
      sourceUpdatedAt: images.modified ? new Date(images.modified).toISOString() : null,
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  ],
  categories,
};
const directory = resolve(root, 'public/data');
const file = resolve(directory, 'benchmarks.json');
let previous;
try {
  previous = JSON.parse(await readFile(file, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (previous && !process.argv.includes('--accept-shrink')) {
  for (const old of previous.categories) {
    const next = categories.find((c) => c.id === old.id);
    if (!next || next.rows.length < old.rows.length * 0.75)
      throw Error(`Benchmark coverage dropped: ${old.id}; review before accepting`);
  }
}
await mkdir(directory, { recursive: true });
// Write only after every source validates; a failed refresh keeps the last valid snapshot.
const staging = resolve(root, '.benchmark-snapshot.tmp');
await writeFile(staging, JSON.stringify(snapshot) + '\n');
await rename(staging, file);

// Model facts are optional detail. A missing or much smaller set keeps the
// previous file instead of stopping the refresh.
const factsFile = resolve(directory, 'model-facts.json');
let previousFacts = 0;
try {
  previousFacts = JSON.parse(await readFile(factsFile, 'utf8')).facts.length;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (epoch.facts.length >= 50 && epoch.facts.length >= previousFacts * 0.75) {
  const { id, name, url, dataUrl, license, licenseUrl } = snapshot.sources.find(
    (source) => source.id === 'epoch',
  );
  const factsStaging = resolve(root, '.model-facts.tmp');
  await writeFile(
    factsStaging,
    JSON.stringify({
      version: 1,
      source: { id, name, url, dataUrl, license, licenseUrl, checkedAt },
      facts: epoch.facts,
    }) + '\n',
  );
  await rename(factsStaging, factsFile);
} else {
  console.warn(`Model facts not updated: ${epoch.facts.length} records (was ${previousFacts}).`);
}
console.log(
  `Benchmarks refreshed: ${categories.map((c) => `${c.name} ${c.rows.length}`).join(', ')}. Model facts: ${epoch.facts.length}. Checked ${checkedAt}.`,
);
