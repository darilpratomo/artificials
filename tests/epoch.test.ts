import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  EPOCH_BENCHMARKS,
  parseEpoch,
  parseTerminalBench,
  TERMINAL_BENCH,
} from '../scripts/lib/epoch';

const LICENSE =
  "## Licensing\nEpoch AI's data is free to use, distribute, and reproduce provided the source and authors are credited under the [Creative Commons Attribution license](https://creativecommons.org/licenses/by/4.0/).\n";

const header =
  'Model version,mean_score,Best score (across scorers),Release date,Organization,Country,stderr,Started at,id';
function benchmarkCsv(rows: [string, number, string, string][]) {
  return [
    header,
    ...rows.map(
      ([model, score, organization, started], index) =>
        `${model},${score},${score},2026-01-01,${organization},USA,0.012,${started},id${index}`,
    ),
  ].join('\n');
}
const fiveRows = (offset = 0): [string, number, string, string][] => [
  ['claude-test-1_high', 0.9 - offset, 'Anthropic', '2026-09-01T10:00:00.000Z'],
  ['gpt-test-1_max', 0.8 - offset, 'OpenAI', '2026-09-02T10:00:00.000Z'],
  ['gemini-test_high', 0.7 - offset, 'Google DeepMind', '2026-08-01T10:00:00.000Z'],
  ['qwen-test_none', 0.6 - offset, 'Alibaba', '2026-07-01T10:00:00.000Z'],
  ['mystery-model', 0.5 - offset, 'Some Lab', '2026-06-01T10:00:00.000Z'],
];

function archive(overrides: Record<string, string | null> = {}) {
  const metadata = [
    'benchmark,in_eci,source_file,score_column,scale,random_baseline,score_ceiling,release_date,superseded_by',
    ...EPOCH_BENCHMARKS.map(
      (spec) =>
        `${spec.benchmark},True,${spec.file},Best score (across scorers),1.0,${spec.id === 'gpqa-diamond' ? '0.25' : '0.0'},1.0,2025-01-01,`,
    ),
  ].join('\n');
  const files: Record<string, string | null> = {
    'README.md': LICENSE,
    'benchmark_metadata.csv': metadata,
    'epoch_capabilities_index/eci_scores.csv': [
      'Model,Display name,eci,eci_ci_low,eci_ci_high,date,Organization,Country (of organization),Model accessibility,Accessibility group,model_versions',
      'Claude Test 1,Claude Test 1,150.5,147,154,2026-09-01,Anthropic,USA,API access,Closed weights,',
      'GPT Test 1,GPT Test 1,149,146,152,2026-09-02,OpenAI,USA,API access,Closed weights,',
      'Gemini Test,Gemini Test,140,136,144,2026-08-01,Google DeepMind,USA,API access,Closed weights,',
      'Qwen Test,Qwen Test,130,125,135,2026-07-01,Alibaba,China,Open weights,Open weights,',
      'Mystery,Mystery,120,110,130,2026-06-01,Some Lab,USA,API access,Closed weights,',
    ].join('\n'),
    'epoch_capabilities_index/processed_data_for_eci.csv': [
      'model_id,benchmark_id,performance,benchmark,benchmark_release_date,model,model_version,Model,date,source',
      'm1,b1,0.5,X,2025-01-01,Claude Test 1,claude-test-1_high,Claude Test 1,2026-09-01,s',
      'm1,b2,0.6,Y,2025-01-01,Claude Test 1,claude-test-1_max,Claude Test 1,2026-09-01,s',
      'm2,b1,0.5,X,2025-01-01,GPT Test 1,gpt-test-1_max,GPT Test 1,2026-09-02,s',
    ].join('\n'),
    // Third-party results inside the archive keep their own licence and must be ignored.
    'aider_polyglot_external.csv': 'Model version,Percent correct\nsomething,99\n',
  };
  for (const spec of EPOCH_BENCHMARKS) files[spec.file] = benchmarkCsv(fiveRows());
  Object.assign(files, overrides);
  const entries: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(files))
    if (content !== null) entries[name] = strToU8(content);
  return zipSync(entries);
}

