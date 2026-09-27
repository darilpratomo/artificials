import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, CheckCheck, Star, StarOff } from 'lucide-react';
import { aboutMaker, aboutModel, aboutTest } from '../../shared/changes';
import { makerLogo } from '../../shared/makers';
import { PageHeading } from '../components/Layout';
import { FollowButton } from '../components/Follow';
import { ChangeEntry } from '../components/changes/ChangeEntry';
import { DOMAINS, day, indexValue, price, score, whole } from '../components/profile/format';
import {
  figureChanges,
  figuresOf,
  lineupOf,
  makerChanges,
  makerFiguresOf,
  newModels,
  newsSince,
  testChanges,
  testFiguresOf,
  useFollowing,
  type Figures,
  type Followed,
  type Kind,
  type MakerFigures,
  type TestFigures,
} from '../lib/following';
import {
  useChanges,
  useExplorer,
  useMakers,
  useTestPages,
  type ChangeEvent,
  type ExplorerRow,
  type TestDirectory,
} from '../lib/overview';
import '../domain-colors.css';
import './model-profile.css';
import '../components/home/dashboard.css';
import './following.css';

/** A figure as it is now, and how it moved since the visitor last looked. */
interface Tile {
  label: string;
  value: string;
  change?: { text: string; direction?: 'up' | 'down' };
}

interface Common {
  slug: string;
  name: string;
  /** Its page, while it has one. */
  href?: string;
  subtitle: string;
  mark: ReactNode;
  tiles: Tile[];
  /** Why its figures cannot be compared, when it has no page any more. */
  gone?: string;
  /** A maker's models that are new since the visitor last looked. */
  added: ExplorerRow[];
  news: ChangeEvent[];
  changed: boolean;
}
type Card = Common &
  (
    | { kind: 'models'; now: Figures }
    | { kind: 'makers'; now: MakerFigures }
    | { kind: 'tests'; now: TestFigures }
  );
type Source = TestDirectory['sources'][number];

const SECTIONS: [Kind, string][] = [
  ['models', 'Models'],
  ['makers', 'Makers'],
  ['tests', 'Tests'],
];
/** A card's first few news items show at once; the rest wait behind a button. */
const FIRST_EVENTS = 3;

/** How a figure moved, in words, with its direction where it has one. */
function moved(
  from: number | null,
  to: number | null,
  format: (value: number) => string,
  appeared: string,
): Tile['change'] {
  if (from === null) return { text: appeared };
  if (to === null) return { text: `Was ${format(from)}` };
  return to > from
    ? { text: `Up from ${format(from)}`, direction: 'up' }
    : { text: `Down from ${format(from)}`, direction: 'down' };
}
const plural = (count: number, one: string, many: string) =>
  `${whole(count)} ${count === 1 ? one : many}`;

/** Moves focus to an element once React has drawn the change that needs it. */
const focusLater = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());
const headingId = (card: Pick<Card, 'kind' | 'slug'>) => `following-${card.kind}-${card.slug}`;

function FigureTile({ tile }: { tile: Tile }) {
  const Direction = tile.change?.direction === 'up' ? ArrowUp : ArrowDown;
  return (
    <div className={`following-figure${tile.change ? ' is-changed' : ''}`}>
      <span>{tile.label}</span>
      <strong>{tile.value}</strong>
      <small>
        {tile.change?.direction && <Direction size={13} aria-hidden="true" />}
        {tile.change?.text ?? 'No change'}
      </small>
    </div>
  );
}

