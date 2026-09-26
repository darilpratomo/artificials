import { describe, expect, it } from 'vitest';
import {
  buildComparisons,
  canonicalComparison,
  comparisonPath,
  parseComparison,
} from '../shared/compare';
import type { ModelOverview } from '../shared/model-overview';
import { comparisonMetadata, pageMetadata } from '../shared/seo';
import { app } from '../worker/index';
import type { Env } from '../worker/types';

describe('comparison addresses', () => {
  it('reads two or three different models, in the order given', () => {
    expect(parseComparison('gpt-6-astra-vs-claude-fable-5-1')).toEqual([
      'gpt-6-astra',
      'claude-fable-5-1',
    ]);
    expect(parseComparison('a-vs-b-vs-c')).toEqual(['a', 'b', 'c']);
    for (const pair of ['gpt-6-astra', 'a-vs-b-vs-c-vs-d', 'a-vs-a', 'a-vs-', '-vs-b', 'A-vs-b'])
      expect(parseComparison(pair), pair).toBeNull();
  });

  it('has one canonical address per set of models', () => {
    expect(comparisonPath(['b', 'a'])).toBe('/compare/b-vs-a');
    expect(canonicalComparison(['gpt-6-astra', 'claude-fable-5-1'])).toBe(
      '/compare/claude-fable-5-1-vs-gpt-6-astra',
    );
    expect(canonicalComparison(['c', 'a', 'b'])).toBe('/compare/a-vs-b-vs-c');
  });
});

describe('featured comparisons', () => {
  const point = (slug: string, makerId: string, maker: string, index: number) => ({
    name: slug.toUpperCase(),
    slug,
    makerId,
    maker,
    index,
  });
  const overview = {
    index: [
      point('alpha-2', 'openai', 'OpenAI', 160),
      point('alpha-1', 'openai', 'OpenAI', 150),
      point('beta', 'anthropic', 'Anthropic', 158),
      point('gamma', 'google', 'Google', 155),
      { name: 'No profile', makerId: 'meta', maker: 'Meta', index: 170 },
      point('orphan', 'unknown', '', 165),
    ],
  } as unknown as ModelOverview;

  it('pairs the best model of each leading maker, in canonical order', () => {
    const { featured } = buildComparisons(overview, ['alpha-2', 'beta', 'gamma']);
    expect(featured.map((pair) => pair.slugs.join(' vs '))).toEqual([
      'alpha-2 vs beta',
      'alpha-2 vs gamma',
      'beta vs gamma',
    ]);
    expect(featured[0]).toMatchObject({
      names: ['ALPHA-2', 'BETA'],
      makers: ['OpenAI', 'Anthropic'],
      makerIds: ['openai', 'anthropic'],
    });
  });

  it('refuses a model slug that would break comparison addresses', () => {
    expect(() => buildComparisons(overview, ['model-vs-other'])).toThrow('-vs-');
  });
});

describe('comparison metadata', () => {
  const models = [
    { slug: 'gpt-6-astra', name: 'GPT-6 Astra', maker: 'OpenAI' },
    { slug: 'claude-fable-5-1', name: 'Claude Fable 5.1', maker: 'Anthropic' },
  ];

  it('names the models in the address order, with one canonical address', () => {
    const meta = comparisonMetadata(models, ['gpt-6-astra', 'claude-fable-5-1']);
    expect(meta.title).toBe(
      'GPT-6 Astra vs Claude Fable 5.1: benchmarks, price and context — Artificials',
    );
    expect(meta.description).toMatch(/^GPT-6 Astra \(OpenAI\) and Claude Fable 5\.1 \(Anthropic\)/);
    expect(meta.canonical).toBe('https://artificials.net/compare/claude-fable-5-1-vs-gpt-6-astra');
    expect(meta.robots).toContain('index');
    expect(
      comparisonMetadata([...models, { slug: 'x', name: 'X', maker: '' }], ['a', 'b', 'x'])
        .description,
    ).toMatch(/^GPT-6 Astra \(OpenAI\), Claude Fable 5\.1 \(Anthropic\) and X side by side/);
  });

  it("uses a featured comparison's own link preview, and the page's for others", () => {
    expect(comparisonMetadata(models, ['gpt-6-astra', 'claude-fable-5-1'], true).image).toBe(
      'https://artificials.net/og/compare/claude-fable-5-1-vs-gpt-6-astra.png',
    );
    expect(comparisonMetadata(models, ['gpt-6-astra', 'claude-fable-5-1']).image).toBe(
      'https://artificials.net/og/compare.png',
    );
  });

  it('keeps unknown models and invalid addresses out of search', () => {
    expect(comparisonMetadata(null, ['a', 'b']).robots).toBe('noindex,follow');
    expect(pageMetadata('/compare/a-vs-a').robots).toContain('noindex');
    expect(pageMetadata('/compare/b-vs-a')).toMatchObject({
      title: 'AI model comparison — Artificials',
      canonical: 'https://artificials.net/compare/a-vs-b',
    });
  });
});

