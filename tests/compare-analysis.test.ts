import { describe, expect, it } from 'vitest';
import { headToHead, margin } from '../src/components/compare/analysis';
import type { ModelProfile, ProfileCategory } from '../shared/model-profiles';

const category = (
  id: string,
  label: string,
  domain: ProfileCategory['domain'],
  unit: ProfileCategory['unit'] = 'percent',
) => ({ id, name: label, label, sourceId: 'source', domain, unit }) as unknown as ProfileCategory;

const categories = [
  category('capability-index', 'Capability index', 'overall', 'index'),
  category('coding', 'Coding test', 'coding'),
  category('arena-text', 'Arena text', 'language', 'index'),
  category('math', 'Math test', 'math'),
  category('only-a', 'A only', 'reasoning'),
];

function profile(
  slug: string,
  input: number,
  output: number,
  context: number | null,
  released: string,
  scores: Record<string, number>,
): ModelProfile {
  return {
    slug,
    name: slug.toUpperCase(),
    maker: 'Maker',
    makerId: 'maker',
    releaseDate: released,
    contextWindow: context,
    offerings: [{ id: `maker/${slug}`, inputPrice: input, outputPrice: output }],
    official: `maker/${slug}`,
    results: Object.entries(scores).map(([id, score]) => ({ category: id, score })),
    categories: categories.filter((entry) => entry.id in scores),
  } as unknown as ModelProfile;
}

const a = profile('a', 10, 50, 1_000_000, '2026-09-01', {
  'capability-index': 165,
  coding: 86.4,
  'arena-text': 1499,
  math: 90.04,
  'only-a': 70,
});
const b = profile('b', 2, 10, 256_000, '2026-06-01', {
  'capability-index': 166.6,
  coding: 80.4,
  'arena-text': 1480,
  math: 90.01,
});

describe('head to head', () => {
  const result = headToHead([a, b]);
  const sentence = (label: string) =>
    result.measures.find((measure) => measure.label === label)!.sentence;

  it('says who is ahead on the index, cheaper, larger and newer, in plain words', () => {
    expect(sentence('Capability index')).toBe('B is 1.6 points higher.');
    // Blended 3:1 — A $20.00, B $4.00.
    expect(sentence('Price per 1M tokens')).toBe('B is 5 times cheaper.');
    expect(sentence('Context window')).toBe('A takes in 3.9 times as much.');
    expect(sentence('Released')).toBe('A is 3 months newer.');
    expect(result.measures[0].best).toEqual([1]);
    expect(result.measures[1].best).toEqual([1]);
    expect(result.measures[3].best).toEqual([]);
  });

  it('compares only the tests both have taken, each on its own scale', () => {
    expect(result.shared.map((test) => test.category.id)).toEqual(['coding', 'math', 'arena-text']);
    // In the site's order of skill areas.
    const [coding, math, arena] = result.shared;
    expect(coding.leader).toBe(0);
    expect(margin(coding)).toBe('6.0 points');
    expect(margin(arena)).toBe('19 points');
    // 90.04% and 90.01% read the same, so neither is ahead.
    expect(math.leader).toBeNull();
    expect(result.unshared).toBe(1);
  });

  it('handles missing prices, context windows and index scores honestly', () => {
    const c = profile('c', 0, 0, null, '2026-09-01', { coding: 50 });
    c.offerings = [];
    const summary = headToHead([a, c]);
    const said = (label: string) =>
      summary.measures.find((measure) => measure.label === label)!.sentence;
    expect(said('Capability index')).toBe('Only A is on the index so far.');
    expect(said('Price per 1M tokens')).toBe('Only A has a listed price.');
    expect(said('Context window')).toBe('Only A reports a context window.');
    expect(said('Released')).toBe('Released on the same day.');
    expect(summary.measures[0].values[1]).toBe('Not on the index yet');
  });
});
