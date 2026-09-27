import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, CheckCheck, Star, StarOff } from 'lucide-react';
import { makerLogo } from '../../shared/makers';
import { PageHeading } from '../components/Layout';
import { ChangeEntry } from '../components/changes/ChangeEntry';
import { indexValue, price, whole } from '../components/profile/format';
import {
  eventsSince,
  figureChanges,
  figuresOf,
  useFollowing,
  type FigureChange,
  type Figures,
  type Followed,
} from '../lib/following';
import { useChanges, useExplorer, type ExplorerRow } from '../lib/overview';
import './model-profile.css';
import '../components/home/dashboard.css';
import './following.css';

type Kind = FigureChange['kind'];
const FIGURES: [kind: Kind, label: string, format: (value: number | null) => string][] = [
  ['price', 'Blended price per 1M', (value) => (value === null ? 'Not listed' : price(value))],
  ['index', 'Capability index', (value) => (value === null ? 'Not scored' : indexValue(value))],
  ['hosts', 'Hosts', (value) => whole(value ?? 0)],
];
/** How a figure that was missing, or went missing, reads. */
const APPEARED: Record<Kind, string> = {
  price: 'Newly listed',
  index: 'Newly scored',
  hosts: 'Newly hosted',
};

/** Moves focus to an element once React has drawn the change that needs it. */
const focusLater = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());
const headingId = (slug: string) => `following-${slug}`;
/** A model's first few changes show at once; the rest wait behind a button. */
const FIRST_EVENTS = 3;

/** A figure as it is now, and how it moved since the visitor last looked. */
function Figure({
  kind,
  label,
  format,
  now,
  change,
}: {
  kind: Kind;
  label: string;
  format: (value: number | null) => string;
  now: Figures;
  change?: FigureChange;
}) {
  const from = change?.from ?? null;
  const to = change?.to ?? null;
  const Direction = from !== null && to !== null ? (to > from ? ArrowUp : ArrowDown) : null;
  return (
    <div className={`following-figure${change ? ' is-changed' : ''}`}>
      <span>{label}</span>
      <strong>{format(now[kind])}</strong>
      <small>
        {!change ? (
          'No change'
        ) : Direction ? (
          <>
            <Direction size={13} aria-hidden="true" />
            {to! > from! ? 'Up' : 'Down'} from {format(from)}
          </>
        ) : from === null ? (
          APPEARED[kind]
        ) : (
          `Was ${format(from)}`
        )}
      </small>
    </div>
  );
}

/**
 * The models a visitor follows, each with what changed since they last looked:
 * its figures against the ones it had then, and its news from "What changed".
 */
