import { describe, expect, it } from 'vitest';
import { buildMakers, makerSlug } from '../shared/maker-pages';
import type { ModelOverview, OverviewTests } from '../shared/model-overview';
import type { ModelProfile } from '../shared/model-profiles';
import { makerMetadata, pageMetadata } from '../shared/seo';
import { app } from '../worker/index';
import type { Env } from '../worker/types';

const profile = (
  slug: string,
  makerId: string,
  maker: string,
  date: string,
  { hosts = 1, official = false, tested = false } = {},
) =>
  ({
    slug,
    name: slug.toUpperCase(),
    maker,
    makerId,
    releaseDate: date,
    contextWindow: 200_000,
    openWeights: false,
    official: official ? `${makerId}/${slug}` : undefined,
    offerings: Array.from({ length: hosts }, (_, index) => ({
      id: index === 0 && official ? `${makerId}/${slug}` : `host-${index}/${slug}`,
      providerId: index === 0 && official ? makerId : `host-${index}`,
      inputPrice: 3,
      outputPrice: 15,
    })),
    results: tested ? [{ category: 'coding' }] : [],
  }) as unknown as ModelProfile;

const profiles = [
  profile('claude-a', 'anthropic', 'Anthropic', '2026-09-01', { official: true, tested: true }),
  profile('claude-b', 'anthropic', 'Anthropic', '2026-06-01', { hosts: 2 }),
  profile('claude-c', 'anthropic', 'Anthropic', '2026-03-01', { official: true, tested: true }),
  // One host, untested and not sold by its maker: not counted.
  profile('claude-x', 'anthropic', 'Anthropic', '2026-09-10'),
  // Too little for a page: one untested model.
  profile('reka-a', 'reka', 'Reka', '2026-01-01', { hosts: 2 }),
  // One tested model is enough.
  profile('granite-a', 'ibm', 'IBM', '2026-02-01', { hosts: 2, tested: true }),
];

const source = (id: string) => ({
  id,
  name: id,
  url: `https://${id}.example`,
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  checkedAt: '2026-09-26T00:00:00Z',
});
const overview = {
  sources: [source('livebench'), source('epoch'), source('arena'), source('swebench')],
  index: [
    { name: 'GPT Top', slug: 'gpt-top', makerId: 'openai', maker: 'OpenAI', index: 170 },
    {
      name: 'Claude A',
      slug: 'claude-a',
      makerId: 'anthropic',
      maker: 'Anthropic',
      index: 160,
      releasedAt: '2026-09-01',
      price: { blended: 6 },
    },
    { name: 'Claude C', slug: 'claude-c', makerId: 'anthropic', maker: 'Anthropic', index: 150 },
  ],
} as unknown as ModelOverview;
const tests = {
  tests: [
    {
      id: 'coding',
      label: 'LiveBench coding',
      domain: 'coding',
      unit: 'percent',
      sourceId: 'livebench',
      rows: [
        { name: 'Claude A (max)', slug: 'claude-a', makerId: 'anthropic', score: 90 },
        { name: 'GPT Top', makerId: 'openai', score: 85 },
        { name: 'Granite A', slug: 'granite-a', makerId: 'ibm', score: 40 },
      ],
    },
    {
      id: 'arena-text',
      label: 'Arena text',
      domain: 'overall',
      unit: 'index',
      sourceId: 'arena',
      rows: [
        { name: 'GPT Top', makerId: 'openai', score: 1500 },
        { name: 'Claude C', slug: 'claude-c', makerId: 'anthropic', score: 1500 },
        { name: 'Claude A', slug: 'claude-a', makerId: 'anthropic', score: 1490 },
      ],
    },
  ],
} as unknown as OverviewTests;

