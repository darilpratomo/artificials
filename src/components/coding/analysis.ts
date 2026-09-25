import type { CodingAgentRow } from '../../lib/overview';

export const percent = (value: number) => `${value.toFixed(1)}%`;

/** "Sep 25, 2026 at 01:10 UTC": a retrieval time that reads the same for everyone. */
export function checkedAt(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'recently';
  const day = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${day} at ${time} UTC`;
}

/** One model run by several agents, best agent first. */
export interface AgentSpread {
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
  rows: CodingAgentRow[];
  best: CodingAgentRow;
  worst: CodingAgentRow;
  spread: number;
}

/**
 * Models with results in at least `minimum` agents. Rows are grouped by the
 * model's name with its configuration, so different efforts stay apart.
 */
export function spreads(results: CodingAgentRow[], minimum = 3): AgentSpread[] {
  const groups = new Map<string, CodingAgentRow[]>();
  for (const row of results) groups.set(row.name, [...(groups.get(row.name) ?? []), row]);
  return [...groups.values()]
    .filter((rows) => rows.length >= minimum)
    .map((rows) => {
      const sorted = [...rows].sort((a, b) => b.score - a.score);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      return {
        name: best.name,
        ...(best.slug ? { slug: best.slug } : {}),
        makerId: best.makerId,
        maker: best.maker,
        rows: sorted,
        best,
        worst,
        spread: Math.round((best.score - worst.score) * 10) / 10,
      };
    })
    .sort((a, b) => b.best.score - a.best.score || a.name.localeCompare(b.name));
}

export interface AgentSummary {
  agent: string;
  agentOrg?: string;
  models: number;
  best: CodingAgentRow;
  latest?: string;
  /** Built by the maker of at least one model it ran. */
  own: boolean;
}

/** Every agent with its best result, best first. */
export function agentsOf(results: CodingAgentRow[]): AgentSummary[] {
  const agents = new Map<string, AgentSummary>();
  for (const row of results) {
    const entry = agents.get(row.agent);
    if (!entry) {
      agents.set(row.agent, {
        agent: row.agent,
        ...(row.agentOrg ? { agentOrg: row.agentOrg } : {}),
        models: 1,
        best: row,
        ...(row.runDate ? { latest: row.runDate } : {}),
        own: row.own,
      });
      continue;
    }
    entry.models += 1;
    if (row.score > entry.best.score) entry.best = row;
    if (row.runDate && (!entry.latest || row.runDate > entry.latest)) entry.latest = row.runDate;
    entry.own ||= row.own;
  }
  return [...agents.values()].sort(
    (a, b) => b.best.score - a.best.score || a.agent.localeCompare(b.agent),
  );
}

export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