export default function Following() {
  const { models, unfollow, markSeen } = useFollowing();
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const expand = (slug: string) =>
    setExpanded((open) => {
      const next = new Set(open);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });
  const enabled = models.length > 0;
  const explorer = useExplorer(enabled, attempt);
  const changes = useChanges(attempt, undefined, enabled);
  const rows = useMemo(
    () => new Map<string, ExplorerRow>(explorer.data?.models.map((row) => [row[0], row])),
    [explorer.data],
  );

  const cards = models.map((model: Followed) => {
    const row = rows.get(model.slug);
    // A model no longer listed keeps the figures it had; only its news can be new.
    const now = row ? figuresOf(row) : model.seen;
    const figures = figureChanges(model.seen, now);
    const events = changes.data ? eventsSince(changes.data.events, model.slug, model.since) : [];
    return { model, row, now, figures, events, count: figures.length + events.length };
  });
  const changed = cards.filter((card) => card.count > 0);

  const seeAll = () => {
    markSeen(Object.fromEntries(changed.map(({ model, now }) => [model.slug, now])));
    focusLater('following-summary');
  };
  const see = (slug: string, now: Figures) => {
    markSeen({ [slug]: now });
    focusLater(headingId(slug));
  };
  const stop = (slug: string, index: number) => {
    const next = cards[index + 1] ?? cards[index - 1];
    unfollow(slug);
    focusLater(next ? headingId(next.model.slug) : 'following-empty');
  };

  const failed = (explorer.error && !explorer.data) || (changes.error && !changes.data);
  return (
    <div className="container page profile-page following-page">
      <PageHeading
        eyebrow="FOLLOWING"
        title="The models you follow."
        text="What changed for each since you last looked: its price, capability index and hosts, and its news from What changed. The list stays in this browser, with no account."
      />
      {!enabled ? (
        <div className="following-empty">
          <span className="following-empty-icon" aria-hidden="true">
            <Star size={22} />
          </span>
          <h2 id="following-empty" tabIndex={-1}>
            You don’t follow any models yet.
          </h2>
          <p>
            Choose Follow on a model’s page, and this page shows what changed for it since you last
            looked.
          </p>
          <Link className="btn" to="/models">
            Browse models
          </Link>
        </div>
      ) : failed ? (
        <div className="dash-state" role="alert">
          <p>{explorer.error || changes.error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : !explorer.data || !changes.data ? (
        <div className="dash-state dash-pending is-tall" role="status">
          Loading the models you follow…
        </div>
      ) : (
        <>
          <div className="following-toolbar">
            <p id="following-summary" tabIndex={-1} aria-live="polite">
              {changed.length
                ? `${whole(changed.length)} of ${whole(models.length)} ${models.length === 1 ? 'model' : 'models'} changed since you last looked.`
                : `Nothing changed since you last looked, across ${whole(models.length)} ${models.length === 1 ? 'model' : 'models'}.`}
            </p>
            {changed.length > 0 && (
              <button type="button" className="btn btn-small" onClick={seeAll}>
                <CheckCheck size={15} aria-hidden="true" />
                Mark all as seen
              </button>
            )}
          </div>
          <ul className="following-list">
            {cards.map(({ model, row, now, figures, events, count }, index) => {
              const name = row?.[1] ?? model.name;
              return (
                <li key={model.slug}>
                  <article className="following-card" aria-labelledby={headingId(model.slug)}>
                    <header className="following-head">
                      <img
                        src={makerLogo(row?.[2] ?? model.makerId)}
                        alt=""
                        width="36"
                        height="36"
                        loading="lazy"
                      />
                      <div>
                        <h2 id={headingId(model.slug)} tabIndex={-1}>
                          {row ? <Link to={`/models/${model.slug}`}>{name}</Link> : name}
                        </h2>
                        <p>
                          {row?.[3] || 'No longer in the catalog'}
                          {count > 0 && (
                            <span className="following-count-chip">
                              {count} {count === 1 ? 'change' : 'changes'}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="following-actions">
                        {count > 0 && (
                          <button
                            type="button"
                            className="btn btn-small"
                            aria-label={`Mark as seen: ${name}`}
                            onClick={() => see(model.slug, now)}
                          >
                            <Check size={15} aria-hidden="true" />
                            Mark as seen
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-small btn-outline"
                          aria-label={`Unfollow ${name}`}
                          onClick={() => stop(model.slug, index)}
                        >
                          <StarOff size={15} aria-hidden="true" />
                          Unfollow
                        </button>
                      </div>
                    </header>
                    {row ? (
                      <div className="following-figures">
                        {FIGURES.map(([kind, label, format]) => (
                          <Figure
                            key={kind}
                            kind={kind}
                            label={label}
                            format={format}
                            now={now}
                            change={figures.find((change) => change.kind === kind)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="following-gone">
                        This model is no longer listed, so its figures cannot be compared. Its maker
                        may have renamed or retired it.
                      </p>
                    )}
                    {events.length > 0 && (
                      <ul className="following-events" id={`${headingId(model.slug)}-news`}>
                        {(expanded.has(model.slug) ? events : events.slice(0, FIRST_EVENTS)).map(
                          (event, position) => (
                            <ChangeEntry
                              key={`${event.kind}-${event.day}-${position}`}
                              event={event}
                            />
                          ),
                        )}
                      </ul>
                    )}
                    {events.length > FIRST_EVENTS && (
                      <button
                        type="button"
                        className="btn btn-small btn-outline following-more"
                        aria-expanded={expanded.has(model.slug)}
                        aria-controls={`${headingId(model.slug)}-news`}
                        onClick={() => expand(model.slug)}
                      >
                        {expanded.has(model.slug)
                          ? 'Show less news'
                          : `Show ${events.length - FIRST_EVENTS} more`}
                      </button>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
          <p className="data-footnote">
            Listed prices and hosts from{' '}
            <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
              models.dev
            </a>{' '}
            (MIT). Capability index from{' '}
            <a href="https://epoch.ai/benchmarks" target="_blank" rel="noopener noreferrer">
              Epoch AI
            </a>{' '}
            (CC BY 4.0)
            {changes.data.sources
              .filter((source) => source.id !== 'epoch')
              .map((source) => (
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
            . A price is blended as three input tokens for every output token, from the maker’s own
            paid listing or else the middle paid listing across hosts. News comes from{' '}
            <Link to="/changes">What changed</Link>, which keeps the last 30 days. Followed models
            are saved in this browser only and are never sent to Artificials; clearing site data
            removes them.
          </p>
        </>
      )}
    </div>
  );
}
