import type {
  AgentResult,
  BenchmarkCategory,
  BenchmarkRow,
  TaskUsage,
} from '../../shared/benchmarks.ts';
import { plainText } from '../../shared/catalog.ts';
import { rankRows } from './benchmark-sources.ts';
import { agentKey, maker } from './epoch.ts';

/**
 * SWE-bench's own leaderboards, published under CC BY-NC 4.0: allowed on this
 * non-commercial site with credit. The refresh checks the licence text first.
 */
export const SWE_BENCH = {
  repo: 'SWE-bench/swe-bench.github.io',
  file: 'data/leaderboards.json',
  url: 'https://www.swebench.com/',
  license: 'CC BY-NC 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
  /** Words the repository's LICENSE file must contain. */
  licenseText: 'Attribution-NonCommercial 4.0 International',
  tasks: 500,
};

interface Entry {
  name?: string;
  agent?: string | null;
  agent_org?: string | null;
  model_display?: string | null;
  model_org?: string | null;
  reasoning_effort?: string | null;
  resolved?: number | null;
  date?: string | null;
  instance_cost?: number | null;
  instance_calls?: number | null;
  folder?: string | null;
  tags?: string[] | null;
}

const text = (value: string | null | undefined, maximum: number) => {
  const cleaned = plainText(value ?? '');
  return cleaned && cleaned.length <= maximum ? cleaned : undefined;
};
const day = (value: string | null | undefined) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

/** The one model an entry used, from its "Model: …" tag; entries with several are left out. */
function modelOf(entry: Entry) {
  const tags = (entry.tags ?? []).filter((tag) => typeof tag === 'string');
  const models = tags.filter((tag) => tag.startsWith('Model: '));
  if (models.length !== 1) return undefined;
  // A host prefix such as "openai/" is not part of the model's name, and
  // "claude-4-5-opus" is the same model as the maker's "claude-opus-4-5".
  const model = models[0]
    .slice(7)
    .trim()
    .split('/')
    .pop()!
    .replace(/^claude-(\d+(?:-\d+)?)-(opus|sonnet|haiku)/i, 'claude-$2-$1');
  return /^[\w.:@+-]{2,120}$/.test(model) ? model : undefined;
}
const scoreOf = (entry: Entry) => {
  const value = entry.resolved;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value < 0 || value > 100) throw Error('SWE-bench score outside 0–100');
  return value;
};
const positive = (value: number | null | undefined, maximum: number) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= maximum
    ? value
    : undefined;

/**
 * SWE-bench Verified, from the SWE-bench team's leaderboard file: the models in
 * the bash-only agent (mini-SWE-agent) as a model test with cost per task, and
 * other agents' single-attempt submissions as agent results.
 */
export function parseSweBench(
  json: string,
  sourceUrl: string,
): {
  bashOnly: BenchmarkCategory;
  agents: { results: AgentResult[]; latestRun: string | null };
} {
  const data = JSON.parse(json) as { leaderboards?: { name?: string; results?: Entry[] }[] };
  const verified = data.leaderboards?.find((board) => board.name === 'Verified')?.results;
  if (!Array.isArray(verified) || verified.length < 50) throw Error('SWE-bench schema changed');

  // Bash only: every model in the same minimal agent.
  const models = new Map<string, Omit<BenchmarkRow, 'rank'> & { date: string }>();
  // Other agents: one attempt per task, one model, so results compare fairly.
  const agents = new Map<string, Omit<AgentResult, 'rank'>>();
  let latestRun: string | null = null;
  for (const entry of verified) {
    const model = modelOf(entry);
    const score = scoreOf(entry);
    const date = day(entry.date);
    const agent = text(entry.agent, 60);
    if (!model || score === undefined || !date || !agent) continue;
    const provider = maker(model, entry.model_org ?? '');
    if (agent.toLowerCase() === 'mini-swe-agent') {
      const effort = text(entry.reasoning_effort, 20)?.toLowerCase();
      const configuration = effort && /^[a-z]+$/.test(effort) ? `${model}_${effort}` : model;
      const previous = models.get(configuration);
      if (previous && previous.date >= date) continue;
      const usage: TaskUsage = {};
      const cost = positive(entry.instance_cost, 1000);
      const calls = positive(entry.instance_calls, 100000);
      if (cost !== undefined) usage.cost = Number(cost.toFixed(4));
      if (calls !== undefined) usage.calls = Number(calls.toFixed(1));
      models.set(configuration, {
        id: configuration,
        model: configuration,
        ...provider,
        score,
        sourceUrl,
        evaluatedAt: date,
        date,
        ...(Object.keys(usage).length ? { usage } : {}),
      });
      continue;
    }
    if (!(entry.tags ?? []).includes('System: Attempts - 1')) continue;
    const key = agentKey(agent);
    if (!key) continue;
    const id = `${key}:${model}`;
    const previous = agents.get(id);
    if (previous && (previous.runDate ?? '') >= date) continue;
    const organisation = text(entry.agent_org, 60);
    const modelName = text(entry.model_display, 80);
    if (!latestRun || date > latestRun) latestRun = date;
    agents.set(id, {
      id,
      agent,
      ...(organisation ? { agentOrg: organisation } : {}),
      model,
      ...(modelName ? { modelName } : {}),
      ...provider,
      score,
      runDate: date,
    });
  }
  const rows = rankRows([...models.values()].map(({ date: _date, ...row }) => row));
  if (rows.length < 15) throw Error('Too few SWE-bench bash-only results');
  const results = [...agents.values()].sort(
    (a, b) => b.score - a.score || a.id.localeCompare(b.id),
  );
  if (results.length < 15) throw Error('Too few SWE-bench agent results');
  let rank = 0;
  return {
    bashOnly: {
      id: 'swe-bench-bash-only',
      name: 'SWE-bench Verified, bash only',
      sourceId: 'swebench',
      unit: 'percent',
      domain: 'agentic',
      description:
        'The 500 SWE-bench Verified issues from real Python projects, with every model in the same minimal agent that can only run shell commands (mini-SWE-agent).',
      methodology:
        'Share of issues resolved, with average API cost and model calls per issue, as published by the SWE-bench team. The latest run of each model and reasoning effort is kept; a suffix such as _high names the effort.',
      rows,
    },
    agents: {
      latestRun,
      results: results.map((row, index) => {
        if (!index || results[index - 1].score !== row.score) rank = index + 1;
        return { ...row, rank };
      }),
    },
  };
}
