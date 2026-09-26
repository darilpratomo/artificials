import { describe, expect, it } from 'vitest';
import type { BenchmarkSnapshot } from '../shared/benchmarks';
import type { History } from '../shared/history';
import type { ModelOverview, OverviewTests } from '../shared/model-overview';
import { pageMetadata, testMetadata } from '../shared/seo';
import { buildTests } from '../shared/test-pages';
import { app } from '../worker/index';
import type { Env } from '../worker/types';

const source = (id: string, name: string) => ({
  id,
  name,
  url: `https://${id}.example`,
  dataUrl: `https://${id}.example/data`,
  checkedAt: '2026-09-26T00:00:00Z',
  edition: '',
  sourceUpdatedAt: null,
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
});
const category = (id: string, sourceId: string, extra: object = {}) => ({
  id,
  name: id.toUpperCase(),
  sourceId,
  description: `What ${id} measures. More detail.`,
  methodology: `How ${id} is scored.`,
  rows: [],
  ...extra,
});
const benchmarks = {
  version: 1,
  sources: [source('epoch', 'Epoch AI'), source('arena', 'Arena')],
  categories: [
    category('capability-index', 'epoch', { unit: 'index', domain: 'overall' }),
    category('gpqa-diamond', 'epoch', { unit: 'percent', domain: 'reasoning', randomBaseline: 25 }),
    category('arena-text', 'arena', { unit: 'index', domain: 'overall' }),
    // No results yet: no page.
    category('empty-test', 'epoch'),
    // An unknown publisher: no page.
    category('orphan', 'nobody'),
  ],
} as unknown as BenchmarkSnapshot;
const overview = {
  index: [
    { name: 'Alpha', slug: 'alpha', makerId: 'openai', maker: 'OpenAI', index: 160 },
    { name: 'Beta', makerId: 'anthropic', maker: 'Anthropic', index: 150, ciLow: 148, ciHigh: 152 },
  ],
} as unknown as ModelOverview;
const row = (name: string, makerId: string, maker: string, score: number, slug?: string) => ({
  name,
  configuration: name,
  makerId,
  maker,
  score,
  ...(slug ? { slug } : {}),
});
const tests = {
  tests: [
    {
      id: 'gpqa-diamond',
      rows: [
        row('Alpha (high)', 'openai', 'OpenAI', 90, 'alpha'),
        row('Gamma', 'google', 'Google', 90),
        row('Alpha mini', 'openai', 'OpenAI', 80),
        row('Mystery', 'unknown', '', 70),
      ],
    },
    { id: 'arena-text', rows: [row('Beta', 'anthropic', 'Anthropic', 1500)] },
    { id: 'orphan', rows: [row('Beta', 'anthropic', 'Anthropic', 1)] },
  ],
} as unknown as OverviewTests;
const history = {
  leaders: [
    {
      day: '2026-09-20',
      test: 'gpqa-diamond',
      slug: 'alpha',
      name: 'Alpha',
      makerId: 'openai',
      score: 90,
      previous: { name: 'Gamma', makerId: 'google', score: 88 },
    },
    {
      day: '2026-09-24',
      test: 'gpqa-diamond',
      name: 'Gamma',
      makerId: 'google',
      score: 91,
      previous: { slug: 'alpha', name: 'Alpha', makerId: 'openai', score: 90 },
    },
    {
      day: '2026-09-25',
      test: 'arena-text',
      name: 'Beta',
      makerId: 'anthropic',
      score: 1500,
      previous: { name: 'Delta', makerId: 'xai', score: 1490 },
    },
  ],
} as unknown as History;

