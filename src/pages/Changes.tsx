import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Rss } from 'lucide-react';
import { PageHeading } from '../components/Layout';
import { ChangeEntry } from '../components/changes/ChangeEntry';
import { day } from '../components/profile/format';
import { useChanges, type ChangeEvent, type Changes } from '../lib/overview';
import '../components/home/dashboard.css';
import './changes.css';

type Kind = ChangeEvent['kind'];
const TABS: [Kind | 'all', string][] = [
  ['all', 'All'],
  ['release', 'Releases'],
  ['leader', 'Leaders'],
  ['index', 'Index'],
  ['price', 'Prices'],
];

/** What changed over the last 30 days, grouped by day, newest first. */
export default function Changes({ initial }: { initial?: Changes }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useChanges(attempt, initial);
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [range, setRange] = useState<7 | 30>(30);

  const first = (() => {
    if (!data) return '';
    const start = new Date(`${data.until}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - (range - 1));
    return start.toISOString().slice(0, 10);
  })();
  const inRange = data?.events.filter((event) => event.day >= first) ?? [];
  const shown = inRange.filter((event) => kind === 'all' || event.kind === kind);
  const days: [string, ChangeEvent[]][] = [];
  for (const event of shown) {
    const last = days.at(-1);
    if (last && last[0] === event.day) last[1].push(event);
    else days.push([event.day, [event]]);
  }

  return (
    <div className="container page changes-page">
      <PageHeading
        eyebrow="WHAT CHANGED"
        title="What changed, day by day."
        text="New releases, price changes, new leaders on each test and models joining the capability index, newest first."
      />
      {error && !data ? (
        <div className="dash-state" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="dash-state dash-pending is-tall" role="status">
          Loading the changes…
        </div>
      ) : (
        <>
          <div className="changes-controls">
            <div className="dash-tabs" role="group" aria-label="Which changes to show">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={kind === id}
                  onClick={() => setKind(id)}
                >
                  {label}{' '}
                  <span className="changes-count">
                    {inRange.filter((event) => id === 'all' || event.kind === id).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="dash-tabs" role="group" aria-label="How far back">
              {([7, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={range === days}
                  onClick={() => setRange(days)}
                >
                  {`Last ${days} days`}
                </button>
              ))}
            </div>
          </div>
          {days.length ? (
            <ol className="timeline-days changes-days">
              {days.map(([date, events]) => (
                <li key={date} className="timeline-day">
                  <h2 className="timeline-date">
                    <time dateTime={date}>{day(date)}</time>
                  </h2>
                  <ul className="timeline-entries">
                    {events.map((event, index) => (
                      <ChangeEntry
                        key={`${event.kind}-${event.model.name}-${index}`}
                        event={event}
                      />
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <p className="changes-empty">Nothing of this kind in the last {range} days.</p>
          )}
          <p className="data-footnote">
            Releases and listed prices from{' '}
            <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
              models.dev
            </a>{' '}
            (MIT)
            {data.sources.map((source) => (
              <span key={source.id}>
                ;{' '}
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.name}
                </a>{' '}
                (
                <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {source.license}
                </a>
                )
              </span>
            ))}
            . A price change is the maker’s own listing changing, not the middle price across hosts;
            a percentage compares prices blended as three input tokens for every output token.
            “Within margin” marks a new leader whose lead is inside the range its publisher gives
            for its score: the next model could still pass it as more votes come in. Changes count
            from when the site began keeping this record, so older ones are not listed.{' '}
            <Link to="/weekly">Each week on one page</Link>.{' '}
            <a href="/changes.xml">
              <Rss size={13} aria-hidden="true" /> RSS feed
            </a>
          </p>
        </>
      )}
    </div>
  );
}
