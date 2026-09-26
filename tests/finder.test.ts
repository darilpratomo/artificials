import { describe, expect, it } from 'vitest';
import { FINDER_TASKS, buildFinder, cheaper, marginOf, pickModels } from '../shared/finder';
import type { ExplorerRow, ModelOverview, OverviewTests } from '../shared/model-overview';

const explorer: { models: ExplorerRow[] } = {
  models: [
    ['alpha', 'Alpha', 'openai', 'OpenAI', '2026-01-01', 1_000_000, 10, 3, 160, 2 | 64],
    ['beta', 'Beta', 'deepseek', 'DeepSeek', '2026-02-01', 128_000, 0.5, 5, 150, 1 | 64],
    ['gamma', 'Gamma', 'google', 'Google', '2026-03-01', null, null, 1, null, 0],
  ],
};

const overview = {
  index: [
    { name: 'Alpha', slug: 'alpha', makerId: 'openai', maker: 'OpenAI', index: 160 },
    { name: 'Unlisted', makerId: 'unknown', maker: '', index: 155 },
    { name: 'Beta', slug: 'beta', makerId: 'deepseek', maker: 'DeepSeek', index: 150 },
  ],
  sources: [
    { id: 'epoch', name: 'Epoch AI', url: 'https://epoch.ai', license: 'CC BY 4.0' },
    { id: 'livebench', name: 'LiveBench', url: 'https://livebench.ai', license: 'Apache-2.0' },
    { id: 'unused', name: 'Unused', url: 'https://example.test', license: 'MIT' },
  ],
} as unknown as ModelOverview;

const tests = {
  version: 1,
  checkedAt: '2026-09-25T00:00:00.000Z',
  tests: [
    {
      id: 'coding',
      name: 'Coding',
      label: 'LiveBench coding',
      sourceId: 'livebench',
      domain: 'coding',
      unit: 'percent',
      description: 'Code generation.',
      rows: [
        {
          name: 'Beta (high)',
          configuration: 'beta-high',
          slug: 'beta',
          makerId: 'deepseek',
          maker: 'DeepSeek',
          score: 80,
        },
        { name: 'No profile', configuration: 'x', makerId: 'unknown', maker: '', score: 78 },
        {
          name: 'Alpha',
          configuration: 'alpha',
          slug: 'alpha',
          makerId: 'openai',
          maker: 'OpenAI',
          score: 75,
        },
      ],
    },
  ],
} as unknown as OverviewTests;

describe('model finder data', () => {
  const finder = buildFinder({ overview, tests, explorer });

  it('keeps only tasks with a test in the data, and each task only its present tests', () => {
    expect(finder.tasks.map((task) => task.id)).toEqual(['coding', 'all-round']);
    expect(finder.tasks.find((task) => task.id === 'coding')!.tests).toEqual(['coding']);
    expect(finder.tasks.find((task) => task.id === 'all-round')!.tests).toEqual([
      'capability-index',
    ]);
    // Every task is described, in the order the finder shows them.
    expect(FINDER_TASKS).toHaveLength(10);
  });

  it('ranks models on each test alone, keeping their rank on the whole test', () => {
    const coding = finder.tests.find((test) => test.id === 'coding')!;
    expect(coding.total).toBe(3);
    const names = coding.rows.map(([model]) => finder.models[model][1]);
    expect(names).toEqual(['Beta', 'Alpha']);
    // The configuration is kept only when it differs from the model's name.
    expect(coding.rows[0]).toEqual([expect.any(Number), 80, 1, 'Beta (high)']);
    expect(coding.rows[1]).toEqual([expect.any(Number), 75, 3]);
    const index = finder.tests.find((test) => test.id === 'capability-index')!;
    expect(index.rows.map(([, score, rank]) => [score, rank])).toEqual([
      [160, 1],
      [150, 3],
    ]);
    expect(index.unit).toBe('index');
  });

  it('describes each model once, with what the finder filters by', () => {
    expect(finder.models).toHaveLength(2);
    const beta = finder.models.find((model) => model[0] === 'beta')!;
    expect(beta).toEqual(['beta', 'Beta', 'deepseek', 'DeepSeek', 0.5, 128_000, 1 | 64]);
    expect(finder.sources.map((source) => source.id)).toEqual(['epoch', 'livebench']);
  });
});

describe('model finder picks', () => {
  const finder = {
    models: [
      ['best', 'Best', 'openai', 'OpenAI', 10, null, 0],
      ['close', 'Close', 'deepseek', 'DeepSeek', 0.5, null, 1],
      ['closest', 'Closest', 'google', 'Google', 12, null, 0],
      ['open', 'Open', 'alibaba', 'Alibaba', 0.2, null, 1],
    ],
  } as unknown as Parameters<typeof pickModels>[0];
  const rows: [number, number, number][] = [
    [0, 90, 1],
    [2, 89, 2],
    [1, 86, 3],
    [3, 70, 4],
  ];

  it('picks the best match, the cheapest model close to it and the best open model', () => {
    const picks = pickModels(finder, { unit: 'percent' }, rows);
    expect(picks.map((pick) => [pick.kind, pick.row[0]])).toEqual([
      ['best', 0],
      ['value', 1],
      ['open', 3],
    ]);
    expect(picks[1]).toMatchObject({ margin: 5, times: 20 });
  });

  it('skips a value pick that costs no less, and the open pick when open weights are required', () => {
    const picks = pickModels(finder, { unit: 'percent' }, [rows[0], rows[1]], { open: false });
    expect(picks.map((pick) => pick.kind)).toEqual(['best']);
  });

  it('measures closeness on each test’s own scale', () => {
    expect(marginOf({ unit: 'percent' }, 90)).toBe(5);
    expect(marginOf({ unit: 'index' }, 1500)).toBe(25);
    expect(marginOf({ unit: 'index' }, 160)).toBe(5);
    expect(cheaper(1.5)).toBe('33% cheaper');
    expect(cheaper(13.3)).toBe('13 times cheaper');
  });
});
