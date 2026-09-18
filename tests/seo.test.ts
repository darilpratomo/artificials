import { describe, it, expect } from 'vitest';
import { pageMetadata, metadataHtml, publicPages } from '../shared/seo';
import { ARTICLES } from '../shared/content';
import { app } from '../worker/index';
import type { Env } from '../worker/types';
describe('public search metadata', () => {
  it('includes every original article and lesson while excluding account and CMS routes', async () => {
    const response = await app.request('/sitemap.xml', {}, {
      APP_URL: 'https://artificials.net',
    } as Env);
    expect(response.status).toBe(200);
    const xml = await response.text();
    for (const { path } of publicPages())
      expect(xml).toContain('https://artificials.net' + path + '</loc>');
    expect(xml).toContain('/contact</loc>');
    expect(xml).toContain('<lastmod>');
    expect(xml).not.toMatch(/dashboard|_private|checkout|login/);
  });
  it('uses unique titles, canonical URLs and private/unknown noindex', () => {
    const pages = publicPages().map(({ path }) => pageMetadata(path));
    expect(new Set(pages.map((page) => page.title)).size).toBe(pages.length);
    expect(pageMetadata('/models/').canonical).toBe('https://artificials.net/models');
    for (const path of [
      '/login',
      '/dashboard',
      '/checkout',
      '/_private/secret',
      '/unknown-page',
      '/news/missing',
    ])
      expect(pageMetadata(path).robots).toContain('noindex');
    expect(pageMetadata('/news/' + ARTICLES[0].slug).structured).toMatchObject({
      '@type': 'Article',
      headline: ARTICLES[0].title,
    });
  });
  it('escapes user-edited CMS text in metadata and structured data', () => {
    const article = {
      ...ARTICLES[0],
      title: '</script><script>alert("x")</script>',
      excerpt: '" onload="bad <&',
    };
    const html = metadataHtml(pageMetadata('/news/' + article.slug, [article]));
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&quot; onload=&quot;bad &lt;&amp;');
    expect(html).toContain('\\u003c/script>');
  });
});

it('CMS publication state controls HTML metadata, sitemap and missing article status', async () => {
  const { vi } = await import('vitest');
  const article = { ...ARTICLES[0], slug: 'cms-new-guide', title: 'CMS published guide' };
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(
      async () =>
        new Response(JSON.stringify([article]), {
          headers: { 'Content-Type': 'application/json' },
        }),
    );
  const env = {
    APP_URL: 'https://artificials.net',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service',
    ASSETS: {
      fetch: async () =>
        new Response('<html><head></head><body><div id="root"></div></body></html>'),
    },
  } as unknown as Env;
  try {
    const page = await app.request('/news/cms-new-guide', {}, env);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<title>CMS published guide — Artificials</title>');
    const missing = await app.request('/news/' + ARTICLES[0].slug, {}, env);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain('noindex');
    const sitemap = await app.request('/sitemap.xml', {}, env);
    const xml = await sitemap.text();
    expect(xml).toContain('/news/cms-new-guide</loc>');
    expect(xml).not.toContain('/news/' + ARTICLES[0].slug);
    const listing = await app.request('/news', {}, env);
    expect(await listing.text()).toContain('href="/news/cms-new-guide"');
  } finally {
    fetchMock.mockRestore();
  }
});
