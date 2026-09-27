import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangeEvent } from '../shared/changes';
import {
  MAX_FOLLOWED,
  clearFollowing,
  eventsSince,
  figureChanges,
  readFollowing,
  type Followed,
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

describe('eventsSince', () => {
  const model = (slug: string) => ({ slug, name: slug, makerId: 'openai', maker: 'OpenAI' });
  const events = [
    { day: '2026-09-26', kind: 'release', model: model('alpha') },
    {
      day: '2026-09-25',
      kind: 'leader',
      model: model('beta'),
      previous: model('alpha'),
      test: 'arena-text',
      label: 'Arena text',
      score: 1500,
      unit: 'index',
    },
    { day: '2026-09-24', kind: 'index', model: model('alpha'), score: 150 },
    { day: '2026-09-26', kind: 'release', model: model('gamma') },
  ] as unknown as ChangeEvent[];

  it('keeps a model’s own news and the leads it lost, after the day it was seen', () => {
    expect(eventsSince(events, 'alpha', '2026-09-23').map((event) => event.day)).toEqual([
      '2026-09-26',
      '2026-09-25',
      '2026-09-24',
    ]);
  });

  it('leaves out news from the day the figures were taken and before', () => {
    expect(eventsSince(events, 'alpha', '2026-09-25').map((event) => event.kind)).toEqual([
      'release',
    ]);
    expect(eventsSince(events, 'alpha', '2026-09-26')).toEqual([]);
  });

  it('gives a new leader its win', () => {
    expect(eventsSince(events, 'beta', '2026-09-01').map((event) => event.kind)).toEqual([
      'leader',
    ]);
  });
});

describe('the followed list in this browser', () => {
  let store: Map<string, string>;
  const entry = (slug: string, extra: Partial<Followed> = {}): Followed => ({
    slug,
    name: slug,
    makerId: 'openai',
    since: '2026-09-20',
    seen: { price: 1.5, index: null, hosts: 3 },
    ...extra,
  });
  const write = (value: unknown) => store.set(KEY, JSON.stringify(value));

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

  it('reads the entries it saved', () => {
    write({ version: 1, models: [entry('alpha'), entry('beta', { makerId: '' })] });
    expect(readFollowing().map((model) => model.slug)).toEqual(['alpha', 'beta']);
  });

  it('drops entries that were edited into something else', () => {
    write({
      version: 1,
      models: [
        entry('alpha'),
        entry('../../admin'),
        entry('beta', { since: 'yesterday' }),
        entry('gamma', { makerId: 'javascript:alert(1)' }),
        { ...entry('delta'), seen: { price: '1', index: null, hosts: 3 } },
        { ...entry('epsilon'), seen: undefined },
        null,
        'zeta',
      ],
    });
    expect(readFollowing().map((model) => model.slug)).toEqual(['alpha']);
  });

  it('keeps no more than the limit, and nothing from broken storage', () => {
    write({
      version: 1,
      models: Array.from({ length: MAX_FOLLOWED + 5 }, (_, index) => entry(`model-${index}`)),
    });
    expect(readFollowing()).toHaveLength(MAX_FOLLOWED);
    store.set(KEY, '{not json');
    expect(readFollowing()).toEqual([]);
  });

  it('forgets every model when cleared, and tells the open pages', () => {
    write({ version: 1, models: [entry('alpha')] });
    const told = vi.fn();
    window.addEventListener('artificials-following-change', told);
    clearFollowing();
    expect(readFollowing()).toEqual([]);
    expect(store.has(KEY)).toBe(false);
    expect(told).toHaveBeenCalledOnce();
  });
});
