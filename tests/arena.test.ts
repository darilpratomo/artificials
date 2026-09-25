import { describe, expect, it } from 'vitest';
import { ARENA_TESTS, arenaCategories, arenaVersions, type ArenaTableRow } from '../shared/arena';
import type { BenchmarkSnapshot } from '../shared/benchmarks';
import type { CatalogSnapshot, ModelRecord } from '../shared/catalog';
import { buildProfiles } from '../shared/model-profiles';
import { indexValue, score } from '../src/components/profile/format';

const row = (
  model_name: string,
  organization: string,
  rating: number,
  category = 'overall',
  leaderboard_publish_date = '2026-09-13',
  license = 'Proprietary',
): ArenaTableRow => ({
  model_name,
  organization,
  license,
  category,
  rating,
  rating_lower: rating - 5,
  rating_upper: rating + 5,
  rank: 0,
  leaderboard_publish_date,
});

/** Every Arena test gets the same rows, so each category has something to show. */
function board(rows: ArenaTableRow[]) {
  const categories = [...new Set(ARENA_TESTS.map((test) => test.category))];
  return categories.flatMap((category) => rows.map((entry) => ({ ...entry, category })));
}

describe('Arena language model tests', () => {
  const text = board([
    row('claude-test-9-max', 'anthropic', 1500.44),
    row('qwen9-max', 'alibaba', 1490),
    row('muse-test-1 (xHigh)', 'meta', 1480, 'overall', '2026-09-13', 'Apache 2.0'),
    row('inkling', 'thinky', 1400),
    row('mystery-1', '', 1300),
    // An older publication is ignored.
    row('old-model', 'openai', 1600, 'overall', '2026-08-01'),
  ]);
  const webdev = [row('claude-test-9-max', 'anthropic', 1800, 'overall', '2026-09-24')];
  const { categories, published } = arenaCategories({ text, webdev });

  it('builds each test from its latest publication, highest score first', () => {
    expect(categories.map((category) => category.id)).toEqual(ARENA_TESTS.map((test) => test.id));
    expect(published).toBe('2026-09-24');
    const overall = categories.find((category) => category.id === 'arena-text')!;
    expect(overall.rows.map((entry) => entry.model)).toEqual([
      'claude-test-9-max',
      'qwen9-max',
      'muse-test-1 (xHigh)',
      'inkling',
      'mystery-1',
    ]);
    expect(overall).toMatchObject({ sourceId: 'arena', unit: 'index', domain: 'overall' });
    expect(overall.rows[0]).toMatchObject({
      score: 1500.4,
      ciLow: 1495.4,
      ciHigh: 1505.4,
      provider: 'Anthropic',
      providerId: 'anthropic',
      evaluatedAt: '2026-09-13',
      openWeights: false,
    });
    expect(overall.rows[2].openWeights).toBe(true);
    expect(overall.rows[3].provider).toBe('Thinking Machines');
    expect(overall.rows[4]).toMatchObject({ provider: 'See source', providerId: 'unknown' });
    const web = categories.find((category) => category.id === 'arena-webdev')!;
    expect(web.rows).toHaveLength(1);
    expect(web.domain).toBe('coding');
  });

  it('peels settings off names, but keeps "Max" where it names a model', () => {
    expect(arenaVersions('claude-opus-5.5-max', 'anthropic')).toContain('claude-opus-5.5');
    expect(arenaVersions('gpt-6-astra-max', 'openai')).toContain('gpt-6-astra');
    expect(arenaVersions('qwen3.8-max', 'alibaba')).toEqual(['qwen3.8-max']);
    expect(arenaVersions('muse-spark-1.2 (xHigh)', 'meta')).toContain('muse-spark-1.2');
    expect(arenaVersions('deepseek-v4-pro-high-20260813', 'deepseek')).toContain(
      'deepseek-v4-pro-high',
    );
  });

  it('attaches results to the right catalog model, and never to a lookalike', () => {
    const offer = (providerId: string, modelId: string, name: string): ModelRecord => ({
      id: `${providerId}/${modelId}`,
      modelId,
      name,
      provider: providerId,
      providerId,
      contextWindow: 200000,
      inputPrice: 1,
      outputPrice: 5,
      releaseDate: '2026-01-01',
      modalities: ['text'],
      inputModalities: ['text'],
      outputModalities: ['text'],
      reasoning: true,
      openWeights: false,
      sourceUrl: 'https://example.test',
      providerUrl: null,
    });
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
        offer('anthropic', 'claude-test-9', 'Claude Test 9'),
        offer('alibaba', 'qwen9', 'Qwen9'),
        offer('meta', 'muse-test-1', 'Muse Test 1'),
      ],
    };
    const benchmarks: BenchmarkSnapshot = { version: 1, sources: [], categories };
    const { links } = buildProfiles(catalog, benchmarks);
    expect(links['arena-text:claude-test-9-max']).toBe('claude-test-9');
    expect(links['arena-webdev:claude-test-9-max']).toBe('claude-test-9');
    expect(links['arena-text:muse-test-1 (xHigh)']).toBe('muse-test-1');
    // Qwen9 Max is its own model: its votes never land on Qwen9.
    expect(links['arena-text:qwen9-max']).toBeUndefined();
  });
});

describe('open-ended scores', () => {
  it('write ratings as whole numbers and a small index with one decimal', () => {
    expect(indexValue(1505.7)).toBe('1506');
    expect(indexValue(158.34)).toBe('158.3');
    expect(score(1818.4, 'index')).toBe('1818');
    expect(score(91.04, 'percent')).toBe('91.0%');
  });
});
