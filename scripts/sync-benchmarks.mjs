import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLiveBench, parseImageBench } from './lib/benchmark-sources.ts';
import {
  parseEpoch,
  parseTerminalBench,
  parseDeepSwe,
  parseCursorBench,
  parseTimeHorizons,
  EPOCH_DATA_URL,
  EPOCH_URL,
  TERMINAL_BENCH,
  DEEPSWE,
  CURSORBENCH,
  TIME_HORIZONS,
} from './lib/epoch.ts';
import { parseSweBench, SWE_BENCH } from './lib/swe-bench.ts';
import { DATASET_URL, arenaRevision, readTable } from './lib/arena-dataset.mjs';
import { ARENA_TESTS, arenaCategories } from '../shared/arena.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
// GitHub's API allows few anonymous requests from the shared addresses that
// scheduled workflows run on, so the workflow passes its own token. The token
// is only ever sent to api.github.com, and redirects are refused.
const githubToken = process.env.GITHUB_TOKEN;
async function get(url, maxBytes = 2_000_000) {
  const headers = { 'user-agent': 'Artificials-benchmarks/1.0 (+https://artificials.net/about)' };
  if (githubToken && new URL(url).origin === 'https://api.github.com')
    headers.authorization = `Bearer ${githubToken}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(25000),
    redirect: 'error',
    headers,
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
// SWE-bench's leaderboard file, pinned to one revision with its licence text.
async function sweBench() {
  const latest = JSON.parse(
    (await get(`https://api.github.com/repos/${SWE_BENCH.repo}/commits/HEAD`)).text,
  );
  if (!/^[a-f0-9]{40}$/.test(latest.sha)) throw Error('Missing SWE-bench revision');
  const raw = `https://raw.githubusercontent.com/${SWE_BENCH.repo}/${latest.sha}`;
  const [licence, board] = await Promise.all([
    get(`${raw}/LICENSE`),
    get(`${raw}/${SWE_BENCH.file}`, 12_000_000),
  ]);
  if (!licence.text.includes(SWE_BENCH.licenseText))
    throw Error('SWE-bench licence changed; review before republishing');
  return { url: `${raw}/${SWE_BENCH.file}`, updatedAt: latest.commit.committer.date, board };
}
/** Arena's language model boards: text with style control, and WebDev. */
async function arenaBoards() {
  const revision = await arenaRevision();
  const [text, webdev] = await Promise.all([
    readTable('text_style_control', 'latest', revision, 5_000_000),
    readTable('webdev', 'latest', revision, 2_000_000),
  ]);
  return arenaCategories({ text, webdev });
}
const [csv, groups, images, epochArchive, agentLicence, swe, arena] = await Promise.all([
  get(tableUrl),
  get(`${base}/categories_${release}.json`),
  get(imageUrl),
  // The archive is binary; its size cap is larger than the text sources'.
  get(EPOCH_DATA_URL, 12_000_000),
  // Optional sources: without them, their results keep their last version.
  get(TERMINAL_BENCH.licenseApi).catch((error) => error),
  sweBench().catch((error) => error),
  arenaBoards().catch((error) => error),
]);
const epoch = parseEpoch(new Uint8Array(epochArchive.bytes));
const directory = resolve(root, 'public/data');
const file = resolve(directory, 'benchmarks.json');
let previous;
try {
  previous = JSON.parse(await readFile(file, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
/**
 * Agent tests from optional sources. A source that fails keeps its previous
 * results and source entry, so one outage never stops the whole refresh.
 */
const carried = [];
function optional(id, parse) {
  try {
    return parse();
  } catch (error) {
    const old = previous?.categories.find((category) => category.id === id);
    console.warn(
      `${id} not updated${old ? '; keeping the previous results' : ''}: ${error.message}`,
    );
    if (old) carried.push(old.sourceId);
    return old;
  }
}
const archive = new Uint8Array(epochArchive.bytes);
const sweParsed = swe instanceof Error ? swe : undefined;
let sweResult;
if (!(swe instanceof Error)) {
  try {
    sweResult = parseSweBench(swe.board.text, swe.url);
  } catch (error) {
    sweResult = error;
  }
}
const agentTests = [
  optional('deepswe', () => parseDeepSwe(archive)),
  optional('cursorbench', () => parseCursorBench(archive)),
  optional('swe-bench-bash-only', () => {
    if (sweParsed) throw sweParsed;
    if (sweResult instanceof Error) throw sweResult;
    return sweResult.bashOnly;
  }),
].filter(Boolean);
// Arena's tests are optional too: each keeps its last version if Arena fails.
const arenaTests = ARENA_TESTS.map((test) =>
  optional(test.id, () => {
    if (arena instanceof Error) throw arena;
    const category = arena.categories.find((entry) => entry.id === test.id);
    if (!category || category.rows.length < 5) throw Error(`${test.id} missing from Arena`);
    return category;
  }),
).filter(Boolean);
const categories = [
  ...parseLiveBench(csv.text, JSON.parse(groups.text), tableUrl),
  ...epoch.categories,
  ...agentTests,
  parseImageBench(images.text, imageUrl + '#leaderboard'),
  ...arenaTests,
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
    ...[
      {
        id: 'deepswe',
        name: `${DEEPSWE.publisher} ${DEEPSWE.name}, compiled by Epoch AI`,
        url: DEEPSWE.url,
        dataUrl: EPOCH_DATA_URL,
        checkedAt,
        edition: 'mini-swe-agent harness',
        sourceUpdatedAt: epoch.latestRun ? `${epoch.latestRun}T00:00:00.000Z` : null,
        license: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      },
      {
        id: 'cursorbench',
        name: `${CURSORBENCH.publisher} ${CURSORBENCH.name}, compiled by Epoch AI`,
        url: CURSORBENCH.url,
        dataUrl: EPOCH_DATA_URL,
        checkedAt,
        edition: 'Cursor agent',
        sourceUpdatedAt: epoch.latestRun ? `${epoch.latestRun}T00:00:00.000Z` : null,
        license: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      },
      {
        id: 'arena',
        name: 'Arena',
        url: 'https://arena.ai/leaderboard/text',
        dataUrl: DATASET_URL,
        checkedAt,
        edition: 'Text with style control, and WebDev',
        sourceUpdatedAt:
          arena instanceof Error || !arena.published ? null : `${arena.published}T00:00:00.000Z`,
        license: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      },
      {
        id: 'swebench',
        name: 'SWE-bench',
        url: SWE_BENCH.url,
        dataUrl: swe instanceof Error ? SWE_BENCH.url : swe.url,
        checkedAt,
        edition: 'Verified, bash only (mini-SWE-agent)',
        sourceUpdatedAt: swe instanceof Error ? null : swe.updatedAt,
        license: SWE_BENCH.license,
        licenseUrl: SWE_BENCH.licenseUrl,
      },
    ]
      // A source whose results were carried over keeps its previous entry.
      .map((source) =>
        carried.includes(source.id)
          ? (previous?.sources.find((entry) => entry.id === source.id) ?? source)
          : source,
      )
      .filter((source) => categories.some((category) => category.sourceId === source.id)),
  ],
  categories,
};
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
// Coding agent results and task lengths are optional too. Each part keeps its
// previous version when its source fails, shrinks sharply or changes licence.
const agentsFile = resolve(directory, 'coding-agents.json');
let previousAgents;
try {
  previousAgents = JSON.parse(await readFile(agentsFile, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
// The first version of the file held Terminal-Bench alone.
const previousBenchmarks =
  previousAgents?.version === 2
    ? previousAgents.benchmarks
    : previousAgents?.results
      ? [{ source: previousAgents.source, results: previousAgents.results }]
      : [];
const previousOf = (id) => previousBenchmarks.find((entry) => entry.source.id === id);
const epochSource = snapshot.sources.find((source) => source.id === 'epoch');
const compiledBy = {
  name: epochSource.name,
  url: epochSource.url,
  dataUrl: epochSource.dataUrl,
  license: epochSource.license,
  licenseUrl: epochSource.licenseUrl,
};
function agentPart(id, read) {
  const old = previousOf(id);
  try {
    const part = read();
    if (old && part.results.length < old.results.length * 0.75)
      throw Error(`${part.results.length} results (was ${old.results.length})`);
    return part;
  } catch (error) {
    console.warn(`${id} agent results not updated: ${error.message}`);
    return old;
  }
}
const agentBenchmarks = [
  agentPart('terminal-bench', () => {
    if (agentLicence instanceof Error) throw agentLicence;
    if (JSON.parse(agentLicence.text).cardData?.license !== 'apache-2.0')
      throw Error('Terminal-Bench leaderboard licence changed; review before republishing');
    const agents = parseTerminalBench(archive);
    return {
      source: {
        id: 'terminal-bench',
        name: TERMINAL_BENCH.name,
        url: TERMINAL_BENCH.url,
        dataUrl: TERMINAL_BENCH.dataUrl,
        license: TERMINAL_BENCH.license,
        licenseUrl: TERMINAL_BENCH.licenseUrl,
        checkedAt,
        latestRun: agents.latestRun,
        tasks: TERMINAL_BENCH.tasks,
        description:
          'Hard tasks carried out in a computer terminal, from building and debugging software to data and system work, each checked automatically.',
        compiledBy,
      },
      results: agents.results,
    };
  }),
  agentPart('swe-bench-agents', () => {
    if (sweParsed) throw sweParsed;
    if (sweResult instanceof Error) throw sweResult;
    return {
      source: {
        id: 'swe-bench-agents',
        name: 'SWE-bench Verified',
        url: SWE_BENCH.url,
        dataUrl: swe.url,
        license: SWE_BENCH.license,
        licenseUrl: SWE_BENCH.licenseUrl,
        checkedAt,
        latestRun: sweResult.agents.latestRun,
        tasks: SWE_BENCH.tasks,
        description:
          'Real GitHub issues from Python projects that engineers confirmed are solvable; the agent must change the code so the project’s tests pass. Entries that tried each issue once, with one model.',
      },
      results: sweResult.agents.results,
    };
  }),
].filter(Boolean);
let timeHorizons = previousAgents?.timeHorizons;
try {
  const horizons = parseTimeHorizons(archive);
  if (timeHorizons && horizons.results.length < timeHorizons.results.length * 0.75)
    throw Error(`${horizons.results.length} results (was ${timeHorizons.results.length})`);
  timeHorizons = {
    source: {
      id: 'metr',
      name: TIME_HORIZONS.name,
      url: TIME_HORIZONS.url,
      dataUrl: EPOCH_DATA_URL,
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      checkedAt,
      latestRun: horizons.latestRelease,
      tasks: 0,
      description:
        'How long a software task, measured in the time a skilled person needs, a model completes half the time.',
      compiledBy,
      version: horizons.version,
    },
    results: horizons.results,
  };
} catch (error) {
  console.warn(`METR time horizons not updated: ${error.message}`);
}
let agentCount = 0;
if (agentBenchmarks.length) {
  const agentsStaging = resolve(root, '.coding-agents.tmp');
  await writeFile(
    agentsStaging,
    JSON.stringify({
      version: 2,
      benchmarks: agentBenchmarks,
      ...(timeHorizons ? { timeHorizons } : {}),
    }) + '\n',
  );
  await rename(agentsStaging, agentsFile);
  agentCount = agentBenchmarks.reduce((total, entry) => total + entry.results.length, 0);
}
console.log(
  `Benchmarks refreshed: ${categories.map((c) => `${c.name} ${c.rows.length}`).join(', ')}. Model facts: ${epoch.facts.length}. Coding agent results: ${agentCount}. Checked ${checkedAt}.`,
);
