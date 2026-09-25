import type { BenchmarkSnapshot, ModelFacts } from './benchmarks.ts';
import type { ModelProfile, ProfileBucket } from './model-profiles.ts';
import { referencePrice, type Timeline } from './model-overview.ts';

/** One model that set a new record for its series. */
export interface TrendPoint {
  date: string;
  value: number;
  name: string;
  slug?: string;
}

/** A record line: each point beat every earlier model in the series. */
export interface TrendSeries {
  id: string;
  label: string;
  /** For makers: the maker, whose colour and logo mark the line. */
  makerId?: string;
  points: TrendPoint[];
}

export interface TrendModel {
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
  value: number;
  date: string;
}

/** The AI trends page: how capability, price, context and scale have moved. */
export interface Trends {
  version: 1;
  /** The day the data describes, from the catalog snapshot. */
  asOf: string;
  /** Highest capability index to date, per maker. */
  frontier: TrendSeries[];
  /** Each maker's best model on the index. */
  leaders: TrendModel[];
  /** Highest index to date for open-weights and for closed models. */
  openClosed: TrendSeries[];
  /** Highest index to date by the developer's country. */
  countries: TrendSeries[];
  /** Cheapest blended list price to date among models at or above each index level. */
  priceBands: TrendSeries[];
  /** Epoch AI's training compute estimates by release date. */
  compute: TrendModel[];
  /** Median context window of notable releases per quarter. */
  context: {
    quarter: string;
    open?: number;
    closed?: number;
    openCount: number;
    closedCount: number;
  }[];
  /** Notable releases per month. */
  releases: { month: string; count: number }[];
  /** Makers with the most notable releases in the last twelve months. */
  activeMakers: { makerId: string; maker: string; count: number }[];
  sources: ProfileBucket['sources'];
}

/** Model developers' organisations as Epoch AI names them, mapped to makers. */
const ORGANISATIONS: [RegExp, string, string][] = [
  [/openai/i, 'openai', 'OpenAI'],
  [/anthropic/i, 'anthropic', 'Anthropic'],
  [/google|deepmind/i, 'google', 'Google'],
  [/\bxai\b|x\.ai/i, 'xai', 'xAI'],
  [/deepseek/i, 'deepseek', 'DeepSeek'],
  [/alibaba|qwen/i, 'alibaba', 'Alibaba'],
  [/\bmeta\b|facebook/i, 'meta', 'Meta'],
  [/moonshot/i, 'moonshotai', 'Moonshot AI'],
  [/zhipu|z\.ai/i, 'zai', 'Z.ai'],
  [/minimax/i, 'minimax', 'MiniMax'],
  [/mistral/i, 'mistral', 'Mistral AI'],
  [/microsoft/i, 'azure', 'Microsoft'],
  [/nvidia/i, 'nvidia', 'NVIDIA'],
  [/amazon/i, 'amazon-bedrock', 'Amazon'],
  [/cohere/i, 'cohere', 'Cohere'],
];
const makerOfOrganisation = (organisation = '') => {
  const match = ORGANISATIONS.find(([pattern]) => pattern.test(organisation));
  return match
    ? { makerId: match[1], maker: match[2] }
    : { makerId: 'unknown', maker: organisation.split(',')[0]?.trim() ?? '' };
};

