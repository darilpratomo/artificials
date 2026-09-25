import { useMemo, useState } from 'react';
import { makerColor, makerLogo } from '../../../shared/makers';
import type { Board, BoardEntry } from '../../lib/overview';
import { ShareButton } from '../charts/ShareButton';
import { whole } from '../profile/format';
import './arena.css';

export const time = (date: string) => new Date(`${date}T00:00:00Z`).getTime();
/** "A, B and C". */
export const list = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/** The overall ranking of a board, best first. */
export const overallOf = (board: Board) =>
  board.categories.find((category) => category.id === 'overall')?.entries ?? [];

/** A model's name with its maker's logo, inside a sentence. */
export function ModelName({ board, entry }: { board: Board; entry: BoardEntry }) {
  const model = board.models[entry.model];
  return (
    <span className="glance-model">
      <img src={makerLogo(model.makerId)} alt="" width="22" height="22" loading="lazy" />
      <b>{model.name}</b>
    </span>
  );
}

/** One line of a score list: a model, or a maker's best model. */
export interface ScoreRow {
  key: string;
  /** Arena's rank, when the row is a place on the board. */
  rank?: number;
  name: string;
  detail: string;
  makerId: string;
  rating: number;
  lower: number;
  upper: number;
  isNew?: boolean;
  open?: boolean;
}

/**
 * An axis of four equal, round steps that holds every range with a little
 * room at both ends, so the tick labels sit exactly where they read.
 */
export function scoreScale(rows: { lower: number; upper: number }[]) {
  const low = Math.min(...rows.map((row) => row.lower));
  const high = Math.max(...rows.map((row) => row.upper));
  let floor = 0;
  let step = 1;
  for (step of [10, 20, 25, 50, 100, 150, 200, 250, 500, 1000]) {
    floor = Math.floor((low - step * 0.15) / step) * step;
    if (floor + 4 * step >= high + step * 0.15) break;
  }
  const ceil = floor + 4 * step;
  return {
    floor,
    ceil,
    ticks: [0, 1, 2, 3, 4].map((index) => floor + index * step),
    x: (value: number) => ((value - floor) / (ceil - floor)) * 100,
  };
}

/**
 * Scores as dots with their 95% range. Arena scores have no zero, so a bar
 * from zero would hide the differences; a dot on a shared axis shows them.
 */
