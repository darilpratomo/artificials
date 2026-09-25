import { useState } from 'react';
import { Link } from 'react-router-dom';
import { makerColor, makerLogo } from '../../../shared/makers';
import { ShareButton } from '../charts/ShareButton';
import { percent, type AgentSpread } from './analysis';

const SHOWN = 10;

/**
 * One row per model run by several agents: a line from the weakest to the
 * strongest agent's score, with a dot for every agent. Opening a row lists them.
 */
export function AgentEffect({ groups, credit }: { groups: AgentSpread[]; credit: string }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? groups : groups.slice(0, SHOWN);
  const widest = Math.max(...groups.map((group) => group.spread), 1);
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h3>Same model, different agents</h3>
          <p>
            Each line runs from the weakest to the strongest agent’s score for one model; every dot
            is an agent. Open a model to see which agent scored what.
          </p>
        </div>
        <ShareButton
          title="How much the coding agent changes a model’s score"
          render={(tools) =>
            tools.listImage(
              {
                title: 'How much the coding agent changes a model’s score',
                subtitle:
                  'Terminal-Bench 2.0: points between the weakest and strongest agent running each model.',
                source: credit,
              },
              groups.slice(0, 30).map((group) => ({
                label: group.name,
                detail: `${group.worst.agent} ${percent(group.worst.score)} to ${group.best.agent} ${percent(group.best.score)}, ${group.rows.length} agents`,
                value: `${group.spread.toFixed(1)} pts`,
                fraction: group.spread / widest,
                makerId: group.makerId,
              })),
            )
          }
        />
      </div>
      <div className="effect-scale" aria-hidden="true">
        <span className="effect-scale-axis">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </span>
      </div>
      <ul className="effect-rows">
        {shown.map((group) => (
          <li key={group.name}>
            <details>
              <summary>
                <span className="effect-name">
                  <img
                    src={makerLogo(group.makerId)}
                    alt=""
                    width="20"
                    height="20"
                    loading="lazy"
                  />
                  <span>
                    <b>{group.name}</b>
                    <small>
                      {group.rows.length} agents, {group.spread.toFixed(1)} points apart
                    </small>
                  </span>
                </span>
                <span className="effect-track" aria-hidden="true">
                  <i
                    style={{
                      left: `${group.worst.score}%`,
                      width: `${Math.max(group.spread, 0.6)}%`,
                      background: makerColor(group.makerId),
                    }}
                  />
                  {group.rows.map((row) => (
                    <b
                      key={row.id}
                      style={{ left: `${row.score}%`, borderColor: makerColor(group.makerId) }}
                    />
                  ))}
                </span>
                <span className="effect-values">
                  {percent(group.worst.score)} to {percent(group.best.score)}
                </span>
              </summary>
              <ol className="effect-agents">
                {group.rows.map((row) => (
                  <li key={row.id}>
                    <span>
                      {row.agent}
                      {row.agentOrg && <small>{row.agentOrg}</small>}
                    </span>
                    <b>{percent(row.score)}</b>
                  </li>
                ))}
              </ol>
              {group.slug && (
                <Link className="text-link effect-profile" to={`/models/${group.slug}`}>
                  {group.name} profile
                </Link>
              )}
            </details>
          </li>
        ))}
      </ul>
      <div className="dash-foot">
        <p>Models with results from at least three agents. {credit}.</p>
        {groups.length > SHOWN && (
          <button
            type="button"
            className="text-link"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Show fewer' : `Show all ${groups.length} models`}
          </button>
        )}
      </div>
    </div>
  );
}