/** Epoch AI's country names, shortened for labels. */
const COUNTRIES: Record<string, string> = {
  'United States of America': 'United States',
  'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
  'Korea (Republic of)': 'South Korea',
};
/** The first country Epoch AI records for a model's developer, shortened. */
export const countryOf = (value?: string) => {
  const first = value?.split(',')[0]?.trim();
  return first ? (COUNTRIES[first] ?? first) : undefined;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Points where a series set a new record: higher for scores, lower for prices. */
export function records(rows: TrendPoint[], lower = false): TrendPoint[] {
  const sorted = [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || (lower ? a.value - b.value : b.value - a.value),
  );
  const points: TrendPoint[] = [];
  let best = lower ? Infinity : -Infinity;
  for (const row of sorted) {
    if (lower ? row.value >= best : row.value <= best) continue;
    best = row.value;
    points.push(row);
  }
  return points;
}

export function buildTrends({
  profiles,
  benchmarks,
  links,
  facts,
  timeline,
  sources,
  linkModel,
}: {
  profiles: ModelProfile[];
  benchmarks: BenchmarkSnapshot;
  /** Benchmark rows matched to profiles, as `category:row` → slug. */
  links: Record<string, string>;
  facts: ModelFacts[];
  timeline: Timeline;
  sources: ProfileBucket['sources'];
  linkModel: (names: string[], providerId: string) => string | undefined;
}): Trends {
  const bySlug = new Map(profiles.map((profile) => [profile.slug, profile]));
  const factOf = new Map<string, ModelFacts>();
  for (const record of facts) for (const version of record.versions) factOf.set(version, record);

  const index = benchmarks.categories.find((category) => category.id === 'capability-index');
  const scored = (index?.rows ?? []).flatMap((row) => {
    if (!row.releasedAt) return [];
    const slug = links[`capability-index:${row.id}`];
    const profile = slug ? bySlug.get(slug) : undefined;
    const record = (row.versions ?? []).map((version) => factOf.get(version)).find(Boolean);
    const known = profile && profile.makerId !== 'unknown';
    const price = profile ? referencePrice(profile) : undefined;
    return [
      {
        name: row.model,
        ...(slug ? { slug } : {}),
        makerId: known ? profile.makerId : row.providerId,
        maker: known ? profile.maker : row.provider,
        value: row.score,
        date: row.releasedAt,
        openWeights: row.openWeights,
        country: countryOf(record?.country ?? profile?.facts?.country),
        price: price?.blended,
      },
    ];
  });
  const point = (row: (typeof scored)[number], value = row.value): TrendPoint => ({
    date: row.date,
    value,
    name: row.name,
    ...(row.slug ? { slug: row.slug } : {}),
  });

  // Makers with at least three models on the index, strongest first.
  const byMaker = new Map<string, typeof scored>();
  for (const row of scored)
    if (row.makerId !== 'unknown')
      byMaker.set(row.makerId, [...(byMaker.get(row.makerId) ?? []), row]);
  const makers = [...byMaker.values()]
    .filter((rows) => rows.length >= 3)
    .map((rows) => ({ rows, best: rows.reduce((a, b) => (b.value > a.value ? b : a)) }))
    .sort((a, b) => b.best.value - a.best.value);
  const frontier = makers.slice(0, 8).map(({ rows, best }) => ({
    id: best.makerId,
    label: best.maker,
    makerId: best.makerId,
    points: records(rows.map((row) => point(row))),
  }));
  const leaders = makers.slice(0, 12).map(({ best }) => ({
    name: best.name,
    ...(best.slug ? { slug: best.slug } : {}),
    makerId: best.makerId,
    maker: best.maker,
    value: best.value,
    date: best.date,
  }));

  const openClosed = (
    [
      ['closed', 'Closed models', false],
      ['open', 'Open-weights models', true],
    ] as const
  ).map(([id, label, open]) => ({
    id,
    label,
    points: records(scored.filter((row) => row.openWeights === open).map((row) => point(row))),
  }));

  const byCountry = new Map<string, typeof scored>();
  for (const row of scored)
    if (row.country) byCountry.set(row.country, [...(byCountry.get(row.country) ?? []), row]);
  const countries = [...byCountry]
    .filter(([, rows]) => rows.length >= 5)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4)
    .map(([country, rows]) => ({
      id: country,
      label: country,
      points: records(rows.map((row) => point(row))),
    }));

  const priceBands = [120, 130, 140, 150].flatMap((level) => {
    const rows = scored.filter((row) => row.value >= level && row.price !== undefined);
    if (rows.length < 3) return [];
    return [
      {
        id: `index-${level}`,
        label: `Index ${level} or higher`,
        points: records(
          rows.map((row) => point(row, row.price!)),
          true,
        ),
      },
    ];
  });

  const compute = facts
    .flatMap((record) => {
      if (!record.trainingCompute || !record.releasedAt) return [];
      const slug = linkModel(record.versions, 'unknown');
      const profile = slug ? bySlug.get(slug) : undefined;
      const maker =
        profile && profile.makerId !== 'unknown'
          ? { makerId: profile.makerId, maker: profile.maker }
          : makerOfOrganisation(record.organization);
      return [
        {
          name: profile?.name ?? record.name,
          ...(slug ? { slug } : {}),
          ...maker,
          value: record.trainingCompute,
          date: record.releasedAt,
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Notable catalog releases: context windows by quarter and the pace of releases.
  const asOf = timeline.entries.reduce(
    (latest, entry) => (entry.date > latest ? entry.date : latest),
    '',
  );
  const notable = timeline.entries.filter((entry) => entry.notable && entry.date <= asOf);
  const quarters = new Map<string, { open: number[]; closed: number[] }>();
  for (const entry of notable) {
    if (!entry.contextWindow || entry.date < '2023-01-01') continue;
    const [year, month] = entry.date.split('-').map(Number);
    const quarter = `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
    const bucket = quarters.get(quarter) ?? { open: [], closed: [] };
    (entry.openWeights ? bucket.open : bucket.closed).push(entry.contextWindow);
    quarters.set(quarter, bucket);
  }
  const context = [...quarters]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([quarter, { open, closed }]) => ({
      quarter,
      ...(open.length >= 3 ? { open: median(open) } : {}),
      ...(closed.length >= 3 ? { closed: median(closed) } : {}),
      openCount: open.length,
      closedCount: closed.length,
    }));
  const months = new Map<string, number>();
  const start = new Date(`${asOf}T00:00:00Z`);
  for (let offset = 23; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - offset, 1));
    months.set(date.toISOString().slice(0, 7), 0);
  }
  for (const entry of notable) {
    const month = entry.date.slice(0, 7);
    if (months.has(month)) months.set(month, months.get(month)! + 1);
  }
  const yearAgo = new Date(
    Date.UTC(start.getUTCFullYear() - 1, start.getUTCMonth(), start.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
  const active = new Map<string, { makerId: string; maker: string; count: number }>();
  for (const entry of notable) {
    if (entry.date <= yearAgo || entry.makerId === 'unknown') continue;
    const current = active.get(entry.makerId) ?? {
      makerId: entry.makerId,
      maker: entry.maker,
      count: 0,
    };
    current.count += 1;
    active.set(entry.makerId, current);
  }

  return {
    version: 1,
    asOf,
    frontier,
    leaders,
    openClosed,
    countries,
    priceBands,
    compute,
    context,
    releases: [...months].map(([month, count]) => ({ month, count })),
    activeMakers: [...active.values()]
      .sort((a, b) => b.count - a.count || a.maker.localeCompare(b.maker))
      .slice(0, 10),
    sources: sources.filter((source) => source.id === 'epoch' || source.id === 'epoch-models'),
  };
}
