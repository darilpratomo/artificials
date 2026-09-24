import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  normalizeCatalog,
  queryCatalog,
  buildCatalogIndex,
  queryCatalogIndex,
  catalogSummary,
  providerLogo,
  validateBenchmark,
} from '../shared/catalog';
import { registerCatalogRoutes } from '../worker/catalog';
import type { CatalogIndex, CatalogSnapshot, CatalogPage, CatalogSummary } from '../shared/catalog';
import workerApp from '../worker/index';
import { MAKER_STYLES, makerLogo } from '../shared/makers';
import type { Env } from '../worker/types';

const raw = {
  alpha: {
    name: 'Alpha',
    doc: 'https://alpha.example/docs',
    models: {
      first: {
        name: 'Model One',
        cost: { input: 0, output: 2 },
        limit: { context: 200000 },
        release_date: '2026-02-03',
        modalities: { input: ['text', 'image'], output: ['text'] },
        reasoning: true,
        open_weights: true,
      },
      second: {
        name: 'Model Two',
        cost: { input: 1, output: 4 },
        limit: { context: 100000 },
        release_date: '2026-04',
        modalities: { input: ['text'], output: ['text'] },
      },
      unknown: {
        name: 'Unknown',
        cost: { input: -5, output: 'free' },
        limit: { context: Infinity },
        release_date: '2026-02-30',
        modalities: { input: ['text', 'text', '<img>'] },
      },
    },
  },
  beta: {
    name: 'Beta',
    doc: 'javascript:alert(1)',
    models: {
      first: { name: 'Model One', cost: { input: 0.5 }, release_date: '2026-03-05' },
    },
  },
};
const snapshot = normalizeCatalog(raw, '2026-09-17T00:00:00.000Z');