export function ScoreRows({
  rows,
  scale,
  label,
}: {
  rows: ScoreRow[];
  scale: ReturnType<typeof scoreScale>;
  /** Accessible name for the list. */
  label: string;
}) {
  return (
    <>
      <div className="score-axis" aria-hidden="true">
        <span className="score-axis-ticks">
          {scale.ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </span>
      </div>
      <ol className="score-rows" aria-label={label}>
        {rows.map((row) => (
          <li key={row.key}>
            <span className="score-rows-rank">
              {row.rank !== undefined && (
                <>
                  <span className="sr-only">Rank </span>
                  {row.rank}
                </>
              )}
            </span>
            <span className="score-rows-name">
              <img src={makerLogo(row.makerId)} alt="" width="22" height="22" loading="lazy" />
              <span>
                <b>{row.name}</b>
                <small>
                  {row.detail}
                  {row.open && <em className="score-tag">Open weights</em>}
                  {row.isNew && <em className="score-tag is-new">New</em>}
                </small>
              </span>
            </span>
            <span className="score-rows-track" aria-hidden="true">
              <s
                style={{
                  left: `${scale.x(row.lower)}%`,
                  width: `${scale.x(row.upper) - scale.x(row.lower)}%`,
                  background: makerColor(row.makerId),
                }}
              />
              <i style={{ left: `${scale.x(row.rating)}%`, background: makerColor(row.makerId) }} />
            </span>
            <span className="score-rows-score">
              <span className="sr-only">Arena score </span>
              <b>{Math.round(row.rating)}</b>
              <small>
                <span className="sr-only">95% range </span>
                {Math.round(row.lower)} to {Math.round(row.upper)}
              </small>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

type Access = 'all' | 'open' | 'proprietary';
const ACCESS: [Access, string][] = [
  ['all', 'All models'],
  ['open', 'Open weights'],
  ['proprietary', 'Proprietary'],
];
const SHOWN = 20;

/** One of Arena's boards, with its categories and an open-weights filter. */
export function ArenaBoard({
  board,
  text,
  vote,
  credit,
}: {
  board: Board;
  /** What the board ranks, for the panel's description. */
  text: string;
  /** What people compare, for the downloadable image: "Blind votes between two images …". */
  vote: string;
  credit: string;
}) {
  const [category, setCategory] = useState(board.categories[0]?.id ?? 'overall');
  const [access, setAccess] = useState<Access>('all');
  const [expanded, setExpanded] = useState(false);
  const current = board.categories.find((entry) => entry.id === category) ?? board.categories[0];
  if (!current) return null;
  const rows: ScoreRow[] = current.entries.flatMap((entry) => {
    const model = board.models[entry.model];
    if (access !== 'all' && (access === 'open') !== model.open) return [];
    return [
      {
        key: model.arenaName,
        rank: entry.rank,
        name: model.name,
        detail: `${model.maker}, ${whole(entry.votes)} votes`,
        makerId: model.makerId,
        rating: entry.rating,
        lower: entry.lower,
        upper: entry.upper,
        isNew: model.isNew,
        open: model.open,
      },
    ];
  });
  const shown = expanded ? rows : rows.slice(0, SHOWN);
  // The axis fits the rows on screen, so even close scores stay apart.
  const scale = scoreScale(shown.length ? shown : current.entries);
  const heading = `${board.label}: ${current.label.toLowerCase()}`;
  const title = `${heading}${access === 'all' ? '' : `, ${ACCESS.find(([id]) => id === access)![1].toLowerCase()}`}`;
  return (
    <div className="dash-panel arena-panel">
      <div className="dash-panel-head">
        <div>
          <h3>{heading}</h3>
          <p>{text}</p>
        </div>
        {rows.length > 0 && (
          <ShareButton
            title={`${title}, Arena scores`}
            render={(tools) =>
              tools.listImage(
                {
                  title: `${title}: Arena scores`,
                  subtitle: `${vote} Higher is better.`,
                  source: credit,
                },
                rows.slice(0, 30).map((row, _, top) => ({
                  label: row.name,
                  detail: row.detail,
                  value: `${Math.round(row.rating)}`,
                  // The image shows up to 30 rows, on an axis of its own.
                  fraction: scoreScale(top).x(row.rating) / 100,
                  makerId: row.makerId,
                })),
              )
            }
          />
        )}
      </div>
      <div className="arena-controls">
        {board.categories.length > 1 && (
          <div className="dash-tabs" role="group" aria-label="Category">
            {board.categories.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={entry.id === current.id}
                onClick={() => {
                  setCategory(entry.id);
                  setExpanded(false);
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}
        <div className="dash-tabs" role="group" aria-label="Weights">
          {ACCESS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={access === id}
              onClick={() => {
                setAccess(id);
                setExpanded(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {rows.length ? (
        <ScoreRows rows={shown} scale={scale} label={`${title}, highest first`} />
      ) : (
        <div className="dash-state">
          <p>No models match. Show all models instead.</p>
        </div>
      )}
      <div className="dash-foot">
        <p>
          Dots mark each model’s Arena score; the line is its 95% range. Where two ranges overlap,
          the order between those models is not settled. {credit}.
        </p>
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

/** Each maker's best model on a board's overall ranking. */
export function MakerBests({
  board,
  title,
  credit,
}: {
  board: Board;
  title: string;
  credit: string;
}) {
  const rows = useMemo(() => {
    const overall = board.categories.find((category) => category.id === 'overall')?.entries ?? [];
    const seen = new Set<string>();
    const out: ScoreRow[] = [];
    for (const entry of overall) {
      const model = board.models[entry.model];
      if (model.makerId === 'unknown' || seen.has(model.makerId)) continue;
      seen.add(model.makerId);
      out.push({
        key: model.makerId,
        name: model.maker,
        detail: model.name,
        makerId: model.makerId,
        rating: entry.rating,
        lower: entry.lower,
        upper: entry.upper,
      });
    }
    return out.slice(0, 12);
  }, [board]);
  if (!rows.length) return null;
  return (
    <div className="dash-panel arena-panel">
      <div className="dash-panel-head">
        <div>
          <h3>{title}</h3>
          <p>The highest-scoring model from each of the {rows.length} leading makers.</p>
        </div>
      </div>
      <ScoreRows rows={rows} scale={scoreScale(rows)} label={`${title}, highest first`} />
      <div className="dash-foot">
        <p>Dots mark the Arena score; the line is its 95% range. {credit}.</p>
      </div>
    </div>
  );
}
