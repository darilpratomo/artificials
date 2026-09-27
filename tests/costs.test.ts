import { describe, expect, it } from 'vitest';
import { buildCosts, COST_FLAGS, workloadCost } from '../shared/costs';
import type { ModelOverview } from '../shared/model-overview';
import type { ModelProfile } from '../shared/model-profiles';
import { presetOf } from '../src/lib/workload';

const offer = (id: string, providerId: string, inputPrice: number, outputPrice: number) => ({
  id,
  providerId,
  inputPrice,
  outputPrice,
  cacheReadPrice: inputPrice / 10,
});
const profile = (slug: string, extra: object) =>
  ({
    slug,
    name: slug.toUpperCase(),
    maker: 'OpenAI',
    makerId: 'openai',
    contextWindow: 128_000,
    openWeights: false,
    reasoning: true,
    offerings: [],
    results: [],
    ...extra,
  }) as unknown as ModelProfile;

describe('the cost calculator’s list', () => {
  const profiles = [
    // Sold by its maker: the maker's own price, with its cached price.
    profile('alpha', {
      official: 'openai/alpha',
      offerings: [offer('host/alpha', 'host', 1, 2), offer('openai/alpha', 'openai', 3, 12)],
    }),
    // Two hosts: the middle price across them.
    profile('beta', {
      openWeights: true,
      reasoning: false,
      offerings: [offer('a/beta', 'a', 0.1, 0.2), offer('b/beta', 'b', 0.3, 0.6)],
    }),
    // One host, untested, not sold by its maker: not counted.
    profile('gamma', { offerings: [offer('a/gamma', 'a', 1, 1)] }),
    // Counted, but no paid listing.
    profile('delta', {
      official: 'openai/delta',
      offerings: [{ ...offer('openai/delta', 'openai', 0, 0) }],
    }),
  ];
  const overview = {
    index: [{ name: 'Alpha', slug: 'alpha', makerId: 'openai', maker: 'OpenAI', index: 150 }],
  } as unknown as ModelOverview;
  const { rows } = buildCosts(profiles, overview);

  it('lists counted models with a paid price, those on the index first', () => {
    expect(rows.map((row) => row[0])).toEqual(['alpha', 'beta']);
    expect(rows[0]).toEqual([
      'alpha',
      'ALPHA',
      'openai',
      'OpenAI',
      3,
      12,
      0.3,
      150,
      128_000,
      COST_FLAGS.reasoning,
      'maker',
    ]);
    expect(rows[1].slice(4, 8)).toEqual([0.1, 0.2, 0.01, null]);
    expect(rows[1][9]).toBe(COST_FLAGS.openWeights);
    expect(rows[1][10]).toBe('median');
  });

  it('prices a request from its tokens', () => {
    // 1,500 tokens in at $3 and 500 out at $12 per 1M tokens.
    expect(workloadCost(rows[0], 1500, 500)).toBeCloseTo(0.0105, 10);
  });

  it('knows a typical request by its numbers', () => {
    expect(presetOf(1500, 500)).toBe('chat');
    expect(presetOf(30000, 1000)).toBe('report');
    expect(presetOf(1500, 501)).toBe('custom');
  });
});
