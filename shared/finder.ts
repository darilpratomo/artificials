import type { ExplorerRow, ModelOverview, OverviewTests } from './model-overview.ts';

/**
 * The model finder: for each task, the published tests that measure it, and
 * the models on them with what a visitor filters by. Each test ranks models
 * on its own; scores from different tests are never combined.
 */

/** [slug, name, makerId, maker, blended price, context window, explorer flags] */
export type FinderModel = [
  slug: string,
  name: string,
  makerId: string,
  maker: string,
  price: number | null,
  contextWindow: number | null,
  flags: number,
];

/** [model index, score, rank on the whole test, the configuration tested when it differs] */
export type FinderRow = [model: number, score: number, rank: number, configuration?: string];

export interface FinderTest {
  id: string;
  label: string;
  sourceId: string;
  unit: 'percent' | 'index';
  description: string;
  /** Every model on the test, including those without a profile. */
  total: number;
  /** Models with a profile, best configuration each, highest score first. */
  rows: FinderRow[];
}

export interface FinderTask {
  id: string;
  label: string;
  description: string;
  /** Test ids, the default first. */
  tests: string[];
}

export interface Finder {
  version: 1;
  tasks: FinderTask[];
  tests: FinderTest[];
  models: FinderModel[];
  sources: ModelOverview['sources'];
}

/** What people choose a model for, and the tests that measure it, the most fitting first. */
export const FINDER_TASKS: FinderTask[] = [
  {
    id: 'chat',
    label: 'Chat and writing',
    description: 'Everyday questions, emails, stories and summaries.',
    tests: ['arena-text', 'arena-creative-writing', 'language'],
  },
  {
    id: 'coding',
    label: 'Coding',
    description: 'Writing, explaining and fixing code.',
    tests: ['coding', 'arena-coding', 'swe-bench-verified'],
  },
  {
    id: 'web',
    label: 'Web apps',
    description: 'Building web pages and apps from a description.',
    tests: ['arena-webdev'],
  },
  {
    id: 'agents',
    label: 'Agents',
    description: 'Working on its own: using tools to finish multi-step tasks.',
    tests: ['agentic-coding', 'deepswe', 'cursorbench'],
  },
  {
    id: 'math',
    label: 'Math',
    description: 'Solving math problems step by step.',
    tests: ['mock-aime', 'math', 'frontiermath', 'arena-math'],
  },
  {
    id: 'reasoning',
    label: 'Hard problems',
    description: 'Expert questions that need careful reasoning.',
    tests: ['gpqa-diamond', 'reasoning', 'arena-hard-prompts'],
  },
  {
    id: 'knowledge',
    label: 'Facts',
    description: 'Answering factual questions correctly.',
    tests: ['simpleqa-verified'],
  },
  {
    id: 'data',
    label: 'Data analysis',
    description: 'Working with tables, numbers and datasets.',
    tests: ['data-analysis'],
  },
  {
    id: 'instructions',
    label: 'Following instructions',
    description: 'Doing exactly what a detailed prompt asks.',
    tests: ['instruction-following', 'arena-instruction-following'],
  },
  {
    id: 'all-round',
    label: 'All-round',
    description: 'The strongest model overall, whatever the task.',
    tests: ['capability-index', 'overall', 'arena-text'],
  },
];

export function buildFinder({
  overview,
  tests,
  explorer,
}: {
  overview: ModelOverview;
  tests: OverviewTests;
  explorer: { models: ExplorerRow[] };
}): Finder {
  const bySlug = new Map(explorer.models.map((row) => [row[0], row]));
  const models: FinderModel[] = [];
  const index = new Map<string, number>();
  const modelOf = (slug: string) => {
    if (!index.has(slug)) {
      const [, name, makerId, maker, , contextWindow, price, , , flags] = bySlug.get(slug)!;
      index.set(slug, models.length);
      models.push([slug, name, makerId, maker, price, contextWindow, flags]);
    }
    return index.get(slug)!;
  };
  const wanted = [...new Set(FINDER_TASKS.flatMap((task) => task.tests))];
  const finderTests: FinderTest[] = wanted.flatMap((id): FinderTest[] => {
    if (id === 'capability-index') {
      const rows = overview.index.flatMap((point, rank): FinderRow[] =>
        point.slug && bySlug.has(point.slug) ? [[modelOf(point.slug), point.index, rank + 1]] : [],
      );
      return [
        {
          id,
          label: 'Epoch Capabilities Index',
          sourceId: 'epoch',
          unit: 'index',
          description:
            'One score built from many tests by Epoch AI. Higher is better; the scale has no fixed top.',
          total: overview.index.length,
          rows,
        },
      ];
    }
    const test = tests.tests.find((entry) => entry.id === id);
    if (!test) return [];
    const seen = new Set<string>();
    const rows = test.rows.flatMap((row, rank): FinderRow[] => {
      if (!row.slug || !bySlug.has(row.slug) || seen.has(row.slug)) return [];
      seen.add(row.slug);
      const name = bySlug.get(row.slug)![1];
      const configuration = row.name !== name ? row.name : undefined;
      return [
        configuration
          ? [modelOf(row.slug), row.score, rank + 1, configuration]
          : [modelOf(row.slug), row.score, rank + 1],
      ];
    });
    return [
      {
        id,
        label: test.label,
        sourceId: test.sourceId,
        unit: test.unit,
        description: test.description,
        total: test.rows.length,
        rows,
      },
    ];
  });
  const present = new Set(finderTests.map((test) => test.id));
  return {
    version: 1,
    tasks: FINDER_TASKS.map((task) => ({
      ...task,
      tests: task.tests.filter((id) => present.has(id)),
    })).filter((task) => task.tests.length),
    tests: finderTests,
    models,
    sources: overview.sources.filter((source) =>
      finderTests.some((test) => test.sourceId === source.id),
    ),
  };
}
