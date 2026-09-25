import { describe, expect, it } from 'vitest';
import type { BenchmarkSnapshot, ModelFacts } from '../shared/benchmarks';
import type { ModelProfile } from '../shared/model-profiles';
import type { Timeline, TimelineEntry } from '../shared/model-overview';
import { buildTrends, records } from '../shared/trends';

function profile(slug: string, name: string, makerId: string, maker: string): ModelProfile {
  return {
    slug,
    name,
    maker,
    makerId,
    releaseDate: null,
    contextWindow: null,
    maxOutput: null,
    contextVaries: false,
    inputModalities: ['text'],
    outputModalities: ['text'],
    reasoning: false,
    openWeights: false,
    offerings: [],
    results: [],
    categories: [],
    peers: [],
  };
}

const row = (
  id: string,
  score: number,
  releasedAt: string,
  providerId: string,
  provider: string,
  openWeights: boolean,
) => ({
  id,
  model: id,
  provider,
  providerId,
  score,
  rank: 0,
  sourceUrl: 'https://example.com',
  releasedAt,
  openWeights,
  versions: [`${id.toLowerCase().replace(/ /g, '-')}_high`],
});
const benchmarks: BenchmarkSnapshot = {
  version: 1,
  sources: [],
  categories: [
    {
      id: 'capability-index',
      name: 'Capability index',
      sourceId: 'epoch',
      unit: 'index',
      domain: 'overall',
      description: '',
      methodology: '',
      rows: [
        row('Alpha 1', 120, '2025-01-10', 'openai', 'OpenAI', false),
        row('Alpha 2', 118, '2025-03-10', 'openai', 'OpenAI', false),
        row('Alpha 3', 140, '2025-09-10', 'openai', 'OpenAI', false),
        row('Beta 1', 110, '2025-02-01', 'deepseek', 'DeepSeek', true),
        row('Beta 2', 130, '2025-08-01', 'deepseek', 'DeepSeek', true),
        row('Beta 3', 125, '2025-10-01', 'deepseek', 'DeepSeek', true),
      ],
    },
  ],
};
const facts: ModelFacts[] = [
  {
    name: 'Alpha 3',
    versions: ['alpha-3_high'],
    country: 'United States of America',
    releasedAt: '2025-09-10',
    trainingCompute: 5e25,
    organization: 'OpenAI',
  },
  {
    name: 'Beta 2',
    versions: ['beta-2_high'],
    country: 'China',
    releasedAt: '2025-08-01',
    organization: 'DeepSeek',
  },
];
const entry = (
  date: string,
  makerId: string,
  openWeights: boolean,
  contextWindow: number,
): TimelineEntry => ({
  slug: `${makerId}-${date}`,
  name: `${makerId} ${date}`,
  makerId,
  maker: makerId,
  date,
  contextWindow,
  openWeights,
  reasoning: false,
  input: ['text'],
  output: ['text'],
  hosts: 1,
  tested: false,
  notable: true,
});
const timeline = {
  version: 1,
  entries: [
    entry('2026-07-01', 'openai', false, 200000),
    entry('2026-07-10', 'openai', false, 400000),
    entry('2026-08-01', 'openai', false, 1000000),
    entry('2026-08-20', 'deepseek', true, 128000),
    entry('2026-09-01', 'deepseek', true, 128000),
    entry('2026-09-10', 'deepseek', true, 256000),
  ],
} as unknown as Timeline;

describe('trend records', () => {
  it('keeps only models that beat every earlier one', () => {
    const points = records([
      { date: '2025-01-01', value: 10, name: 'a' },
      { date: '2025-02-01', value: 8, name: 'b' },
      { date: '2025-03-01', value: 12, name: 'c' },
    ]);
    expect(points.map((point) => point.name)).toEqual(['a', 'c']);
    const cheaper = records(
      [
        { date: '2025-01-01', value: 10, name: 'a' },
        { date: '2025-02-01', value: 12, name: 'b' },
        { date: '2025-03-01', value: 4, name: 'c' },
      ],
      true,
    );
    expect(cheaper.map((point) => point.name)).toEqual(['a', 'c']);
  });
});

describe('AI trends data', () => {
  const trends = buildTrends({
    profiles: [profile('alpha-3', 'Alpha 3', 'openai', 'OpenAI')],
    benchmarks,
    links: { 'capability-index:Alpha 3': 'alpha-3' },
    facts,
    timeline,
    sources: [],
    linkModel: (names) => (names.includes('alpha-3_high') ? 'alpha-3' : undefined),
  });

  it('draws each maker’s records and names its best model', () => {
    const openai = trends.frontier.find((series) => series.id === 'openai')!;
    expect(openai.points.map((point) => point.name)).toEqual(['Alpha 1', 'Alpha 3']);
    expect(trends.leaders[0]).toMatchObject({ name: 'Alpha 3', slug: 'alpha-3', value: 140 });
  });

  it('splits open-weights and closed records', () => {
    const open = trends.openClosed.find((series) => series.id === 'open')!;
    expect(open.points.map((point) => point.value)).toEqual([110, 130]);
  });

  it('takes countries and compute from Epoch AI’s model records', () => {
    expect(trends.countries).toEqual([]);
    expect(trends.compute).toEqual([
      expect.objectContaining({ name: 'Alpha 3', slug: 'alpha-3', makerId: 'openai', value: 5e25 }),
    ]);
  });

  it('counts releases and context windows from the catalog', () => {
    expect(trends.asOf).toBe('2026-09-10');
    expect(trends.releases).toHaveLength(24);
    expect(trends.releases.at(-1)).toEqual({ month: '2026-09', count: 2 });
    expect(trends.context.at(-1)).toMatchObject({
      quarter: '2026-Q3',
      closed: 400000,
      open: 128000,
    });
    expect(trends.activeMakers.map((maker) => maker.makerId)).toEqual(['deepseek', 'openai']);
  });
});
