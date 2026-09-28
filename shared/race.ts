import type { ModelOverview } from './model-overview.ts';
import { records } from './trends.ts';

/** One model on the capability index, with the day it came out. */
export interface RaceModel {
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
  date: string;
  index: number;
  /** Epoch AI's confidence interval for the index. */
  low?: number;
  high?: number;
  open?: boolean;
  /** Blended list price per million tokens, where the catalog has one. */
  price?: number;
}

/** A model that beat every earlier one in its series. */
export interface RaceRecord {
  date: string;
  index: number;
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
}

export interface PriceRecord {
  date: string;
  price: number;
  name: string;
  slug?: string;
}

/** The AI race: every model on the capability index by release date, and its records. */
export interface Race {
  version: 1;
  /** Every model with a release date, oldest first. */
  models: RaceModel[];
  /** Each new record for the whole field. */
  records: RaceRecord[];
  /** Each leading maker's own records, strongest maker first. */
  makers: { makerId: string; maker: string; records: RaceRecord[] }[];
  /** Records among open-weights models and among closed ones. */
  open: RaceRecord[];
  closed: RaceRecord[];
  /** The cheapest price to date among models at or above an index level. */
  prices: { level: number; points: PriceRecord[] }[];
  /** Figures the page states, worked out here so its words always match the data. */
  facts: RaceFacts;
  sources: { id: string; name: string; url: string; license: string; licenseUrl: string }[];
}

export interface RaceFacts {
  /** How many times the record was broken, and by how many makers. */
  records: number;
  holders: number;
  first: RaceRecord;
  latest: RaceRecord;
  /**
   * The best open-weights model, and the first closed model to reach its
   * score: how far the open side trails.
   */
  openLag?: { open: RaceRecord; closed: RaceRecord; months: number };
  /** The cheapest price at or above an index level, when first recorded and now. */
  cheaper?: { level: number; from: PriceRecord; to: PriceRecord; factor: number };
}

/** Whole months from one day to another, rounded down. */
export function monthsBetween(from: string, to: string) {
  const [a, b] = [from, to].map((date) => date.split('-').map(Number));
  return (b[0] - a[0]) * 12 + (b[1] - a[1]) - (b[2] < a[2] ? 1 : 0);
}

/** Levels whose cheapest price is followed, highest first. */
const LEVELS = [150, 140, 130, 120];

export function buildRace(overview: Pick<ModelOverview, 'index' | 'sources' | 'catalog'>): Race {
  const models: RaceModel[] = overview.index
    .flatMap((point) =>
      point.releasedAt
        ? [
            {
              name: point.name,
              ...(point.slug ? { slug: point.slug } : {}),
              makerId: point.makerId,
              maker: point.maker,
              date: point.releasedAt,
              index: point.index,
              ...(point.ciLow !== undefined ? { low: point.ciLow } : {}),
              ...(point.ciHigh !== undefined ? { high: point.ciHigh } : {}),
              ...(point.openWeights !== undefined ? { open: point.openWeights } : {}),
              ...(point.price?.blended !== undefined ? { price: point.price.blended } : {}),
            },
          ]
        : [],
    )
    .sort((a, b) => a.date.localeCompare(b.date) || b.index - a.index);

  const record = (model: RaceModel): RaceRecord => ({
    date: model.date,
    index: model.index,
    name: model.name,
    ...(model.slug ? { slug: model.slug } : {}),
    makerId: model.makerId,
    maker: model.maker,
  });
  const recordsOf = (rows: RaceModel[]) =>
    records(rows.map((model) => ({ ...record(model), value: model.index }))).map(
      ({ value: _value, ...rest }) => rest,
    );

  const all = recordsOf(models);
  // Makers with at least three models on the index, strongest first.
  const byMaker = new Map<string, RaceModel[]>();
  for (const model of models)
    if (model.makerId !== 'unknown')
      byMaker.set(model.makerId, [...(byMaker.get(model.makerId) ?? []), model]);
  const makers = [...byMaker.values()]
    .filter((rows) => rows.length >= 3)
    .map((rows) => ({ rows, best: Math.max(...rows.map((row) => row.index)) }))
    .sort((a, b) => b.best - a.best)
    .slice(0, 6)
    .map(({ rows }) => ({
      makerId: rows[0].makerId,
      maker: rows[0].maker,
      records: recordsOf(rows),
    }));
  const open = recordsOf(models.filter((model) => model.open === true));
  const closed = recordsOf(models.filter((model) => model.open === false));

  const prices = LEVELS.flatMap((level) => {
    const rows = models.filter((model) => model.index >= level && model.price !== undefined);
    if (rows.length < 3) return [];
    const points = records(
      rows.map((model) => ({
        date: model.date,
        value: model.price!,
        name: model.name,
        ...(model.slug ? { slug: model.slug } : {}),
      })),
      true,
    ).map(({ value, ...rest }) => ({ ...rest, price: value }));
    return [{ level, points }];
  });

  // How far the open side trails: its best model, and the first closed model to match it.
  const bestOpen = open.at(-1);
  const matched = bestOpen && closed.find((row) => row.index >= bestOpen.index);
  // The steepest fall in price, at the highest level with a record over a year or more.
  const falling = prices.find(
    ({ points }) => points.length >= 3 && monthsBetween(points[0].date, points.at(-1)!.date) >= 12,
  );

  return {
    version: 1,
    models,
    records: all,
    makers,
    open,
    closed,
    prices,
    facts: {
      records: all.length,
      holders: new Set(all.map((row) => row.makerId)).size,
      first: all[0],
      latest: all.at(-1)!,
      ...(bestOpen && matched
        ? {
            openLag: {
              open: bestOpen,
              closed: matched,
              months: Math.max(0, monthsBetween(matched.date, bestOpen.date)),
            },
          }
        : {}),
      ...(falling
        ? {
            cheaper: {
              level: falling.level,
              from: falling.points[0],
              to: falling.points.at(-1)!,
              factor: falling.points[0].price / falling.points.at(-1)!.price,
            },
          }
        : {}),
    },
    sources: [
      ...overview.sources
        .filter((source) => source.id === 'epoch')
        .map(({ id, name, url, license, licenseUrl }) => ({ id, name, url, license, licenseUrl })),
      {
        id: 'catalog',
        name: overview.catalog.source,
        url: overview.catalog.sourceUrl.replace(/\/api\.json$/, ''),
        license: overview.catalog.license,
        licenseUrl: 'https://opensource.org/license/mit',
      },
    ],
  };
}
