import type { ModelOverview, OverviewTests, TestRow } from './model-overview.ts';

/** One model's result on a test, with its uncertainty as the source publishes it. */
export interface ScoringRow {
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
  score: number;
  /** One standard error, in points. */
  stderr?: number;
  /** A published confidence interval. */
  low?: number;
  high?: number;
}

/** Real results for the page on how AI benchmarks work. */
export interface Scoring {
  version: 1;
  /** GPQA Diamond's leaders with Epoch AI's standard errors, and the score of random guessing. */
  gpqa: { rows: ScoringRow[]; chance: number };
  /** Arena's text leaders, with Arena's 95% confidence intervals. */
  arena: { rows: ScoringRow[] };
  /** The capability index's leaders, with Epoch AI's confidence intervals. */
  index: { rows: ScoringRow[] };
  /** How many tests the site publishes. */
  tests: number;
  sources: { id: string; name: string; url: string; license: string; licenseUrl: string }[];
}

/** How many leaders each chart shows. */
const SHOWN = 8;

/** Names as the page shows them: no spaces just inside brackets. */
const tidy = (name: string) => name.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

const row = ({
  name,
  slug,
  makerId,
  maker,
  score,
  stderr,
  ciLow,
  ciHigh,
}: TestRow): ScoringRow => ({
  name: tidy(name),
  ...(slug ? { slug } : {}),
  makerId,
  maker,
  score,
  ...(stderr !== undefined ? { stderr } : {}),
  ...(ciLow !== undefined ? { low: ciLow } : {}),
  ...(ciHigh !== undefined ? { high: ciHigh } : {}),
});

/** A score's standard error from its accuracy and number of questions, in points. */
export function standardError(accuracy: number, questions: number) {
  return Math.sqrt((accuracy * (1 - accuracy)) / questions) * 100;
}

export function buildScoring({
  tests,
  overview,
}: {
  tests: OverviewTests;
  overview: Pick<ModelOverview, 'index' | 'sources'>;
}): Scoring {
  const test = (id: string) => tests.tests.find((entry) => entry.id === id);
  const gpqa = test('gpqa-diamond');
  const arena = test('arena-text');
  return {
    version: 1,
    gpqa: {
      rows: (gpqa?.rows ?? [])
        .filter((entry) => entry.stderr !== undefined)
        .slice(0, SHOWN)
        .map(row),
      chance: gpqa?.randomBaseline ?? 25,
    },
    arena: {
      rows: (arena?.rows ?? [])
        .filter((entry) => entry.ciLow !== undefined && entry.ciHigh !== undefined)
        .slice(0, SHOWN)
        .map(row),
    },
    index: {
      rows: [...overview.index]
        .filter((point) => point.ciLow !== undefined && point.ciHigh !== undefined)
        .sort((a, b) => b.index - a.index)
        .slice(0, SHOWN)
        .map((point) => ({
          name: point.name,
          ...(point.slug ? { slug: point.slug } : {}),
          makerId: point.makerId,
          maker: point.maker,
          score: point.index,
          low: point.ciLow,
          high: point.ciHigh,
        })),
    },
    tests: tests.tests.length,
    sources: overview.sources
      .filter((source) => source.id === 'epoch' || source.id === 'arena')
      .map(({ id, name, url, license, licenseUrl }) => ({ id, name, url, license, licenseUrl })),
  };
}
