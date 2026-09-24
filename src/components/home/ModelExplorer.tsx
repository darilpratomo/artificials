import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { makerLogo } from '../../../shared/makers';
import { Select } from '../Select';
import { FLAGS, useExplorer, type ExplorerRow } from '../../lib/overview';
import { day, price, tokens } from '../profile/format';

type Sort = 'newest' | 'index' | 'price' | 'context' | 'hosts' | 'name';
const SORTS: [Sort, string][] = [
  ['hosts', 'Most hosts'],
  ['newest', 'Newest first'],
  ['index', 'Highest capability index'],
  ['price', 'Lowest price'],
  ['context', 'Largest context window'],
  ['name', 'Name, A to Z'],
];
const FILTERS: [number, string][] = [
  [FLAGS.tested, 'Tested'],
  [FLAGS.openWeights, 'Open weights'],
  [FLAGS.reasoning, 'Reasoning'],
  [FLAGS.imageOutput, 'Makes images'],
  [FLAGS.imageInput, 'Reads images'],
];
const PAGE = 25;

/** Nulls last, whatever the direction. */
function by<T>(value: (row: ExplorerRow) => T | null, compare: (a: T, b: T) => number) {
  return (a: ExplorerRow, b: ExplorerRow) => {
    const left = value(a);
    const right = value(b);
    if (left === null || left === '') return right === null || right === '' ? 0 : 1;
    if (right === null || right === '') return -1;
    return compare(left, right);
  };
}
const SORTERS: Record<Sort, (a: ExplorerRow, b: ExplorerRow) => number> = {
  newest: by(
    (row) => row[4],
    (a, b) => b.localeCompare(a),
  ),
  index: by(
    (row) => row[8],
    (a, b) => b - a,
  ),
  price: by(
    (row) => row[6],
    (a, b) => a - b,
  ),
  context: by(
    (row) => row[5],
    (a, b) => b - a,
  ),
  hosts: by(
    (row) => row[7],
    (a, b) => b - a,
  ),
  name: by(
    (row) => row[1],
    (a, b) => a.localeCompare(b),
  ),
};

/**
 * Every model in the catalog, searchable and sortable. The list file loads
 * only when this section comes near the screen.
 */
export function ModelExplorer({ total }: { total: number }) {
  const section = useRef<HTMLDivElement>(null);
  const [wanted, setWanted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useExplorer(wanted, attempt);
  const [query, setQuery] = useState('');
  const [maker, setMaker] = useState('all');
  const [sort, setSort] = useState<Sort>('hosts');
  const [flags, setFlags] = useState(0);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    const element = section.current;
    if (!element || wanted) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setWanted(true);
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [wanted]);

  const makers = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const row of data?.models ?? []) {
      if (!row[3]) continue;
      const entry = counts.get(row[3]) ?? { name: row[3], count: 0 };
      entry.count += 1;
      counts.set(row[3], entry);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [data]);

  const rows = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (data?.models ?? [])
      .filter(
        (row) =>
          (maker === 'all' || row[3] === maker) &&
          (row[9] & flags) === flags &&
          words.every((word) => `${row[1]} ${row[3]} ${row[0]}`.toLowerCase().includes(word)),
      )
      .sort((a, b) => SORTERS[sort](a, b) || a[1].localeCompare(b[1]));
  }, [data, query, maker, sort, flags]);

  const reset = () => setShown(PAGE);
  return (
    <div className="explorer" ref={section} onFocus={() => setWanted(true)}>
      <div className="explorer-controls">
        <label className="explorer-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search every model"
            placeholder={`Search ${total.toLocaleString('en-US')} models or makers`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              reset();
            }}
          />
        </label>
        <Select
          value={maker}
          onValueChange={(value) => {
            setMaker(value);
            reset();
          }}
          aria-label="Filter by maker"
        >
          <option value="all">All makers</option>
          {makers.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {`${entry.name} (${entry.count})`}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value as Sort);
            reset();
          }}
          aria-label="Sort models"
        >
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="explorer-filters" role="group" aria-label="Show only">
        {FILTERS.map(([flag, label]) => (
          <button
            key={flag}
            type="button"
            aria-pressed={(flags & flag) === flag}
            onClick={() => {
              setFlags((value) => value ^ flag);
              reset();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <div className="dash-state" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="dash-state explorer-loading" role="status">
          Loading the model list…
        </div>
      ) : (
        <>
          <p className="explorer-count" role="status">
            {rows.length === data.models.length
              ? `${rows.length.toLocaleString('en-US')} models`
              : `${rows.length.toLocaleString('en-US')} of ${data.models.length.toLocaleString('en-US')} models match`}
          </p>
          <div className="explorer-table" role="table" aria-label="Models">
            <div className="explorer-row explorer-head" role="row">
              <span role="columnheader">Model</span>
              <span role="columnheader">Released</span>
              <span role="columnheader">Context</span>
              <span role="columnheader">Price per 1M tokens</span>
              <span role="columnheader">Index</span>
              <span role="columnheader">Hosts</span>
            </div>
            {rows.slice(0, shown).map((row) => (
              <div className="explorer-row" role="row" key={row[0]}>
                <span role="cell" className="explorer-model">
                  <img src={makerLogo(row[2])} alt="" width="32" height="32" loading="lazy" />
                  <span>
                    <Link to={`/models/${row[0]}`}>{row[1]}</Link>
                    <small>{row[3] || 'Maker not reported'}</small>
                  </span>
                </span>
                <span role="cell" data-label="Released">
                  {row[4] ? day(row[4]) : '—'}
                </span>
                <span role="cell" data-label="Context">
                  {row[5] ? tokens(row[5]) : '—'}
                </span>
                <span role="cell" data-label="Price per 1M">
                  {row[6] !== null ? price(row[6]) : '—'}
                </span>
                <span role="cell" data-label="Index">
                  {row[8] !== null ? row[8].toFixed(1) : '—'}
                </span>
                <span role="cell" data-label="Hosts">
                  {row[7]}
                </span>
              </div>
            ))}
            {!rows.length && (
              <p className="explorer-empty">
                No model matches. Try a shorter search or turn off a filter.
              </p>
            )}
          </div>
          <p className="explorer-note">
            Price is the maker’s own list price, or the middle price across hosts, blended as three
            input tokens for every output token. Index is the Epoch Capabilities Index.
          </p>
          {rows.length > shown && (
            <button
              type="button"
              className="btn btn-outline btn-small explorer-more"
              onClick={() => setShown((value) => value + PAGE * 2)}
            >
              Show {Math.min(PAGE * 2, rows.length - shown)} more
            </button>
          )}
        </>
      )}
    </div>
  );
}
