import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  benchmarkCandidates,
  buildProfiles,
  isNoChargeOffer,
  isPaidOffer,
  makerOf,
  modelSlug,
  profileBucket,
  PROFILE_BUCKETS,
} from '../shared/model-profiles';
import type { CatalogSnapshot, ModelRecord } from '../shared/catalog';
import type { BenchmarkCategory, BenchmarkSnapshot } from '../shared/benchmarks';
import { buildOverview, configurationOf, referencePrice } from '../shared/model-overview';

describe('model identity', () => {
  it('removes host prefixes and routing suffixes but keeps versions', () => {
    expect(modelSlug('claude-sonnet-5')).toBe('claude-sonnet-5');
    expect(modelSlug('anthropic/claude-sonnet-5')).toBe('claude-sonnet-5');
    expect(modelSlug('anthropic.claude-sonnet-4-20250514-v1:0')).toBe('claude-sonnet-4-20250514');
    expect(modelSlug('us.anthropic.claude-sonnet-4-20250514-v1:0')).toBe(
      'claude-sonnet-4-20250514',
    );
    expect(modelSlug('claude-sonnet-4@20250514')).toBe('claude-sonnet-4');
    expect(modelSlug('z-ai/glm-5.2:free')).toBe('glm-5-2');
    expect(modelSlug('Qwen/Qwen3-32B')).toBe('qwen3-32b');
    expect(modelSlug('gpt-5.5')).toBe('gpt-5-5');
  });

  it('never mistakes a version number for a host suffix', () => {
    // A "-v3" that is part of the name must survive; only Bedrock's "-v1:0" is removed.
    expect(modelSlug('deepseek-v3')).toBe('deepseek-v3');
    expect(modelSlug('deepseek/deepseek-v4-pro')).toBe('deepseek-v4-pro');
    expect(modelSlug('gpt-5-2025-08-07')).toBe('gpt-5-2025-08-07');
  });

  it('peels only configuration markers from benchmark names', () => {
    expect(benchmarkCandidates('gpt-6-astra_max')).toContain('gpt-6-astra');
    expect(benchmarkCandidates('claude-fable-5-1-max-effort')).toContain('claude-fable-5-1');
    expect(benchmarkCandidates('claude-opus-4-6-thinking-auto-high-effort')).toContain(
      'claude-opus-4-6',
    );
    expect(benchmarkCandidates('kimi-k2.6-thinking')).toContain('kimi-k2-6');
    expect(benchmarkCandidates('o3-2025-04-16_high')).toEqual(
      expect.arrayContaining(['o3-2025-04-16', 'o3']),
    );
    // "Max" is part of real model names, so a bare suffix is never removed.
    expect(benchmarkCandidates('qwen3-max')).not.toContain('qwen3');
    expect(benchmarkCandidates('qwen3.8-max-0902_xhigh')).not.toContain('qwen3-8');
    // Exact names always come first.
    expect(benchmarkCandidates('qwen3-30b-a3b-thinking-2507')[0]).toBe(
      'qwen3-30b-a3b-thinking-2507',
    );
  });

  it('attributes makers only when the name is unambiguous', () => {
    expect(makerOf('claude-sonnet-5')).toEqual({ maker: 'Anthropic', makerId: 'anthropic' });
    expect(makerOf('gpt-oss-120b').makerId).toBe('openai');
    expect(makerOf('o3-mini').makerId).toBe('openai');
    expect(makerOf('gemma-3-27b-it').makerId).toBe('google');
    expect(makerOf('olmo-2-13b')).toEqual({ maker: '', makerId: 'unknown' });
    // A host's prefix or a base model's name does not make the host or base maker the maker.
    expect(makerOf('zai-glm-5-3').makerId).toBe('zai');
    expect(makerOf('llama-3-3-nemotron-super-49b-v1-5').makerId).toBe('nvidia');
    expect(makerOf('llama-4-scout-17b-16e-instruct').makerId).toBe('meta');
  });

  it('spreads profiles across a fixed number of files, identically everywhere', () => {
    const bucket = profileBucket('claude-sonnet-5');
    expect(bucket).toBe(profileBucket('claude-sonnet-5'));
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThan(PROFILE_BUCKETS);
    const used = new Set(['a', 'b', 'gpt-5', 'claude', 'glm-5-2', 'kimi-k3'].map(profileBucket));
    expect(used.size).toBeGreaterThan(3);
  });

  it('treats a zero price as a free tier or plan, not the lowest list price', () => {
    expect(isPaidOffer({ inputPrice: 1, outputPrice: 2 })).toBe(true);
    expect(isPaidOffer({ inputPrice: 0, outputPrice: 2 })).toBe(true);
    expect(isPaidOffer({ inputPrice: 0, outputPrice: 0 })).toBe(false);
    expect(isPaidOffer({ inputPrice: null, outputPrice: 2 })).toBe(false);
    expect(isNoChargeOffer({ inputPrice: 0, outputPrice: 0 })).toBe(true);
    expect(isNoChargeOffer({ inputPrice: null, outputPrice: null })).toBe(false);
  });
});

