import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChartColumn, Rss, Sparkles, Tag, Trophy, type LucideIcon } from 'lucide-react';
import { makerLogo } from '../../shared/makers';
import { PageHeading } from '../components/Layout';
import { day, price, score } from '../components/profile/format';
import { useChanges, type ChangeEvent, type ChangeModel, type Changes } from '../lib/overview';
import '../components/home/dashboard.css';
import './changes.css';

type Kind = ChangeEvent['kind'];
const KINDS: [kind: Kind, label: string, icon: LucideIcon][] = [
  ['release', 'New release', Sparkles],
  ['leader', 'New leader', Trophy],
  ['index', 'Joined the index', ChartColumn],
  ['price', 'Price change', Tag],
];
const TABS: [Kind | 'all', string][] = [
  ['all', 'All'],
  ['release', 'Releases'],
  ['leader', 'Leaders'],
  ['index', 'Index'],
  ['price', 'Prices'],
];

/** A model's name, linked to its profile when it has one. */
function Name({ model }: { model: ChangeModel }) {
  return model.slug ? (
    <Link to={`/models/${model.slug}`}>{model.name}</Link>
  ) : (
    <strong>{model.name}</strong>
  );
}

/** Blended three input tokens to one output token, as the site's reference price. */
const blend = ([input, output]: [number, number]) => (input * 3 + output) / 4;

function sentence(event: ChangeEvent): { text: ReactNode; chip?: string } {
  switch (event.kind) {
    case 'release':
      return {
        text: (
          <>
            <Name model={event.model} /> was released
            {event.model.maker ? ` by ${event.model.maker}` : ''}.
          </>
        ),
      };
    case 'leader':
      return {
        text: (
          <>
            <Name model={event.model} /> took the top spot on{' '}
            <Link to={`/tests/${event.test}`}>{event.label}</Link> at{' '}
            {score(event.score, event.unit)}, from <Name model={event.previous} />.
          </>
        ),
        ...(event.withinMargin ? { chip: 'Within margin' } : {}),
      };
    case 'index':
      return {
        text: (
          <>
            <Name model={event.model} /> joined the{' '}
            <Link to="/tests/capability-index">capability index</Link> at{' '}
            {score(event.score, 'index')}.
          </>
        ),
      };
    case 'price': {
      const change = blend(event.to) / blend(event.from) - 1;
      return {
        text: (
          <>
            {event.model.maker ? `${event.model.maker}’s` : 'The'} listed price for{' '}
            <Name model={event.model} /> went from {price(event.from[0])} in and{' '}
            {price(event.from[1])} out to {price(event.to[0])} in and {price(event.to[1])} out per
            1M tokens.
          </>
        ),
        chip: `${change > 0 ? '+' : '−'}${Math.abs(Math.round(change * 100))}%`,
      };
    }
  }
}

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
                    {events.map((event, index) => {
                      const [, label, Icon] = KINDS.find(([id]) => id === event.kind)!;
                      const { text, chip } = sentence(event);
                      return (
                        <li
                          key={`${event.kind}-${event.model.name}-${index}`}
                          className="change-entry"
                        >
                          <img
                            src={makerLogo(event.model.makerId)}
                            alt=""
                            width="36"
                            height="36"
                            loading="lazy"
                          />
                          <div>
                            <span className={`change-kind is-${event.kind}`}>
                              <Icon size={13} aria-hidden="true" />
                              {label}
                            </span>
                            <p>{text}</p>
                          </div>
                          {chip && <span className="change-chip">{chip}</span>}
                        </li>
                      );
                    })}
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
            <a href="/changes.xml">
              <Rss size={13} aria-hidden="true" /> RSS feed
            </a>
          </p>
        </>
      )}
    </div>
  );
}
