import { describe, expect, it } from 'vitest';
import { parseSweBench } from '../scripts/lib/swe-bench';

const entry = (overrides: Record<string, unknown>) => ({
  name: 'Entry',
  agent: 'mini-SWE-agent',
  agent_org: 'SWE-agent',
  model_display: 'Model',
  model_org: 'OpenAI',
  reasoning_effort: null,
  resolved: 50,
  date: '2026-02-17',
  instance_cost: 0.5,
  instance_calls: 30,
  folder: 'folder',
  tags: ['Model: gpt-test', 'System: Attempts - 1'],
  ...overrides,
});
function board(extra: Record<string, unknown>[] = []) {
  const results = [
    // Twenty models in the bash-only agent.
    ...Array.from({ length: 20 }, (_, index) =>
      entry({ tags: [`Model: gpt-test-${index}`], resolved: 40 + index, reasoning_effort: 'high' }),
    ),
    // Twenty other agents, one attempt each.
    ...Array.from({ length: 20 }, (_, index) =>
      entry({
        agent: `Agent ${index}`,
        agent_org: `Org ${index}`,
        tags: ['Model: claude-4-5-opus', 'System: Attempts - 1'],
        model_display: 'Claude 4.5 Opus',
        model_org: 'Anthropic',
        resolved: 60 + index / 2,
      }),
    ),
    // Several attempts per issue, several models, or no model tag: left out.
    entry({ agent: 'Retry Agent', tags: ['Model: gpt-test', 'System: Attempts - 2+'] }),
    entry({ agent: 'Mixed Agent', tags: ['Model: a', 'Model: b', 'System: Attempts - 1'] }),
    entry({ agent: 'Untagged Agent', tags: ['System: Attempts - 1'] }),
    ...Array.from({ length: 10 }, () => entry({ agent: 'Filler', tags: [] })),
    ...extra,
  ];
  return JSON.stringify({
    leaderboards: [
      { name: 'Lite', results: [] },
      { name: 'Verified', results },
    ],
  });
}

describe('SWE-bench leaderboard', () => {
  it('splits bash-only models, with cost per issue, from single-attempt agents', () => {
    const { bashOnly, agents } = parseSweBench(board(), 'https://example.com/board.json');
    expect(bashOnly).toMatchObject({
      id: 'swe-bench-bash-only',
      sourceId: 'swebench',
      unit: 'percent',
    });
    expect(bashOnly.rows).toHaveLength(20);
    expect(bashOnly.rows[0]).toMatchObject({
      model: 'gpt-test-19_high',
      providerId: 'openai',
      score: 59,
      rank: 1,
      evaluatedAt: '2026-02-17',
      usage: { cost: 0.5, calls: 30 },
      sourceUrl: 'https://example.com/board.json',
    });
    expect(agents.results).toHaveLength(20);
    // SWE-bench's "claude-4-5-opus" is the maker's "claude-opus-4-5".
    expect(agents.results[0]).toMatchObject({
      agent: 'Agent 19',
      agentOrg: 'Org 19',
      model: 'claude-opus-4-5',
      modelName: 'Claude 4.5 Opus',
      providerId: 'anthropic',
      runDate: '2026-02-17',
    });
    const names = agents.results.map((row) => row.agent);
    for (const left of ['Retry Agent', 'Mixed Agent', 'Untagged Agent'])
      expect(names).not.toContain(left);
    expect(agents.latestRun).toBe('2026-02-17');
  });

  it('keeps the latest run of a model and rejects impossible scores', () => {
    const newer = entry({
      tags: ['Model: gpt-test-0'],
      resolved: 99,
      reasoning_effort: 'high',
      date: '2026-03-01',
    });
    const { bashOnly } = parseSweBench(board([newer]), 'x');
    expect(bashOnly.rows.find((row) => row.model === 'gpt-test-0_high')!.score).toBe(99);
    expect(() => parseSweBench(board([entry({ resolved: 120 })]), 'x')).toThrow(/outside/);
    expect(() => parseSweBench(JSON.stringify({ leaderboards: [] }), 'x')).toThrow(/schema/);
  });
});
