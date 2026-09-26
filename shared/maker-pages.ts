import { BENCHMARK_DOMAINS, type BenchmarkDomain } from './benchmarks.ts';
import {
  isNotable,
  referencePrice,
  type ModelOverview,
  type OverviewTests,
} from './model-overview.ts';
import { PRIMARY, type ModelProfile, type ProfileBucket } from './model-profiles.ts';

/**
 * One page per model maker (/makers/:slug): its models, where its best model
 * stands on each test, and the tests it leads. Every figure is one the site
 * already shows elsewhere, gathered by maker; nothing is combined or scored.
 */

/** A maker's model, as its page lists it. */
export interface MakerModel {
  slug: string;
  name: string;
  date: string | null;
  context: number | null;
  /** The reference price per 1M tokens, blended three input tokens to one output. */
  price: number | null;
  /** Whose listing the price is: the maker's own, or the middle host's. */
  priceFrom?: 'maker' | 'median';
  index: number | null;
  openWeights: boolean;
  tested: boolean;
}

/** The maker's best model on one test, and its rank among every model tested. */
export interface MakerResult {
  test: string;
  label: string;
  domain: BenchmarkDomain;
  unit: 'percent' | 'index';
  /** The model's name as the test gives it, with the configuration that scored best. */
  name: string;
  slug?: string;
  score: number;
  /** 1 plus the number of models with a higher score, so ties share a rank. */
  rank: number;
  total: number;
}

export interface MakerSummary {
  slug: string;
  id: string;
  name: string;
  models: number;
  tested: number;
  openWeights: number;
  best?: { slug?: string; name: string; index: number };
  newest?: { slug: string; name: string; date: string };
  /** Tests on which the maker's model scores highest, the capability index included. */
  leads: number;
}

/** The maker's models on the capability index, with the index's top model for reference. */
export interface MakerRanking {
  total: number;
  /** How many of the maker's models the index lists; the page shows up to twelve. */
  count: number;
  top: { name: string; maker: string; makerId: string; index: number };
  models: {
    name: string;
    slug?: string;
    index: number;
    rank: number;
    date?: string;
    price?: number;
  }[];
}

export interface MakerPage extends MakerSummary {
  version: 1;
  /** Every model from a known maker that the maker sells, several hosts list or a test covers, newest first. */
  lineup: MakerModel[];
  /** Each skill area's headline test, as model pages choose it. */
  areas: (MakerResult & { area: BenchmarkDomain })[];
  /** Every test the maker has a result on, the capability index first, then by rank. */
  results: MakerResult[];
  ranking?: MakerRanking;
  sources: Pick<
    ProfileBucket['sources'][number],
    'id' | 'name' | 'url' | 'license' | 'licenseUrl'
  >[];
}

export interface MakerDirectory {
  version: 1;
  makers: MakerSummary[];
}

/** A maker needs this much on the site for a page of its own. */
const MIN_MODELS = 3;