function offer(
  providerId: string,
  modelId: string,
  input: number | null,
  output: number | null,
  extra: Partial<ModelRecord> = {},
): ModelRecord {
  return {
    id: `${providerId}/${modelId}`,
    modelId,
    name: 'Claude Test 1',
    provider: providerId === 'anthropic' ? 'Anthropic' : providerId.toUpperCase(),
    providerId,
    contextWindow: 200000,
    inputPrice: input,
    outputPrice: output,
    releaseDate: '2026-01-01',
    modalities: ['text'],
    inputModalities: ['text'],
    outputModalities: ['text'],
    reasoning: true,
    openWeights: false,
    sourceUrl: 'https://example.test',
    providerUrl: null,
    ...extra,
  };
}

function category(
  id: string,
  rows: [string, number, string][],
  extra: Partial<BenchmarkCategory> = {},
): BenchmarkCategory {
  return {
    id,
    name: id === 'coding' ? 'Coding' : id,
    sourceId: id === 'coding' ? 'livebench' : 'epoch',
    description: 'Test',
    methodology: 'Test',
    unit: 'percent',
    domain: id === 'coding' ? 'coding' : 'reasoning',
    rows: rows.map(([model, score, providerId], index) => ({
      id: model,
      model,
      provider: providerId,
      providerId,
      score,
      rank: index + 1,
      sourceUrl: 'https://example.test',
    })),
    ...extra,
  };
}

const catalog: CatalogSnapshot = {
  schemaVersion: 1,
  updatedAt: '2026-09-24T00:00:00.000Z',
  source: 'models.dev',
  sourceUrl: 'https://models.dev/api.json',
  license: 'MIT',
  coverage: '',
  benchmarkStatus: 'unavailable',
  providers: [],
  models: [
    offer('anthropic', 'claude-test-1', 3, 15),
    offer('reseller', 'anthropic/claude-test-1', 3, 15),
    offer('bedrock', 'anthropic.claude-test-1-v1:0', 2, 10),
    offer('plan', 'claude-test-1', 0, 0),
    offer('mystery', 'claude-test-1', null, null),
    offer('anthropic', 'claude-other-2', 5, 25, { name: 'Claude Other 2' }),
    offer('host', 'qwen3', 0.2, 0.6, { name: 'Qwen3' }),
  ],
};

const benchmarks: BenchmarkSnapshot = {
  version: 1,
  sources: [],
  categories: [
    category(
      'capability-index',
      [
        ['Claude Test 1', 150, 'anthropic'],
        ['Claude Other 2', 140, 'anthropic'],
      ],
      { unit: 'index', domain: 'overall' },
    ),
    category('coding', [
      ['claude-test-1-high-effort', 80, 'anthropic'],
      ['claude-test-1-low-effort', 70, 'anthropic'],
      ['qwen3-max', 60, 'alibaba'],
      // A contradicting maker must never attach, even when the name matches.
      ['claude-other-2', 50, 'openai'],
    ]),
  ],
};
// The index row maps through its model versions, as the Epoch data does.
benchmarks.categories[0].rows[0].versions = ['claude-test-1_high'];
benchmarks.categories[0].rows[1].versions = ['claude-other-2_high'];

