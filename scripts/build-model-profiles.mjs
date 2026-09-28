/**
 * Builds per-model profile files from the two published snapshots. Runs before
 * every build, so profiles always match the committed catalog and benchmarks.
 * Output lives in public/data/models/ and is not committed.
 *
 * Run with: node scripts/build-model-profiles.mjs
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProfiles, profileBucket, PROFILE_BUCKETS } from '../shared/model-profiles.ts';
import { buildOverview } from '../shared/model-overview.ts';
import { buildFinder } from '../shared/finder.ts';
import { buildCoding } from '../shared/coding.ts';
import { buildTrends } from '../shared/trends.ts';
import { buildImages } from '../shared/images.ts';
import { buildVideos } from '../shared/videos.ts';
import { buildExplore } from '../shared/explore.ts';
import { buildComparisons } from '../shared/compare.ts';
import { buildChanges } from '../shared/changes.ts';
import { buildMakers } from '../shared/maker-pages.ts';
import { buildTests } from '../shared/test-pages.ts';
import { buildWeeks } from '../shared/weekly.ts';
import { buildCosts } from '../shared/costs.ts';
import { buildRace } from '../shared/race.ts';
import { buildScoring } from '../shared/scoring.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = resolve(root, 'public/data');
const catalog = JSON.parse(await readFile(resolve(data, 'catalog.json'), 'utf8'));
const benchmarks = JSON.parse(await readFile(resolve(data, 'benchmarks.json'), 'utf8'));
// Research facts are optional: profiles build without them.
let facts = { facts: [] };
try {
  facts = JSON.parse(await readFile(resolve(data, 'model-facts.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
// Coding agent results are optional too: the coding page shows model tests without them.
let agents;
try {
  agents = JSON.parse(await readFile(resolve(data, 'coding-agents.json'), 'utf8'));
  // The first version of the file held Terminal-Bench alone.
  if (agents.version === 1)
    agents = { version: 2, benchmarks: [{ source: agents.source, results: agents.results }] };
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const { profiles, links, linkModel } = buildProfiles(catalog, benchmarks, facts.facts);
// What changed, kept by the data refresh (scripts/sync-history.mjs). Optional:
// profiles build without it.
let history;
try {
  history = JSON.parse(await readFile(resolve(data, 'history.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
for (const profile of profiles)
  if (history?.prices[profile.slug]) profile.priceHistory = history.prices[profile.slug];
if (profiles.length < 100)
  throw Error('Unexpectedly few model profiles; check the catalog snapshot.');

const updatedAt = catalog.updatedAt;
const sources = benchmarks.sources.map(({ id, name, url, license, licenseUrl, checkedAt }) => ({
  id,
  name,
  url,
  license,
  licenseUrl,
  checkedAt,
}));
if (facts.source)
  sources.push({
    id: 'epoch-models',
    name: `${facts.source.name} model records`,
    url: facts.source.url,
    license: facts.source.license,
    licenseUrl: facts.source.licenseUrl,
    checkedAt: facts.source.checkedAt,
  });
const catalogSource = {
  source: catalog.source,
  sourceUrl: catalog.sourceUrl,
  license: catalog.license,
  updatedAt,
};
const buckets = Array.from({ length: PROFILE_BUCKETS }, () => []);
for (const profile of profiles) buckets[profileBucket(profile.slug)].push(profile);

const staging = resolve(root, '.profiles-staging');
const target = resolve(data, 'models');
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
const models = profiles
  .map((profile) => [
    profile.slug,
    profile.name,
    profile.maker,
    profile.offerings.length,
    profile.results.length ? 1 : 0,
    profile.releaseDate ?? '',
  ])
  .sort((a, b) => b[4] - a[4] || b[3] - a[3] || a[0].localeCompare(b[0]));
// The Worker reads the directory on page requests, so it stays small; the
// benchmark-row links are only needed by the rankings page.
await writeFile(
  resolve(staging, 'directory.json'),
  JSON.stringify({ version: 1, updatedAt, buckets: PROFILE_BUCKETS, models }) + '\n',
);
const names = Object.fromEntries(
  [...new Set(Object.values(links))].map((slug) => [
    slug,
    profiles.find((profile) => profile.slug === slug).name,
  ]),
);
await writeFile(resolve(staging, 'links.json'), JSON.stringify({ rows: links, names }) + '\n');
const { overview, tests, explorer, timeline } = buildOverview(
  profiles,
  links,
  catalog,
  benchmarks,
  sources,
);
// One page per maker; each profile and the market's maker list link to their maker's page.
const makers = buildMakers({ profiles, overview, tests });
const makerPages = new Map(makers.pages.map((page) => [page.id, page.slug]));
for (const profile of profiles)
  if (makerPages.has(profile.makerId)) profile.makerPage = makerPages.get(profile.makerId);
for (const entry of overview.market.makers)
  if (makerPages.has(entry.makerId)) entry.page = makerPages.get(entry.makerId);
await writeFile(resolve(staging, 'timeline.json'), JSON.stringify(timeline) + '\n');
await writeFile(resolve(staging, 'tests.json'), JSON.stringify(tests) + '\n');
await writeFile(resolve(staging, 'explorer.json'), JSON.stringify(explorer) + '\n');
const finder = buildFinder({ overview, tests, explorer });
await writeFile(resolve(staging, 'finder.json'), JSON.stringify(finder) + '\n');
const coding = buildCoding({
  profiles,
  tests: tests.tests,
  benchmarks,
  links,
  agents,
  linkModel,
  sources,
  facts: facts.facts,
});
await writeFile(resolve(staging, 'coding.json'), JSON.stringify(coding) + '\n');
const trends = buildTrends({
  profiles,
  benchmarks,
  links,
  facts: facts.facts,
  timeline,
  sources,
  linkModel,
});
await writeFile(resolve(staging, 'trends.json'), JSON.stringify(trends) + '\n');
// Arena's boards are optional: without a snapshot the image page shows the
// test alone, and the video page says there is nothing to show yet.
async function optionalSnapshot(name) {
  try {
    return JSON.parse(await readFile(resolve(data, name), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
const images = buildImages({ arena: await optionalSnapshot('image-arena.json'), benchmarks });
await writeFile(resolve(staging, 'images.json'), JSON.stringify(images) + '\n');
const videos = buildVideos({ arena: await optionalSnapshot('video-arena.json') });
await writeFile(resolve(staging, 'videos.json'), JSON.stringify(videos) + '\n');
// The home page carries one current result from each of those pages.
overview.explore = buildExplore({ overview, tests, finder, coding, trends, images, videos });
await writeFile(resolve(staging, 'overview.json'), JSON.stringify(overview) + '\n');
// The AI race and how benchmarks work: small files for their pages.
await writeFile(resolve(staging, 'race.json'), JSON.stringify(buildRace(overview)) + '\n');
await writeFile(
  resolve(staging, 'scoring.json'),
  JSON.stringify(buildScoring({ tests, overview })) + '\n',
);
// Featured model comparisons, prerendered and listed in the sitemap.
const comparisons = buildComparisons(
  overview,
  profiles.map((profile) => profile.slug),
);
await writeFile(resolve(staging, 'comparisons.json'), JSON.stringify(comparisons) + '\n');
// The last 30 days of changes, for the "What changed" page and its feed.
const changes = buildChanges({
  history,
  profiles,
  timeline,
  tests,
  sources,
  until: updatedAt.slice(0, 10),
});
await writeFile(resolve(staging, 'changes.json'), JSON.stringify(changes) + '\n');
// Every priced model for the cost calculator.
await writeFile(
  resolve(staging, 'costs.json'),
  JSON.stringify(buildCosts(profiles, overview)) + '\n',
);
// The week in AI models: one page per week since the record began.
const weeks = buildWeeks({
  history,
  profiles,
  timeline,
  tests,
  sources,
  until: updatedAt.slice(0, 10),
});
await mkdir(resolve(staging, 'weekly'), { recursive: true });
await writeFile(resolve(staging, 'weekly.json'), JSON.stringify(weeks.directory) + '\n');
for (const page of weeks.pages)
  await writeFile(resolve(staging, 'weekly', `${page.week}.json`), JSON.stringify(page) + '\n');
// The list of makers for /makers, the sitemap and search, and each maker's page.
await mkdir(resolve(staging, 'makers'), { recursive: true });
await writeFile(resolve(staging, 'makers.json'), JSON.stringify(makers.directory) + '\n');
for (const page of makers.pages)
  await writeFile(resolve(staging, 'makers', `${page.slug}.json`), JSON.stringify(page) + '\n');
// One page per test, and the list of them for /tests, the sitemap and search.
const testPages = buildTests({ benchmarks, overview, tests, history, makerPages });
await mkdir(resolve(staging, 'test-pages'), { recursive: true });
await writeFile(resolve(staging, 'test-pages.json'), JSON.stringify(testPages.directory) + '\n');
for (const page of testPages.pages)
  await writeFile(resolve(staging, 'test-pages', `${page.id}.json`), JSON.stringify(page) + '\n');
// Written last, once each profile knows its maker's page.
for (const [index, list] of buckets.entries())
  await writeFile(
    resolve(staging, `${index}.json`),
    JSON.stringify({ version: 1, updatedAt, sources, catalog: catalogSource, profiles: list }) +
      '\n',
  );
await rm(target, { recursive: true, force: true });
await rename(staging, target);

const withResults = profiles.filter((profile) => profile.results.length).length;
const withFacts = profiles.filter((profile) => profile.facts).length;
const matched = benchmarks.categories
  .map((category) => {
    const hits = category.rows.filter((row) => links[`${category.id}:${row.id}`]).length;
    return `${category.id} ${hits}/${category.rows.length}`;
  })
  .join(', ');
console.log(
  `Model profiles: ${profiles.length} models, ${withResults} with benchmark results, ${withFacts} with research records, ${PROFILE_BUCKETS} files, ${makers.pages.length} maker pages, ${testPages.pages.length} test pages, ${weeks.pages.length} weeks.\nMatched rows: ${matched}.`,
);
