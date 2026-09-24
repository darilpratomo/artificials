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
