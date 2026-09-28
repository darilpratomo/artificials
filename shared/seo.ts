import { ARTICLES, type Article } from './content';
import { articleCover } from './editorial-covers';
import academy from './academy-index.json';
import { UTILITIES } from './utilities';
import { canonicalComparison, parseComparison } from './compare';
import { weekRange, weekSentence, type WeekCounts } from './week-label';
import { WEEKLY_CHANNEL, makerChannel, modelChannel, testChannel, type FeedChannel } from './feeds';
export const SITE_URL = 'https://artificials.net';
/**
 * Link previews drawn at build time (scripts/build-og-images.mjs): the site's
 * default card, one per model with test results, per featured comparison, per
 * maker and per test, and the lists' own cards. The rules here pick the same
 * files the build draws.
 */
const DEFAULT_IMAGE = SITE_URL + '/og/default.png';
const COMPARE_IMAGE = SITE_URL + '/og/compare.png';
/** Pages with a card of their own. */
const PAGE_IMAGES: Record<string, string> = {
  '/compare': COMPARE_IMAGE,
  '/makers': SITE_URL + '/og/makers.png',
  '/tests': SITE_URL + '/og/tests.png',
  '/cost-calculator': SITE_URL + '/og/cost-calculator.png',
};
const pages: Record<string, [string, string]> = {
  '/tools': [
    'Free image, PDF and Word tools',
    'Compress images and PDFs, merge and extract pages, convert images, and work with Word documents. Free browser tools with no file uploads.',
  ],
  ...Object.fromEntries(
    UTILITIES.map((tool) => [
      '/tools/' + tool.id,
      [
        tool.title + ' — free online tool',
        tool.description + ' Process files locally in your browser, without uploads or an account.',
      ],
    ]),
  ),
  '/': [
    'AI model rankings, prices and new releases',
    'Compare AI models by test results, price and context window. Rankings, charts and every new release, refreshed automatically.',
  ],
  '/models': [
    'AI model comparison',
    'Compare AI models on capability, price and context window: the most capable, cheapest and newest models, charts, prices per token and every model we track, with sources.',
  ],
  '/coding-agents': [
    'AI coding agents compared',
    'Compare AI coding agents such as Codex CLI, Claude Code and Gemini CLI on Terminal-Bench 2.0 and SWE-bench: how much the agent changes a model’s score, what a task costs, and how long a task models can finish.',
  ],
  '/image-models': [
    'AI image model rankings',
    'The best AI image generators and image editors, ranked by blind votes in the Arena: every category, open-weights models, each maker’s best and how scores have moved.',
  ],
  '/model-finder': [
    'AI model finder',
    'Find the best AI model for your task and budget: coding, writing, math, agents and more, ranked on published tests, with prices, context windows and open-weights options.',
  ],
  '/video-models': [
    'AI video model rankings',
    'The best AI video generators, ranked by blind votes in the Arena: text to video, image to video and video editing, open-weights models, each maker’s best and how scores have moved.',
  ],
  '/trends': [
    'AI trends',
    'How AI is changing: the capability frontier by maker and country, open weights against closed models, the falling cost of capability, context windows, training compute and the pace of releases.',
  ],
  '/leaderboard': [
    'AI model rankings and benchmarks',
    'Compare published AI benchmarks for coding, reasoning, mathematics, language, and image generation, with source and update information.',
  ],
  '/leaders': [
    'Current AI model leaders',
    'Explore the leading AI models by capability, coding, reasoning, image generation and more, then open the full ranking table.',
  ],
  '/score-price-time': [
    'AI model score, price and time chart',
    'Compare AI model capability against price, release date and context window with interactive filters and downloadable charts.',
  ],
  '/market': [
    'AI model market overview',
    'Understand the AI model market by maker activity, availability, pricing, open weights and model capabilities.',
  ],
  '/releases': [
    'AI model release timeline',
    'Every AI model release, newest first: release dates, prices, context windows, capabilities and makers, updated automatically.',
  ],
  '/changes': [
    'What changed in AI models',
    'New AI model releases, listed price changes, new leaders on each benchmark and models joining the capability index over the last 30 days, newest first.',
  ],
  '/cost-calculator': [
    'AI model cost calculator',
    'Describe a typical request and how many you send, and see what it costs each month on every AI model, next to its capability index.',
  ],
  '/weekly': [
    'The week in AI models',
    'Each week’s new AI model releases, new leaders on benchmark tests and listed price changes, on one page.',
  ],
  '/tests': [
    'AI benchmark tests',
    'Every AI benchmark test on Artificials: what each measures, who publishes it, how many models it covers and which model scores highest.',
  ],
  '/makers': [
    'AI model makers',
    'Every AI model maker on Artificials: how many models each has, how many are tested, and the best score each reaches on the capability index.',
  ],
  '/compare': [
    'Compare AI models',
    'Compare AI model context windows, input and output pricing, capabilities, and provider specifications side by side.',
  ],
  '/news': [
    'AI insights and original guides',
    'Read original guides to AI models, benchmark evaluation, context windows, and engineering reliable AI applications.',
  ],
  '/learn': [
    'Learn AI with Python — Artificials Academy',
    'Learn AI through 36 original lessons: foundations, Python, machine learning, neural networks, language models, and four practical projects.',
  ],
  '/how-ai-works': [
    'How AI works — An animated journey from your question to the silicon',
    'Follow one question down through an AI system and back: tokens, meaning, neurons, attention, training, GPUs, memory, whole data centres, and the answer. Twenty animated chapters.',
  ],
  '/about': [
    'About Artificials',
    'Artificials is a free, non-commercial guide to AI models, published benchmark evidence and practical AI education.',
  ],
  '/contact': [
    'Contact Artificials',
    'Contact Artificials at support@artificials.net with corrections, questions and feedback.',
  ],
  '/privacy': [
    'Privacy policy',
    'How Artificials handles analytics, local preferences, editor accounts and privacy requests. Visitors never need an account.',
  ],
  '/terms': [
    'Terms and conditions',
    'The terms for using Artificials, a free and non-commercial site: model information, rankings, guides, lessons and free tools.',
  ],
};
/** Every fixed page with its title and description, for the site search's index. */
export function staticPages() {
  return Object.entries(pages).map(([path, [title, description]]) => ({
    path,
    title,
    description,
  }));
}
/**
 * A page's own RSS feed, named in its head beside the site's feed (which the
 * page template names on every page), so feed readers find both.
 */
