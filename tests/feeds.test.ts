import { describe, expect, it } from 'vitest';
import type { ChangeEvent, Changes } from '../shared/changes';
import { aboutMaker, aboutTest } from '../shared/changes';
import {
  SITE_CHANNEL,
  changeTitle,
  changesFeed,
  makerChannel,
  modelChannel,
  testChannel,
} from '../shared/feeds';
import {
  makerMetadata,
  metadataHtml,
  modelMetadata,
  pageMetadata,
  testMetadata,
  weekMetadata,
} from '../shared/seo';
import { app } from '../worker/index';
import type { Env } from '../worker/types';

const model = (slug: string, name: string, maker = 'Anthropic', makerId = 'anthropic') => ({
  slug,
  name,
  maker,
  makerId,
});
const events: ChangeEvent[] = [
  {
    day: '2026-09-26',
    kind: 'leader',
    model: model('rival-1', 'Rival 1', 'OpenAI', 'openai'),
    previous: model('claude-test-1', 'Claude Test 1'),
    test: 'arena-text',
    label: 'Arena text',
    unit: 'index',
    score: 1509.4,
    withinMargin: true,
  },
  {
    day: '2026-09-20',
    kind: 'price',
    model: model('claude-test-1', 'Claude Test 1'),
    from: [5, 25],
    to: [3, 15],
  },
  { day: '2026-09-18', kind: 'release', model: model('other-1', 'Other <1> & Co') },
  {
    day: '2026-09-10',
    kind: 'index',
    model: model('claude-test-1', 'Claude Test 1'),
    score: 150.24,
  },
];

describe('change feeds', () => {
  it('writes each change as the pages do', () => {
    expect(events.map(changeTitle)).toEqual([
      'Rival 1 took the top spot on Arena text at 1509, from Claude Test 1, within the published margin',
      'Anthropic’s listed price for Claude Test 1 went from $5.00 in and $25.00 out to $3.00 in and $15.00 out per 1M tokens',
      'Other <1> & Co was released by Anthropic',
      'Claude Test 1 joined the capability index at 150.2',
    ]);
  });

  it('builds a valid feed that names itself and escapes names', () => {
    const feed = changesFeed(events, SITE_CHANNEL);
    expect(feed).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?><rss version="2.0"/);
    expect(feed).toContain('<title>What changed in AI models — Artificials</title>');
    expect(feed).toContain(
      '<atom:link href="https://artificials.net/changes.xml" rel="self" type="application/rss+xml"/>',
    );
    expect(feed.match(/<item>/g)).toHaveLength(4);
    expect(feed).toContain('<title>Other &lt;1&gt; &amp; Co was released by Anthropic</title>');
    expect(feed).toContain(
      '<guid isPermaLink="false">leader:2026-09-26:rival-1:arena-text</guid><pubDate>Sat, 26 Sep 2026 00:00:00 GMT</pubDate>',
    );
    expect(feed).not.toMatch(/lastBuildDate/);
  });

  it('gives each model, maker and test a feed of its own', () => {
    expect(modelChannel('claude-test-1', 'Claude Test 1')).toMatchObject({
      title: 'Claude Test 1: what changed — Artificials',
      path: '/models/claude-test-1',
      feed: '/models/claude-test-1/changes.xml',
    });
    expect(makerChannel('anthropic', 'Anthropic')).toMatchObject({
      title: 'Anthropic: what changed — Artificials',
      path: '/makers/anthropic',
      feed: '/makers/anthropic/changes.xml',
    });
    expect(testChannel('arena-text', 'Arena text')).toMatchObject({
      title: 'Arena text: what changed — Artificials',
      path: '/tests/arena-text',
      feed: '/tests/arena-text/changes.xml',
      description: 'Each new leader on Arena text.',
    });
    expect(testChannel('capability-index', 'Capability index').description).toBe(
      'Each new leader on the capability index, and each model that joins it.',
    );
  });

  it('keeps each feed to its own changes, linking a model without a page to the feed’s page', () => {
    const unlinked: ChangeEvent = {
      day: '2026-09-25',
      kind: 'leader',
      model: { name: 'Mystery Model', maker: '', makerId: 'unknown' },
      previous: model('rival-1', 'Rival 1', 'OpenAI', 'openai'),
      test: 'arena-text',
      label: 'Arena text',
      unit: 'index',
      score: 1512,
    };
    const all = [unlinked, ...events];
    const maker = changesFeed(
      all.filter((event) => aboutMaker(event, 'openai')),
      makerChannel('openai', 'OpenAI'),
    );
    // OpenAI's model took one top spot and lost another.
    expect(maker.match(/<item>/g)).toHaveLength(2);
    expect(maker).toContain('<link>https://artificials.net/makers/openai</link><guid');
    const test = changesFeed(
      all.filter((event) => aboutTest(event, 'arena-text')),
      testChannel('arena-text', 'Arena text'),
    );
    expect(test.match(/<item>/g)).toHaveLength(2);
    expect(test).toContain('<link>https://artificials.net/tests/arena-text</link><guid');
    expect(test).toContain('<link>https://artificials.net/models/rival-1</link>');
  });
});