describe('Epoch AI benchmark archive', () => {
  it('converts fractions to percentages and keeps evaluation dates and standard errors', () => {
    const { categories, latestRun } = parseEpoch(archive());
    const gpqa = categories.find((category) => category.id === 'gpqa-diamond')!;
    expect(gpqa.unit).toBe('percent');
    expect(gpqa.domain).toBe('reasoning');
    expect(gpqa.randomBaseline).toBe(25);
    expect(gpqa.rows[0]).toMatchObject({
      model: 'claude-test-1_high',
      providerId: 'anthropic',
      score: 90,
      rank: 1,
      stderr: 1.2,
      evaluatedAt: '2026-09-01',
    });
    expect(gpqa.rows.find((row) => row.model === 'gemini-test_high')!.providerId).toBe('google');
    expect(latestRun).toBe('2026-09-02');
  });

  it('publishes the capability index first, on its own open-ended scale', () => {
    const { categories } = parseEpoch(archive());
    const index = categories[0];
    expect(index.id).toBe('capability-index');
    expect(index.unit).toBe('index');
    expect(index.rows[0]).toMatchObject({
      model: 'Claude Test 1',
      score: 150.5,
      ciLow: 147,
      ciHigh: 154,
      versions: ['claude-test-1_high', 'claude-test-1_max'],
    });
  });

  it('keeps only the latest run of a configuration that was tested twice', () => {
    const rows = fiveRows();
    rows.push(['claude-test-1_high', 0.95, 'Anthropic', '2026-09-10T10:00:00.000Z']);
    const { categories } = parseEpoch(archive({ 'gpqa_diamond.csv': benchmarkCsv(rows) }));
    const gpqa = categories.find((category) => category.id === 'gpqa-diamond')!;
    expect(gpqa.rows.filter((row) => row.model === 'claude-test-1_high')).toHaveLength(1);
    expect(gpqa.rows[0].score).toBe(95);
  });

  it('ignores third-party files that ship in the same archive', () => {
    const { categories } = parseEpoch(archive());
    expect(categories.map((category) => category.id)).not.toContain('aider');
    expect(categories).toHaveLength(EPOCH_BENCHMARKS.length + 1);
  });

  it('stops the refresh when the licence text changes', () => {
    expect(() => parseEpoch(archive({ 'README.md': 'All rights reserved.' }))).toThrow(/licence/);
  });

  it('stops the refresh on superseded benchmarks, bad scores or missing files', () => {
    const superseded = archive({
      'benchmark_metadata.csv': [
        'benchmark,in_eci,source_file,score_column,scale,random_baseline,score_ceiling,release_date,superseded_by',
        ...EPOCH_BENCHMARKS.map(
          (spec) =>
            `${spec.benchmark},True,${spec.file},Best score (across scorers),1.0,0,1.0,2025-01-01,Newer`,
        ),
      ].join('\n'),
    });
    expect(() => parseEpoch(superseded)).toThrow(/superseded/);
    const invalid = fiveRows();
    invalid[0][1] = 1.4;
    expect(() => parseEpoch(archive({ 'gpqa_diamond.csv': benchmarkCsv(invalid) }))).toThrow(/0–1/);
    expect(() => parseEpoch(archive({ 'swe_bench_verified.csv': null }))).toThrow(/missing/);
    expect(() =>
      parseEpoch(archive({ 'chess_puzzles.csv': benchmarkCsv(fiveRows().slice(0, 2)) })),
    ).toThrow(/Too few/);
  });
});

describe('Epoch AI model records', () => {
  const records = [
    'model_version,model_group,date,display_name,organization,country,accessibility,training_compute_flop',
    'claude-test-1_high,Claude Test 1,2026-09-01,Claude Test 1,Anthropic,United States of America,API access,3.1e25',
    'claude-test-1_max,Claude Test 1,2026-09-01,,Anthropic,United States of America,API access,3.1e25',
    'qwen-test_none,Qwen Test,2026-07-01,,"Alibaba,Qwen Team",China,Open weights (unrestricted),',
    '<script>,Bad,2026-01-01,,X,Y,API access,',
    'odd-compute,Odd,2026-01-01,,Lab,,API access,12',
  ].join('\n');

  it('groups versions under one record with release, access and compute', () => {
    const { facts } = parseEpoch(archive({ 'model_metadata.csv': records }));
    const claude = facts.find((entry) => entry.name === 'Claude Test 1')!;
    expect(claude).toEqual({
      name: 'Claude Test 1',
      versions: ['claude-test-1_high', 'claude-test-1_max'],
      releasedAt: '2026-09-01',
      organization: 'Anthropic',
      country: 'United States of America',
      access: 'API access',
      trainingCompute: 3.1e25,
    });
    expect(facts.find((entry) => entry.name === 'Qwen Test')!.organization).toBe(
      'Alibaba, Qwen Team',
    );
    // Unsafe identifiers are skipped and implausible compute is left out.
    expect(facts.some((entry) => entry.name === 'Bad')).toBe(false);
    expect(facts.find((entry) => entry.name === 'Odd')!.trainingCompute).toBeUndefined();
  });

  it('keeps release dates and weight access on capability-index rows', () => {
    const index = parseEpoch(archive()).categories[0];
    expect(index.rows.find((row) => row.model === 'Qwen Test')).toMatchObject({
      releasedAt: '2026-07-01',
      openWeights: true,
    });
    expect(index.rows[0].openWeights).toBe(false);
  });

  it('refreshes scores even when the records file is missing or changed', () => {
    expect(parseEpoch(archive({ 'model_metadata.csv': null })).facts).toEqual([]);
    expect(parseEpoch(archive({ 'model_metadata.csv': 'something,else\n1,2\n' })).facts).toEqual(
      [],
    );
  });
});