describe('catalog provenance and normalization', () => {
  it('preserves real zero prices, unknown values and distinct serving providers', () => {
    expect(snapshot.models).toHaveLength(4);
    expect(snapshot.models.find((model) => model.id === 'alpha/first')?.inputPrice).toBe(0);
    const unknown = snapshot.models.find((model) => model.modelId === 'unknown')!;
    expect([
      unknown.inputPrice,
      unknown.outputPrice,
      unknown.contextWindow,
      unknown.releaseDate,
    ]).toEqual([null, null, null, null]);
    expect(unknown.modalities).toEqual(['text']);
    expect(snapshot.models.find((model) => model.id === 'beta/first')?.providerUrl).toBeNull();
    expect(snapshot.models.every((model) => !model.benchmark)).toBe(true);
    expect(snapshot.benchmarkStatus).toBe('unavailable');
  });
  it('rejects empty or malformed catalogs and keeps deterministic source IDs', () => {
    for (const input of [null, [], {}, { bad: { name: 'Bad', models: { x: {} } } }])
      expect(() => normalizeCatalog(input)).toThrow();
    const reordered = { beta: raw.beta, alpha: raw.alpha };
    expect(normalizeCatalog(reordered, snapshot.updatedAt)).toEqual(snapshot);
    expect(snapshot.models[0].sourceUrl).toMatch(/^https:\/\/github.com\/anomalyco\/models.dev\//);
  });
  it('never guesses benchmark scores or permits unsourced licensed imports', () => {
    expect(validateBenchmark({ score: 99 })).toBeNull();
    expect(
      validateBenchmark({
        score: NaN,
        metric: 'test',
        methodology: 'test',
        sourceUrl: 'https://example.com',
        updatedAt: '2026-09-17',
      }),
    ).toBeNull();
    expect(
      validateBenchmark({
        score: 82,
        metric: 'Example benchmark',
        methodology: 'Documented run',
        sourceUrl: 'https://example.com/results',
        updatedAt: '2026-09-17',
      })?.score,
    ).toBe(82);
    expect(providerLogo('attacker/../logo')).toBe('/providers/generic.svg');
  });
});
describe('bounded catalog search and ranking', () => {
  it('sorts source metrics with unknowns last and filters without a total-record cap', () => {
    expect(
      queryCatalog(snapshot, { sort: 'input-price' }).models.map((model) => model.inputPrice),
    ).toEqual([0, 0.5, 1, null]);
    expect(queryCatalog(snapshot, { sort: 'context' }).models[0].id).toBe('alpha/first');
    expect(
      queryCatalog(snapshot, { provider: 'alpha', modality: 'image', reasoning: true }).total,
    ).toBe(1);
    expect(queryCatalog(snapshot, { query: 'model one' }).total).toBe(2);
    const large = normalizeCatalog({
      alpha: {
        name: 'Alpha',
        models: Object.fromEntries(
          Array.from({ length: 150 }, (_, i) => [`model-${i}`, { name: `Model ${i}` }]),
        ),
      },
    });
    expect(queryCatalog(large, { limit: 24, page: 7 }).models).toHaveLength(6);
    expect(queryCatalog(large, { limit: 24, page: 7 }).total).toBe(150);
  });
  it('produces the same ordering in the compact runtime index', () => {
    const index = buildCatalogIndex(snapshot);
    for (const sort of ['name', 'newest', 'context', 'input-price', 'output-price'] as const) {
      const positions = queryCatalogIndex(index, { sort }).positions;
      expect(positions.map((position) => snapshot.models[position].id)).toEqual(
        queryCatalog(snapshot, { sort }).models.map((model) => model.id),
      );
    }
    expect(
      queryCatalogIndex(index, { ids: ['beta/first'], limit: Infinity, page: NaN }).positions.map(
        (position) => snapshot.models[position].id,
      ),
    ).toEqual(['beta/first']);
    expect(queryCatalogIndex(index, { provider: 'unknown' }).total).toBe(0);
    expect(queryCatalogIndex(index, { limit: 10000 }).limit).toBe(40);
  });
});
describe('public catalog API', () => {
  const app = new Hono<{ Bindings: Env }>();
  registerCatalogRoutes(app);
  let calls: string[] = [];
  const env = {
    ASSETS: {
      fetch: async (request: Request) => {
        const path = new URL(request.url).pathname;
        calls.push(path);
        const data = path.endsWith('catalog-summary.json')
          ? catalogSummary(snapshot)
          : path.endsWith('catalog-index.json')
            ? buildCatalogIndex(snapshot)
            : snapshot.models;
        return Response.json(data);
      },
    },
  } as unknown as Env;
  it('serves summary without loading the entire catalog index', async () => {
    calls = [];
    const response = await app.request('/api/catalog/summary', {}, env);
    expect(response.status).toBe(200);
    expect(((await response.json()) as CatalogSummary).totalModels).toBe(4);
    expect(calls).toEqual(['/data/catalog-summary.json']);
    expect(response.headers.get('cache-control')).toContain('public');
  });
  it('loads only the requested shards and accepts saved comparison IDs', async () => {
    calls = [];
    const response = await app.request(
      '/api/catalog?ids=alpha%2Ffirst,beta%2Ffirst&sort=name',
      {},
      env,
    );
    expect(response.status).toBe(200);
    const page = (await response.json()) as CatalogPage;
    expect(page.total).toBe(2);
    expect(page.models.map((model: { id: string }) => model.id)).toEqual([
      'alpha/first',
      'beta/first',
    ]);
    expect(calls.filter((path) => path.includes('catalog-shards'))).toEqual([
      '/data/catalog-shards/0.json',
    ]);
    expect(calls).not.toContain('/data/catalog.json');
  });
  it('applies the camel-case openWeights filter used by the frontend', async () => {
    const response = await app.request('/api/catalog?openWeights=true', {}, env);
    const page = (await response.json()) as CatalogPage;
    expect(page.total).toBe(1);
    expect(page.models[0].id).toBe('alpha/first');
    expect(page.models.every((model) => model.openWeights)).toBe(true);
  });
  it('serves the full deployed dataset through the Worker within the subrequest budget', async () => {
    const assetFiles = [
      'catalog-index.json',
      'catalog-summary.json',
      ...(await readdir(resolve('public/data/catalog-first'))).map(
        (file) => `catalog-first/${file}`,
      ),
      ...(await readdir(resolve('public/data/catalog-shards'))).map(
        (file) => `catalog-shards/${file}`,
      ),
    ];
    const assets = new Map<string, string>(
      await Promise.all(
        assetFiles.map(
          async (file) =>
            [`/data/${file}`, await readFile(resolve('public/data', file), 'utf8')] as const,
        ),
      ),
    );
    let subrequests = 0;
    const realEnv = {
      APP_URL: 'https://artificials.net',
      ENVIRONMENT: 'production',
      ASSETS: {
        fetch: async (request: Request) => {
          subrequests++;
          const data = assets.get(new URL(request.url).pathname);
          return new Response(data ?? 'Missing asset', {
            status: data ? 200 : 404,
            headers: { 'Content-Type': data ? 'application/json' : 'text/plain' },
          });
        },
      },
    } as unknown as Env;
    const timings: { kind: string; elapsedMs: number; cpuMs: number; subrequests: number }[] = [];
    for (const kind of ['first-page-cold', 'filtered-cold', 'filtered-warm', 'filtered-warm']) {
      subrequests = 0;
      const start = performance.now();
      const cpu = process.cpuUsage();
      const response = await workerApp.request(
        '/api/catalog?sort=context&limit=40' +
          (kind === 'first-page-cold' ? '' : '&reasoning=true'),
        {},
        realEnv,
      );
      // Consume the complete body, as a real response would.
      const raw = await response.text();
      const usedCpu = process.cpuUsage(cpu);
      timings.push({
        kind,
        elapsedMs: performance.now() - start,
        cpuMs: (usedCpu.user + usedCpu.system) / 1000,
        subrequests,
      });
      const page = JSON.parse(raw) as CatalogPage;
      expect(response.status).toBe(200);
      expect(page.models).toHaveLength(40);
      expect(page.totalModels).toBeGreaterThan(100);
      expect(page.models.every((model) => model.id && model.sourceUrl)).toBe(true);
      expect(subrequests).toBeLessThanOrEqual(42);
      if (kind === 'first-page-cold') expect(subrequests).toBe(1);
      else expect(page.models.every((model) => model.reasoning)).toBe(true);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    }
    if (process.env.CATALOG_BENCH === '1')
      console.log(
        'Catalog full Worker request (local Node, ASSETS in memory; not Cloudflare CPU telemetry):',
        timings,
      );
  });
  it('bundles a complete attributable snapshot and all referenced logos', async () => {
    const snapshot = JSON.parse(
      await readFile(resolve('public/data/catalog.json'), 'utf8'),
    ) as CatalogSnapshot;
    const index = JSON.parse(
      await readFile(resolve('public/data/catalog-index.json'), 'utf8'),
    ) as CatalogIndex;
    expect(snapshot.models.length).toBeGreaterThan(100);
    expect(new Set(snapshot.models.map((model) => model.id)).size).toBe(snapshot.models.length);
    expect(index.rows.length).toBe(snapshot.models.length);
    expect(index.updatedAt).toBe(snapshot.updatedAt);
    expect(index.schemaVersion).toBe(2);
    for (const sort of ['name', 'newest', 'context', 'input-price', 'output-price'] as const) {
      for (const limit of [20, 24, 40]) {
        const first = JSON.parse(
          await readFile(resolve(`public/data/catalog-first/${sort}-${limit}.json`), 'utf8'),
        ) as CatalogPage;
        const calculated = queryCatalog(snapshot, { sort, limit });
        expect(first).toEqual(calculated);
      }
    }

    // Pages draw logos with providerLogo() and makerLogo() at render time, so
    // every mark they can request must exist and be a static drawing.
    const logos = new Set([
      ...snapshot.providers.map((provider) => providerLogo(provider.id)),
      ...Object.keys(MAKER_STYLES).map(makerLogo),
    ]);
    for (const logo of logos) {
      const svg = await readFile(resolve(`public${logo}`), 'utf8');
      expect(svg).toContain('<svg');
      expect(svg).not.toMatch(/<script|<foreignObject|\bonload\s*=|javascript:|href\s*=/i);
    }
  });
});

describe('text cleanup', () => {
  it('drops placeholder release dates and emoji, but keeps paragraph breaks', async () => {
    const { normalizeCatalog, withoutPictographs } = await import('../shared/catalog');
    const snapshot = normalizeCatalog(
      { lab: { name: 'Lab', models: { m: { name: 'M', release_date: '1970-01-01' } } } },
      '2026-09-24T00:00:00.000Z',
    );
    expect(snapshot.models[0].releaseDate).toBeNull();
    expect(withoutPictographs('Launch day \u{1F680}\n\nMore  text')).toBe(
      'Launch day \n\nMore text',
    );
  });
});