export interface FeedLink {
  title: string;
  href: string;
}
const feedLink = (channel: FeedChannel): FeedLink => ({
  title: channel.title,
  href: SITE_URL + channel.feed,
});

export function publicPages(articles: Article[] = ARTICLES) {
  return [
    ...Object.keys(pages).map((path) => ({ path })),
    ...articles
      .filter((a) => a.published)
      .map((a) => ({ path: '/news/' + a.slug, modified: a.updated_at })),
    ...academy.lessons.map((l) => ({ path: '/learn/' + l.slug, modified: academy.updatedAt })),
  ] as { path: string; modified?: string }[];
}
export function pageMetadata(pathname: string, articles: Article[] = ARTICLES) {
  const path = pathname.replace(/\/$/, '') || '/';
  const comparison = /^\/compare\/([a-z0-9-]+)$/.exec(path);
  const compared = comparison && parseComparison(comparison[1]);
  // The page names the models once they load; the Worker and the prerenderer do it first.
  if (compared)
    return {
      ...comparisonMetadata(
        compared.map((slug) => ({ slug, name: slug, maker: '' })),
        compared,
      ),
      title: 'AI model comparison — Artificials',
      description:
        'Published test results, prices, context windows and features of AI models, side by side.',
    };
  const week = /^\/weekly\/(\d{4}-\d{2}-\d{2})$/.exec(path);
  // The page names the week once it loads; the prerenderer does it first.
  if (week)
    return {
      ...weekMetadata(null, week[1]),
      title: 'The week in AI models — Artificials',
      description: 'A week of new AI model releases, new leaders on tests and price changes.',
      known: true,
      robots: 'index,follow,max-image-preview:large',
    };
  const test = /^\/tests\/([a-z0-9][a-z0-9-]{0,99})$/.exec(path);
  // The page names the test once it loads; the prerenderer does it first.
  if (test)
    return {
      ...testMetadata({
        id: test[1],
        label: 'AI benchmark test',
        models: 0,
        source: '',
        description: '',
      }),
      title: 'AI benchmark test — Artificials',
      description: 'An AI benchmark test: what it measures and every model’s best score on it.',
    };
  const maker = /^\/makers\/([a-z0-9][a-z0-9-]{0,99})$/.exec(path);
  // The page names the maker once it loads; the prerenderer does it first.
  if (maker)
    return {
      ...makerMetadata({ slug: maker[1], name: 'AI model maker', models: 0, tested: 0 }),
      title: 'AI model maker — Artificials',
      description: 'An AI model maker’s models, test results, prices and releases.',
    };
  const profile = /^\/models\/([a-z0-9][a-z0-9-]{0,99})$/.exec(path);
  if (profile)
    return {
      ...modelMetadata(
        { slug: profile[1], name: 'AI model profile', maker: '', offerings: 0, hasResults: false },
        profile[1],
      ),
      title: 'AI model profile — Artificials',
      description:
        'Benchmarks, pricing across providers, context window and capabilities for an AI model.',
    };
  const article = articles.find((a) => a.published && path === '/news/' + a.slug);
  const lesson = academy.lessons.find((l) => path === '/learn/' + l.slug);
  const known = Boolean(pages[path] || article || lesson);
  const accountTitles: Record<string, string> = {
    '/login': 'Editor sign-in',
    '/dashboard': 'Editor account',
    '/following': 'What you follow',
  };
  const title =
    (article?.title ||
      lesson?.title ||
      pages[path]?.[0] ||
      accountTitles[path] ||
      'Page unavailable') + ' — Artificials';
  const description =
    article?.excerpt ||
    lesson?.summary ||
    pages[path]?.[1] ||
    (path === '/following'
      ? 'The AI models, makers and tests you follow on Artificials, and what changed for each since you last looked.'
      : 'Return to Artificials to explore AI models, rankings, guides, and lessons.');
  const canonical = SITE_URL + path;
  const image = article
    ? `${SITE_URL}/editorial/${articleCover(article).file}.webp`
    : (PAGE_IMAGES[path] ?? DEFAULT_IMAGE);
  const structured = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description,
        image: [image],
        dateModified: article.updated_at,
        mainEntityOfPage: canonical,
        publisher: { '@type': 'Organization', name: 'Artificials', url: SITE_URL },
      }
    : path === '/'
      ? {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Artificials',
          url: SITE_URL + '/',
          inLanguage: 'en',
        }
      : null;
  // Every page names the site's feed already; a page with one of its own names that too.
  const feed = path === '/weekly' ? WEEKLY_CHANNEL : undefined;
  return {
    title,
    description,
    canonical,
    image,
    known,
    robots: known ? 'index,follow,max-image-preview:large' : 'noindex,follow',
    type: article ? 'article' : 'website',
    structured,
    ...(feed ? { feed: feedLink(feed) } : {}),
  };
}
export interface ModelMetaInput {
  slug: string;
  name: string;
  maker: string;
  offerings: number;
  hasResults: boolean;
}
/** Search metadata for a model profile. `null` means the slug is unknown. */
export function modelMetadata(model: ModelMetaInput | null, slug = model?.slug ?? '') {
  const canonical = SITE_URL + '/models/' + slug;
  if (!model)
    return {
      title: 'Model not found — Artificials',
      description:
        'This model is not in the Artificials catalog. Browse AI models by capability, price and provider.',
      canonical,
      image: DEFAULT_IMAGE,
      known: false,
      robots: 'noindex,follow',
      type: 'website' as const,
      structured: null,
    };
  const hosts = model.offerings === 1 ? '1 provider' : `${model.offerings} providers`;
  const by = model.maker ? ` by ${model.maker}` : '';
  return {
    feed: feedLink(modelChannel(slug, model.name)),
    title: `${model.name}: benchmarks, pricing and providers — Artificials`,
    description: `${model.name}${by}. ${model.hasResults ? 'How it ranks on benchmarks, ' : 'Capabilities, '}prices from ${hosts}, context window and a cost calculator. Updated automatically.`,
    canonical,
    image: model.hasResults ? `${SITE_URL}/og/models/${slug}.png` : DEFAULT_IMAGE,
    known: true,
    robots: 'index,follow,max-image-preview:large',
    type: 'website' as const,
    structured: null,
  };
}
export interface MakerMetaInput {
  slug: string;
  name: string;
  models: number;
  tested: number;
}
/** Title, description and address of a maker's page; `null` when there is no such maker. */
export function makerMetadata(maker: MakerMetaInput | null, slug = maker?.slug ?? '') {
  const canonical = SITE_URL + '/makers/' + slug;
  if (!maker)
    return {
      title: 'Maker not found — Artificials',
      description:
        'This maker has no page on Artificials. Browse every AI model maker, or search the model directory.',
      canonical,
      image: DEFAULT_IMAGE,
      known: false,
      robots: 'noindex,follow',
      type: 'website' as const,
      structured: null,
    };
  const tested = maker.tested
    ? `${maker.tested} with published test results`
    : 'none with published test results yet';
  return {
    feed: feedLink(makerChannel(slug, maker.name)),
    title: `${maker.name} AI models: benchmarks, prices and releases — Artificials`,
    description: `Every ${maker.name} model on Artificials: ${maker.models} models, ${tested}. Where its best models rank on each test, with prices, context windows and release dates.`,
    canonical,
    image: `${SITE_URL}/og/makers/${slug}.png`,
    known: true,
    robots: 'index,follow,max-image-preview:large',
    type: 'website' as const,
    structured: null,
  };
}
/** Title, description and address of a week's recap; `null` when there is no such week. */
export function weekMetadata(
  week: { week: string; end: string; complete: boolean; counts: WeekCounts } | null,
  id = week?.week ?? '',
) {
  const canonical = SITE_URL + '/weekly/' + id;
  if (!week)
    return {
      title: 'Week not found — Artificials',
      description: 'There is no recap for this week. See the latest week in AI models.',
      canonical,
      image: DEFAULT_IMAGE,
      known: false,
      robots: 'noindex,follow',
      type: 'website' as const,
      structured: null,
    };
  const range = weekRange(week.week, week.end);
  return {
    feed: feedLink(WEEKLY_CHANNEL),
    title: `The week in AI models: ${range} — Artificials`,
    description: `${weekSentence(week.counts)}${week.complete ? '' : ' so far'}, ${range}. Each release, new leader and price change, with its source.`,
    canonical,
    image: `${SITE_URL}/og/weekly/${week.week}.png`,
    known: true,
    robots: 'index,follow,max-image-preview:large',
    type: 'website' as const,
    structured: null,
  };
}
export interface TestMetaInput {
  id: string;
  label: string;
  models: number;
  source: string;
  description: string;
}
/** Title, description and address of a test's page; `null` when there is no such test. */
export function testMetadata(test: TestMetaInput | null, id = test?.id ?? '') {
  const canonical = SITE_URL + '/tests/' + id;
  if (!test)
    return {
      title: 'Test not found — Artificials',
      description:
        'This test has no page on Artificials. Browse every AI benchmark test, or the model rankings.',
      canonical,
      image: DEFAULT_IMAGE,
      known: false,
      robots: 'noindex,follow',
      type: 'website' as const,
      structured: null,
    };
  // The test's own first sentence says what it measures.
  const measures = test.description.match(/^[^.]*\./)?.[0] ?? test.description;
  return {
    feed: feedLink(testChannel(id, test.label)),
    title: `${test.label} leaderboard: every AI model’s score — Artificials`,
    description:
      `${test.models} AI models ranked by their best published ${test.label} score${test.source ? `, from ${test.source}` : ''}. ${measures}`.trim(),
    canonical,
    image: `${SITE_URL}/og/tests/${id}.png`,
    known: true,
    robots: 'index,follow,max-image-preview:large',
    type: 'website' as const,
    structured: null,
  };
}
export interface ComparisonMetaModel {
  slug: string;
  name: string;
  maker: string;
}
/**
 * Title, description and canonical address of a comparison; null when a model
 * is unknown. A featured comparison has a link preview of its own.
 */
