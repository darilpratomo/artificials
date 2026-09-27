import type { CatalogSnapshot } from './catalog.ts';
import { readableName } from './model-names.ts';
import type { BenchmarkDomain, BenchmarkSnapshot, TaskUsage } from './benchmarks.ts';
import type { Explore } from './explore.ts';
import {
  blendedPrice,
  isPaidOffer,
  testLabel,
  type ModelProfile,
  type ProfileBucket,
} from './model-profiles.ts';

/**
 * The home page's data: every model on the capability index, every published
 * test, recent releases and a few leaders. Built once per deploy from the same
 * snapshots as the profiles, so the page never computes rankings itself.
 */

export interface ReferencePrice {
  input: number;
  output: number;
  /** Three input tokens per output token, in USD per million tokens. */
  blended: number;
  /** `maker`: the maker's own listing. `median`: the middle listing across hosts. */
  from: 'maker' | 'median';
  /** Cached input price from the same listing, when it has one. */
  cached?: number;
}

export interface IndexPoint {
  /** The evaluator's own name for the model. */
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
  index: number;
  ciLow?: number;
  ciHigh?: number;
  releasedAt?: string;
  openWeights?: boolean;
  price?: ReferencePrice;
  contextWindow?: number;
  reasoning?: boolean;
  /** Epoch AI's estimate of training compute, in FLOP. */
  compute?: number;
}

export interface TestRow {
  /** The model's name, with the configuration that scored best, such as "GPT-6 (high)". */
  name: string;
  configuration: string;
  slug?: string;
  makerId: string;
  maker: string;
  score: number;
  stderr?: number;
  /** The published confidence interval, for open-ended scores such as Arena's. */
  ciLow?: number;
  ciHigh?: number;
  /** Average cost, tokens or steps per task, for agent tests that publish them. */
  usage?: TaskUsage;
}

export interface OverviewTest {
  id: string;
  name: string;
  label: string;
  sourceId: string;
  domain: BenchmarkDomain;
  unit: 'percent' | 'index';
  description: string;
  randomBaseline?: number;
  /** Best configuration per model, highest score first. */
  rows: TestRow[];
}

export interface Release {
  slug: string;
  name: string;
  makerId: string;
  maker: string;
  date: string;
  contextWindow?: number;
  price?: number;
  openWeights: boolean;
  reasoning: boolean;
  input: string[];
  output: string[];
  hosts: number;
  index?: number;
  tested: boolean;
  /** A known maker, sold by the maker itself, by several hosts, or tested. */
  notable: boolean;
}

/** One release on the full timeline, with the detail a timeline entry shows. */
export interface TimelineEntry extends Release {
  maxOutput?: number;
  inputPrice?: number;
  outputPrice?: number;
  priceFrom?: 'maker' | 'median';
  knowledge?: string;
  toolCall?: boolean;
  structuredOutput?: boolean;
  /** Epoch AI's record: developer, country, access and estimated training compute. */
  record?: { organization?: string; country?: string; access?: string; trainingCompute?: number };
}

export interface Timeline {
  version: 1;
  updatedAt: string;
  entries: TimelineEntry[];
}

export interface Highlight {
  id: string;
  title: string;
  /** `measured`: a published test result. `catalog`: listing data. `derived`: both combined. */
  kind: 'measured' | 'catalog' | 'derived';
  domain: BenchmarkDomain;
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
  value: number;
  unit: 'index' | 'percent' | 'tokens' | 'usd' | 'date';
  /** What the value is, such as the test's name. */
  detail: string;
  date?: string;
}

