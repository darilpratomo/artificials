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
for (const [index, list] of buckets.entries())
  await writeFile(
    resolve(staging, `${index}.json`),
    JSON.stringify({ version: 1, updatedAt, sources, catalog: catalogSource, profiles: list }) +
      '\n',
  );
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
// Featured model comparisons, prerendered and listed in the sitemap.
const comparisons = buildComparisons(
  overview,
  profiles.map((profile) => profile.slug),
);
await writeFile(resolve(staging, 'comparisons.json'), JSON.stringify(comparisons) + '\n');
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
  `Model profiles: ${profiles.length} models, ${withResults} with benchmark results, ${withFacts} with research records, ${PROFILE_BUCKETS} files.\nMatched rows: ${matched}.`,
);
