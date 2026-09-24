import { useState } from 'react';
import { Link } from 'react-router-dom';
import { makerLogo } from '../../../shared/makers';
import type { Release } from '../../lib/overview';
import { day, price, tokens } from '../profile/format';

function daysAgo(date: string, now: number) {
  const days = Math.round((now - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  return '';
}

function facts(release: Release) {
  const list: string[] = [];
  if (release.index !== undefined) list.push(`Index ${release.index.toFixed(1)}`);
  if (release.contextWindow) list.push(`${tokens(release.contextWindow)} context`);
  if (release.price !== undefined) list.push(`${price(release.price)} per 1M tokens`);
  if (release.openWeights) list.push('Open weights');
  if (release.reasoning) list.push('Reasoning');
  if (release.output.includes('image')) list.push('Makes images');
  if (release.input.includes('image')) list.push('Reads images');
  if (release.input.includes('audio') || release.output.includes('audio')) list.push('Audio');
  return list;
}

/** New models, newest first, grouped by release day. */
export function ReleaseTimeline({ releases }: { releases: Release[] }) {
  const [scope, setScope] = useState<'known' | 'all'>('known');
  const [shown, setShown] = useState(10);
  const list = releases.filter((release) => scope === 'all' || release.notable);
  const visible = list.slice(0, shown);
  const now = Date.now();
  const days: [string, Release[]][] = [];
  for (const release of visible) {
    const last = days.at(-1);
    if (last && last[0] === release.date) last[1].push(release);
    else days.push([release.date, [release]]);
  }

  return (
    <div className="timeline">
      <div className="dash-tabs" role="group" aria-label="Which releases to show">
        <button
          type="button"
          aria-pressed={scope === 'known'}
          onClick={() => {
            setScope('known');
            setShown(10);
          }}
        >
          Known makers
        </button>
        <button
          type="button"
          aria-pressed={scope === 'all'}
          onClick={() => {
            setScope('all');
            setShown(10);
          }}
        >
          All listings
        </button>
      </div>
      <ol className="timeline-days">
        {days.map(([date, entries]) => (
          <li key={date} className="timeline-day">
            <h3 className="timeline-date">
              <time dateTime={date}>{day(date)}</time>
              {daysAgo(date, now) && <span>{daysAgo(date, now)}</span>}
            </h3>
            <ul className="timeline-entries">
              {entries.map((release) => (
                <li key={release.slug} className="timeline-entry">
                  <img
                    src={makerLogo(release.makerId)}
                    alt=""
                    width="40"
                    height="40"
                    loading="lazy"
                  />
                  <div className="timeline-main">
                    <Link to={`/models/${release.slug}`} className="timeline-link">
                      {release.name}
                    </Link>
                    <span>
                      {release.maker || 'Maker not reported'}
                      {`, from ${release.hosts} ${release.hosts === 1 ? 'host' : 'hosts'}`}
                    </span>
                  </div>
                  <ul className="timeline-facts" aria-label="Key facts">
                    {facts(release).map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {list.length > shown && (
        <button
          type="button"
          className="btn btn-outline btn-small timeline-more"
          onClick={() => setShown((value) => value + 15)}
        >
          Show more releases
        </button>
      )}
    </div>
  );
}