describe('each model’s feed from the Worker', () => {
  const directory = {
    version: 1,
    updatedAt: '2026-09-24T00:00:00.000Z',
    buckets: 128,
    models: [
      ['claude-test-1', 'Claude Test 1', 'Anthropic', 5, 1, '2026-01-01'],
      ['quiet-model', 'Quiet Model', '', 1, 0, ''],
    ],
  };
  const changes: Changes = {
    version: 1,
    since: '2026-08-28',
    until: '2026-09-26',
    events,
    sources: [],
  };
  const envWith = (serve: (path: string) => Response) =>
    ({
      APP_URL: 'https://artificials.net',
      ASSETS: { fetch: async (request: Request) => serve(new URL(request.url).pathname) },
    }) as unknown as Env;

  it('answers that it cannot load, rather than an empty feed, when the data is missing', async () => {
    const broken = envWith(() => new Response('Unavailable', { status: 500 }));
    expect((await app.request('/models/claude-test-1/changes.xml', {}, broken)).status).toBe(503);
    expect((await app.request('/models/Bad_Slug/changes.xml', {}, broken)).status).toBe(404);
  });

  const env = envWith((path) =>
    path === '/data/models/directory.json'
      ? Response.json(directory)
      : path === '/data/models/changes.json'
        ? Response.json(changes)
        : new Response('Not found', { status: 404 }),
  );

  it('lists a model’s own changes and the top spots it lost, newest first', async () => {
    const response = await app.request('/models/claude-test-1/changes.xml', {}, env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=1800');
    const feed = await response.text();
    expect(feed).toContain('<title>Claude Test 1: what changed — Artificials</title>');
    expect(feed).toContain(
      '<atom:link href="https://artificials.net/models/claude-test-1/changes.xml" rel="self" type="application/rss+xml"/>',
    );
    const titles = [...feed.matchAll(/<item><title>([^<]*)<\/title>/g)].map((match) => match[1]);
    expect(titles).toEqual([
      'Rival 1 took the top spot on Arena text at 1509, from Claude Test 1, within the published margin',
      'Anthropic’s listed price for Claude Test 1 went from $5.00 in and $25.00 out to $3.00 in and $15.00 out per 1M tokens',
      'Claude Test 1 joined the capability index at 150.2',
    ]);
  });

  it('serves a quiet model an empty feed, and no feed to models it does not know', async () => {
    const quiet = await app.request('/models/quiet-model/changes.xml', {}, env);
    expect(quiet.status).toBe(200);
    expect(await quiet.text()).not.toContain('<item>');
    expect((await app.request('/models/unknown-model/changes.xml', {}, env)).status).toBe(404);
  });
});

describe('feeds named in page heads', () => {
  it('names a maker’s and a test’s feed on their pages', () => {
    expect(
      metadataHtml(makerMetadata({ slug: 'anthropic', name: 'Anthropic', models: 3, tested: 1 })),
    ).toContain(
      '<link id="page-feed" rel="alternate" type="application/rss+xml" title="Anthropic: what changed — Artificials" href="https://artificials.net/makers/anthropic/changes.xml">',
    );
    expect(
      metadataHtml(
        testMetadata({
          id: 'arena-text',
          label: 'Arena text',
          models: 300,
          source: 'Arena',
          description: 'People vote.',
        }),
      ),
    ).toContain('href="https://artificials.net/tests/arena-text/changes.xml"');
    expect(metadataHtml(makerMetadata(null, 'missing'))).not.toContain('application/rss+xml');
    expect(metadataHtml(testMetadata(null, 'missing'))).not.toContain('application/rss+xml');
  });

  it('names a model’s feed on its page, and none for an unknown model', () => {
    const meta = modelMetadata({
      slug: 'claude-test-1',
      name: 'Claude Test 1',
      maker: 'Anthropic',
      offerings: 5,
      hasResults: true,
    });
    expect(metadataHtml(meta)).toContain(
      '<link id="page-feed" rel="alternate" type="application/rss+xml" title="Claude Test 1: what changed — Artificials" href="https://artificials.net/models/claude-test-1/changes.xml">',
    );
    expect(metadataHtml(modelMetadata(null, 'missing'))).not.toContain('application/rss+xml');
  });

  it('names the weekly feed on the weekly pages, and leaves the site feed to the template', () => {
    // The page template names /changes.xml on every page, so no page names it twice.
    expect(pageMetadata('/changes')).not.toHaveProperty('feed');
    expect(pageMetadata('/weekly')).toMatchObject({
      feed: { href: 'https://artificials.net/weekly.xml' },
    });
    expect(
      weekMetadata({
        week: '2026-09-21',
        end: '2026-09-27',
        complete: false,
        counts: { releases: 1, leaders: 0, withinMargin: 0, prices: 0, indexed: 0 },
      }),
    ).toMatchObject({ feed: { href: 'https://artificials.net/weekly.xml' } });
    expect(metadataHtml(pageMetadata('/models'))).not.toContain('application/rss+xml');
  });
});