describe('comparison pages from the Worker', () => {
  const shell = '<html><head></head><body><div id="root"></div></body></html>';
  const env = {
    APP_URL: 'https://artificials.net',
    ASSETS: {
      fetch: async (input: Request) => {
        const { pathname } = new URL(input.url);
        if (pathname === '/data/models/directory.json')
          return Response.json({
            version: 1,
            models: [
              ['gpt-6-astra', 'GPT-6 Astra', 'OpenAI', 20, 1, '2026-09-04'],
              ['claude-fable-5-1', 'Claude Fable 5.1', 'Anthropic', 30, 1, '2026-09-01'],
              ['kimi-k3', 'Kimi K3', 'Moonshot AI', 40, 1, '2026-07-16'],
            ],
          });
        if (pathname === '/data/models/comparisons.json')
          return Response.json({
            version: 1,
            featured: [{ slugs: ['claude-fable-5-1', 'gpt-6-astra'] }],
          });
        if (pathname === '/compare/claude-fable-5-1-vs-gpt-6-astra')
          return new Response('prerendered comparison');
        if (pathname === '/app-shell') return new Response(shell);
        return new Response('not found', { status: 404 });
      },
    },
  } as unknown as Env;

  it('serves a featured comparison prerendered at its canonical address', async () => {
    const response = await app.request('/compare/claude-fable-5-1-vs-gpt-6-astra', {}, env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('prerendered comparison');
  });

  it('gives any other valid comparison its title and canonical address', async () => {
    const response = await app.request('/compare/kimi-k3-vs-gpt-6-astra', {}, env);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(
      '<title>Kimi K3 vs GPT-6 Astra: benchmarks, price and context — Artificials</title>',
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://artificials.net/compare/gpt-6-astra-vs-kimi-k3">',
    );
    expect(html).toContain('content="https://artificials.net/og/compare.png"');
  });

  it('shares the featured preview when the same models come in another order', async () => {
    const html = await (
      await app.request('/compare/gpt-6-astra-vs-claude-fable-5-1', {}, env)
    ).text();
    expect(html).toContain(
      '<meta property="og:image" content="https://artificials.net/og/compare/claude-fable-5-1-vs-gpt-6-astra.png">',
    );
    expect(html).toContain('<meta property="og:image:width" content="1200">');
  });

  it('answers unknown models and invalid addresses with a real 404', async () => {
    for (const path of ['/compare/gpt-6-astra-vs-not-a-model', '/compare/kimi-k3-vs-kimi-k3']) {
      const response = await app.request(path, {}, env);
      expect(response.status, path).toBe(404);
      expect(await response.text()).toContain('noindex');
    }
  });

  it('lists the featured comparisons in the sitemap', async () => {
    const xml = await (await app.request('/sitemap.xml', {}, env)).text();
    expect(xml).toContain('https://artificials.net/compare/claude-fable-5-1-vs-gpt-6-astra</loc>');
  });
});
