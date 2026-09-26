import type { Board } from './arena.ts';
import type { Coding } from './coding.ts';
import { cheaper, pickModels, type Finder } from './finder.ts';
import type { Images } from './images.ts';
import type { ModelOverview, OverviewTests } from './model-overview.ts';
import type { Trends } from './trends.ts';
import type { Videos } from './videos.ts';

/**
 * What the home page shows of the pages it links to, worked out when the site
 * is built: the record on the capability index over recent years, and one
 * current result from each page. Every result names its test; results from
 * different tests are never combined.
 */

/** A model that raised the highest capability index score so far. */
export interface IndexRecord {
  date: string;
  value: number;
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
}

/** One current result a home card leads with. */
export interface ExploreResult {
  name: string;
  slug?: string;
  makerId: string;
  /** The line under the name: the maker, or the agent that ran the model. */
  by: string;
  value: number;
  unit: 'percent' | 'rating' | 'usd';
  /** What the value is, naming the test behind it. */
  detail: string;
}

export type ExploreCard = 'rankings' | 'coding' | 'images' | 'videos' | 'trends' | 'finder';

export interface ExploreCredit {
  name: string;
  url: string;
  license: string;
  /** Who compiled the results, when that is not the source itself. */
  via?: string;
  /** The catalog the prices come from, rather than a test. */
  prices?: true;
}

export interface Explore {
  /** Where the record line starts: three years before `until`. */
  since: string;
  /** The day the data describes, where the record line ends. */
  until: string;
  /** The record standing at `since`, then each model that beat it, oldest first. */
  records: IndexRecord[];
  results: Partial<Record<ExploreCard, ExploreResult>>;
  /** The sources behind `results`. */
  credits: ExploreCredit[];
}

const YEARS = 3;

/** The highest-rated model on a board's overall ranking. */
function boardTop(board: Board | undefined) {
  const entries = board?.categories.find((category) => category.id === 'overall')?.entries ?? [];
  const top = entries.reduce<(typeof entries)[number] | undefined>(
    (best, entry) => (!best || entry.rating > best.rating ? entry : best),
    undefined,
  );
  return top && board ? { entry: top, model: board.models[top.model] } : undefined;
}

export function buildExplore({
  overview,
  tests,
  finder,
  coding,
  trends,
  images,
  videos,
}: {
  overview: ModelOverview;
  tests: OverviewTests;
  finder: Finder;
  coding: Coding;
  trends: Trends;
  images: Images;
  videos: Videos;
}): Explore {
  // Each source is credited once, the first time a result uses it.
  const credits = new Map<string, ExploreCredit>();
  const add = (entry: ExploreCredit) => {
    if (!credits.has(entry.name)) credits.set(entry.name, entry);
  };
  const credit = (id: string) => {
    const source = overview.sources.find((entry) => entry.id === id);
    if (source) add({ name: source.name, url: source.url, license: source.license });
  };
  const prices = () =>
    add({
      name: overview.catalog.source,
      url: `https://${overview.catalog.source}`,
      license: overview.catalog.license,
      prices: true,
    });
  const results: Explore['results'] = {};

  const since = `${Number(trends.asOf.slice(0, 4)) - YEARS}${trends.asOf.slice(4)}`;
  const standing = trends.overall.filter((record) => record.date <= since).at(-1);
  const records = [
    ...(standing ? [standing] : []),
    ...trends.overall.filter((record) => record.date > since),
  ].map(({ date, value, name, slug, makerId, maker }) => ({
    date,
    value,
    name,
    ...(slug ? { slug } : {}),
    makerId,
    maker,
  }));

  const text = tests.tests.find((test) => test.id === 'arena-text');
  const voted = text?.rows.reduce<(typeof text.rows)[number] | undefined>(
    (best, row) => (!best || row.score > best.score ? row : best),
    undefined,
  );
  if (text && voted) {
    results.rankings = {
      name: voted.name,
      ...(voted.slug ? { slug: voted.slug } : {}),
      makerId: voted.makerId,
      by: voted.maker,
      value: voted.score,
      unit: 'rating',
      detail: 'Highest rating on Arena text, where people vote between two anonymous answers',
    };
    credit(text.sourceId);
  }

  const agents = coding.agentTests[0];
  const run = agents?.results[0];
  if (agents && run) {
    results.coding = {
      name: run.name,
      ...(run.slug ? { slug: run.slug } : {}),
      makerId: run.makerId,
      by: `Run by ${run.agent}`,
      value: run.score,
      unit: 'percent',
      detail: `Highest share of the ${agents.source.tasks} ${agents.source.name} tasks solved`,
    };
    add({
      name: agents.source.name,
      url: agents.source.url,
      license: agents.source.license,
      ...(agents.source.compiledBy ? { via: agents.source.compiledBy.name } : {}),
    });
  }

  for (const [card, data, id, label] of [
    ['images', images, 'text-to-image', 'text to image'],
    ['videos', videos, 'text-to-video', 'text to video'],
  ] as const) {
    const top = boardTop(data.boards.find((board) => board.id === id));
    const source = data.sources.find((entry) => entry.id === 'arena');
    if (!top || !source) continue;
    results[card] = {
      name: top.model.name,
      makerId: top.model.makerId,
      by: top.model.maker,
      value: top.entry.rating,
      unit: 'rating',
      detail: `Highest rating on Arena ${label}, from people’s votes`,
    };
    add({ name: source.name, url: source.url, license: source.license });
  }

  // The highest price band: the cheapest model at that level against the first one.
  const band = trends.priceBands.at(-1);
  const cheapest = band?.points.at(-1);
  const opening = band?.points[0];
  const level = band?.label.match(/\d+/)?.[0];
  const indexed = cheapest
    ? overview.index.find((point) =>
        cheapest.slug ? point.slug === cheapest.slug : point.name === cheapest.name,
      )
    : undefined;
  if (cheapest && opening && level && indexed && opening.value > cheapest.value) {
    const times = opening.value / cheapest.value;
    results.trends = {
      name: cheapest.name,
      ...(cheapest.slug ? { slug: cheapest.slug } : {}),
      makerId: indexed.makerId,
      by: indexed.maker,
      value: cheapest.value,
      unit: 'usd',
      detail: `Cheapest model scoring ${level} or more on the index, per 1M tokens. ${opening.name} costs ${times < 1.95 ? `${Math.round((times - 1) * 100)}% more` : `${Math.round(times)} times as much`}`,
    };
    credit('epoch');
    prices();
  }

  // What the finder shows first: its first task, ranked by that task's first test.
  const task = finder.tasks[0];
  const test = task && finder.tests.find((entry) => entry.id === task.tests[0]);
  const value = test
    ? pickModels(finder, test, test.rows).find((pick) => pick.kind === 'value')
    : undefined;
  if (task && test && value?.kind === 'value') {
    const [slug, name, makerId, maker, price] = finder.models[value.row[0]];
    results.finder = {
      name,
      slug,
      makerId,
      by: maker,
      value: price!,
      unit: 'usd',
      detail: `Best value for ${task.label.toLowerCase()}: within ${value.margin} points of the top ${test.label} score, and ${cheaper(value.times)}`,
    };
    credit(test.sourceId);
    prices();
  }

  return {
    since,
    until: trends.asOf,
    records,
    results,
    // Test sources first, then the price catalog.
    credits: [...credits.values()].sort((a, b) => Number(!!a.prices) - Number(!!b.prices)),
  };
}