/** Shape of the market, over models from known makers (see `isNotable`). */
export interface Market {
  /** Models the shares below are measured over. */
  base: number;
  openWeights: number;
  reasoning: number;
  readsImages: number;
  /** Median reference price among models with a paid listing, USD per 1M tokens, blended. */
  medianPrice: number | null;
  millionContext: number;
  /** Releases in the 30 days up to the newest listing. */
  recent: number;
  makers: {
    makerId: string;
    maker: string;
    models: number;
    best?: { name: string; slug?: string; index: number };
    /** The maker's page, /makers/:page, when it has one. */
    page?: string;
  }[];
  widest: { slug: string; name: string; makerId: string; maker: string; hosts: number }[];
  gap?: {
    open: { name: string; slug?: string; makerId: string; index: number };
    closed: { name: string; slug?: string; makerId: string; index: number };
  };
}

export interface ModelOverview {
  version: 1;
  updatedAt: string;
  checkedAt: string;
  counts: { models: number; tested: number; offerings: number; providers: number; makers: number };
  sources: ProfileBucket['sources'];
  catalog: ProfileBucket['catalog'];
  index: IndexPoint[];
  /** The tests in tests.json, so a page can offer them before loading their rows. */
  metrics: Pick<OverviewTest, 'id' | 'label' | 'domain' | 'unit' | 'sourceId'>[];
  releases: Release[];
  highlights: Highlight[];
  market: Market;
  /** A current result from each page the home page links to, added once those pages are built. */
  explore?: Explore;
}

/** Every published test, loaded only when a chart or profile needs it. */
export interface OverviewTests {
  version: 1;
  checkedAt: string;
  tests: OverviewTest[];
}

/**
 * One row per model for the searchable list of every model:
 * slug, name, maker id, maker, release date, context, reference blended price,
 * hosts, capability index and a bit set of FLAGS.
 */
export type ExplorerRow = [
  slug: string,
  name: string,
  makerId: string,
  maker: string,
  releaseDate: string,
  contextWindow: number | null,
  price: number | null,
  hosts: number,
  index: number | null,
  flags: number,
];
export const FLAGS = {
  openWeights: 1,
  reasoning: 2,
  tested: 4,
  imageInput: 8,
  imageOutput: 16,
  audio: 32,
  toolCall: 64,
  /** In its maker's lineup: sold by the maker, listed by several hosts or tested. */
  notable: 128,
} as const;
export interface Explorer {
  version: 1;
  updatedAt: string;
  models: ExplorerRow[];
}

const round = (value: number, places = 4) => Number(value.toFixed(places));

/** The maker's own paid listing, or else the middle paid listing across hosts. */
export function referencePrice(profile: ModelProfile): ReferencePrice | undefined {
  // Offerings arrive sorted: paid listings first, cheapest first.
  const paid = profile.offerings.filter(isPaidOffer);
  if (!paid.length) return undefined;
  const own = profile.official ? paid.find((offer) => offer.id === profile.official) : undefined;
  const pick = own ?? paid[Math.floor((paid.length - 1) / 2)];
  return {
    input: pick.inputPrice!,
    output: pick.outputPrice!,
    blended: round(blendedPrice(pick.inputPrice, pick.outputPrice)!),
    from: own ? 'maker' : 'median',
    ...(pick.cacheReadPrice !== undefined ? { cached: pick.cacheReadPrice } : {}),
  };
}

const EFFORT_WORDS: Record<string, string> = { none: 'no reasoning', unknown: '' };

/**
 * The configuration part of an evaluator's name, such as "high" in
 * "gpt-6_high" or "thinking 64k" in "claude-x-thinking-64k".
 */
