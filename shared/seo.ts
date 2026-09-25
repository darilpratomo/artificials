import { ARTICLES, type Article } from './content';
import academy from './academy-index.json';
import { UTILITIES } from './utilities';
export const SITE_URL = 'https://artificials.net';
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
    'Compare AI models by test results, price and context window. Rankings, charts and every new release, refreshed automatically every six hours.',
  ],
  '/models': [
    'AI model comparison',
    'Compare AI models on capability, price and context window: the most capable, cheapest and newest models, charts, prices per token and every model we track, with sources.',
  ],
  '/coding-agents': [
    'AI coding agents compared',
    'Compare AI coding agents such as Codex CLI, Claude Code and Gemini CLI on Terminal-Bench 2.0, see how much the agent changes a model’s score, and rank models on coding tests and price.',
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
  '/studio': [
    'Artificials Studio',
    'Explore Artificials Studio, a workspace for building full-stack application projects with AI, including databases and authentication.',
  ],
  '/pricing': [
    'Studio plans and pricing',
    'Review Artificials Studio subscription plans, included generation credits, and usage limits before choosing a plan.',
  ],
  '/about': [
    'About Artificials',
    'Learn about Artificials and our approach to AI model information, published benchmark evidence, and practical AI education.',
  ],
  '/contact': [
    'Contact Artificials',
    'Contact the Artificials team at support@artificials.net for product questions, feedback, and support.',
  ],
  '/privacy': [
    'Privacy policy',
    'Read how Artificials handles account information, local preferences, service data, and privacy requests.',
  ],
  '/terms': [
    'Terms and conditions',
    'Read the terms for using Artificials, including educational content, AI information, accounts, and Studio services.',
  ],
};
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
    '/login': 'Welcome back',
    '/dashboard': 'Your workspace',
    '/checkout': 'Checkout',
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
    'Return to Artificials to explore AI models, rankings, guides, and lessons.';
  const canonical = SITE_URL + path;
  const kind =
    article?.category === 'Research'
      ? 'benchmarks'
      : article?.category === 'AI models'
        ? 'context'
        : 'engineering';
  const image =
    SITE_URL + (article ? `/editorial/${kind}.webp` : '/editorial/hero-brand-orbit.webp');
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
  return {
    title,
    description,
    canonical,
    image,
    known,
    robots: known ? 'index,follow,max-image-preview:large' : 'noindex,follow',
    type: article ? 'article' : 'website',
    structured,
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
      image: SITE_URL + '/editorial/hero-brand-orbit.webp',
      known: false,
      robots: 'noindex,follow',
      type: 'website' as const,
      structured: null,
    };
  const hosts = model.offerings === 1 ? '1 provider' : `${model.offerings} providers`;
  const by = model.maker ? ` by ${model.maker}` : '';
  return {
    title: `${model.name}: benchmarks, pricing and providers — Artificials`,
    description: `${model.name}${by}. ${model.hasResults ? 'How it ranks on benchmarks, ' : 'Capabilities, '}prices from ${hosts}, context window and a cost calculator. Updated automatically.`,
    canonical,
    image: SITE_URL + '/editorial/hero-brand-orbit.webp',
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
export function metadataHtml(meta: ReturnType<typeof pageMetadata>) {
  const e = escapeHtml;
  return `<title>${e(meta.title)}</title><meta name="description" content="${e(meta.description)}"><meta name="robots" content="${meta.robots}"><link rel="canonical" href="${e(meta.canonical)}"><meta property="og:site_name" content="Artificials"><meta property="og:title" content="${e(meta.title)}"><meta property="og:description" content="${e(meta.description)}"><meta property="og:url" content="${e(meta.canonical)}"><meta property="og:type" content="${meta.type}"><meta property="og:image" content="${e(meta.image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(meta.title)}"><meta name="twitter:description" content="${e(meta.description)}"><meta name="twitter:image" content="${e(meta.image)}">${meta.structured ? `<script id="page-schema" type="application/ld+json">${JSON.stringify(meta.structured).replace(/</g, '\\u003c')}</script>` : ''}`;
}