describe('building profiles', () => {
  const { profiles, links } = buildProfiles(catalog, benchmarks);
  const test = profiles.find((profile) => profile.slug === 'claude-test-1')!;

  it('groups every host of one model into one profile', () => {
    expect(test.offerings.map((entry) => entry.providerId).sort()).toEqual(
      ['anthropic', 'bedrock', 'mystery', 'plan', 'reseller'].sort(),
    );
    expect(test.maker).toBe('Anthropic');
    expect(test.official).toBe('anthropic/claude-test-1');
  });

  it('orders list prices first, official on ties, then no-charge, then unpriced', () => {
    expect(test.offerings.map((entry) => entry.providerId)).toEqual([
      'bedrock',
      'anthropic',
      'reseller',
      'plan',
      'mystery',
    ]);
  });

  it('attaches every configuration of a matched model, and nothing else', () => {
    expect(test.results.map((result) => result.configuration)).toEqual([
      'Claude Test 1',
      'claude-test-1-high-effort',
      'claude-test-1-low-effort',
    ]);
    expect(links['coding:qwen3-max']).toBeUndefined();
    expect(profiles.find((profile) => profile.slug === 'qwen3')!.results).toEqual([]);
    expect(links['coding:claude-other-2']).toBeUndefined();
  });

  it('labels tests by name and ranks within each test', () => {
    const coding = test.categories.find((entry) => entry.id === 'coding')!;
    expect(coding.label).toBe('LiveBench coding');
    expect(coding.total).toBe(4);
    expect(coding.best).toBe(80);
    expect(test.results.find((result) => result.category === 'coding')!.rank).toBe(1);
  });

  it('suggests the nearest models on the capability index as peers', () => {
    expect(test.peers.map((peer) => peer.slug)).toEqual(['claude-other-2']);
    expect(test.peers[0].inputPrice).toBe(5);
  });

  it('is deterministic', () => {
    expect(JSON.stringify(buildProfiles(catalog, benchmarks))).toBe(
      JSON.stringify(buildProfiles(catalog, benchmarks)),
    );
  });
});

describe('published snapshots', () => {
  it('build into consistent profiles', () => {
    const snapshot = JSON.parse(
      readFileSync('public/data/catalog.json', 'utf8'),
    ) as CatalogSnapshot;
    const results = JSON.parse(
      readFileSync('public/data/benchmarks.json', 'utf8'),
    ) as BenchmarkSnapshot;
    const { profiles, links } = buildProfiles(snapshot, results);
    expect(profiles.length).toBeGreaterThan(1000);
    const slugs = new Set(profiles.map((profile) => profile.slug));
    expect(slugs.size).toBe(profiles.length);
    for (const slug of Object.values(links)) expect(slugs.has(slug)).toBe(true);
    for (const profile of profiles) {
      expect(profile.offerings.length).toBeGreaterThan(0);
      expect(profile.slug).toMatch(/^[a-z0-9][a-z0-9-]{0,99}$/);
      for (const result of profile.results) {
        expect(result.rank).toBeLessThanOrEqual(result.total);
        expect(profile.categories.some((entry) => entry.id === result.category)).toBe(true);
      }
    }
  });
});

