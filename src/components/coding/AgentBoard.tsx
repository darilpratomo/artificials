import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { makerColor, makerLogo } from '../../../shared/makers';
import type { CodingAgentRow } from '../../lib/overview';
import { Select } from '../Select';
import { ShareButton } from '../charts/ShareButton';
import { percent } from './analysis';

type Scope = 'all' | 'own' | 'independent';
const SCOPES: [Scope, string][] = [
  ['all', 'All agents'],
  ['own', 'Built by the model’s maker'],
  ['independent', 'Independent agents'],
];
const SHOWN = 15;

/**
 * Agent and model pairs ranked by the share of tasks solved, on a fixed 0 to
 * 100 scale. Picking a model lists every agent that ran it.
 */
export function AgentBoard({
  results,
  test,
  tasks,
  credit,
}: {
  results: CodingAgentRow[];
  /** The benchmark's name, such as Terminal-Bench 2.0. */
  test: string;
  tasks: number;
  credit: string;
}) {
  const [scope, setScope] = useState<Scope>('all');
  const [model, setModel] = useState('all');
  const [expanded, setExpanded] = useState(false);
  // Models run by at least two agents, most capable result first.
  const models = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of results) counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
    return [...counts].filter(([, count]) => count >= 2);
  }, [results]);
  const rows = results.filter(
    (row) =>
      (scope === 'all' || (scope === 'own') === row.own) && (model === 'all' || row.name === model),
  );
  const shown = expanded ? rows : rows.slice(0, SHOWN);
  const title =
    model === 'all'
      ? `${test}: ${SCOPES.find(([id]) => id === scope)![1].toLowerCase()}`
      : `${test}: ${model} in each agent`;

  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h3>{model === 'all' ? 'Agent and model pairs' : `${model}, agent by agent`}</h3>
          <p>
            Share of the {tasks} {test} tasks solved. Higher is better. Every result pairs one agent
            with one model.
          </p>
        </div>
        <div className="dash-controls">
          <Select value={model} onValueChange={setModel} aria-label="Show one model">
            <option value="all">All models</option>
            {models.map(([name, count]) => (
              <option key={name} value={name}>
                {`${name} (${count} agents)`}
              </option>
            ))}
          </Select>
          {rows.length > 0 && (
            <ShareButton
              title={title}
              render={(tools) =>
                tools.listImage(
                  {
                    title,
                    subtitle: `Share of the ${tasks} tasks solved, per agent and model. Higher is better.`,
                    source: credit,
                  },
                  rows.slice(0, 30).map((row) => ({
                    label: row.agent,
                    detail: row.name,
                    value: percent(row.score),
                    fraction: row.score / 100,
                    makerId: row.makerId,
                  })),
                )
              }
            />
          )}
        </div>
      </div>
      <div className="dash-tabs" role="group" aria-label="Which agents to show">
        {SCOPES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={scope === id}
            onClick={() => {
              setScope(id);
              setExpanded(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {rows.length ? (
        <ol className="agent-board" aria-label={`${title}, highest first`}>
          {shown.map((row, index) => (
            <li key={row.id}>
              <span className="agent-board-rank" aria-hidden="true">
                {index + 1}
              </span>
              <span className="agent-board-name">
                <span className="agent-board-agent">
                  <b>{row.agent}</b>
                  {row.agentOrg && <small>{row.agentOrg}</small>}
                </span>
                <span className="agent-board-model">
                  <img src={makerLogo(row.makerId)} alt="" width="18" height="18" loading="lazy" />
                  <span className="sr-only">with</span>
                  {row.slug ? <Link to={`/models/${row.slug}`}>{row.name}</Link> : row.name}
                </span>
              </span>
              <span className="agent-board-track" aria-hidden="true">
                <i style={{ width: `${row.score}%`, background: makerColor(row.makerId) }} />
                {row.stderr !== undefined && (
                  <s
                    style={{
                      left: `${Math.max(0, row.score - row.stderr)}%`,
                      width: `${Math.min(row.score + row.stderr, 100) - Math.max(0, row.score - row.stderr)}%`,
                    }}
                  />
                )}
              </span>
              <span className="agent-board-score">
                <b>{percent(row.score)}</b>
                {row.stderr !== undefined && (
                  <small>
                    <span aria-hidden="true">±</span>
                    <span className="sr-only">plus or minus </span>
                    {row.stderr.toFixed(1)}
                  </small>
                )}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="dash-state">
          <p>No results match. Choose another model or show all agents.</p>
        </div>
      )}
      <div className="dash-foot">
        <p>Bars start at zero; the thin line marks one standard error either side. {credit}.</p>
        {rows.length > SHOWN && (
          <button
            type="button"
            className="text-link"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Show fewer' : `Show all ${rows.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