const TB_HEADER =
  'Model version,Agent,Accuracy mean,Release date,Organization,Country,Training compute (FLOP),Training compute notes,Accuracy SE,Agent Org,Model Org,Run date,Notes,Source,Source Link,Created,Name,id';
/** Twelve agents on four models each, all citing the leaderboard. */
function terminalRows() {
  const rows: string[] = [];
  for (let agent = 0; agent < 12; agent += 1)
    for (const [model, name, org] of [
      ['gpt-test-1_unknown', 'GPT Test 1', 'OpenAI'],
      ['claude-test-1_unknown', 'Claude Test 1', 'Anthropic'],
      ['gemini-test', 'Gemini Test', 'Google'],
      ['qwen-test', 'Qwen Test', 'Alibaba'],
    ])
      rows.push(
        `${model},Agent ${agent},${(0.3 + agent / 40).toFixed(3)},2026-01-01,${org},USA,,,0.02,Org ${agent},${org},2026-02-0${(agent % 9) + 1},,${TERMINAL_BENCH.url},,2026-03-01T00:00:00.000Z,${name},r${agent}${model}`,
      );
  return rows;
}
function terminalArchive(
  rows: string[],
  metadata = 'Terminal Bench,True,terminalbench_external.csv,Accuracy mean,1.0,0.0,1.0,2025-05-19,',
) {
  return zipSync({
    'benchmark_metadata.csv': strToU8(
      `benchmark,in_eci,source_file,score_column,scale,random_baseline,score_ceiling,release_date,superseded_by\n${metadata}`,
    ),
    [TERMINAL_BENCH.file]: strToU8([TB_HEADER, ...rows].join('\n')),
  });
}

describe('Terminal-Bench results from the Epoch AI archive', () => {
  it('keeps leaderboard rows only, merges spellings of one agent and keeps the newest run', () => {
    const rows = [
      ...terminalRows(),
      // Same agent, spelled differently, listed without "_unknown" and run later:
      // replaces the older entry.
      `gpt-test-1, agent-0 ,0.9,2026-01-01,OpenAI,USA,,,0.03,Org 0,OpenAI,2026-04-01,,Terminal-Bench v2 Leaderboard,,2026-05-01T00:00:00.000Z,GPT Test 1,late`,
      // The same entry again with an assumed effort and the same score: merged.
      `gpt-test-1_medium,Agent 1,0.325,2026-01-01,OpenAI,USA,,,0.02,Org 1,OpenAI,2026-01-01,,${TERMINAL_BENCH.url},,2026-03-01T00:00:00.000Z,GPT Test 1,dup`,
      // No leaderboard source: left out.
      `gpt-test-1_unknown,Rogue Agent,0.99,2026-01-01,OpenAI,USA,,,0.01,Rogue,OpenAI,2026-05-01,,,,2026-05-01T00:00:00.000Z,GPT Test 1,rogue`,
    ];
    const { results, latestRun } = parseTerminalBench(terminalArchive(rows));
    expect(results).toHaveLength(48);
    expect(results.some((row) => row.agent === 'Rogue Agent')).toBe(false);
    expect(results[0]).toMatchObject({
      id: 'agent0:gpt-test-1',
      agent: 'Agent 0',
      agentOrg: 'Org 0',
      model: 'gpt-test-1',
      modelName: 'GPT Test 1',
      providerId: 'openai',
      score: 90,
      stderr: 3,
      runDate: '2026-04-01',
      rank: 1,
    });
    expect(latestRun).toBe('2026-04-01');
    // Equal scores share a rank.
    const tied = results.filter((row) => row.agent === 'Agent 11');
    expect(new Set(tied.map((row) => row.rank)).size).toBe(1);
  });

  it('stops when the archive entry changes, is superseded or holds an impossible score', () => {
    expect(() =>
      parseTerminalBench(
        terminalArchive(
          terminalRows(),
          'Terminal Bench,True,terminalbench_external.csv,Pass rate,1.0,0.0,1.0,2025-05-19,',
        ),
      ),
    ).toThrow(/changed/);
    expect(() =>
      parseTerminalBench(
        terminalArchive(
          terminalRows(),
          'Terminal Bench,True,terminalbench_external.csv,Accuracy mean,1.0,0.0,1.0,2025-05-19,Terminal Bench 3',
        ),
      ),
    ).toThrow(/superseded/);
    const broken = terminalRows();
    broken[0] = broken[0].replace(',0.300,', ',1.300,');
    expect(() => parseTerminalBench(terminalArchive(broken))).toThrow(/outside/);
    expect(() => parseTerminalBench(terminalArchive(terminalRows().slice(0, 20)))).toThrow(/few/);
  });
});
