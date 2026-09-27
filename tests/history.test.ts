import { describe, expect, it } from 'vitest';
import { historyState, recordHistory, withinMargin, type HistoryState } from '../shared/history';
import type { BenchmarkSnapshot } from '../shared/benchmarks';
import type { ModelProfile } from '../shared/model-profiles';

const state = (overrides: Partial<HistoryState> = {}): HistoryState => ({
  prices: { alpha: [10, 50, 'x'], beta: [1, 2, 'x'] },
  index: { alpha: 160 },
  leaders: { coding: { slug: 'alpha', name: 'Alpha', makerId: 'openai', score: 80 } },
  ...overrides,
});

describe('change history', () => {
  const first = recordHistory(undefined, state(), '2026-09-17');

  it('starts from a baseline without events', () => {
    expect(first).toMatchObject({ since: '2026-09-17', prices: {}, indexed: [], leaders: [] });
    expect(first.latest.prices.alpha).toEqual([10, 50, 'x']);
  });

  it('keeps each changed price with the price it replaced, dated by the day it was seen', () => {
    const second = recordHistory(
      first,
      state({ prices: { alpha: [8, 40, 'y'], beta: [1, 2, 'y'] } }),
      '2026-09-20',
    );
    expect(second.prices).toEqual({
      alpha: [
        ['x', 10, 50],
        ['2026-09-20', 8, 40],
      ],
    });
    const third = recordHistory(
      second,
      state({ prices: { alpha: [6, 30, 'z'], beta: [1, 2, 'z'] } }),
      '2026-09-25',
    );
    expect(third.prices.alpha).toHaveLength(3);
    // An unchanged price keeps the day it was first seen.
    expect(third.latest.prices.beta).toEqual([1, 2, 'x']);
  });

  it('keeps a listing that is missing for one snapshot from counting as a change', () => {
    const gone = recordHistory(first, state({ prices: { beta: [1, 2, 'y'] } }), '2026-09-20');
    const back = recordHistory(gone, state(), '2026-09-21');
    expect(back.prices).toEqual({});
  });

  it('records a new leader only when the top score changes hands', () => {
    const relabelled = recordHistory(
      first,
      state({ leaders: { coding: { name: 'alpha-max', makerId: 'openai', score: 80 } } }),
      '2026-09-20',
    );
    expect(relabelled.leaders).toEqual([]);
    const overtaken = recordHistory(
      first,
      state({
        leaders: { coding: { slug: 'beta', name: 'Beta', makerId: 'deepseek', score: 82 } },
      }),
      '2026-09-20',
    );
    expect(overtaken.leaders).toEqual([
      {
        day: '2026-09-20',
        test: 'coding',
        slug: 'beta',
        name: 'Beta',
        makerId: 'deepseek',
        score: 82,
        previous: { slug: 'alpha', name: 'Alpha', makerId: 'openai', score: 80 },
      },
    ]);
  });

  it('counts models joining the index, but not a source change that adds many at once', () => {
    const joined = recordHistory(first, state({ index: { alpha: 160, beta: 150 } }), '2026-09-20');
    expect(joined.indexed).toEqual([['2026-09-20', 'beta', 150]]);
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`m${i}`, 140]));
    expect(
      recordHistory(first, state({ index: { alpha: 160, ...many } }), '2026-09-20').indexed,
    ).toEqual([]);
    // Nor does the index's first appearance.
    const without = recordHistory(undefined, state({ index: {} }), '2026-09-17');
    expect(recordHistory(without, state({ index: { alpha: 160 } }), '2026-09-18').indexed).toEqual(
      [],
    );
  });

  it('keeps the top score’s published range and the next model’s score', () => {
    const profile = (slug: string, name: string) =>
      ({ slug, name, makerId: 'anthropic', offerings: [] }) as unknown as ModelProfile;
    const row = (id: string, score: number, range?: [number, number]) => ({
      id,
      model: id,
      provider: 'Anthropic',
      providerId: 'anthropic',
      score,
      rank: 0,
      sourceUrl: '',
      ...(range ? { ciLow: range[0], ciHigh: range[1] } : {}),
    });
    const snapshot = {
      version: 1,
      sources: [],
      categories: [
        {
          id: 'arena-text',
          name: 'Text',
          sourceId: 'arena',
          description: '',
          methodology: '',
          unit: 'index',
          rows: [
            row('alpha-high', 1510, [1500, 1520]),
            // The same model in another setting is not the next model.
            row('alpha', 1508, [1498, 1518]),
            row('beta', 1502, [1495, 1509]),
          ],
        },
        {
          id: 'coding',
          name: 'Coding',
          sourceId: 'livebench',
          description: '',
          methodology: '',
          rows: [row('alpha-high', 80), row('beta', 70)],
        },
      ],
    } as unknown as BenchmarkSnapshot;
    const links = {
      'arena-text:alpha-high': 'alpha',
      'arena-text:alpha': 'alpha',
      'arena-text:beta': 'beta',
    };
    const { leaders } = historyState(
      [profile('alpha', 'Alpha'), profile('beta', 'Beta')],
      links,
      snapshot,
      '2026-09-26',
    );
    expect(leaders['arena-text']).toEqual({
      slug: 'alpha',
      name: 'Alpha',
      makerId: 'anthropic',
      score: 1510,
      ciLow: 1500,
      ciHigh: 1520,
      next: 1502,
    });
    expect(withinMargin(leaders['arena-text'])).toBe(true);
    expect(withinMargin({ ...leaders['arena-text'], next: 1499 })).toBe(false);
    // A test without published ranges never reads as within the margin.
    expect(leaders.coding).toMatchObject({ score: 80, next: 70 });
    expect(withinMargin(leaders.coding)).toBe(false);
  });
});
