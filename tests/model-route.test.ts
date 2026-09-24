import { describe, expect, it } from 'vitest';
import { normalizeCatalog } from '../shared/catalog';
import { modelMetadata, pageMetadata } from '../shared/seo';
import { app } from '../worker/index';
import type { Env } from '../worker/types';

describe('catalog detail fields', () => {
  it('keeps reported details and drops malformed values', () => {
    const snapshot = normalizeCatalog(
      {
        lab: {
          name: 'Lab',
          models: {
            'rich-1': {
              name: 'Rich 1',
              reasoning: true,
              tool_call: false,
              structured_output: true,
              knowledge: '2026-03',
              last_updated: '2026-06-01',
              family: 'Rich',
              reasoning_options: [
                { type: 'toggle' },
                { type: 'effort', values: ['low', 'high', 'high', '<script>'] },
              ],
              limit: { context: 200000, output: 64000 },
              cost: {
                input: 3,
                output: 15,
                cache_read: 0.3,
                cache_write: -1,
                tiers: [{ input: 6, output: 22.5, tier: { type: 'context', size: 200000 } }],
              },
              modalities: { input: ['text'], output: ['text'] },
            },
            'plain-1': { name: 'Plain 1', limit: { context: 8000, output: 0 } },
          },
        },
      },
      '2026-09-24T00:00:00.000Z',
    );
    const rich = snapshot.models.find((model) => model.modelId === 'rich-1')!;
    expect(rich).toMatchObject({
      maxOutput: 64000,
      cacheReadPrice: 0.3,
      knowledge: '2026-03',
      lastUpdated: '2026-06-01',
      family: 'rich',
      toolCall: false,
      structuredOutput: true,
      reasoningToggle: true,
      reasoningEfforts: ['low', 'high'],
      longContextPricing: [{ threshold: 200000, input: 6, output: 22.5, cacheRead: null }],
    });
    // A negative price is invalid, so it is omitted rather than shown.
    expect(rich.cacheWritePrice).toBeUndefined();
    const plain = snapshot.models.find((model) => model.modelId === 'plain-1')!;
    expect(plain.maxOutput).toBeUndefined();
    expect(plain.toolCall).toBeUndefined();
  });
});

describe('model profile pages', () => {
  const directory = {
    version: 1,
    updatedAt: '2026-09-24T00:00:00.000Z',
    buckets: 128,
    models: [
      ['claude-test-1', 'Claude Test 1', 'Anthropic', 5, 1, '2026-01-01'],
      ['tiny-model', 'Tiny Model', '', 1, 0, ''],
      ['busy-model', 'Busy Model', '', 4, 0, ''],
    ],
  };
  const requested: string[] = [];
  const env = {
    APP_URL: 'https://artificials.net',
    ASSETS: {
      fetch: async (request: Request) => {
        const path = new URL(request.url).pathname;
        requested.push(path);
        if (path === '/data/models/directory.json') return Response.json(directory);
        if (path === '/app-shell')
          return new Response('<html><head></head><body><div id="root"></div></body></html>', {
            headers: { 'Content-Security-Policy': "default-src 'self'" },
          });
        return new Response('Not found', { status: 404 });
      },
    },
  } as unknown as Env;

  it('serves known models with their own title, description and canonical URL', async () => {
    const response = await app.request('/models/claude-test-1', {}, env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    const html = await response.text();
    expect(html).toContain(
      '<title>Claude Test 1: benchmarks, pricing and providers — Artificials</title>',
    );
    expect(html).toContain('href="https://artificials.net/models/claude-test-1"');
    expect(html).toContain('index,follow');
    expect(html).toContain('prices from 5 providers');
  });

  it('answers unknown and malformed slugs with a real 404 and noindex', async () => {
    const missing = await app.request('/models/not-a-model', {}, env);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain('noindex,follow');
    requested.length = 0;
    const malformed = await app.request('/models/..%2Fsecret', {}, env);
    expect(malformed.status).toBe(404);
    // Our route answered, rather than the request slipping through to another handler.
    expect(await malformed.text()).toContain('noindex,follow');
    // A malformed slug is rejected before any directory lookup.
    expect(requested).not.toContain('/data/models/directory.json');
  });

  it('lists substantial profiles in the sitemap', async () => {
    const xml = await (await app.request('/sitemap.xml', {}, env)).text();
    expect(xml).toContain('https://artificials.net/models/claude-test-1</loc>');
    expect(xml).toContain('https://artificials.net/models/busy-model</loc>');
    expect(xml).not.toContain('/models/tiny-model</loc>');
  });

  it('never marks a profile path as unavailable while it loads in the browser', () => {
    const meta = pageMetadata('/models/claude-test-1');
    expect(meta.robots).toContain('index');
    expect(meta.canonical).toBe('https://artificials.net/models/claude-test-1');
    expect(modelMetadata(null, 'gone').robots).toContain('noindex');
  });
});
