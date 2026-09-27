import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aboutMaker, aboutModel, aboutTest, type ChangeEvent } from '../shared/changes';
import { FLAGS, type ExplorerRow } from '../shared/model-overview';
import {
  MAX_FOLLOWED,
  clearFollowing,
  figureChanges,
  lineupOf,
  makerChanges,
  makerFiguresOf,
  newModels,
  newsSince,
  readFollowing,
  testChanges,
  testFiguresOf,
  type FollowedMaker,
  type FollowedModel,
  type FollowedTest,
} from '../src/lib/following';

const KEY = 'artificials-following-v1';

describe('figureChanges', () => {
  const seen = { price: 5, index: 150.2, hosts: 12 };

  it('finds nothing when the figures are the same, down to rounding noise', () => {
    expect(figureChanges(seen, { ...seen })).toEqual([]);
    expect(figureChanges(seen, { ...seen, price: 5 + 1e-12 })).toEqual([]);
    expect(
      figureChanges({ price: null, index: null, hosts: 0 }, { price: null, index: null, hosts: 0 }),
    ).toEqual([]);
  });

  it('lists each figure that moved, in the order the page shows them', () => {
    expect(figureChanges(seen, { price: 4, index: 151, hosts: 10 })).toEqual([
      { kind: 'price', from: 5, to: 4 },
      { kind: 'index', from: 150.2, to: 151 },
      { kind: 'hosts', from: 12, to: 10 },
    ]);
  });

  it('counts a figure appearing or going missing as a change', () => {
    expect(figureChanges({ ...seen, index: null }, seen)).toEqual([
      { kind: 'index', from: null, to: 150.2 },
    ]);
    expect(figureChanges(seen, { ...seen, price: null })).toEqual([
      { kind: 'price', from: 5, to: null },
    ]);
  });
});

describe('a maker’s figures', () => {
  const row = (slug: string, makerId: string, flags: number) =>
    [slug, slug, makerId, makerId, '', null, null, 1, null, flags] as ExplorerRow;
  const rows = [
    row('alpha-1', 'alpha', FLAGS.notable),
    row('alpha-mini', 'alpha', FLAGS.notable | FLAGS.tested),
    row('alpha-preview', 'alpha', FLAGS.tested),
    row('beta-1', 'beta', FLAGS.notable),
  ];

  it('takes its lineup from the models its page lists', () => {
    expect(lineupOf(rows, 'alpha')).toEqual(['alpha-1', 'alpha-mini']);
    expect(lineupOf(rows, 'gamma')).toEqual([]);
  });

  it('reads its page’s counts, best index and top spots', () => {
    expect(
      makerFiguresOf({ models: 2, best: { name: 'Alpha 1', index: 140.5 }, leads: 3 }, ['a', 'b']),
    ).toEqual({ models: 2, index: 140.5, leads: 3, lineup: ['a', 'b'] });
    expect(makerFiguresOf({ models: 1, leads: 0 }, ['a'])).toMatchObject({ index: null });
  });

  it('finds what moved and which models are new, whatever order the lineup comes in', () => {
    const seen = { models: 2, index: 140.5, leads: 3, lineup: ['alpha-1', 'alpha-mini'] };
    const now = { models: 3, index: 150, leads: 2, lineup: ['alpha-2', 'alpha-mini', 'alpha-1'] };
    expect(makerChanges(seen, now)).toEqual([
      { kind: 'models', from: 2, to: 3 },
      { kind: 'index', from: 140.5, to: 150 },
      { kind: 'leads', from: 3, to: 2 },
    ]);
    expect(newModels(seen, now)).toEqual(['alpha-2']);
    expect(makerChanges(seen, { ...seen, lineup: [...seen.lineup].reverse() })).toEqual([]);
    expect(newModels(seen, { ...seen, lineup: ['alpha-1'] })).toEqual([]);
  });
});

