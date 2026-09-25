import { describe, expect, it } from 'vitest';
import type { AgentSource, AgentSnapshot, BenchmarkSnapshot } from '../shared/benchmarks';
import { buildCoding } from '../shared/coding';
import type { OverviewTest } from '../shared/model-overview';
import type { ModelProfile } from '../shared/model-profiles';
import { agentsOf, median, spreads } from '../src/components/coding/analysis';

function profile(slug: string, name: string, makerId: string, maker: string): ModelProfile {
  return {
    slug,
    name,
    maker,
    makerId,
    releaseDate: '2026-04-01',
    contextWindow: null,
    maxOutput: null,
    contextVaries: false,
    inputModalities: ['text'],
    outputModalities: ['text'],
    reasoning: true,
    openWeights: false,
    offerings: [],
    results: [],
    categories: [],
    peers: [],
  };
}
const profiles = [
  profile('gpt-test', 'GPT Test', 'openai', 'OpenAI'),
  profile('claude-test', 'Claude Test', 'anthropic', 'Anthropic'),
];
const source: AgentSource = {
  id: 'terminal-bench',
  name: 'Terminal-Bench 2.0',
  url: 'https://example.com/leaderboard',
  dataUrl: 'https://example.com/data',
  license: 'Apache-2.0',
  licenseUrl: 'https://example.com/license',
  checkedAt: '2026-09-25T00:00:00.000Z',
  latestRun: '2026-04-23',
  tasks: 89,
  description: 'Terminal tasks.',
  compiledBy: {
    name: 'Epoch AI',
    url: 'https://example.com/epoch',
    dataUrl: 'https://example.com/epoch.zip',
    license: 'CC BY 4.0',
    licenseUrl: 'https://example.com/cc-by',
  },
};
const result = (
  id: string,
  agent: string,
  agentOrg: string,
  model: string,
  providerId: string,
  score: number,
  rank: number,
) => ({
  id,
  agent,
  agentOrg,
  model,
  modelName: model.toUpperCase(),
  provider: providerId,
  providerId,
  score,
  rank,
});
const agents: AgentSnapshot = {
  version: 2,
  benchmarks: [
    {
      source,
      results: [
        result('codexcli:gpt-test_high', 'Codex CLI', 'OpenAI', 'gpt-test_high', 'openai', 80, 1),
        result('droid:gpt-test_high', 'Droid', 'Factory', 'gpt-test_high', 'openai', 70, 2),
        result(
          'claudecode:gpt-test_high',
          'Claude Code',
          'Anthropic',
          'gpt-test_high',
          'openai',
          60,
          3,
        ),
        result('droid:claude-test', 'Droid', 'Factory', 'claude-test', 'anthropic', 55, 4),
        result('droid:mystery-1', 'Droid', 'Factory', 'mystery-1', 'unknown', 20, 5),
      ],
    },
  ],
  timeHorizons: {
    source: { ...source, id: 'metr', name: 'METR time horizons', version: 'METR-Horizon-v1.1' },
    results: [
      {
        id: 'gpt-test_high',
        model: 'gpt-test_high',
        provider: 'OpenAI',
        providerId: 'openai',
        minutes: 90,
        low: 40,
        high: 200,
        rank: 1,
      },
    ],
  },
};
const test = (id: string, sourceId: string): OverviewTest => ({
  id,
  name: id,
  label: id,
  sourceId,
  domain: 'coding',
  unit: 'percent',
  description: `${id} tasks`,
  rows: [
    {
      name: 'GPT Test (high)',
      configuration: 'gpt-test_high',
      slug: 'gpt-test',
      makerId: 'openai',
      maker: 'OpenAI',
      score: 70,
    },
  ],
});
const linkModel = (names: string[]) =>
  names[0].startsWith('gpt-test')
    ? 'gpt-test'
    : names[0] === 'claude-test'
      ? 'claude-test'
      : undefined;
const sources = ['livebench', 'epoch', 'corebench', 'deepswe'].map((id) => ({
  id,
  name: id,
  url: `https://example.com/${id}`,
  license: 'MIT',
  licenseUrl: 'https://example.com/mit',
  checkedAt: '2026-09-25T00:00:00.000Z',
}));