describe('test pages', () => {
  const { directory, pages } = buildTests({
    benchmarks,
    overview,
    tests,
    history,
    makerPages: new Map([['openai', 'openai']]),
  });
  const gpqa = pages.find((page) => page.id === 'gpqa-diamond')!;

  it('gives a page to every test with a known publisher and results', () => {
    expect(pages.map((page) => page.id)).toEqual([
      'capability-index',
      'gpqa-diamond',
      'arena-text',
    ]);
    expect(directory.tests[1]).toEqual({
      id: 'gpqa-diamond',
      label: 'GPQA-DIAMOND',
      domain: 'reasoning',
      unit: 'percent',
      sourceId: 'epoch',
      source: 'Epoch AI',
      models: 4,
      top: { name: 'Alpha (high)', slug: 'alpha', makerId: 'openai', maker: 'OpenAI', score: 90 },
    });
  });

  it('ranks every model once, ties sharing a rank, with the median and random guessing', () => {
    expect(gpqa.rows.map(({ name, rank }) => [name, rank])).toEqual([
      ['Alpha (high)', 1],
      ['Gamma', 1],
      ['Alpha mini', 3],
      ['Mystery', 4],
    ]);
    expect(gpqa).toMatchObject({ median: 85, randomBaseline: 25, unit: 'percent' });
    expect(gpqa.sourceInfo).toEqual({
      name: 'Epoch AI',
      url: 'https://epoch.example',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    });
    expect(JSON.stringify(pages)).not.toContain('checkedAt');
  });

  it('lists the best model from each known maker, linked to its maker’s page', () => {
    expect(gpqa.makers.map(({ maker, name, rank, page }) => [maker, name, rank, page])).toEqual([
      ['OpenAI', 'Alpha (high)', 1, 'openai'],
      ['Google', 'Gamma', 1, undefined],
    ]);
  });

  it('reads the capability index from its own list, with each range', () => {
    const index = pages.find((page) => page.id === 'capability-index')!;
    expect(index.rows).toEqual([
      { name: 'Alpha', slug: 'alpha', makerId: 'openai', maker: 'OpenAI', score: 160, rank: 1 },
      {
        name: 'Beta',
        makerId: 'anthropic',
        maker: 'Anthropic',
        score: 150,
        ciLow: 148,
        ciHigh: 152,
        rank: 2,
      },
    ]);
  });

  it('keeps each test’s new leaders, newest first', () => {
    expect(gpqa.leaders.map(({ day, name }) => [day, name])).toEqual([
      ['2026-09-24', 'Gamma'],
      ['2026-09-20', 'Alpha'],
    ]);
    expect(pages.find((page) => page.id === 'arena-text')!.leaders).toHaveLength(1);
  });
});

describe('test page addresses', () => {
  it('names a test in its title, and keeps unknown tests out of search', () => {
    const meta = testMetadata({
      id: 'gpqa-diamond',
      label: 'GPQA Diamond',
      models: 216,
      source: 'Epoch AI',
      description:
        'Graduate-level questions in biology, chemistry and physics. Random guessing scores 25%.',
    });
    expect(meta).toMatchObject({
      title: 'GPQA Diamond leaderboard: every AI model’s score — Artificials',
      canonical: 'https://artificials.net/tests/gpqa-diamond',
      robots: 'index,follow,max-image-preview:large',
    });
    expect(meta.description).toBe(
      '216 AI models ranked by their best published GPQA Diamond score, from Epoch AI. Graduate-level questions in biology, chemistry and physics.',
    );
    expect(testMetadata(null, 'nothing').robots).toBe('noindex,follow');
    expect(pageMetadata('/tests').title).toBe('AI benchmark tests — Artificials');
  });

  it('lists every test page in the sitemap', async () => {
    const env = {
      APP_URL: 'https://artificials.net',
      ASSETS: {
        fetch: async (input: Request) =>
          new URL(input.url).pathname === '/data/models/test-pages.json'
            ? Response.json({ version: 1, tests: [{ id: 'gpqa-diamond' }, { id: 'arena-text' }] })
            : new Response('not found', { status: 404 }),
      },
    } as unknown as Env;
    const xml = await (await app.request('/sitemap.xml', {}, env)).text();
    for (const path of ['/tests', '/tests/gpqa-diamond', '/tests/arena-text'])
      expect(xml).toContain(`<loc>https://artificials.net${path}</loc>`);
  });
});
