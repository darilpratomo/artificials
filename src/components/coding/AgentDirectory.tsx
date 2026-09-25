import { useState } from 'react';
import { Link } from 'react-router-dom';
import { makerLogo } from '../../../shared/makers';
import { day } from '../profile/format';
import { percent, type AgentSummary } from './analysis';

const SHOWN = 12;

/** Every agent on the leaderboard: who built it, how many models it ran and its best result. */
export function AgentDirectory({ agents }: { agents: AgentSummary[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? agents : agents.slice(0, SHOWN);
  return (
    <div className="dash-panel">
      <div className="agent-list-head" aria-hidden="true">
        <span>Agent</span>
        <span>Models run</span>
        <span>Best result</span>
        <span>Latest result</span>
      </div>
      <ol className="agent-list">
        {shown.map((entry) => (
          <li key={entry.agent}>
            <span className="agent-list-name">
              <b>{entry.agent}</b>
              <small>{entry.agentOrg ?? 'Builder not listed'}</small>
            </span>
            <span>
              <small className="agent-list-label">Models run</small>
              {entry.models}
            </span>
            <span className="agent-list-best">
              <small className="agent-list-label">Best result</small>
              <b>{percent(entry.best.score)}</b>
              <span>
                <img
                  src={makerLogo(entry.best.makerId)}
                  alt=""
                  width="16"
                  height="16"
                  loading="lazy"
                />
                <span className="sr-only">with</span>
                {entry.best.slug ? (
                  <Link to={`/models/${entry.best.slug}`}>{entry.best.name}</Link>
                ) : (
                  entry.best.name
                )}
              </span>
            </span>
            <span>
              <small className="agent-list-label">Latest result</small>
              {entry.latest ? day(entry.latest) : 'Not listed'}
            </span>
          </li>
        ))}
      </ol>
      {agents.length > SHOWN && (
        <div className="dash-foot">
          <p>Sorted by each agent’s best result.</p>
          <button
            type="button"
            className="text-link"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Show fewer' : `Show all ${agents.length} agents`}
          </button>
        </div>
      )}
    </div>
  );
}