describe('careful identity rules', () => {
  const base = { ...catalog, models: [] as ModelRecord[] };
  const results = (rows: [string, number, string][], id = 'coding'): BenchmarkSnapshot => ({
    version: 1,
    sources: [],
    categories: [category(id, rows)],
  });

  it('reads a bare "-max" as effort only when another record shows a max setting', () => {
    const snapshot = {
      ...base,
      models: [
        offer('openai', 'gpt-test-9', 2, 8, { name: 'GPT Test 9' }),
        offer('alibaba', 'qwen9', 1, 3, { name: 'Qwen9' }),
      ],
    };
    const rows = results([
      ['gpt-test-9-max', 90, 'openai'],
      ['qwen9-max', 80, 'alibaba'],
    ]);
    // Without evidence, neither row is attached.
    expect(buildProfiles(snapshot, rows).links['coding:gpt-test-9-max']).toBeUndefined();
    // Epoch records "gpt-test-9_max", so "-max" there is an effort setting.
    const { links } = buildProfiles(snapshot, rows, [
      { name: 'GPT Test 9', versions: ['gpt-test-9_high', 'gpt-test-9_max'] },
    ]);
    expect(links['coding:gpt-test-9-max']).toBe('gpt-test-9');
    expect(links['coding:qwen9-max']).toBeUndefined();
  });

  it('never names a reseller as the maker, but trusts a lab that only sells its own models', () => {
    const { profiles } = buildProfiles(
      {
        ...base,
        models: [
          offer('reseller', 'mystery-7', 1, 2, { name: 'Mystery 7' }),
          offer('upstage', 'studio-2', 1, 2, { name: 'Studio 2' }),
        ],
      },
      { version: 1, sources: [], categories: [] },
    );
    const mystery = profiles.find((profile) => profile.slug === 'mystery-7')!;
    expect(mystery).toMatchObject({ maker: '', makerId: 'unknown' });
    const studio = profiles.find((profile) => profile.slug === 'studio-2')!;
    expect(studio).toMatchObject({
      maker: 'Upstage',
      makerId: 'upstage',
      official: 'upstage/studio-2',
    });
  });

  it('ignores placeholder dates and one host’s outlying context window', () => {
    const { profiles } = buildProfiles(
      {
        ...base,
        models: [
          offer('a', 'widget-1', 1, 2, {
            name: 'Widget 1',
            releaseDate: '1970-01-01',
            contextWindow: 20000000,
          }),
          offer('b', 'widget-1', 1, 2, {
            name: 'Widget 1',
            releaseDate: '2026-05-02',
            contextWindow: 2000000,
          }),
          offer('c', 'widget-1', 1, 2, {
            name: 'Widget 1',
            releaseDate: '2026-05-03',
            contextWindow: 2000000,
          }),
        ],
      },
      { version: 1, sources: [], categories: [] },
    );
    expect(profiles[0].releaseDate).toBe('2026-05-02');
    expect(profiles[0].contextWindow).toBe(2000000);
  });

  it('tells apart variants that share a display name', () => {
    const { profiles } = buildProfiles(
      {
        ...base,
        models: [
          offer('anthropic', 'claude-test-1', 3, 15),
          offer('anthropic', 'claude-test-1-fast', 6, 30),
          offer('anthropic', 'claude-test-1-2026-01-01', 3, 15),
        ],
      },
      { version: 1, sources: [], categories: [] },
    );
    expect(profiles.map((profile) => profile.name).sort()).toEqual([
      'Claude Test 1',
      'Claude Test 1 (2026-01-01)',
      'Claude Test 1 (fast)',
    ]);
  });

  it('attaches research records by exact identifiers only', () => {
    const { profiles } = buildProfiles(catalog, benchmarks, [
      {
        name: 'Claude Test 1',
        versions: ['claude-test-1_high'],
        organization: 'Anthropic',
        country: 'United States of America',
        access: 'API access',
        trainingCompute: 3e25,
      },
      { name: 'Qwen3 Max', versions: ['qwen3-max'], organization: 'Alibaba' },
    ]);
    expect(profiles.find((profile) => profile.slug === 'claude-test-1')!.facts).toMatchObject({
      name: 'Claude Test 1',
      trainingCompute: 3e25,
    });
    // "qwen3-max" is not "qwen3"; the record stays unattached.
    expect(profiles.find((profile) => profile.slug === 'qwen3')!.facts).toBeUndefined();
  });
});

