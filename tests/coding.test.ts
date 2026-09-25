import { describe, expect, it } from 'vitest';
import type { AgentSnapshot } from '../shared/benchmarks';
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
const source: AgentSnapshot['source'] = {
  id: 'terminal-bench',
  name: 'Terminal-Bench 2.0',
  url: 'https://example.com/leaderboard',
  dataUrl: 'https://example.com/data',
  license: 'Apache-2.0',
  licenseUrl: 'https://example.com/license',
  checkedAt: '2026-09-25T00:00:00.000Z',
  latestRun: '2026-04-23',
  tasks: 89,
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
  version: 1,
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
const sources = ['livebench', 'epoch', 'corebench'].map((id) => ({
  id,
  name: id,
  url: `https://example.com/${id}`,
  license: 'MIT',
  licenseUrl: 'https://example.com/mit',
  checkedAt: '2026-09-25T00:00:00.000Z',
}));

describe('coding page data', () => {
  const coding = buildCoding({
    profiles,
    tests: [
      test('agentic-coding', 'livebench'),
      test('image', 'corebench'),
      test('coding', 'livebench'),
    ],
    agents,
    linkModel,
    sources,
  });

  it('links agent results to profiles and marks agents built by the model’s maker', () => {
    const [codex, droid, claudeCode, droidClaude, unknown] = coding.agents!.results;
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
    expect(coding.tests.map((entry) => entry.id)).toEqual(['agentic-coding', 'coding']);
    expect(coding.sources.map((entry) => entry.id)).toEqual(['livebench']);
    expect(coding.tests[0].rows[0].releasedAt).toBe('2026-04-01');
  });

  it('works without agent results', () => {
    const plain = buildCoding({ profiles, tests: [], linkModel, sources });
    expect(plain.agents).toBeUndefined();
    expect(plain.tests).toEqual([]);
  });

  it('measures how far apart agents running one model score', () => {
    const results = coding.agents!.results;
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