export function configurationOf(configuration: string, slug?: string): string {
  const underscore = configuration.lastIndexOf('_');
  if (underscore > 0) {
    const effort = configuration.slice(underscore + 1).trim();
    return EFFORT_WORDS[effort.toLowerCase()] ?? effort;
  }
  if (!slug) return '';
  const tidy = configuration
    .toLowerCase()
    .replace(/[._\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-');
  if (!tidy.startsWith(slug + '-')) return '';
  // A dated snapshot keeps its date as written: "2025-08-07", not "2025 08 07".
  const rest = tidy.slice(slug.length + 1);
  return /^\d{4}-\d{2}-\d{2}$/.test(rest) ? rest : rest.replace(/-/g, ' ');
}

export function isNotable(profile: ModelProfile) {
  return (
    profile.makerId !== 'unknown' &&
    (!!profile.official || profile.offerings.length >= 2 || profile.results.length > 0)
  );
}

export function buildOverview(
  profiles: ModelProfile[],
  links: Record<string, string>,
  catalog: CatalogSnapshot,
  benchmarks: BenchmarkSnapshot,
  sources: ProfileBucket['sources'],
): { overview: ModelOverview; tests: OverviewTests; explorer: Explorer; timeline: Timeline } {
  const bySlug = new Map(profiles.map((profile) => [profile.slug, profile]));
  const linked = (category: string, row: string) => {
    const slug = links[`${category}:${row}`];
    return slug ? bySlug.get(slug) : undefined;
  };
  const makerOf = (profile: ModelProfile | undefined, providerId: string, provider: string) =>
    profile && profile.makerId !== 'unknown'
      ? { makerId: profile.makerId, maker: profile.maker }
      : {
          makerId: providerId,
          maker: provider === 'See source' ? (profile?.maker ?? '') : provider,
        };

  const indexCategory = benchmarks.categories.find(
    (category) => category.id === 'capability-index',
  );
  const indexOf = new Map<string, number>();
  const index: IndexPoint[] = (indexCategory?.rows ?? []).map((row) => {
    const profile = linked('capability-index', row.id);
    if (profile && !indexOf.has(profile.slug)) indexOf.set(profile.slug, row.score);
    const price = profile ? referencePrice(profile) : undefined;
    const releasedAt = row.releasedAt ?? profile?.releaseDate ?? undefined;
    const openWeights = row.openWeights ?? profile?.openWeights;
    return {
      name: readableName(row.model),
      ...(profile ? { slug: profile.slug } : {}),
      ...makerOf(profile, row.providerId, row.provider),
      index: row.score,
      ...(row.ciLow !== undefined ? { ciLow: row.ciLow, ciHigh: row.ciHigh } : {}),
      ...(releasedAt ? { releasedAt } : {}),
      ...(openWeights !== undefined ? { openWeights } : {}),
      ...(price ? { price } : {}),
      ...(profile?.contextWindow ? { contextWindow: profile.contextWindow } : {}),
      ...(profile ? { reasoning: profile.reasoning } : {}),
      ...(profile?.facts?.trainingCompute ? { compute: profile.facts.trainingCompute } : {}),
    };
  });

  const tests: OverviewTest[] = benchmarks.categories
    .filter((category) => category.id !== 'capability-index')
    .map((category) => {
      const best = new Map<string, TestRow>();
      for (const row of category.rows) {
        const profile = linked(category.id, row.id);
        const key = profile ? `profile:${profile.slug}` : `row:${row.model}`;
        const current = best.get(key);
        if (current && current.score >= row.score) continue;
        const configuration = configurationOf(row.model, profile?.slug);
        best.set(key, {
          name: profile
            ? `${profile.name}${configuration ? ` (${configuration})` : ''}`
            : readableName(row.model),
          configuration: row.model,
          ...(profile ? { slug: profile.slug } : {}),
          ...makerOf(profile, row.providerId, row.provider),
          score: row.score,
          ...(row.stderr !== undefined ? { stderr: row.stderr } : {}),
          ...(row.ciLow !== undefined ? { ciLow: row.ciLow, ciHigh: row.ciHigh } : {}),
          ...(row.usage ? { usage: row.usage } : {}),
        });
      }
      return {
        id: category.id,
        name: category.name,
        label: testLabel(category),
        sourceId: category.sourceId,
        domain: category.domain ?? 'overall',
        unit: category.unit ?? 'percent',
        description: category.description,
        ...(category.randomBaseline !== undefined
          ? { randomBaseline: category.randomBaseline }
          : {}),
        rows: [...best.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
      };
    });

  // Releases: dated listings up to the snapshot day, newest first. Aliases of
  // one release (same maker, name and day) collapse into the most-hosted one.
  const today = catalog.updatedAt.slice(0, 10);
  const releaseOf = (profile: ModelProfile): Release => {
    const price = referencePrice(profile);
    const score = indexOf.get(profile.slug);
    return {
      slug: profile.slug,
      name: profile.name,
      makerId: profile.makerId,
      maker: profile.maker,
      date: profile.releaseDate!,
      ...(profile.contextWindow ? { contextWindow: profile.contextWindow } : {}),
      ...(price ? { price: price.blended } : {}),
      openWeights: profile.openWeights,
      reasoning: profile.reasoning,
      input: profile.inputModalities,
      output: profile.outputModalities,
      hosts: profile.offerings.length,
      ...(score !== undefined ? { index: score } : {}),
      tested: profile.results.length > 0,
      notable: isNotable(profile),
    };
  };
  const dated = profiles
    .filter((profile) => profile.releaseDate && profile.releaseDate.slice(0, 10) <= today)
    .sort(
      (a, b) =>
        b.releaseDate!.localeCompare(a.releaseDate!) ||
        b.offerings.length - a.offerings.length ||
        a.slug.localeCompare(b.slug),
    );
  const seen = new Set<string>();
  const unique = dated.filter((profile) => {
    const key = `${profile.makerId === 'unknown' ? profile.slug : profile.makerId}|${profile.name.toLowerCase()}|${profile.releaseDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const timelineOf = (profile: ModelProfile): TimelineEntry => {
    const base = releaseOf(profile);
    const price = referencePrice(profile);
    const record = profile.facts;
    return {
      ...base,
      ...(profile.maxOutput ? { maxOutput: profile.maxOutput } : {}),
      ...(price
        ? { inputPrice: price.input, outputPrice: price.output, priceFrom: price.from }
        : {}),
      ...(profile.knowledge ? { knowledge: profile.knowledge } : {}),
      ...(profile.toolCall !== undefined ? { toolCall: profile.toolCall } : {}),
      ...(profile.structuredOutput !== undefined
        ? { structuredOutput: profile.structuredOutput }
        : {}),
      ...(record
        ? {
            record: {
              ...(record.organization ? { organization: record.organization } : {}),
              ...(record.country ? { country: record.country } : {}),
              ...(record.access ? { access: record.access } : {}),
              ...(record.trainingCompute ? { trainingCompute: record.trainingCompute } : {}),
            },
          }
        : {}),
    };
  };
  const notable = unique.filter(isNotable).slice(0, 150);
  const others = unique.filter((profile) => !isNotable(profile)).slice(0, 60);
  const releases = [...notable, ...others]
    .sort(
      (a, b) =>
        b.releaseDate!.localeCompare(a.releaseDate!) ||
        b.offerings.length - a.offerings.length ||
        a.slug.localeCompare(b.slug),
    )
    .map(releaseOf);

  // Leaders. Each names its test; ties go to the first row the source ranks.
  const highlights: Highlight[] = [];
  const topIndex = index[0];
  if (topIndex)
    highlights.push({
      id: 'index',
      title: 'Highest capability index',
      kind: 'measured',
      domain: 'overall',
      name: topIndex.name,
      ...(topIndex.slug ? { slug: topIndex.slug } : {}),
      makerId: topIndex.makerId,
      maker: topIndex.maker,
      value: topIndex.index,
      unit: 'index',
      detail: 'Epoch Capabilities Index',
    });
  const leaders: [test: string, id: string, title: string][] = [
    ['coding', 'coding', 'Best at coding'],
    ['agentic-coding', 'agentic', 'Best at agentic coding'],
    ['frontiermath', 'math', 'Best at advanced math'],
    ['gpqa-diamond', 'reasoning', 'Best at science reasoning'],
    ['swe-bench-verified', 'software', 'Best at real-world code fixes'],
    ['simpleqa-verified', 'knowledge', 'Best factual recall'],
    ['image', 'image', 'Best image generation'],
  ];
  for (const [testId, id, title] of leaders) {
    const test = tests.find((entry) => entry.id === testId);
    const top = test?.rows[0];
    if (!test || !top) continue;
    highlights.push({
      id,
      title,
      kind: 'measured',
      domain: test.domain,
      name: top.name,
      ...(top.slug ? { slug: top.slug } : {}),
      makerId: top.makerId,
      maker: top.maker,
      value: top.score,
      unit: test.unit,
      detail: test.label,
    });
  }
  const openLeader = index.find((point) => point.openWeights);
  if (openLeader)
    highlights.push({
      id: 'open',
      title: 'Best open-weights model',
      kind: 'measured',
      domain: 'overall',
      name: openLeader.name,
      ...(openLeader.slug ? { slug: openLeader.slug } : {}),
      makerId: openLeader.makerId,
      maker: openLeader.maker,
      value: openLeader.index,
      unit: 'index',
      detail: 'Epoch Capabilities Index',
    });
  const cheapTop = index
    .slice(0, 10)
    .filter((point) => point.price)
    .sort((a, b) => a.price!.blended - b.price!.blended)[0];
  if (cheapTop)
    highlights.push({
      id: 'value',
      title: 'Lowest price in the top 10',
      kind: 'derived',
      domain: 'overall',
      name: cheapTop.name,
      ...(cheapTop.slug ? { slug: cheapTop.slug } : {}),
      makerId: cheapTop.makerId,
      maker: cheapTop.maker,
      value: cheapTop.price!.blended,
      unit: 'usd',
      detail: 'Blended list price per 1M tokens',
    });
  const known = profiles.filter(isNotable);
  const widest = known
    .filter((profile) => profile.contextWindow)
    .sort(
      (a, b) =>
        b.contextWindow! - a.contextWindow! ||
        b.offerings.length - a.offerings.length ||
        a.slug.localeCompare(b.slug),
    )[0];
  if (widest)
    highlights.push({
      id: 'context',
      title: 'Largest context window',
      kind: 'catalog',
      domain: 'overall',
      name: widest.name,
      slug: widest.slug,
      makerId: widest.makerId,
      maker: widest.maker,
      value: widest.contextWindow!,
      unit: 'tokens',
      detail: 'Listed context window',
    });
  const newest = releases.find((release) => release.notable);
  if (newest)
    highlights.push({
      id: 'newest',
      title: 'Newest release',
      kind: 'catalog',
      domain: 'overall',
      name: newest.name,
      slug: newest.slug,
      makerId: newest.makerId,
      maker: newest.maker,
      value: Date.parse(newest.date),
      unit: 'date',
      detail: 'Listed release date',
      date: newest.date,
    });

  // Market shape, over models from known makers so one-host listings do not skew it.
  const share = (count: number) => (known.length ? count / known.length : 0);
  const prices = known
    .map((profile) => referencePrice(profile)?.blended)
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);
  const newestDay = releases[0]?.date;
  const makerCounts = new Map<string, { makerId: string; maker: string; models: number }>();
  for (const profile of known) {
    const entry = makerCounts.get(profile.makerId) ?? {
      makerId: profile.makerId,
      maker: profile.maker,
      models: 0,
    };
    entry.models += 1;
    makerCounts.set(profile.makerId, entry);
  }
  const bestOf = (makerId: string) => {
    const point = index.find((entry) => entry.makerId === makerId);
    return point
      ? { name: point.name, ...(point.slug ? { slug: point.slug } : {}), index: point.index }
      : undefined;
  };
  const closedLeader = index.find((point) => point.openWeights === false);
  const market: Market = {
    base: known.length,
    openWeights: share(known.filter((profile) => profile.openWeights).length),
    reasoning: share(known.filter((profile) => profile.reasoning).length),
    readsImages: share(known.filter((profile) => profile.inputModalities.includes('image')).length),
    medianPrice: prices.length ? round(prices[Math.floor((prices.length - 1) / 2)], 3) : null,
    millionContext: known.filter((profile) => (profile.contextWindow ?? 0) >= 1_000_000).length,
    recent: newestDay
      ? releases.filter(
          (release) =>
            release.notable && Date.parse(newestDay) - Date.parse(release.date) < 30 * 86_400_000,
        ).length
      : 0,
    makers: [...makerCounts.values()]
      .sort((a, b) => b.models - a.models || a.maker.localeCompare(b.maker))
      .slice(0, 12)
      .map((entry) => {
        const best = bestOf(entry.makerId);
        return { ...entry, ...(best ? { best } : {}) };
      }),
    widest: [...known]
      .sort((a, b) => b.offerings.length - a.offerings.length || a.slug.localeCompare(b.slug))
      .slice(0, 10)
      .map((profile) => ({
        slug: profile.slug,
        name: profile.name,
        makerId: profile.makerId,
        maker: profile.maker,
        hosts: profile.offerings.length,
      })),
    ...(openLeader && closedLeader
      ? {
          gap: {
            open: {
              name: openLeader.name,
              ...(openLeader.slug ? { slug: openLeader.slug } : {}),
              makerId: openLeader.makerId,
              index: openLeader.index,
            },
            closed: {
              name: closedLeader.name,
              ...(closedLeader.slug ? { slug: closedLeader.slug } : {}),
              makerId: closedLeader.makerId,
              index: closedLeader.index,
            },
          },
        }
      : {}),
  };

  const flags = (profile: ModelProfile) =>
    (profile.openWeights ? FLAGS.openWeights : 0) |
    (profile.reasoning ? FLAGS.reasoning : 0) |
    (profile.results.length ? FLAGS.tested : 0) |
    (profile.inputModalities.includes('image') ? FLAGS.imageInput : 0) |
    (profile.outputModalities.includes('image') ? FLAGS.imageOutput : 0) |
    ([...profile.inputModalities, ...profile.outputModalities].includes('audio')
      ? FLAGS.audio
      : 0) |
    (profile.toolCall ? FLAGS.toolCall : 0) |
    (isNotable(profile) ? FLAGS.notable : 0);
  const models: ExplorerRow[] = profiles.map((profile) => [
    profile.slug,
    profile.name,
    profile.makerId,
    profile.maker,
    profile.releaseDate ?? '',
    profile.contextWindow,
    referencePrice(profile)?.blended ?? null,
    profile.offerings.length,
    indexOf.get(profile.slug) ?? null,
    flags(profile),
  ]);

  const checkedAt = benchmarks.sources
    .map((source) => source.checkedAt)
    .sort()
    .at(-1) as string;
  return {
    overview: {
      version: 1,
      updatedAt: catalog.updatedAt,
      checkedAt,
      counts: {
        models: profiles.length,
        tested: profiles.filter((profile) => profile.results.length).length,
        offerings: catalog.models.length,
        providers: new Set(catalog.models.map((model) => model.providerId)).size,
        makers: new Set(known.map((profile) => profile.makerId)).size,
      },
      sources,
      catalog: {
        source: catalog.source,
        sourceUrl: catalog.sourceUrl,
        license: catalog.license,
        updatedAt: catalog.updatedAt,
      },
      index,
      metrics: tests.map(({ id, label, domain, unit, sourceId }) => ({
        id,
        label,
        domain,
        unit,
        sourceId,
      })),
      releases,
      highlights,
      market,
    },
    tests: { version: 1, checkedAt, tests },
    explorer: { version: 1, updatedAt: catalog.updatedAt, models },
    timeline: { version: 1, updatedAt: catalog.updatedAt, entries: unique.map(timelineOf) },
  };
}
