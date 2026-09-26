/**
 * Draws the link previews into dist/og after the site is built: the site's
 * default card, the comparison page's card, one card per featured comparison
 * and one per model with test results. shared/seo.ts points each page at its
 * card by the same rules. The data refresh skips this (SKIP_OG_IMAGES=1): the
 * previews change nothing it checks, and Workers Builds draws them on deploy.
 *
 * Run with: node scripts/build-og-images.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareCard, comparisonCard, homeCard, modelCard, setup } from './lib/og.ts';
import { comparisonPath } from '../shared/compare.ts';
import { indexValue, price, score, tokens } from '../shared/format.ts';
import { referencePrice } from '../shared/model-overview.ts';
import { PROFILE_BUCKETS, primaryResult } from '../shared/model-profiles.ts';

if (process.env.SKIP_OG_IMAGES === '1') {
  console.log('Link previews skipped (SKIP_OG_IMAGES=1).');
  process.exit(0);
}

const root = fileURLToPath(new URL('../', import.meta.url));
const data = resolve(root, 'dist/data/models');
const out = resolve(root, 'dist/og');
const read = async (name) => JSON.parse(await readFile(resolve(data, name), 'utf8'));
setup(root);

const overview = await read('overview.json');
const { featured } = await read('comparisons.json');
const profiles = new Map();
const sources = new Map();
let catalog;
for (let index = 0; index < PROFILE_BUCKETS; index += 1) {
  const bucket = await read(`${index}.json`);
  for (const profile of bucket.profiles) profiles.set(profile.slug, profile);
  for (const source of bucket.sources) sources.set(source.id, source);
  catalog = bucket.catalog;
}
const prices = `${catalog.source} (${catalog.license})`;
const credit = (ids) =>
  `Data: ${[
    ...[...new Set(ids)].flatMap((id) => {
      const source = sources.get(id);
      return source ? [`${source.name} (${source.license})`] : [];
    }),
    prices,
  ].join(', ')}.`;

/** The model's headline result: the capability index, or its first result in another area. */
const DOMAINS = ['overall', 'coding', 'reasoning', 'math', 'agentic', 'language', 'knowledge'];
function headline(profile) {
  for (const domain of DOMAINS) {
    const result = primaryResult(profile, domain);
    const category = result && profile.categories.find((entry) => entry.id === result.category);
    if (category) return { result, category };
  }
  const [result] = profile.results;
  return result && { result, category: profile.categories.find((c) => c.id === result.category) };
}
const indexOf = (profile) =>
  profile.results.find((result) => result.category === 'capability-index')?.score ?? null;
const blended = (profile) => referencePrice(profile)?.blended ?? null;

async function write(path, png) {
  await mkdir(resolve(out, path, '..'), { recursive: true });
  await writeFile(resolve(out, path), png);
}

const top = [...overview.index].sort((a, b) => b.index - a.index).slice(0, 5);
await write(
  'default.png',
  await homeCard(
    overview.counts.models,
    top.map(({ name, makerId, index }) => ({ name, makerId, value: index.toFixed(1) })),
    credit(['epoch']),
  ),
);
await write('compare.png', await compareCard(featured.slice(0, 5)));

let comparisons = 0;
for (const { slugs } of featured) {
  const pair = slugs.map((slug) => profiles.get(slug));
  if (pair.some((profile) => !profile)) continue;
  /** The better value's side, unless both read the same. */
  const better = (values, format, lowest = false) => {
    const known = values.filter((value) => value !== null);
    if (known.length < 2 || format(known[0]) === format(known[1])) return [];
    const edge = lowest ? Math.min(...known) : Math.max(...known);
    return [values.indexOf(edge)];
  };
  const index = pair.map(indexOf);
  const cost = pair.map(blended);
  const context = pair.map((profile) => profile.contextWindow ?? null);
  const png = await comparisonCard(
    pair.map(({ name, maker, makerId }) => ({ name, maker, makerId })),
    [
      {
        label: 'Capability index',
        values: index.map((value) => (value === null ? null : indexValue(value))),
        best: better(index, indexValue),
      },
      {
        label: 'Price per 1M tokens',
        values: cost.map((value) => (value === null ? null : price(value))),
        best: better(cost, price, true),
      },
      {
        label: 'Context window',
        values: context.map((value) => (value === null ? null : tokens(value))),
        best: better(context, tokens),
      },
    ],
    credit(['epoch']),
  );
  await write(`${comparisonPath(slugs).slice(1)}.png`, png);
  comparisons += 1;
}

let models = 0;
for (const profile of profiles.values()) {
  if (!profile.results.length) continue;
  const lead = headline(profile);
  const reference = referencePrice(profile);
  const png = await modelCard(
    { name: profile.name, maker: profile.maker, makerId: profile.makerId },
    [
      lead
        ? {
            label:
              lead.category.id === 'capability-index' ? 'Capability index' : lead.category.label,
            value: score(lead.result.score, lead.category.unit),
            note: sources.get(lead.category.sourceId)?.name,
          }
        : { label: 'Test results', value: null },
      {
        label: 'Price per 1M tokens',
        value: reference ? price(reference.blended) : null,
        note: reference ? 'Blended, 3 input to 1 output' : 'No listed price',
      },
      {
        label: 'Context window',
        value: profile.contextWindow ? tokens(profile.contextWindow) : null,
        note: profile.contextWindow ? 'Tokens in one request' : undefined,
      },
    ],
    credit(lead ? [lead.category.sourceId] : []),
  );
  await write(`models/${profile.slug}.png`, png);
  models += 1;
}

console.log(
  `Link previews: the default card, the comparison card, ${comparisons} comparisons and ${models} models.`,
);
