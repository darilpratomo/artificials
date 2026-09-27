import { describe, expect, it } from 'vitest';
import type { History } from '../shared/history';
import type { OverviewTests, Timeline } from '../shared/model-overview';
import type { ModelProfile } from '../shared/model-profiles';
import { weekMetadata } from '../shared/seo';
import { buildWeeks, mondayOf, weekRange, weekSentence } from '../shared/weekly';
import { app } from '../worker/index';
import type { Env } from '../worker/types';

const profile = (slug: string, name: string, maker: string, makerId: string) =>
  ({ slug, name, maker, makerId }) as unknown as ModelProfile;
const profiles = [
  profile('alpha', 'Alpha', 'OpenAI', 'openai'),
  profile('beta', 'Beta', 'Anthropic', 'anthropic'),
];
const release = (slug: string, date: string, extra: object = {}) => ({
  slug,
  name: slug.toUpperCase(),
  makerId: 'openai',
  maker: 'OpenAI',
  date,
  hosts: 3,
  openWeights: false,
  reasoning: true,
  notable: true,
  ...extra,
});
const timeline = {
  version: 1,
  updatedAt: '2026-09-26T00:00:00Z',
  entries: [
    release('late', '2026-09-24', { hosts: 20 }),
    release('scored', '2026-09-22', { index: 150, hosts: 2 }),
    release('quiet', '2026-09-23', { notable: false }),
    release('early', '2026-09-15', { makerId: 'anthropic', maker: 'Anthropic' }),
    release('before', '2026-09-10'),
  ],
} as unknown as Timeline;
const tests = {
  tests: [{ id: 'arena-text', label: 'Arena text', sourceId: 'arena', unit: 'index', rows: [] }],
} as unknown as OverviewTests;
const history: History = {
  version: 1,
  since: '2026-09-17',
  prices: {
    alpha: [
      ['2026-09-17', 10, 40],
      ['2026-09-19', 5, 20],
    ],
  },
  indexed: [],
  leaders: [
    {
      day: '2026-09-23',
      test: 'arena-text',
      slug: 'beta',
      name: 'Beta',
      makerId: 'anthropic',
      score: 1510,
      ciLow: 1500,
      ciHigh: 1520,
      next: 1505,
      previous: { slug: 'alpha', name: 'Alpha', makerId: 'openai', score: 1508 },
    },
  ],
  latest: { prices: {}, index: {}, leaders: {}, day: '2026-09-26' },
};
const source = {
  id: 'arena',
  name: 'Arena',
  url: 'https://arena.example',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  checkedAt: '2026-09-26T00:00:00Z',
};

describe('the week in AI models', () => {
  const { directory, pages } = buildWeeks({
    history,
    profiles,
    timeline,
    tests,
    sources: [source],
    until: '2026-09-26',
  });
  const [latest, first] = pages;

  it('makes one page per week, Monday to Sunday, from the week the record began', () => {
    expect(mondayOf('2026-09-17')).toBe('2026-09-14');
    expect(mondayOf('2026-09-21')).toBe('2026-09-21');
    expect(directory.latest).toBe('2026-09-21');
    expect(directory.weeks.map(({ week, end, complete }) => [week, end, complete])).toEqual([
      ['2026-09-21', '2026-09-27', false],
      ['2026-09-14', '2026-09-20', true],
    ]);
    expect([latest.previous, latest.next, first.previous, first.next]).toEqual([
      '2026-09-14',
      undefined,
      undefined,
      '2026-09-21',
    ]);
  });

  it('lists the week’s notable releases, highest on the index first, then the most hosted', () => {
    expect(latest.releases.map((entry) => entry.slug)).toEqual(['scored', 'late']);
    expect(first.releases.map((entry) => entry.slug)).toEqual(['early']);
    expect(latest.counts).toEqual({
      releases: 2,
      leaders: 1,
      withinMargin: 1,
      prices: 0,
      indexed: 0,
    });
    expect(first.counts.prices).toBe(1);
  });

  it('counts its highlights from the events, and credits their sources', () => {
    expect(latest.highlights).toEqual([
      expect.objectContaining({
        kind: 'release',
        text: 'SCORED',
        detail: 'OpenAI, 150.0 on the capability index',
      }),
      expect.objectContaining({ kind: 'maker', text: 'OpenAI', detail: '2 new models' }),
      expect.objectContaining({ kind: 'leader', text: 'Beta', detail: 'New leader on Arena text' }),
    ]);
    expect(first.highlights).toContainEqual(
      expect.objectContaining({
        kind: 'price',
        text: 'Alpha',
        detail: '−50%, now $5.00 in and $20.00 out',
      }),
    );
    expect(latest.sources.map((entry) => entry.id)).toEqual(['arena']);
    expect(JSON.stringify(pages)).not.toContain('checkedAt');
  });
});

describe('week labels and addresses', () => {
  it('writes a week’s dates and figures as people do', () => {
    expect(weekRange('2026-09-21', '2026-09-27')).toBe('Sep 21–27, 2026');
    expect(weekRange('2026-09-28', '2026-10-04')).toBe('Sep 28 – Oct 4, 2026');
    expect(weekRange('2026-12-28', '2027-01-03')).toBe('Dec 28, 2026 – Jan 3, 2027');
    expect(weekSentence({ releases: 15, leaders: 1, withinMargin: 0, prices: 0, indexed: 2 })).toBe(
      '15 new releases, 1 new leader on a test and 2 models joining the capability index',
    );
    expect(weekSentence({ releases: 0, leaders: 0, withinMargin: 0, prices: 0, indexed: 0 })).toBe(
      'No new releases, leaders or price changes',
    );
  });

  it('names each week in its title, with a card of its own', () => {
    const meta = weekMetadata({
      week: '2026-09-21',
      end: '2026-09-27',
      complete: false,
      counts: { releases: 15, leaders: 7, withinMargin: 5, prices: 0, indexed: 0 },
    });
    expect(meta).toMatchObject({
      title: 'The week in AI models: Sep 21–27, 2026 — Artificials',
      canonical: 'https://artificials.net/weekly/2026-09-21',
      image: 'https://artificials.net/og/weekly/2026-09-21.png',
      robots: 'index,follow,max-image-preview:large',
    });
    expect(meta.description).toMatch(/^15 new releases and 7 new leaders on tests so far, /);
    expect(weekMetadata(null, '2026-01-05').robots).toBe('noindex,follow');
  });

  it('lists every week in the sitemap', async () => {
    const env = {
      APP_URL: 'https://artificials.net',
      ASSETS: {
        fetch: async (input: Request) =>
          new URL(input.url).pathname === '/data/models/weekly.json'
            ? Response.json({
                version: 1,
                latest: '2026-09-21',
                weeks: [{ week: '2026-09-21' }, { week: '2026-09-14' }],
              })
            : new Response('not found', { status: 404 }),
      },
    } as unknown as Env;
    const xml = await (await app.request('/sitemap.xml', {}, env)).text();
    for (const path of ['/weekly/2026-09-21', '/weekly/2026-09-14'])
      expect(xml).toContain(`<loc>https://artificials.net${path}</loc>`);
  });
});