describe('home overview', () => {
  const { profiles, links } = buildProfiles(catalog, benchmarks);
  const { overview, tests, explorer } = buildOverview(profiles, links, catalog, benchmarks, []);

  it('uses the maker’s own price, or else the middle host price, never a free plan', () => {
    const test = profiles.find((profile) => profile.slug === 'claude-test-1')!;
    expect(referencePrice(test)).toEqual({ input: 3, output: 15, blended: 6, from: 'maker' });
    const qwen = profiles.find((profile) => profile.slug === 'qwen3')!;
    expect(referencePrice(qwen)).toMatchObject({ from: 'median', input: 0.2 });
  });

  it('names the tested configuration next to the model', () => {
    expect(configurationOf('gpt-6_high', 'gpt-6')).toBe('high');
    expect(configurationOf('model_none')).toBe('no reasoning');
    expect(configurationOf('claude-test-1-high-effort', 'claude-test-1')).toBe('high effort');
    expect(configurationOf('other-name', 'claude-test-1')).toBe('');
    expect(configurationOf('gpt-5-2025-08-07', 'gpt-5')).toBe('2025-08-07');
  });

  it('keeps each model’s best configuration once per test, highest first', () => {
    const coding = tests.tests.find((entry) => entry.id === 'coding')!;
    expect(coding.rows[0]).toMatchObject({
      name: 'Claude Test 1 (high effort)',
      slug: 'claude-test-1',
      score: 80,
    });
    expect(coding.rows.filter((row) => row.slug === 'claude-test-1')).toHaveLength(1);
    expect(overview.metrics.map((entry) => entry.id)).toEqual(['coding']);
  });

  it('lists index models with links, prices and leaders that name their test', () => {
    expect(overview.index[0]).toMatchObject({
      name: 'Claude Test 1',
      slug: 'claude-test-1',
      makerId: 'anthropic',
      index: 150,
    });
    const leader = overview.highlights.find((entry) => entry.id === 'index')!;
    expect(leader).toMatchObject({ kind: 'measured', detail: 'Epoch Capabilities Index' });
    const coding = overview.highlights.find((entry) => entry.id === 'coding')!;
    expect(coding.detail).toBe('LiveBench coding');
    expect(explorer.models).toHaveLength(profiles.length);
  });
});

describe('market and timeline', () => {
  const rich = {
    ...catalog,
    models: [
      ...catalog.models,
      offer('anthropic', 'claude-test-1-fast', 6, 30, {
        family: 'claude-test',
        lastUpdated: '2026-02-01',
        attachment: true,
        temperature: false,
        reasoningToggle: true,
        maxInput: 150000,
        contextWindow: 1_000_000,
      }),
    ],
  };
  const { profiles, links } = buildProfiles(rich, benchmarks);
  const { overview, timeline } = buildOverview(profiles, links, rich, benchmarks, []);

  it('carries every reported detail into the profile', () => {
    const fast = profiles.find((profile) => profile.slug === 'claude-test-1-fast')!;
    expect(fast).toMatchObject({
      family: 'claude-test',
      lastUpdated: '2026-02-01',
      attachment: true,
      temperature: false,
      reasoningToggle: true,
      maxInput: 150000,
    });
  });

  it('measures the market over models from known makers only', () => {
    const { market } = overview;
    // Qwen3 has one host and no maker listing, so it is not counted.
    expect(market.base).toBe(3);
    expect(market.millionContext).toBe(1);
    expect(market.makers[0]).toMatchObject({ makerId: 'anthropic', models: 3 });
    expect(market.makers[0].best).toMatchObject({ slug: 'claude-test-1', index: 150 });
    expect(market.widest[0]).toMatchObject({ slug: 'claude-test-1', hosts: 5 });
    // Blended prices 6, 10 and 12: the middle one.
    expect(market.medianPrice).toBe(10);
  });

  it('lists every dated release on the timeline with its details', () => {
    expect(timeline.entries.length).toBeGreaterThanOrEqual(overview.releases.length);
    const entry = timeline.entries.find((item) => item.slug === 'claude-test-1')!;
    expect(entry).toMatchObject({ inputPrice: 3, outputPrice: 15, priceFrom: 'maker' });
    expect(timeline.entries.every((item) => item.date <= rich.updatedAt.slice(0, 10))).toBe(true);
  });
});
