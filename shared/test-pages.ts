import type { BenchmarkDomain, BenchmarkSnapshot } from './benchmarks.ts';
import { withinMargin, type History } from './history.ts';
import { readableName } from './model-names.ts';
import { testLabel } from './model-profiles.ts';
import type { ModelOverview, OverviewTests } from './model-overview.ts';

/**
 * One page per published test (/tests/:id): what it measures, who made it
 * and under what licence, and every model's best result on it. Rows, scores
 * and ranks are the source's own; the page only sorts and groups them.
 */

export interface TestPageRow {
  /** The model, with the configuration that scored best. */
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
  score: number;
  /** 1 plus the number of models with a higher score, so ties share a rank. */
  rank: number;
  ciLow?: number;
  ciHigh?: number;
}

export interface TestLeaderChange {
  day: string;
  name: string;
  slug?: string;
  makerId: string;
  score: number;
  previous: { name: string; slug?: string; makerId: string; score: number };
  /** The next model's score was inside the range the publisher gives for the new top score. */
  withinMargin?: true;
}

export interface TestSummary {
  id: string;
  label: string;
  domain: BenchmarkDomain;
  unit: 'percent' | 'index';
  sourceId: string;
  source: string;
  models: number;
  top?: { name: string; slug?: string; makerId: string; maker: string; score: number };
}

export interface TestPage extends TestSummary {
  version: 1;
  description: string;
  methodology: string;
  randomBaseline?: number;
  median: number;
  /**
   * How many other models score inside the range the publisher gives for the
   * top score, where it gives one: none of them is clearly behind the leader.
   */
  nearTop?: number;
  sourceInfo: { name: string; url: string; license: string; licenseUrl: string };
  /** Every model's best result, best first. */
  rows: TestPageRow[];
  /** The best model from each maker, best first. */
  makers: (TestPageRow & { page?: string })[];
  /** New top models since the site began keeping a record, newest first. */
  leaders: TestLeaderChange[];
}

export interface TestDirectory {
  version: 1;
  tests: TestSummary[];
  /** Each publisher behind the tests, with its licence, for pages that credit several at once. */
  sources: (TestPage['sourceInfo'] & { id: string })[];
}

const rankAll = <T extends { score: number }>(rows: T[]) => {
  const scores = rows.map((row) => row.score);
  return rows.map((row) => ({
    ...row,
    rank: 1 + scores.filter((value) => value > row.score).length,
  }));
};

export function buildTests({
  benchmarks,
  overview,
  tests,
  history,
  makerPages,
}: {
  benchmarks: BenchmarkSnapshot;
  overview: ModelOverview;
  tests: OverviewTests;
  history?: History;
  /** Maker id to the maker's page, for makers that have one. */
  makerPages: Map<string, string>;
}): { directory: TestDirectory; pages: TestPage[] } {
  const pages: TestPage[] = [];
  for (const category of benchmarks.categories) {
    const source = benchmarks.sources.find((entry) => entry.id === category.sourceId);
    if (!source) continue;
    // The capability index lists one row per model already; every other test
    // keeps each model's best configuration, as tests.json does.
    const listed =
      category.id === 'capability-index'
        ? overview.index.map((point) => ({
            name: point.name,
            ...(point.slug ? { slug: point.slug } : {}),
            makerId: point.makerId,
            maker: point.maker,
            score: point.index,
            ...(point.ciLow !== undefined ? { ciLow: point.ciLow, ciHigh: point.ciHigh } : {}),
          }))
        : (tests.tests.find((test) => test.id === category.id)?.rows ?? []).map((row) => ({
            name: row.name,
            ...(row.slug ? { slug: row.slug } : {}),
            makerId: row.makerId,
            maker: row.maker,
            score: row.score,
            ...(row.ciLow !== undefined ? { ciLow: row.ciLow, ciHigh: row.ciHigh } : {}),
          }));
    if (!listed.length) continue;
    const rows = rankAll(
      [...listed].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    );
    const scores = rows.map((row) => row.score).sort((a, b) => a - b);
    const middle = scores.length / 2;
    const median =
      scores.length % 2 ? scores[Math.floor(middle)] : (scores[middle - 1] + scores[middle]) / 2;
    const seen = new Set<string>();
    const makers = rows
      .filter((row) => row.makerId !== 'unknown' && !seen.has(row.makerId) && seen.add(row.makerId))
      .slice(0, 12)
      .map((row) =>
        makerPages.has(row.makerId) ? { ...row, page: makerPages.get(row.makerId) } : row,
      );
    const [top] = rows;
    // Other models inside the range the publisher gives for the top score.
    const low = top.ciLow;
    const nearTop =
      low !== undefined ? rows.slice(1).filter((row) => row.score >= low).length : undefined;
    pages.push({
      version: 1,
      id: category.id,
      label: testLabel(category),
      domain: category.domain ?? 'overall',
      unit: category.unit ?? 'percent',
      sourceId: category.sourceId,
      source: source.name,
      models: rows.length,
      top: {
        name: top.name,
        ...(top.slug ? { slug: top.slug } : {}),
        makerId: top.makerId,
        maker: top.maker,
        score: top.score,
      },
      description: category.description,
      methodology: category.methodology,
      ...(category.randomBaseline !== undefined ? { randomBaseline: category.randomBaseline } : {}),
      median: Number(median.toFixed(2)),
      ...(nearTop !== undefined ? { nearTop } : {}),
      sourceInfo: {
        name: source.name,
        url: source.url,
        license: source.license,
        licenseUrl: source.licenseUrl,
      },
      rows,
      makers,
      leaders: (history?.leaders ?? [])
        .filter((change) => change.test === category.id)
        .map((change) => ({
          day: change.day,
          name: change.slug ? change.name : readableName(change.name),
          ...(change.slug ? { slug: change.slug } : {}),
          makerId: change.makerId,
          score: change.score,
          previous: {
            name: change.previous.slug ? change.previous.name : readableName(change.previous.name),
            ...(change.previous.slug ? { slug: change.previous.slug } : {}),
            makerId: change.previous.makerId,
            score: change.previous.score,
          },
          ...(withinMargin(change) ? { withinMargin: true as const } : {}),
        }))
        .reverse(),
    });
  }
  const sources = new Map<string, TestDirectory['sources'][number]>();
  for (const page of pages)
    if (!sources.has(page.sourceId))
      sources.set(page.sourceId, { id: page.sourceId, ...page.sourceInfo });
  return {
    directory: {
      version: 1,
      tests: pages.map(({ id, label, domain, unit, sourceId, source, models, top }) => ({
        id,
        label,
        domain,
        unit,
        sourceId,
        source,
        models,
        ...(top ? { top } : {}),
      })),
      sources: [...sources.values()],
    },
    pages,
  };
}