function FollowCard({
  card,
  open,
  onToggle,
  onSeen,
  onUnfollow,
}: {
  card: Card;
  open: boolean;
  onToggle: () => void;
  onSeen: () => void;
  onUnfollow: () => void;
}) {
  const id = headingId(card);
  const shown = open ? card.news : card.news.slice(0, FIRST_EVENTS);
  return (
    <article className="following-card" aria-labelledby={id}>
      <header className="following-head">
        {card.mark}
        <div>
          <h3 id={id} tabIndex={-1}>
            {card.href ? <Link to={card.href}>{card.name}</Link> : card.name}
          </h3>
          <p>
            {card.subtitle}
            {card.changed && <span className="following-count-chip">Changed</span>}
          </p>
        </div>
        <div className="following-actions">
          {card.changed && (
            <button
              type="button"
              className="btn btn-small"
              aria-label={`Mark as seen: ${card.name}`}
              onClick={onSeen}
            >
              <Check size={15} aria-hidden="true" />
              Mark as seen
            </button>
          )}
          <button
            type="button"
            className="btn btn-small btn-outline"
            aria-label={`Unfollow ${card.name}`}
            onClick={onUnfollow}
          >
            <StarOff size={15} aria-hidden="true" />
            Unfollow
          </button>
        </div>
      </header>
      {card.gone ? (
        <p className="following-gone">{card.gone}</p>
      ) : (
        <div className="following-figures">
          {card.tiles.map((tile) => (
            <FigureTile key={tile.label} tile={tile} />
          ))}
        </div>
      )}
      {card.added.length > 0 && (
        <div className="following-new">
          <h4>
            {card.added.length === 1
              ? 'A new model since you last looked'
              : `${whole(card.added.length)} new models since you last looked`}
          </h4>
          <ul>
            {card.added.map((row) => (
              <li key={row[0]}>
                <img src={makerLogo(row[2])} alt="" width="28" height="28" loading="lazy" />
                <span>
                  <Link to={`/models/${row[0]}`}>{row[1]}</Link>
                  <small>{row[4] ? `Released ${day(row[4])}` : 'Release date not reported'}</small>
                </span>
                <FollowButton
                  compact
                  kind="models"
                  entry={{ slug: row[0], name: row[1], makerId: row[2], seen: figuresOf(row) }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      {card.news.length > 0 && (
        <ul className="following-events" id={`${id}-news`}>
          {shown.map((event, position) => (
            <ChangeEntry key={`${event.kind}-${event.day}-${position}`} event={event} />
          ))}
        </ul>
      )}
      {card.news.length > FIRST_EVENTS && (
        <button
          type="button"
          className="btn btn-small btn-outline following-more"
          aria-expanded={open}
          aria-controls={`${id}-news`}
          onClick={onToggle}
        >
          {open ? 'Show less news' : `Show ${card.news.length - FIRST_EVENTS} more`}
        </button>
      )}
    </article>
  );
}

/** A source's credit: its name and its licence, each linked; the licence never breaks apart. */
function Credit({ source }: { source: Source }) {
  return (
    <>
      <a href={source.url} target="_blank" rel="noopener noreferrer">
        {source.name}
      </a>{' '}
      <span className="following-licence">
        (
        <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
          {source.license}
        </a>
        )
      </span>
    </>
  );
}

/**
 * The models, makers and tests a visitor follows, each with what changed since
 * they last looked: its figures against the ones it had then, a maker's new
 * models, and its news from "What changed".
 */
export default function Following() {
  const { models, makers, tests, total, unfollow, markSeen } = useFollowing();
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((open) => {
      const next = new Set(open);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // Each file loads only when something followed needs it.
  const needRows = models.length > 0 || makers.length > 0;
  // The list of tests also names each test's publisher, for the credits.
  const needTests = total > 0;
  const explorer = useExplorer(needRows, attempt);
  const changes = useChanges(attempt, undefined, total > 0);
  const makerList = useMakers(attempt, undefined, makers.length > 0);
  const testList = useTestPages(attempt, undefined, needTests);
  const loads = [
    ...(needRows ? [explorer] : []),
    ...(total > 0 ? [changes] : []),
    ...(makers.length ? [makerList] : []),
    ...(needTests ? [testList] : []),
  ];
  const failed = loads.find((state) => state.error && !state.data);
  const ready = loads.every((state) => state.data);

  const rows = useMemo(
    () => new Map<string, ExplorerRow>(explorer.data?.models.map((row) => [row[0], row])),
    [explorer.data],
  );
  const events = changes.data?.events ?? [];

  const modelCards: Card[] = models.map((model) => {
    const row = rows.get(model.slug);
    // A model no longer listed keeps the figures it had; only its news can be new.
    const now = row ? figuresOf(row) : model.seen;
    const moves = figureChanges(model.seen, now);
    const move = (kind: string) => moves.find((change) => change.kind === kind);
    const priceMove = move('price');
    const indexMove = move('index');
    const hostsMove = move('hosts');
    const news = newsSince(events, model.since, (event) => aboutModel(event, model.slug));
    return {
      kind: 'models',
      slug: model.slug,
      name: row?.[1] ?? model.name,
      href: row ? `/models/${model.slug}` : undefined,
      subtitle: row ? row[3] || 'Maker not reported' : 'No longer in the catalog',
      mark: (
        <img
          src={makerLogo(row?.[2] ?? model.makerId)}
          alt=""
          width="40"
          height="40"
          loading="lazy"
        />
      ),
      tiles: [
        {
          label: 'Blended price per 1M',
          value: now.price === null ? 'Not listed' : price(now.price),
          change: priceMove && moved(priceMove.from, priceMove.to, price, 'Newly listed'),
        },
        {
          label: 'Capability index',
          value: now.index === null ? 'Not scored' : indexValue(now.index),
          change: indexMove && moved(indexMove.from, indexMove.to, indexValue, 'Newly scored'),
        },
        {
          label: 'Hosts',
          value: whole(now.hosts),
          change: hostsMove && moved(hostsMove.from, hostsMove.to, whole, 'Newly hosted'),
        },
      ],
      gone: row
        ? undefined
        : 'This model is no longer listed, so its figures cannot be compared. Its maker may have renamed or retired it.',
      added: [],
      news,
      changed: moves.length > 0 || news.length > 0,
      now,
    };
  });

  const makerMap = new Map(makerList.data?.makers.map((maker) => [maker.slug, maker]));
  const makerCards: Card[] = makers.map((maker) => {
    const summary = makerMap.get(maker.slug);
    const now = summary
      ? makerFiguresOf(summary, lineupOf(explorer.data?.models ?? [], summary.id))
      : maker.seen;
    const moves = summary ? makerChanges(maker.seen, now) : [];
    const move = (kind: string) => moves.find((change) => change.kind === kind);
    const modelsMove = move('models');
    const indexMove = move('index');
    const leadsMove = move('leads');
    const added = (summary ? newModels(maker.seen, now) : [])
      .map((slug) => rows.get(slug))
      .filter((row): row is ExplorerRow => row !== undefined)
      .sort((a, b) => b[4].localeCompare(a[4]) || a[1].localeCompare(b[1]));
    const listed = new Set(added.map((row) => row[0]));
    // A new model's release is already in its list, with a way to follow it.
    const news = newsSince(
      events,
      maker.since,
      (event) =>
        aboutMaker(event, summary?.id ?? maker.makerId) &&
        !(event.kind === 'release' && event.model.slug && listed.has(event.model.slug)),
    );
    return {
      kind: 'makers',
      slug: maker.slug,
      name: summary?.name ?? maker.name,
      href: summary ? `/makers/${maker.slug}` : undefined,
      subtitle: summary ? 'AI model maker' : 'No longer has a page',
      mark: (
        <img
          src={makerLogo(summary?.id ?? maker.makerId)}
          alt=""
          width="40"
          height="40"
          loading="lazy"
        />
      ),
      tiles: [
        {
          label: 'Models',
          value: whole(now.models),
          change: modelsMove && moved(modelsMove.from, modelsMove.to, whole, ''),
        },
        {
          label: 'Best on the capability index',
          value: now.index === null ? 'Not yet' : indexValue(now.index),
          change:
            indexMove && moved(indexMove.from, indexMove.to, indexValue, 'Newly on the index'),
        },
        {
          label: 'Top score on',
          value: plural(now.leads, 'test', 'tests'),
          change: leadsMove && moved(leadsMove.from, leadsMove.to, whole, ''),
        },
      ],
      gone: summary
        ? undefined
        : 'This maker no longer has a page on Artificials, so its figures cannot be compared. It may list too few models now.',
      added,
      news,
      changed: moves.length > 0 || added.length > 0 || news.length > 0,
      now,
    };
  });

  const testMap = new Map(testList.data?.tests.map((test) => [test.id, test]));
  const testCards: Card[] = tests.map((test) => {
    const summary = testMap.get(test.slug);
    const now = summary ? testFiguresOf(summary) : test.seen;
    const moves = summary ? testChanges(test.seen, now) : [];
    const leaderMove = moves.find((change) => change.kind === 'leader');
    const scoreMove = moves.find((change) => change.kind === 'score');
    const modelsMove = moves.find((change) => change.kind === 'models');
    const value = (number: number) => score(number, summary?.unit ?? 'percent');
    const domain = DOMAINS[summary?.domain ?? 'overall'];
    const news = newsSince(events, test.since, (event) => aboutTest(event, test.slug));
    return {
      kind: 'tests',
      slug: test.slug,
      name: summary?.label ?? test.name,
      href: summary ? `/tests/${test.slug}` : undefined,
      subtitle: summary
        ? `${domain.label}, published by ${summary.source}`
        : 'No longer published on Artificials',
      mark: (
        <span className={`domain-key domain-${domain.token}`} aria-hidden="true">
          <domain.icon size={18} strokeWidth={2} />
        </span>
      ),
      tiles: [
        {
          label: 'Top model',
          value: now.leaderName ?? 'None yet',
          change: leaderMove && {
            text: typeof leaderMove.from === 'string' ? `Was ${leaderMove.from}` : 'New at the top',
          },
        },
        {
          label: 'Top score',
          value: now.score === null ? 'Not reported' : value(now.score),
          change:
            scoreMove &&
            moved(
              scoreMove.from as number | null,
              scoreMove.to as number | null,
              value,
              'Newly scored',
            ),
        },
        {
          label: 'Models tested',
          value: whole(now.models),
          change:
            modelsMove && moved(modelsMove.from as number, modelsMove.to as number, whole, ''),
        },
      ],
      gone: summary
        ? undefined
        : 'This test is no longer published on Artificials, so its figures cannot be compared.',
      added: [],
      news,
      changed: moves.length > 0 || news.length > 0,
      now,
    };
  });

  const cards: Record<Kind, Card[]> = {
    models: modelCards,
    makers: makerCards,
    tests: testCards,
  };
  const all = [...modelCards, ...makerCards, ...testCards];
  const changed = all.filter((card) => card.changed);

  /** Each card's figures as they are now, by kind, to take as seen. */
  const nowOf = <K extends Kind>(list: Card[], kind: K) =>
    Object.fromEntries(
      list.flatMap((card) => (card.kind === kind ? [[card.slug, card.now] as const] : [])),
    ) as Record<string, Followed<K>['seen']>;
  const seen = (list: Card[]) =>
    markSeen({
      models: nowOf(list, 'models'),
      makers: nowOf(list, 'makers'),
      tests: nowOf(list, 'tests'),
    });
  const stop = (card: Card) => {
    const index = all.indexOf(card);
    const next = all[index + 1] ?? all[index - 1];
    unfollow(card.kind, card.slug);
    focusLater(next ? headingId(next) : 'following-empty');
  };

  // Credits for what the page shows: catalog data, the capability index, and
  // the publisher of every test whose results it shows, each with its licence.
  const followsIndex = tests.some((test) => test.slug === 'capability-index');
  const shown = all.flatMap((card) => card.news);
  const indexShown =
    needRows ||
    followsIndex ||
    shown.some(
      (event) =>
        event.kind === 'index' || (event.kind === 'leader' && event.test === 'capability-index'),
    );
  const tested = new Set<string>([
    ...tests.map((test) => test.slug),
    ...(makers.length ? (testList.data?.tests.map((test) => test.id) ?? []) : []),
    ...shown.flatMap((event) => (event.kind === 'leader' ? [event.test] : [])),
  ]);
  tested.delete('capability-index');
  const sourceIds = new Set(
    [...tested].flatMap((id) => {
      const sourceId = testMap.get(id)?.sourceId;
      return sourceId ? [sourceId] : [];
    }),
  );
  const credits = (testList.data?.sources ?? []).filter((source) => sourceIds.has(source.id));

  return (
    <div className="container page profile-page following-page">
      <PageHeading
        eyebrow="FOLLOWING"
        title="What you follow."
        text="Models, makers and tests you follow, with what changed for each since you last looked. The list stays in this browser, with no account."
      />
      {!total ? (
        <div className="following-empty">
          <span className="following-empty-icon" aria-hidden="true">
            <Star size={22} />
          </span>
          <h2 id="following-empty" tabIndex={-1}>
            You don’t follow anything yet.
          </h2>
          <p>
            Choose Follow on the page of a <Link to="/models">model</Link>, a{' '}
            <Link to="/makers">maker</Link> or a <Link to="/tests">test</Link>, and this page shows
            what changed for it since you last looked.
          </p>
          <Link className="btn" to="/models">
            Browse models
          </Link>
        </div>
      ) : failed ? (
        <div className="dash-state" role="alert">
          <p>{failed.error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : !ready ? (
        <div className="dash-state dash-pending is-tall" role="status">
          Loading what you follow…
        </div>
      ) : (
        <>
          <div className="following-toolbar">
            <p id="following-summary" tabIndex={-1} aria-live="polite">
              {changed.length
                ? `${whole(changed.length)} of ${whole(total)} changed since you last looked.`
                : 'Nothing changed since you last looked.'}
            </p>
            {changed.length > 0 && (
              <button
                type="button"
                className="btn btn-small"
                onClick={() => {
                  seen(changed);
                  focusLater('following-summary');
                }}
              >
                <CheckCheck size={15} aria-hidden="true" />
                Mark all as seen
              </button>
            )}
          </div>
          {SECTIONS.map(([kind, title]) =>
            cards[kind].length ? (
              <section
                key={kind}
                className="following-section"
                aria-labelledby={`following-${kind}`}
              >
                <h2 id={`following-${kind}`}>
                  {title} <span className="following-section-count">{cards[kind].length}</span>
                </h2>
                <ul className="following-list">
                  {cards[kind].map((card) => (
                    <li key={card.slug}>
                      <FollowCard
                        card={card}
                        open={expanded.has(headingId(card))}
                        onToggle={() => toggle(headingId(card))}
                        onSeen={() => {
                          seen([card]);
                          focusLater(headingId(card));
                        }}
                        onUnfollow={() => stop(card)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
          <p className="data-footnote">
            {needRows && (
              <>
                Listed prices, hosts and model lineups from{' '}
                <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
                  models.dev
                </a>{' '}
                (MIT).{' '}
              </>
            )}
            {indexShown && (
              <>
                Capability index from{' '}
                <a href="https://epoch.ai/benchmarks" target="_blank" rel="noopener noreferrer">
                  Epoch AI
                </a>{' '}
                (CC BY 4.0).{' '}
              </>
            )}
            {credits.length > 0 && (
              <>
                Test results from{' '}
                {credits.map((source, position) => (
                  <span key={source.id}>
                    {position === 0 ? '' : position === credits.length - 1 ? ' and ' : ', '}
                    <Credit source={source} />
                  </span>
                ))}
                .{' '}
              </>
            )}
            {models.length > 0 &&
              'A price is blended as three input tokens for every output token, from the maker’s own paid listing or else the middle paid listing across hosts. '}
            News comes from <Link to="/changes">What changed</Link>, which keeps the last 30 days.
            Each model’s, maker’s and test’s page also links to an RSS feed of its changes. What you
            follow is saved in this browser only and never sent to Artificials; clearing site data
            removes it.
          </p>
        </>
      )}
    </div>
  );
}
