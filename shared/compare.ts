import type { IndexPoint, ModelOverview } from './model-overview.ts';

/**
 * Shareable comparisons live at /compare/a-vs-b, or a-vs-b-vs-c for three
 * models, by profile slug. A page shows the models in the order its address
 * gives; the canonical address lists them alphabetically, so each set of
 * models has one page for search engines.
 */
export const MAX_COMPARED = 3;
export const SEPARATOR = '-vs-';
const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;

/** The slugs in a comparison address: two or three different models, or null. */
export function parseComparison(pair: string): string[] | null {
  const slugs = pair.split(SEPARATOR);
  if (slugs.length < 2 || slugs.length > MAX_COMPARED) return null;
  if (!slugs.every((slug) => SLUG.test(slug))) return null;
  return new Set(slugs).size === slugs.length ? slugs : null;
}

export const comparisonPath = (slugs: string[]) => '/compare/' + slugs.join(SEPARATOR);

/** The one address search engines should index for a set of models. */
export const canonicalComparison = (slugs: string[]) => comparisonPath([...slugs].sort());

export interface FeaturedComparison {
  /** In canonical, alphabetical order. */
  slugs: [string, string];
  names: [string, string];
  makers: [string, string];
  makerIds: [string, string];
}

export interface Comparisons {
  version: 1;
  featured: FeaturedComparison[];
}

/** The makers whose best models are paired in the featured comparisons. */
const FEATURED_MAKERS = 10;

/**
 * Featured comparisons: every pair among the best models of the ten makers
 * that score highest on the capability index, strongest pairs first. These
 * are prerendered and listed in the sitemap; any other set works too.
 */
export function buildComparisons(overview: ModelOverview, slugs: string[]): Comparisons {
  const clash = slugs.find((slug) => slug.includes(SEPARATOR));
  if (clash)
    throw Error(`The slug "${clash}" contains "${SEPARATOR}", which comparison addresses use.`);
  const best = new Map<string, IndexPoint & { slug: string }>();
  for (const point of overview.index) {
    if (!point.slug || point.makerId === 'unknown' || !point.maker) continue;
    const current = best.get(point.makerId);
    if (!current || point.index > current.index)
      best.set(point.makerId, point as IndexPoint & { slug: string });
  }
  const leaders = [...best.values()].sort((a, b) => b.index - a.index).slice(0, FEATURED_MAKERS);
  const featured: FeaturedComparison[] = [];
  for (const [i, first] of leaders.entries())
    for (const second of leaders.slice(i + 1)) {
      const [a, b] = [first, second].sort((x, y) => (x.slug < y.slug ? -1 : 1));
      featured.push({
        slugs: [a.slug, b.slug],
        names: [a.name, b.name],
        makers: [a.maker, b.maker],
        makerIds: [a.makerId, b.makerId],
      });
    }
  return { version: 1, featured };
}