describe('a test’s figures', () => {
  const summary = {
    models: 40,
    top: { name: 'Alpha 1 (high)', slug: 'alpha-1', makerId: 'alpha', maker: 'Alpha', score: 81.2 },
  };

  it('knows its top model by page, or by name where it has none', () => {
    expect(testFiguresOf(summary)).toEqual({
      leader: 'alpha-1',
      leaderName: 'Alpha 1 (high)',
      score: 81.2,
      models: 40,
    });
    const { slug: _, ...unlinked } = summary.top;
    expect(testFiguresOf({ ...summary, top: unlinked }).leader).toBe('Alpha 1 (high)');
    expect(testFiguresOf({ models: 0 })).toEqual({
      leader: null,
      leaderName: null,
      score: null,
      models: 0,
    });
  });

  it('sees a new leader, not a new name for the same one', () => {
    const seen = testFiguresOf(summary);
    const renamed = testFiguresOf({ ...summary, top: { ...summary.top, name: 'Alpha 1 (max)' } });
    expect(testChanges(seen, renamed)).toEqual([]);
    const overtaken = testFiguresOf({
      models: 41,
      top: { name: 'Beta 2', slug: 'beta-2', makerId: 'beta', maker: 'Beta', score: 82 },
    });
    expect(testChanges(seen, overtaken)).toEqual([
      { kind: 'leader', from: 'Alpha 1 (high)', to: 'Beta 2' },
      { kind: 'score', from: 81.2, to: 82 },
      { kind: 'models', from: 40, to: 41 },
    ]);
  });
});

describe('news since the last look', () => {
  const model = (slug: string, makerId = 'openai') => ({
    slug,
    name: slug,
    makerId,
    maker: makerId,
  });
  const events = [
    { day: '2026-09-26', kind: 'release', model: model('alpha') },
    {
      day: '2026-09-25',
      kind: 'leader',
      model: model('beta', 'deepseek'),
      previous: model('alpha'),
      test: 'arena-text',
      label: 'Arena text',
      score: 1500,
      unit: 'index',
    },
    { day: '2026-09-24', kind: 'index', model: model('alpha'), score: 150 },
    { day: '2026-09-26', kind: 'release', model: model('gamma', 'google') },
  ] as unknown as ChangeEvent[];
  const days = (list: ChangeEvent[]) => list.map((event) => `${event.day} ${event.kind}`);

  it('keeps a model’s own news and the leads it lost, after the day it was seen', () => {
    expect(days(newsSince(events, '2026-09-23', (event) => aboutModel(event, 'alpha')))).toEqual([
      '2026-09-26 release',
      '2026-09-25 leader',
      '2026-09-24 index',
    ]);
    expect(days(newsSince(events, '2026-09-25', (event) => aboutModel(event, 'alpha')))).toEqual([
      '2026-09-26 release',
    ]);
    expect(newsSince(events, '2026-09-26', (event) => aboutModel(event, 'alpha'))).toEqual([]);
    expect(days(newsSince(events, '2026-09-01', (event) => aboutModel(event, 'beta')))).toEqual([
      '2026-09-25 leader',
    ]);
  });

  it('gives a maker its models’ news and the top spots other makers took from it', () => {
    expect(days(newsSince(events, '2026-09-01', (event) => aboutMaker(event, 'openai')))).toEqual([
      '2026-09-26 release',
      '2026-09-25 leader',
      '2026-09-24 index',
    ]);
    expect(days(newsSince(events, '2026-09-01', (event) => aboutMaker(event, 'deepseek')))).toEqual(
      ['2026-09-25 leader'],
    );
  });

  it('gives a test its new leaders, and the capability index its new entries too', () => {
    expect(days(events.filter((event) => aboutTest(event, 'arena-text')))).toEqual([
      '2026-09-25 leader',
    ]);
    expect(days(events.filter((event) => aboutTest(event, 'capability-index')))).toEqual([
      '2026-09-24 index',
    ]);
    expect(events.filter((event) => aboutTest(event, 'gpqa-diamond'))).toEqual([]);
  });
});

