import { describe, expect, it } from 'vitest';
import { FLAGS, type ExplorerRow } from '../shared/model-overview';
import { searchIndex } from '../shared/search';
import { ARTICLES } from '../shared/content';
import { UTILITIES } from '../shared/utilities';
import { findEntries, findModels, type SearchEntry } from '../src/lib/search';

const row = (
  slug: string,
  name: string,
  date: string,
  hosts: number,
  tested = true,
): ExplorerRow => [
  slug,
  name,
  'anthropic',
  'Anthropic',
  date,
  null,
  null,
  hosts,
  null,
  tested ? FLAGS.tested : 0,
];

describe('model search', () => {
  const rows = [
    row('claude-opus-5', 'Claude Opus 5', '2026-07-24', 42),
    row('claude-opus-5-5', 'Claude Opus 5.5', '2026-09-22', 31),
    row('anthropic-claude-opus-5-5', 'Claude Opus 5.5', '2026-09-22', 1, false),
    row('claude-haiku-4', 'Claude Haiku 4', '2025-10-01', 3),
    row('metis', 'Métis', '2026-01-01', 12),
  ];

  it('puts widely offered tested models first, newest first', () => {
    expect(findModels(rows, 'claude', 10).map(([slug]) => slug)).toEqual([
      'claude-opus-5-5',
      'claude-opus-5',
      'claude-haiku-4',
      'anthropic-claude-opus-5-5',
    ]);
  });

  it('needs every word, in the name, the maker or the address', () => {
    expect(findModels(rows, 'opus 5.5', 10).map(([slug]) => slug)).toEqual([
      'claude-opus-5-5',
      'anthropic-claude-opus-5-5',
    ]);
    expect(findModels(rows, 'anthropic haiku', 10).map(([slug]) => slug)).toEqual([
      'claude-haiku-4',
    ]);
    expect(findModels(rows, 'claude-opus-5-5', 10)).toHaveLength(2);
  });

  it('ignores accents, keeps to the limit and leaves out chosen models', () => {
    expect(findModels(rows, 'metis', 10).map(([slug]) => slug)).toEqual(['metis']);
    expect(findModels(rows, 'claude', 2)).toHaveLength(2);
    expect(findModels(rows, 'claude', 10, ['claude-opus-5'])).toHaveLength(3);
    expect(findModels(rows, '   ', 10)).toEqual([]);
  });
});

describe('page search', () => {
  const entries: SearchEntry[] = [
    ['page', '/leaderboard', 'Model rankings', 'Scores on every published test', ''],
    ['page', '/changes', 'What changed', 'Price changes, new leaders and releases', ''],
    ['guide', '/news/prices', 'Reading token prices', 'How providers charge', 'Guides'],
    ['tool', '/tools/compress-pdf', 'Compress PDFs', 'Smaller PDFs', 'PDF'],
  ];
  const paths = (query: string) => findEntries(entries, query).map(([, path]) => path);

  it('ranks titles that start with the search, then title words, then descriptions', () => {
    expect(paths('price')).toEqual(['/news/prices', '/changes']);
    expect(paths('changes')).toEqual(['/changes']);
    expect(paths('rank')).toEqual(['/leaderboard']);
  });

  it('needs every word and finds the extra words too', () => {
    expect(paths('compress pdf')).toEqual(['/tools/compress-pdf']);
    expect(paths('compress word')).toEqual([]);
    expect(paths('guides')).toEqual(['/news/prices']);
  });
});

describe('search index', () => {
  const { entries } = searchIndex();
  const find = (path: string) => entries.find((entry) => entry[1] === path);

  it('names pages as the menus do, and still finds them by their page title', () => {
    expect(find('/changes')).toEqual([
      'page',
      '/changes',
      'What changed',
      'Price changes, new leaders and releases',
      expect.stringContaining('What changed in AI models'),
    ]);
    expect(find('/')?.[2]).toBe('Home');
  });

  it('lists every published guide, lesson and tool once', () => {
    const count = (kind: SearchEntry[0]) => entries.filter(([entry]) => entry === kind).length;
    expect(count('guide')).toBe(ARTICLES.filter((article) => article.published).length);
    expect(count('tool')).toBe(UTILITIES.length);
    expect(count('lesson')).toBeGreaterThan(30);
    expect(new Set(entries.map(([, path]) => path)).size).toBe(entries.length);
    expect(entries.filter(([kind, path]) => kind === 'page' && path.startsWith('/tools/'))).toEqual(
      [],
    );
  });

  it('finds a maker by its name, not by the line under it', () => {
    const index = searchIndex([
      {
        slug: 'anthropic',
        id: 'anthropic',
        name: 'Anthropic',
        models: 38,
        tested: 21,
        openWeights: 0,
        leads: 15,
      },
    ]);
    const maker = index.entries.find(([kind]) => kind === 'maker')!;
    expect(maker).toEqual([
      'maker',
      '/makers/anthropic',
      'Anthropic',
      '38 models, 21 tested',
      'anthropic',
      'anthropic',
    ]);
    expect(findEntries(index.entries, 'anthropic')[0]).toBe(maker);
    expect(findEntries(index.entries, 'models').some(([kind]) => kind === 'maker')).toBe(false);
  });

  it('carries no guide text, only titles and summaries', () => {
    // Allow metadata for the 99-guide collection; article bodies must stay out of the index.
    expect(JSON.stringify(searchIndex()).length).toBeLessThan(42_000);
  });
});
