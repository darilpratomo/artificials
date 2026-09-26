/** Run on Node 24 LTS: node scripts/sync-catalog.mjs [--accept-shrink] */
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { retrying, statusError } from './lib/retry.ts';
import {
  normalizeCatalog,
  catalogSummary,
  buildCatalogIndex,
  CATALOG_SOURCE_URL,
} from '../shared/catalog.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(root, 'public/data');
const maxBytes = 16 * 1024 * 1024;
// A timeout, dropped connection or server error is tried again before the
// refresh gives up and keeps the existing snapshot.
async function readCatalog() {
  const response = await fetch(CATALOG_SOURCE_URL, {
    signal: AbortSignal.timeout(25000),
    redirect: 'error',
    headers: {
      accept: 'application/json',
      'user-agent': 'Artificials-catalog/1.0 (+https://artificials.net/about)',
    },
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
    throw statusError(
      `Source returned unsupported response (${response.status}). Existing snapshot retained.`,
      response.status,
    );
  if (Number(response.headers.get('content-length') || 0) > maxBytes)
    throw new Error('Catalog response too large.');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new Error('Catalog response too large.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return chunks;
}
const chunks = await retrying(CATALOG_SOURCE_URL, readCatalog);
const source = JSON.parse(Buffer.concat(chunks).toString('utf8'));
const snapshot = normalizeCatalog(source);
if (snapshot.models.length < 100 || snapshot.providers.length < 5)
  throw new Error('Unexpectedly small catalog. Existing snapshot retained.');
let previous;
try {
  previous = JSON.parse(await readFile(resolve(directory, 'catalog-summary.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (
  previous &&
  snapshot.models.length < previous.totalModels * 0.75 &&
  !process.argv.includes('--accept-shrink')
)
  throw new Error(
    'Catalog lost more than 25% of offerings. Review upstream and use --accept-shrink only if intentional. Existing snapshot retained.',
  );
const index = buildCatalogIndex(snapshot);
const summary = catalogSummary(snapshot);
const staging = resolve(root, '.catalog-staging');
await mkdir(staging, { recursive: true });
await mkdir(resolve(staging, 'catalog-shards'), { recursive: true });
await mkdir(resolve(staging, 'catalog-first'), { recursive: true });
try {
  await writeFile(resolve(staging, 'catalog.json'), JSON.stringify(snapshot) + '\n');
  await writeFile(resolve(staging, 'catalog-index.json'), JSON.stringify(index) + '\n');
  await writeFile(resolve(staging, 'catalog-summary.json'), JSON.stringify(summary) + '\n');
  for (let offset = 0; offset < snapshot.models.length; offset += index.shardSize)
    await writeFile(
      resolve(staging, 'catalog-shards', `${offset / index.shardSize}.json`),
      JSON.stringify(snapshot.models.slice(offset, offset + index.shardSize)) + '\n',
    );
  // Common landing pages are already complete JSON: no index parsing on cold visits.
  for (const sort of Object.keys(index.orders)) {
    for (const limit of [20, 24, 40]) {
      const page = {
        ...summary,
        models: index.orders[sort].slice(0, limit).map((position) => snapshot.models[position]),
        total: snapshot.models.length,
        page: 1,
        pageCount: Math.ceil(snapshot.models.length / limit),
        limit,
        sort,
      };
      await writeFile(
        resolve(staging, 'catalog-first', `${sort}-${limit}.json`),
        JSON.stringify(page) + '\n',
      );
    }
  }
  await mkdir(directory, { recursive: true });
  // Output is committed/deployed as one revision. Failures before this point keep all prior data.
  await rm(resolve(directory, 'catalog-shards'), { recursive: true, force: true });
  await rename(resolve(staging, 'catalog-shards'), resolve(directory, 'catalog-shards'));
  await rm(resolve(directory, 'catalog-first'), { recursive: true, force: true });
  await rename(resolve(staging, 'catalog-first'), resolve(directory, 'catalog-first'));
  for (const file of ['catalog.json', 'catalog-index.json', 'catalog-summary.json'])
    await rename(resolve(staging, file), resolve(directory, file));
} finally {
  await rm(staging, { recursive: true, force: true });
}
console.log(
  `Catalog synchronized: ${snapshot.models.length.toLocaleString('en')} offerings / ${snapshot.providers.length} providers at ${snapshot.updatedAt}.`,
);