describe('what the browser remembers', () => {
  let store: Map<string, string>;
  const model = (slug: string, extra: Partial<FollowedModel> = {}): FollowedModel => ({
    slug,
    name: slug,
    makerId: 'openai',
    since: '2026-09-20',
    seen: { price: 1.5, index: null, hosts: 3 },
    ...extra,
  });
  const maker: FollowedMaker = {
    slug: 'openai',
    name: 'OpenAI',
    makerId: 'openai',
    since: '2026-09-20',
    seen: { models: 2, index: 150, leads: 1, lineup: ['gpt-6', 'gpt-6-mini'] },
  };
  const test: FollowedTest = {
    slug: 'arena-text',
    name: 'Arena text',
    since: '2026-09-20',
    seen: { leader: 'gpt-6', leaderName: 'GPT-6', score: 1500, models: 300 },
  };
  const write = (value: unknown) => store.set(KEY, JSON.stringify(value));
  const slugs = () => {
    const list = readFollowing();
    return {
      models: list.models.map((entry) => entry.slug),
      makers: list.makers.map((entry) => entry.slug),
      tests: list.tests.map((entry) => entry.slug),
    };
  };

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads each kind it saved, and lists saved before makers and tests existed', () => {
    write({ version: 1, models: [model('alpha'), model('beta', { makerId: '' })] });
    expect(slugs()).toEqual({ models: ['alpha', 'beta'], makers: [], tests: [] });
    write({ version: 1, models: [model('alpha')], makers: [maker], tests: [test] });
    expect(readFollowing()).toEqual({ models: [model('alpha')], makers: [maker], tests: [test] });
  });

  it('drops entries that were edited into something else, and repeats', () => {
    write({
      version: 1,
      models: [
        model('alpha'),
        model('alpha', { name: 'Again' }),
        model('../../admin'),
        model('beta', { since: 'yesterday' }),
        model('gamma', { makerId: 'javascript:alert(1)' }),
        { ...model('delta'), seen: { price: '1', index: null, hosts: 3 } },
        { ...model('epsilon'), seen: { price: 1, index: null, hosts: 2.5 } },
        { ...model('zeta'), seen: undefined },
        null,
        'eta',
      ],
      makers: [
        maker,
        { ...maker, slug: 'google', seen: { ...maker.seen, lineup: ['<script>'] } },
        { ...maker, slug: 'meta', seen: { ...maker.seen, lineup: 'gpt-6' } },
        { ...maker, slug: 'mistral', seen: { ...maker.seen, leads: -1 } },
      ],
      tests: [
        test,
        { ...test, slug: 'math', seen: { ...test.seen, score: '81.2' } },
        { ...test, slug: 'coding', seen: { ...test.seen, leader: 7 } },
        { ...test, slug: 'overall', seen: { ...test.seen, leaderName: 'x'.repeat(201) } },
      ],
    });
    expect(slugs()).toEqual({ models: ['alpha'], makers: ['openai'], tests: ['arena-text'] });
  });

  it('keeps no more than the limit of each kind, and nothing from broken storage', () => {
    write({
      version: 1,
      models: Array.from({ length: MAX_FOLLOWED + 5 }, (_, index) => model(`model-${index}`)),
    });
    expect(readFollowing().models).toHaveLength(MAX_FOLLOWED);
    store.set(KEY, '{not json');
    expect(slugs()).toEqual({ models: [], makers: [], tests: [] });
    store.set(KEY, 'null');
    expect(slugs()).toEqual({ models: [], makers: [], tests: [] });
  });

  it('forgets everything when cleared, and tells the open pages', () => {
    write({ version: 1, models: [model('alpha')], makers: [maker], tests: [test] });
    const told = vi.fn();
    window.addEventListener('artificials-following-change', told);
    clearFollowing();
    expect(slugs()).toEqual({ models: [], makers: [], tests: [] });
    expect(store.has(KEY)).toBe(false);
    expect(told).toHaveBeenCalledOnce();
  });
});