export const makerSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function buildMakers({
  profiles,
  overview,
  tests,
}: {
  profiles: ModelProfile[];
  overview: ModelOverview;
  tests: OverviewTests;
}): { directory: MakerDirectory; pages: MakerPage[] } {
  const groups = new Map<string, ModelProfile[]>();
  for (const profile of profiles.filter(isNotable)) {
    const group = groups.get(profile.makerId) ?? [];
    group.push(profile);
    groups.set(profile.makerId, group);
  }
  const indexByMaker = (id: string) =>
    overview.index
      .filter((point) => point.makerId === id)
      .sort((a, b) => b.index - a.index || a.name.localeCompare(b.name));
  // A model's best score when the index lists it more than once.
  const indexScore = new Map<string, number>();
  for (const point of overview.index)
    if (point.slug && point.index > (indexScore.get(point.slug) ?? -Infinity))
      indexScore.set(point.slug, point.index);
  const rankIn = (scores: number[], score: number) =>
    1 + scores.filter((value) => value > score).length;
  const indexScores = overview.index.map((point) => point.index);
  const testScores = new Map(
    tests.tests.map((test) => [test.id, test.rows.map((row) => row.score)]),
  );

  const pages: MakerPage[] = [];
  const used = new Set<string>();
  for (const [id, group] of groups) {
    const tested = group.filter((profile) => profile.results.length > 0).length;
    if (group.length < MIN_MODELS && !tested) continue;
    const name = group[0].maker;
    let slug = makerSlug(name) || id;
    if (used.has(slug)) slug = id;
    used.add(slug);

    const lineup: MakerModel[] = group
      .map((profile) => {
        const price = referencePrice(profile);
        return {
          slug: profile.slug,
          name: profile.name,
          date: profile.releaseDate,
          context: profile.contextWindow,
          price: price?.blended ?? null,
          ...(price ? { priceFrom: price.from } : {}),
          index: indexScore.get(profile.slug) ?? null,
          openWeights: profile.openWeights,
          tested: profile.results.length > 0,
        };
      })
      .sort(
        (a, b) =>
          (b.date ?? '').localeCompare(a.date ?? '') ||
          (b.index ?? 0) - (a.index ?? 0) ||
          a.name.localeCompare(b.name),
      );

    const results: MakerResult[] = [];
    const [top] = indexByMaker(id);
    if (top)
      results.push({
        test: 'capability-index',
        label: 'Epoch Capabilities Index',
        domain: 'overall',
        unit: 'index',
        name: top.name,
        ...(top.slug ? { slug: top.slug } : {}),
        score: top.index,
        rank: rankIn(indexScores, top.index),
        total: indexScores.length,
      });
    for (const test of tests.tests) {
      // Rows come best first, so the maker's first row is its best result.
      const row = test.rows.find((entry) => entry.makerId === id);
      if (!row) continue;
      const scores = testScores.get(test.id)!;
      results.push({
        test: test.id,
        label: test.label,
        domain: test.domain,
        unit: test.unit,
        name: row.name,
        ...(row.slug ? { slug: row.slug } : {}),
        score: row.score,
        rank: rankIn(scores, row.score),
        total: scores.length,
      });
    }
    const share = (result: MakerResult) => result.rank / result.total;
    results.sort(
      (a, b) =>
        Number(b.test === 'capability-index') - Number(a.test === 'capability-index') ||
        share(a) - share(b) ||
        a.label.localeCompare(b.label),
    );
    const areas = (['overall', ...BENCHMARK_DOMAINS] as BenchmarkDomain[]).flatMap((area) => {
      const test = PRIMARY[area].find((entry) => results.some((result) => result.test === entry));
      const result = results.find((entry) => entry.test === test);
      return result ? [{ ...result, area }] : [];
    });

    // Up to twelve of its models on the capability index, best first.
    const indexed = indexByMaker(id);
    const leader = [...overview.index].sort((a, b) => b.index - a.index)[0];
    const ranking: MakerRanking | undefined =
      indexed.length && leader
        ? {
            total: indexScores.length,
            count: indexed.length,
            top: {
              name: leader.name,
              maker: leader.maker,
              makerId: leader.makerId,
              index: leader.index,
            },
            models: indexed.slice(0, 12).map((point) => ({
              name: point.name,
              ...(point.slug ? { slug: point.slug } : {}),
              index: point.index,
              rank: rankIn(indexScores, point.index),
              ...(point.releasedAt ? { date: point.releasedAt } : {}),
              ...(point.price ? { price: point.price.blended } : {}),
            })),
          }
        : undefined;
    const newest = lineup.find((model) => model.date);
    const sourceIds = new Set([
      ...(top ? ['epoch'] : []),
      ...tests.tests
        .filter((test) => results.some((result) => result.test === test.id))
        .map((test) => test.sourceId),
    ]);
    pages.push({
      version: 1,
      slug,
      id,
      name,
      models: lineup.length,
      tested,
      openWeights: lineup.filter((model) => model.openWeights).length,
      ...(top
        ? { best: { ...(top.slug ? { slug: top.slug } : {}), name: top.name, index: top.index } }
        : {}),
      ...(newest ? { newest: { slug: newest.slug, name: newest.name, date: newest.date! } } : {}),
      leads: results.filter((result) => result.rank === 1).length,
      lineup,
      areas,
      results,
      ...(ranking ? { ranking } : {}),
      sources: overview.sources
        .filter((source) => sourceIds.has(source.id))
        .map(({ id, name, url, license, licenseUrl }) => ({ id, name, url, license, licenseUrl })),
    });
  }

  pages.sort(
    (a, b) =>
      (b.best?.index ?? 0) - (a.best?.index ?? 0) ||
      b.models - a.models ||
      a.name.localeCompare(b.name),
  );
  return {
    directory: {
      version: 1,
      makers: pages.map(({ slug, id, name, models, tested, openWeights, best, newest, leads }) => ({
        slug,
        id,
        name,
        models,
        tested,
        openWeights,
        ...(best ? { best } : {}),
        ...(newest ? { newest } : {}),
        leads,
      })),
    },
    pages,
  };
}
