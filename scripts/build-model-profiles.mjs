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

const root = fileURLToPath(new URL('../', import.meta.url));
const data = resolve(root, 'public/data');
const catalog = JSON.parse(await readFile(resolve(data, 'catalog.json'), 'utf8'));
const benchmarks = JSON.parse(await readFile(resolve(data, 'benchmarks.json'), 'utf8'));
const { profiles, links } = buildProfiles(catalog, benchmarks);
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
await rm(target, { recursive: true, force: true });
await rename(staging, target);

const withResults = profiles.filter((profile) => profile.results.length).length;
const matched = benchmarks.categories
  .map((category) => {
    const hits = category.rows.filter((row) => links[`${category.id}:${row.id}`]).length;
    return `${category.id} ${hits}/${category.rows.length}`;
  })
  .join(', ');
console.log(
  `Model profiles: ${profiles.length} models, ${withResults} with benchmark results, ${PROFILE_BUCKETS} files.\nMatched rows: ${matched}.`,
);
