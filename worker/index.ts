import {
  publicPages,
  pageMetadata,
  metadataHtml,
  escapeHtml,
  modelMetadata,
  comparisonMetadata,
  SITE_URL,
} from '../shared/seo';
import {
  canonicalComparison,
  comparisonPath,
  parseComparison,
  type Comparisons,
} from '../shared/compare';
import type { DirectoryEntry, ProfileDirectory } from '../shared/model-profiles';
import type { MakerDirectory } from '../shared/maker-pages';
import type { TestDirectory } from '../shared/test-pages';
import type { Article } from '../shared/content';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { z, ZodError } from 'zod';
import { auth, db, configured, requireUser, requireAdmin, rate, captcha, hashedIp } from './auth';
import { sameOrigin } from './security';
import { articleSchema } from '../shared/schema';
import { ARTICLES } from '../shared/content';
import type { Env } from './types';
import { registerCatalogRoutes } from './catalog';
export const app = new Hono<{ Bindings: Env }>();
app.use('*', async (c, next) => {
  // Private local documentation must never become a public SPA route.
  if (/^\/admin(?:\.md(?:\/|$)|\/|$)/i.test(c.req.path)) return c.text('Not found', 404);
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-Frame-Options', 'DENY');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (c.env.ENVIRONMENT === 'production')
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Cache-Control', 'no-store');
  if (
    c.req.path.startsWith('/api/') &&
    !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) &&
    !sameOrigin(c.req.header('origin'), c.env.APP_URL) &&
    !(
      c.env.ENVIRONMENT !== 'production' &&
      ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:8787'].includes(
        c.req.header('origin') || '',
      )
    )
  )
    throw new HTTPException(403, { message: 'Request origin not allowed.' });
  await next();
});
app.use(
  '/api/*',
  bodyLimit({ maxSize: 256000, onError: (c) => c.json({ error: 'Request is too large.' }, 413) }),
);
registerCatalogRoutes(app);
app.get('/api/config', (c) =>
  c.json({
    auth: configured(c.env),
    google: c.env.GOOGLE_AUTH_ENABLED === 'true',
    turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || '',
    legalReady: c.env.LEGAL_READY === 'true',
    supportEmail: c.env.SUPPORT_EMAIL || '',
    privacyEmail: c.env.PRIVACY_EMAIL || '',
    operatorName: c.env.OPERATOR_NAME || '',
    operatorAddress: c.env.OPERATOR_ADDRESS || '',
  }),
);
app.get('/api/session', async (c) => {
  if (!configured(c.env)) return c.json({ user: null });
  const client = auth(c);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return c.json({ user: null });
  const { data: assurance, error: assuranceError } =
    await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) throw new Error('Account security');
  if (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2')
    return c.json({ user: { id: user.id, email: user.email }, requiresMfa: true });
  return c.json({ user: { id: user.id, email: user.email } });
});
app.post('/api/auth/otp', async (c) => {
  const { email, captcha: token } = z
    .object({ email: z.email().max(254), captcha: z.string().max(4096).default('') })
    .parse(await c.req.json());
  await rate(c, 'otp:' + (await hashedIp(c)), 6, 600);
  await captcha(c, token);
  const { error } = await auth(c).auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error)
    throw new HTTPException(429, {
      message: 'Unable to send a code right now. Please wait before trying again.',
    });
  return c.json({ sent: true });
});
app.post('/api/auth/verify', async (c) => {
  const { email, code } = z
    .object({ email: z.email().max(254), code: z.string().regex(/^\d{6,8}$/) })
    .parse(await c.req.json());
  await rate(c, 'verify:' + (await hashedIp(c)), 10, 600);
  const { error } = await auth(c).auth.verifyOtp({ email, token: code, type: 'email' });
  if (error)
    throw new HTTPException(400, {
      message: 'This code is invalid or expired. Please request a new one.',
    });
  return c.json({ success: true });
});
app.post('/api/auth/google', async (c) => {
  if (c.env.GOOGLE_AUTH_ENABLED !== 'true')
    throw new HTTPException(503, { message: 'Google sign-in is not available.' });
  await rate(c, 'google:' + (await hashedIp(c)), 15, 600);
  const { data, error } = await auth(c).auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: c.env.APP_URL + '/api/auth/callback', skipBrowserRedirect: true },
  });
  if (error || !data.url)
    throw new HTTPException(503, { message: 'Google sign-in is unavailable.' });
  return c.json({ url: data.url });
});
app.get('/api/auth/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.redirect('/login?error=oauth');
  const { error } = await auth(c).auth.exchangeCodeForSession(code);
  return c.redirect(error ? '/login?error=oauth' : '/dashboard');
});
app.post('/api/auth/logout', async (c) => {
  const { error } = await auth(c).auth.signOut();
  if (error) throw new Error('logout');
  return c.json({ success: true });
});
app.get('/api/security', async (c) => {
  const { client } = await requireUser(c);
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw new Error('mfa');
  return c.json({
    factors: data.totp.map((f) => ({ id: f.id, status: f.status, friendly_name: f.friendly_name })),
  });
});
app.post('/api/security/enroll', async (c) => {
  const { client, user } = await requireUser(c);
  await rate(c, 'mfa:' + user.id, 10, 600);
  const { data, error } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Artificials ' + new Date().toISOString(),
  });
  if (error)
    throw new HTTPException(400, {
      message: 'Could not create a second factor. Check existing factors.',
    });
  return c.json({ id: data.id, secret: data.totp.secret, uri: data.totp.uri });
});
app.post('/api/security/verify', async (c) => {
  const { client, user } = await requireUser(c);
  await rate(c, 'mfa-verify:' + user.id, 10, 600);
  const { factorId, code } = z
    .object({ factorId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) })
    .parse(await c.req.json());
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw new HTTPException(400, { message: 'Invalid authentication code.' });
  return c.json({ verified: true });
});
app.get('/api/articles', async (c) => {
  if (!configured(c.env)) return c.json({ articles: ARTICLES });
  const { data, error } = await db(c.env)
    .from('articles')
    .select('*')
    .eq('published', true)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw new Error('articles');
  return c.json({ articles: data });
});
app.get('/api/cms/:token/articles', async (c) => {
  await requireAdmin(c);
  const { data, error } = await db(c.env)
    .from('articles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw new Error('cms');
  return c.json({ articles: data });
});
app.post('/api/cms/:token/articles', async (c) => {
  const user = await requireAdmin(c);
  const article = articleSchema.parse(await c.req.json());
  const database = db(c.env);
  const { data, error } = await database
    .from('articles')
    .upsert({ ...article, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error)
    throw new HTTPException(400, { message: 'Unable to save. The slug may already be in use.' });
  await database.from('audit_log').insert({
    actor_id: user.id,
    action: article.published ? 'article.publish' : 'article.save',
    target_id: data.id,
  });
  return c.json({ article: data });
});
app.delete('/api/cms/:token/articles/:id', async (c) => {
  const user = await requireAdmin(c);
  const id = z.string().uuid().parse(c.req.param('id'));
  const database = db(c.env);
  const { error } = await database.from('articles').delete().eq('id', id);
  if (error) throw new Error('cms delete');
  await database
    .from('audit_log')
    .insert({ actor_id: user.id, action: 'article.delete', target_id: id });
  return c.json({ deleted: true });
});
app.get('/robots.txt', (c) =>
  c.text(
    'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /_private/\nSitemap: ' +
      c.env.APP_URL +
      '/sitemap.xml',
  ),
);
async function publishedArticles(env: Env): Promise<Article[]> {
  if (!configured(env)) return ARTICLES;
  const { data, error } = await db(env)
    .from('articles')
    .select('*')
    .eq('published', true)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw new Error('articles');
  return data || [];
}
// The profile directory is a static asset; keep one parsed copy per isolate.
let profileDirectory: { loadedAt: number; bySlug: Map<string, DirectoryEntry> } | null = null;
async function profileEntries(env: Env, requestUrl: string) {
  if (profileDirectory && Date.now() - profileDirectory.loadedAt < 5 * 60 * 1000)
    return profileDirectory.bySlug;
  const response = await env.ASSETS.fetch(
    new Request(new URL('/data/models/directory.json', requestUrl)),
  );
  if (!response.ok) throw new Error('profile directory');
  const directory = (await response.json()) as ProfileDirectory;
  profileDirectory = {
    loadedAt: Date.now(),
    bySlug: new Map(directory.models.map((entry) => [entry[0], entry])),
  };
  return profileDirectory.bySlug;
}
// The featured comparisons, by canonical address, kept per isolate like the directory.
let featuredCache: { loadedAt: number; paths: Set<string> } | null = null;
async function featuredComparisons(env: Env, requestUrl: string) {
  if (featuredCache && Date.now() - featuredCache.loadedAt < 5 * 60 * 1000)
    return featuredCache.paths;
  const response = await env.ASSETS.fetch(
    new Request(new URL('/data/models/comparisons.json', requestUrl)),
  );
  if (!response.ok) throw new Error('featured comparisons');
  const { featured } = (await response.json()) as Comparisons;
  featuredCache = {
    loadedAt: Date.now(),
    paths: new Set(featured.map(({ slugs }) => comparisonPath(slugs))),
  };
  return featuredCache.paths;
}
app.get('/sitemap.xml', async (c) => {
  const pages = publicPages(await publishedArticles(c.env));
  try {
    // Profiles with benchmark results or several hosts carry enough substance to index.
    for (const [slug, , , offerings, hasResults] of (
      await profileEntries(c.env, c.req.url)
    ).values())
      if (hasResults || offerings >= 3) pages.push({ path: '/models/' + slug });
  } catch {
    // A missing directory must not take the rest of the sitemap down.
  }
  try {
    // The featured comparisons are prerendered with their data.
    for (const path of await featuredComparisons(c.env, c.req.url)) pages.push({ path });
  } catch {
    // Neither may a missing comparisons file.
  }
  try {
    // Every maker with a page, prerendered like the comparisons.
    const response = await c.env.ASSETS.fetch(
      new Request(new URL('/data/models/makers.json', c.req.url)),
    );
    if (response.ok)
      for (const { slug } of ((await response.json()) as MakerDirectory).makers)
        pages.push({ path: '/makers/' + slug });
  } catch {
    // Nor a missing list of makers.
  }
  try {
    // Every test with a page.
    const response = await c.env.ASSETS.fetch(
      new Request(new URL('/data/models/test-pages.json', c.req.url)),
    );
    if (response.ok)
      for (const { id } of ((await response.json()) as TestDirectory).tests)
        pages.push({ path: '/tests/' + id });
  } catch {
    // Nor a missing list of tests.
  }
  return c.body(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      pages
        .map(
          ({ path, modified }) =>
            '<url><loc>' +
            SITE_URL +
            escapeHtml(path) +
            '</loc>' +
            (modified && !Number.isNaN(Date.parse(modified))
              ? '<lastmod>' + new Date(modified).toISOString() + '</lastmod>'
              : '') +
            '</url>',
        )
        .join('') +
      '</urlset>',
    200,
    { 'Content-Type': 'application/xml; charset=utf-8' },
  );
});
// Static guides use the free asset path. When CMS is configured, publication state
// must take precedence over the build snapshot (including deleted/unpublished guides).
app.on('GET', ['/news', '/news/:slug'], async (c) => {
  if (!configured(c.env)) return c.env.ASSETS.fetch(c.req.raw);
  const articles = await publishedArticles(c.env);
  const article = articles.find((a) => a.slug === c.req.param('slug'));
  const shell = await c.env.ASSETS.fetch(new Request(new URL('/app-shell', c.req.url)));
  const meta = pageMetadata(c.req.path, articles);
  const listing = c.req.path === '/news';
  const body = listing
    ? '<main class="container page"><h1>News &amp; insights</h1>' +
      articles
        .map(
          (a) =>
            '<article><h2><a href="/news/' +
            escapeHtml(a.slug) +
            '">' +
            escapeHtml(a.title) +
            '</a></h2><p>' +
            escapeHtml(a.excerpt) +
            '</p></article>',
        )
        .join('') +
      '</main>'
    : article
      ? '<main class="container article-page"><a href="/news">Back to News &amp; insights</a><h1>' +
        escapeHtml(article.title) +
        '</h1><p class="article-deck">' +
        escapeHtml(article.excerpt) +
        '</p><div class="prose">' +
        article.body
          .replace(/^(## [^\n]+)\n/gm, '$1\n\n')
          .split(/\n\s*\n/)
          .map((p) =>
            p.startsWith('## ')
              ? '<h2>' + escapeHtml(p.slice(3)) + '</h2>'
              : '<p>' + escapeHtml(p) + '</p>',
          )
          .join('') +
        '</div></main>'
      : '<main><h1>Article not found</h1><a href="/news">Browse insights</a></main>';
  const html = (await shell.text())
    .replace('</head>', metadataHtml(meta) + '</head>')
    .replace('<div id="root"></div>', '<div id="root">' + body + '</div>');
  const policy = shell.headers.get('Content-Security-Policy');
  if (policy) c.header('Content-Security-Policy', policy);
  return c.html(html, listing || article ? 200 : 404);
});
// Model profiles render in the browser; the Worker supplies the right title and
// description on first paint, and a real 404 status for unknown models.
app.get('/models/:slug', async (c) => {
  const slug = c.req.param('slug');
  let entry: DirectoryEntry | undefined;
  if (/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) {
    try {
      entry = (await profileEntries(c.env, c.req.url)).get(slug);
    } catch {
      // Fall through to the not-found response.
    }
  }
  const shell = await c.env.ASSETS.fetch(new Request(new URL('/app-shell', c.req.url)));
  const meta = modelMetadata(
    entry
      ? {
          slug: entry[0],
          name: entry[1],
          maker: entry[2],
          offerings: entry[3],
          hasResults: entry[4] === 1,
        }
      : null,
    slug,
  );
  const html = (await shell.text()).replace('</head>', metadataHtml(meta) + '</head>');
  const policy = shell.headers.get('Content-Security-Policy');
  if (policy) c.header('Content-Security-Policy', policy);
  return c.html(html, entry ? 200 : 404);
});
// Comparisons work like profiles: the Worker gives any valid address its title and
// canonical URL, and a real 404 for unknown models. Featured comparisons, at their
// canonical address, are served as prerendered pages with their data.
app.get('/compare/:pair', async (c) => {
  const slugs = parseComparison(c.req.param('pair'));
  let entries: DirectoryEntry[] = [];
  if (slugs) {
    try {
      const directory = await profileEntries(c.env, c.req.url);
      entries = slugs
        .map((slug) => directory.get(slug))
        .filter((entry): entry is DirectoryEntry => entry !== undefined);
    } catch {
      // Fall through to the not-found response.
    }
  }
  const known = Boolean(slugs && entries.length === slugs.length);
  if (known && c.req.path === canonicalComparison(slugs!)) {
    const prerendered = await c.env.ASSETS.fetch(c.req.raw);
    if (prerendered.ok) return prerendered;
  }
  // The same models in another order share the featured comparison's link preview.
  let featured = false;
  if (known)
    try {
      featured = (await featuredComparisons(c.env, c.req.url)).has(canonicalComparison(slugs!));
    } catch {
      // Without the list, the comparison page's own preview serves.
    }
  const shell = await c.env.ASSETS.fetch(new Request(new URL('/app-shell', c.req.url)));
  const meta = comparisonMetadata(
    known ? entries.map(([slug, name, maker]) => ({ slug, name, maker })) : null,
    slugs ?? [],
    featured,
  );
  const html = (await shell.text()).replace('</head>', metadataHtml(meta) + '</head>');
  const policy = shell.headers.get('Content-Security-Policy');
  if (policy) c.header('Content-Security-Policy', policy);
  return c.html(html, known ? 200 : 404);
});
app.get('/_private/:token', async (c) => {
  c.header('X-Robots-Tag', 'noindex, nofollow');
  if (!c.env.CMS_PATH_TOKEN || c.req.param('token') !== c.env.CMS_PATH_TOKEN)
    return c.text('Not found', 404);
  return c.env.ASSETS.fetch(new Request(new URL('/app-shell', c.req.url)));
});
app.all('/admin', (c) => c.text('Not found', 404));
// Artificials is free and non-commercial; the paid app builder and its plans are gone.
for (const path of ['/studio', '/pricing', '/checkout']) app.get(path, (c) => c.redirect('/', 301));
app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404));
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));
app.onError((error, c) => {
  if (error instanceof ZodError)
    return c.json({ error: 'Please check your input and try again.' }, 400);
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  return c.json({ error: 'The service is temporarily unavailable. Please try again.' }, 500);
});
export default app;
