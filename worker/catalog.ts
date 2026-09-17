import type { Hono } from 'hono';
import { queryCatalogIndex } from '../shared/catalog';
import type {
  CatalogIndex,
  CatalogPage,
  CatalogQuery,
  CatalogSort,
  CatalogSummary,
  ModelRecord,
} from '../shared/catalog';
import type { Env } from './types';

// One immutable deployment snapshot per isolate. Never fetch external providers during a visit.
let cachedIndex: Promise<CatalogIndex> | undefined;
let cachedSummary: Promise<CatalogSummary> | undefined;
let assetBinding: Env['ASSETS'] | undefined;
const MAX_INDEX_BYTES = 8 * 1024 * 1024;
async function assetJson<T>(env: Env, path: string, maxBytes: number): Promise<T> {
  const response = await env.ASSETS.fetch(new Request(`https://artificials.net${path}`));
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
    throw new Error('Catalog snapshot unavailable.');
  const raw = await response.text();
  if (raw.length > maxBytes) throw new Error('Catalog snapshot too large.');
  return JSON.parse(raw) as T;
}
function useSnapshot(env: Env) {
  // Tests and preview deployments can supply different asset bindings in one process.
  if (assetBinding !== env.ASSETS) {
    cachedIndex = undefined;
    cachedSummary = undefined;
    assetBinding = env.ASSETS;
  }
  cachedIndex ??= assetJson<CatalogIndex>(env, '/data/catalog-index.json', MAX_INDEX_BYTES).catch(
    (error) => {
      cachedIndex = undefined;
      throw error;
    },
  );
  cachedSummary ??= assetJson<CatalogSummary>(env, '/data/catalog-summary.json', 150000).catch(
    (error) => {
      cachedSummary = undefined;
      throw error;
    },
  );
  return { index: cachedIndex, summary: cachedSummary };
}
const flag = (value: string | undefined) => (value === undefined ? undefined : value === 'true');
/** Mount before the application's /api/* fallback. No secrets or accounts required. */
export function registerCatalogRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get('/api/catalog/summary', async (c) => {
    // Summary visitors do not pay the CPU/memory cost of parsing the search index.
    const summary = await assetJson<CatalogSummary>(c.env, '/data/catalog-summary.json', 150000);
    c.header('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600');
    return c.json(summary);
  });
  app.get('/api/catalog', async (c) => {
    const params = c.req.query();
    const query: CatalogQuery & { ids?: string[] } = {
      query: params.query?.slice(0, 200),
      provider: params.provider?.slice(0, 100),
      modality: params.modality?.slice(0, 32),
      sort: params.sort as CatalogSort,
      reasoning: flag(params.reasoning),
      openWeights: flag(params.openWeights),
      page: Number(params.page || 1),
      limit: Number(params.limit || 24),
      ids: params.ids
        ?.split(',')
        .slice(0, 3)
        .map((id) => id.slice(0, 401)),
    };
    const firstPage = !Number.isFinite(query.page) || Math.floor(query.page!) <= 1;
    const unfiltered =
      !query.query?.trim() &&
      !query.provider &&
      !query.modality &&
      query.reasoning === undefined &&
      query.openWeights === undefined &&
      !query.ids?.length;
    const limit = Number.isFinite(query.limit)
      ? Math.min(40, Math.max(1, Math.floor(query.limit!)))
      : 24;
    const sort = (
      ['name', 'newest', 'context', 'input-price', 'output-price'] as string[]
    ).includes(query.sort!)
      ? query.sort!
      : 'newest';
    if (firstPage && unfiltered && [20, 24, 40].includes(limit)) {
      const response = await c.env.ASSETS.fetch(
        new Request(`https://artificials.net/data/catalog-first/${sort}-${limit}.json`),
      );
      if (
        !response.ok ||
        !response.body ||
        !response.headers.get('content-type')?.includes('application/json')
      )
        throw new Error('Catalog snapshot unavailable.');
      c.header('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600');
      c.header('Content-Type', 'application/json; charset=UTF-8');
      return c.body(response.body);
    }
    const snapshot = useSnapshot(c.env);
    const [index, summary] = await Promise.all([snapshot.index, snapshot.summary]);
    if (index.schemaVersion !== 2 || index.updatedAt !== summary.updatedAt)
      throw new Error('Inconsistent catalog deployment.');
    const { positions, ...pagination } = queryCatalogIndex(index, query);
    const shardNumbers = [
      ...new Set(positions.map((position) => Math.floor(position / index.shardSize))),
    ];
    const shards = await Promise.all(
      shardNumbers.map(
        async (number) =>
          [
            number,
            await assetJson<ModelRecord[]>(c.env, `/data/catalog-shards/${number}.json`, 250000),
          ] as const,
      ),
    );
    const byShard = new Map(shards);
    const models = positions.map(
      (position) =>
        byShard.get(Math.floor(position / index.shardSize))![position % index.shardSize],
    );
    const response: CatalogPage = { ...summary, models, ...pagination };
    c.header('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600');
    return c.json(response);
  });
}