export function comparisonMetadata(
  models: ComparisonMetaModel[] | null,
  slugs: string[],
  featured = false,
) {
  const canonical = SITE_URL + (slugs.length ? canonicalComparison(slugs) : '/compare');
  const image =
    models && featured ? `${SITE_URL}/og${canonicalComparison(slugs)}.png` : COMPARE_IMAGE;
  if (!models)
    return {
      title: 'Comparison not found — Artificials',
      description:
        'One of these models is not in the Artificials catalog. Pick two or three models to compare side by side.',
      canonical,
      image,
      known: false,
      robots: 'noindex,follow',
      type: 'website' as const,
      structured: null,
    };
  const named = models.map((model) =>
    model.maker ? `${model.name} (${model.maker})` : model.name,
  );
  const list =
    named.length > 2 ? `${named.slice(0, -1).join(', ')} and ${named.at(-1)}` : named.join(' and ');
  return {
    title: `${models.map((model) => model.name).join(' vs ')}: benchmarks, price and context — Artificials`,
    description: `${list} side by side: published test results, prices per million tokens, context windows and features.`,
    canonical,
    image,
    known: true,
    robots: 'index,follow,max-image-preview:large',
    type: 'website' as const,
    structured: null,
  };
}
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}
export function metadataHtml(meta: ReturnType<typeof pageMetadata> & { feed?: FeedLink }) {
  const e = escapeHtml;
  return `<title>${e(meta.title)}</title><meta name="description" content="${e(meta.description)}"><meta name="robots" content="${meta.robots}"><link rel="canonical" href="${e(meta.canonical)}">${meta.feed ? `<link id="page-feed" rel="alternate" type="application/rss+xml" title="${e(meta.feed.title)}" href="${e(meta.feed.href)}">` : ''}<meta property="og:site_name" content="Artificials"><meta property="og:title" content="${e(meta.title)}"><meta property="og:description" content="${e(meta.description)}"><meta property="og:url" content="${e(meta.canonical)}"><meta property="og:type" content="${meta.type}"><meta property="og:image" content="${e(meta.image)}">${meta.image.startsWith(SITE_URL + '/og/') ? '<meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : ''}<meta property="og:image:alt" content="${e(meta.title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(meta.title)}"><meta name="twitter:description" content="${e(meta.description)}"><meta name="twitter:image" content="${e(meta.image)}"><meta name="twitter:image:alt" content="${e(meta.title)}">${meta.structured ? `<script id="page-schema" type="application/ld+json">${JSON.stringify(meta.structured).replace(/</g, '\\u003c')}</script>` : ''}`;
}
