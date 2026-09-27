import academy from './academy-index.json';
import { ARTICLES } from './content';
import { staticPages } from './seo';
import { UTILITIES } from './utilities';
import { COMPARE_LINK, NAV_GROUPS, TOP_LINKS, navItems } from '../src/components/navigation';
import type { MakerSummary } from './maker-pages';
import type { TestSummary } from './test-pages';

/**
 * What the site search finds besides models: makers, tests, pages, guides,
 * lessons and free tools. `scripts/build-search-index.mjs` writes it to
 * /data/models/search.json, so guide text never reaches the page's own code.
 * Models are searched in explorer.json, which the model search already uses.
 */
export type SearchKind = 'maker' | 'test' | 'page' | 'guide' | 'lesson' | 'tool';

/** [kind, path, title, description, more words that find it, a maker's id for its logo] */
export type SearchEntry = [
  kind: SearchKind,
  path: string,
  title: string,
  description: string,
  keywords: string,
  logo?: string,
];

export interface SearchIndex {
  version: 1;
  entries: SearchEntry[];
}

/** Pages the menus do not name, called what a visitor would call them. */
const NAMES: Record<string, [title: string, description?: string]> = {
  '/': ['Home', 'Leaders, prices and new releases at a glance'],
  '/about': ['About Artificials'],
  '/contact': ['Contact'],
  '/privacy': ['Privacy policy'],
  '/terms': ['Terms and conditions'],
};

export function searchIndex(makers: MakerSummary[] = [], tests: TestSummary[] = []): SearchIndex {
  const menu = new Map(
    [...TOP_LINKS, COMPARE_LINK, ...NAV_GROUPS.flatMap(navItems)].map((item) => [item.to, item]),
  );
  const pages: SearchEntry[] = staticPages()
    .filter(({ path }) => !path.startsWith('/tools/'))
    .map(({ path, title, description }) => {
      const item = menu.get(path);
      const [name, summary] = NAMES[path] ?? [];
      // The menus' shorter name and line read best; the page's own title still finds it.
      return [
        'page',
        path,
        item?.label ?? name ?? title,
        item?.description ?? summary ?? description,
        `${title} ${description}`,
      ];
    });
  const guides: SearchEntry[] = ARTICLES.filter((article) => article.published).map((article) => [
    'guide',
    `/news/${article.slug}`,
    article.title,
    article.excerpt,
    article.category,
  ]);
  const modules = new Map(academy.modules.map((module) => [module.id, module]));
  const lessons: SearchEntry[] = academy.lessons.map((lesson) => {
    const module = modules.get(lesson.module);
    return [
      'lesson',
      `/learn/${lesson.slug}`,
      lesson.title,
      lesson.summary,
      `${module?.label ?? ''} ${module?.title ?? ''} ${lesson.level}`,
    ];
  });
  const tools: SearchEntry[] = UTILITIES.map((tool) => [
    'tool',
    `/tools/${tool.id}`,
    tool.title,
    tool.description,
    `${tool.category} ${tool.formats}`,
  ]);
  // A maker is found by its name; its line says what its page holds.
  const makerEntries: SearchEntry[] = makers.map((maker) => [
    'maker',
    `/makers/${maker.slug}`,
    maker.name,
    `${maker.models} ${maker.models === 1 ? 'model' : 'models'}, ${maker.tested} tested`,
    maker.id,
    maker.id,
  ]);
  // A test is found by its name, its address, its skill area or its publisher.
  const testEntries: SearchEntry[] = tests.map((test) => [
    'test',
    `/tests/${test.id}`,
    test.label,
    `${test.models} ${test.models === 1 ? 'model' : 'models'}, from ${test.source}`,
    `${test.id.replace(/-/g, ' ')} ${test.domain} ${test.source} benchmark`,
  ]);
  return {
    version: 1,
    entries: [...makerEntries, ...testEntries, ...pages, ...guides, ...lessons, ...tools],
  };
}