const benchmarks: BenchmarkSnapshot = {
  version: 1,
  sources: [],
  categories: [
    {
      id: 'deepswe',
      name: 'DeepSWE',
      sourceId: 'deepswe',
      unit: 'percent',
      domain: 'agentic',
      description: 'Long tasks.',
      methodology: 'Published.',
      rows: ['max', 'high', 'medium', 'low', 'minimal'].map((effort, index) => ({
        id: `gpt-test_${effort}`,
        model: `gpt-test_${effort}`,
        provider: 'OpenAI',
        providerId: 'openai',
        score: 70 - index * 3,
        rank: index + 1,
        sourceUrl: 'https://example.com',
        usage: { cost: 5 - index, steps: 30 },
      })),
    },
  ],
};
const links = Object.fromEntries(
  benchmarks.categories[0].rows.map((row) => [`deepswe:${row.id}`, 'gpt-test']),
);

describe('coding page data', () => {
  const coding = buildCoding({
    profiles,
    tests: [
      test('agentic-coding', 'livebench'),
      test('image', 'corebench'),
      test('deepswe', 'deepswe'),
      test('coding', 'livebench'),
    ],
    benchmarks,
    links,
    agents,
    linkModel,
    sources,
  });

  it('links agent results to profiles and marks agents built by the model’s maker', () => {
    const [codex, droid, claudeCode, droidClaude, unknown] = coding.agentTests[0].results;
    expect(codex).toMatchObject({ name: 'GPT Test (high)', slug: 'gpt-test', own: true });
    expect(droid.own).toBe(false);
    // Anthropic's agent running an OpenAI model is not the model maker's own agent.
    expect(claudeCode.own).toBe(false);
    expect(droidClaude).toMatchObject({ name: 'Claude Test', makerId: 'anthropic', own: false });
    // Unmatched models keep the source's name and are never linked.
    expect(unknown).toMatchObject({ name: 'MYSTERY-1', makerId: 'unknown', own: false });
    expect(unknown.slug).toBeUndefined();
  });

  it('keeps only the coding tests, in order, and only their sources', () => {
    expect(coding.tests.map((entry) => entry.id)).toEqual(['agentic-coding', 'deepswe', 'coding']);
    expect(coding.sources.map((entry) => entry.id)).toEqual(['livebench', 'deepswe']);
    expect(coding.tests[0].rows[0].releasedAt).toBe('2026-04-01');
  });

  it('keeps every configuration of tests that publish cost per task', () => {
    expect(coding.costTests.map((entry) => entry.id)).toEqual(['deepswe']);
    const rows = coding.costTests[0].rows;
    expect(rows).toHaveLength(5);
    expect(rows[1]).toMatchObject({
      name: 'GPT Test (high)',
      slug: 'gpt-test',
      usage: { cost: 4 },
    });
  });

  it('links task lengths to profiles', () => {
    expect(coding.timeHorizons!.results[0]).toMatchObject({
      name: 'GPT Test (high)',
      slug: 'gpt-test',
      makerId: 'openai',
      minutes: 90,
    });
  });

  it('works without agent results', () => {
    const plain = buildCoding({ profiles, tests: [], benchmarks, links: {}, linkModel, sources });
    expect(plain.agentTests).toEqual([]);
    expect(plain.timeHorizons).toBeUndefined();
    expect(plain.tests).toEqual([]);
  });

  it('measures how far apart agents running one model score', () => {
    const results = coding.agentTests[0].results;
    const [group] = spreads(results);
    expect(group).toMatchObject({ name: 'GPT Test (high)', spread: 20 });
    expect(group.best.agent).toBe('Codex CLI');
    expect(group.worst.agent).toBe('Claude Code');
    expect(spreads(results, 4)).toEqual([]);
    const droid = agentsOf(results).find((entry) => entry.agent === 'Droid')!;
    expect(droid).toMatchObject({ models: 3, own: false });
    expect(droid.best.score).toBe(70);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});