describe('maker pages', () => {
  const { directory, pages } = buildMakers({ profiles, overview, tests });
  const anthropic = pages.find((page) => page.id === 'anthropic')!;

  it('gives a page to makers with three counted models or one tested model', () => {
    expect(pages.map((page) => page.slug)).toEqual(['anthropic', 'ibm']);
    expect(directory.makers.map((maker) => maker.slug)).toEqual(['anthropic', 'ibm']);
    expect(makerSlug('Z.ai')).toBe('z-ai');
    expect(makerSlug('Mistral AI')).toBe('mistral-ai');
  });

  it('lists the counted models newest first, with their index and reference price', () => {
    expect(anthropic).toMatchObject({ models: 3, tested: 2, openWeights: 0 });
    expect(anthropic.lineup.map((model) => model.slug)).toEqual([
      'claude-a',
      'claude-b',
      'claude-c',
    ]);
    expect(anthropic.lineup[0]).toMatchObject({ index: 160, price: 6, priceFrom: 'maker' });
    expect(anthropic.lineup[1]).toMatchObject({ index: null, priceFrom: 'median' });
    expect(anthropic.newest).toEqual({ slug: 'claude-a', name: 'CLAUDE-A', date: '2026-09-01' });
  });

  it('ranks its best result on each test, ties sharing a rank', () => {
    expect(
      anthropic.results.map(({ test, name, rank, total }) => [test, name, rank, total]),
    ).toEqual([
      ['capability-index', 'Claude A', 2, 3],
      // Equal standings keep the tests in alphabetical order.
      ['arena-text', 'Claude C', 1, 3],
      ['coding', 'Claude A (max)', 1, 3],
    ]);
    expect(anthropic.leads).toBe(2);
    expect(anthropic.best).toEqual({ slug: 'claude-a', name: 'Claude A', index: 160 });
    // Skill areas use the same headline tests as model pages.
    expect(anthropic.areas.map(({ area, test }) => [area, test])).toEqual([
      ['overall', 'capability-index'],
      ['coding', 'coding'],
    ]);
  });

  it('places its models on the capability index against the top score', () => {
    expect(anthropic.ranking).toEqual({
      total: 3,
      count: 2,
      top: { name: 'GPT Top', maker: 'OpenAI', makerId: 'openai', index: 170 },
      models: [
        { name: 'Claude A', slug: 'claude-a', index: 160, rank: 2, date: '2026-09-01', price: 6 },
        { name: 'Claude C', slug: 'claude-c', index: 150, rank: 3 },
      ],
    });
  });

  it('credits only the sources behind its results, without fetch times', () => {
    expect(anthropic.sources.map((entry) => entry.id)).toEqual(['livebench', 'epoch', 'arena']);
    expect(JSON.stringify(pages)).not.toContain('checkedAt');
    const ibm = pages.find((page) => page.id === 'ibm')!;
    expect(ibm.best).toBeUndefined();
    expect(ibm.leads).toBe(0);
    expect(ibm.results).toMatchObject([{ test: 'coding', rank: 3, total: 3 }]);
  });
});

describe('maker page addresses', () => {
  it('names a maker in its title, and keeps unknown makers out of search', () => {
    expect(
      makerMetadata({ slug: 'anthropic', name: 'Anthropic', models: 38, tested: 21 }),
    ).toMatchObject({
      title: 'Anthropic AI models: benchmarks, prices and releases — Artificials',
      canonical: 'https://artificials.net/makers/anthropic',
      robots: 'index,follow,max-image-preview:large',
    });
    expect(makerMetadata(null, 'nobody').robots).toBe('noindex,follow');
    expect(pageMetadata('/makers').title).toBe('AI model makers — Artificials');
    expect(pageMetadata('/makers/anthropic').canonical).toBe(
      'https://artificials.net/makers/anthropic',
    );
  });

  it('lists every maker page in the sitemap', async () => {
    const env = {
      APP_URL: 'https://artificials.net',
      ASSETS: {
        fetch: async (input: Request) =>
          new URL(input.url).pathname === '/data/models/makers.json'
            ? Response.json({
                version: 1,
                makers: [{ slug: 'anthropic' }, { slug: 'z-ai' }],
              })
            : new Response('not found', { status: 404 }),
      },
    } as unknown as Env;
    const xml = await (await app.request('/sitemap.xml', {}, env)).text();
    for (const path of ['/makers', '/makers/anthropic', '/makers/z-ai'])
      expect(xml).toContain(`<loc>https://artificials.net${path}</loc>`);
  });
});
