import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { COST_FLAGS, type CostRow, type Costs } from '../../shared/costs';
import { makerLogo } from '../../shared/makers';
import { PageHeading } from '../components/Layout';
import { ScatterChart, type ScatterPoint } from '../components/charts/ScatterChart';
import { approxWords, cost, indexValue, price, whole } from '../components/profile/format';
import { useCosts } from '../lib/overview';
import { LIMIT, PRESETS, clampInteger, presetOf } from '../lib/workload';
import '../domain-colors.css';
import './model-profile.css';
import '../components/home/dashboard.css';
import './data-table.css';
import './cost.css';

/** How many models the table shows before "Show all". */
const FIRST_ROWS = 25;
const DAYS = 30;
const MAX_PER_DAY = 1_000_000;
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** What a workload costs on every priced model, next to its capability index. */
export default function Cost({ initial }: { initial?: Costs }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useCosts(attempt, initial);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const read = (key: string, fallback: number, maximum = LIMIT) => {
    const value = params.get(key);
    return value === null ? fallback : clampInteger(value, maximum);
  };
  // The workload lives in the address, so a calculation can be shared as a link.
  const input = read('in', 1500);
  const output = read('out', 500);
  const perDay = read('day', 100, MAX_PER_DAY);
  const cached = read('cache', 0, 90);
  const everyModel = params.get('models') === 'all';
  const byIndex = params.get('sort') === 'index';
  const preset = presetOf(input, output);
  const update = (changes: Record<string, string | null>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes))
          if (value === null) next.delete(key);
          else next.set(key, value);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  /** One request at a model's prices, with the cached share of input at its cached price. */
  const perRequest = (row: CostRow) =>
    (input * (1 - cached / 100) * row[4] +
      input * (cached / 100) * (row[6] ?? row[4]) +
      output * row[5]) /
    1_000_000;
  const monthly = (row: CostRow) => perRequest(row) * perDay * DAYS;

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (data?.rows ?? [])
      .filter((row) => everyModel || row[7] !== null)
      .filter((row) => !text || `${row[1]} ${row[3]}`.toLowerCase().includes(text))
      .sort((a, b) =>
        byIndex
          ? (b[7] ?? -Infinity) - (a[7] ?? -Infinity) || monthly(a) - monthly(b)
          : monthly(a) - monthly(b) || (b[7] ?? -Infinity) - (a[7] ?? -Infinity),
      );
    // monthly depends on the workload, which the address holds.
  }, [data, query, everyModel, byIndex, input, output, perDay, cached]);

  const working = (input > 0 || output > 0) && perDay > 0;
  const indexed = rows.filter((row) => row[7] !== null);
  const cheapest = [...rows].sort((a, b) => monthly(a) - monthly(b))[0];
  const top = [...indexed].sort((a, b) => b[7]! - a[7]!)[0];
  const topTen = [...indexed].sort((a, b) => b[7]! - a[7]!).slice(0, 10);
  const value = [...topTen].sort((a, b) => monthly(a) - monthly(b))[0];
  const rank = (row: CostRow) => topTen.indexOf(row) + 1;
  const shown = all ? rows : rows.slice(0, FIRST_ROWS);

  const points: ScatterPoint[] = working
    ? indexed.map((row) => ({
        key: row[0],
        name: row[1],
        makerId: row[2],
        maker: row[3],
        x: monthly(row),
        y: row[7]!,
        href: `/models/${row[0]}`,
        details: [
          `${cost(monthly(row))} a month`,
          `${price(row[4])} in, ${price(row[5])} out per 1M tokens`,
        ],
      }))
    : [];

  return (
    <div className="container page profile-page cost-page">
      <PageHeading
        eyebrow="COST CALCULATOR"
        title="What your workload costs on each model."
        text="Describe a typical request and how many you send. Every model’s monthly cost at its listed price, next to its capability index."
      />
      <section className="profile-card" aria-labelledby="workload-heading">
        <div className="profile-card-head">
          <h2 id="workload-heading">Your workload</h2>
          <p>Pick a typical request or enter your own numbers. The link keeps them, to share.</p>
        </div>
        <div className="calc-presets" role="group" aria-label="Typical requests">
          {PRESETS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={preset === entry.id}
              onClick={() =>
                entry.id !== 'custom' &&
                update({ in: String(entry.input), out: String(entry.output) })
              }
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="calc-fields cost-fields">
          <label>
            <span>Tokens sent</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={LIMIT}
              value={input}
              onChange={(event) => update({ in: String(clampInteger(event.target.value)) })}
            />
            <small>about {approxWords(input)} words per request</small>
          </label>
          <label>
            <span>Tokens written</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={LIMIT}
              value={output}
              onChange={(event) => update({ out: String(clampInteger(event.target.value)) })}
            />
            <small>about {approxWords(output)} words per request</small>
          </label>
          <label>
            <span>Requests per day</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_PER_DAY}
              value={perDay}
              onChange={(event) =>
                update({ day: String(clampInteger(event.target.value, MAX_PER_DAY)) })
              }
            />
            <small>{whole(perDay * DAYS)} a month</small>
          </label>
          <label>
            <span>Input from cache</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={90}
              step={10}
              value={cached}
              onChange={(event) => update({ cache: String(clampInteger(event.target.value, 90)) })}
            />
            <small>percent of tokens sent, such as a repeated system prompt</small>
          </label>
        </div>
      </section>

      {error && !data ? (
        <div className="dash-state" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((count) => count + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="dash-state dash-pending is-tall" role="status">
          Loading prices…
        </div>
      ) : (
        <>
          {!working && (
            <p className="cost-note" role="status">
              Enter some tokens and at least one request a day to compare costs.
            </p>
          )}
          {working && (
            <section className="cost-glance" aria-label="Costs at a glance" aria-live="polite">
              {cheapest && (
                <div className="glance-tile">
                  <span>Cheapest</span>
                  <strong>{cost(monthly(cheapest))}</strong>
                  <small>
                    a month on <Link to={`/models/${cheapest[0]}`}>{cheapest[1]}</Link>
                  </small>
                </div>
              )}
              {top && (
                <div className="glance-tile">
                  <span>Highest on the capability index</span>
                  <strong>{cost(monthly(top))}</strong>
                  <small>
                    a month on <Link to={`/models/${top[0]}`}>{top[1]}</Link>, at{' '}
                    {indexValue(top[7]!)}
                  </small>
                </div>
              )}
              {value && (
                <div className="glance-tile">
                  <span>Cheapest of the top 10</span>
                  <strong>{cost(monthly(value))}</strong>
                  <small>
                    a month on <Link to={`/models/${value[0]}`}>{value[1]}</Link>, #{rank(value)} on
                    the index
                  </small>
                </div>
              )}
            </section>
          )}

          {points.length > 1 && (
            <section className="profile-card" aria-labelledby="chart-heading">
              <div className="profile-card-head">
                <h2 id="chart-heading">Monthly cost and capability</h2>
                <p>
                  Each model on the capability index, at its monthly cost for your workload. Up and
                  to the left does more for less; the line marks the highest index at each cost.
                </p>
              </div>
              <ScatterChart
                points={points}
                x={{
                  kind: 'log',
                  label: 'Cost per month (USD, log scale)',
                  format: (amount) => usd.format(amount),
                }}
                y={{ label: 'Capability index', format: (score) => score.toFixed(0) }}
                frontier={{ kind: 'cheapest', label: 'Highest index at each cost' }}
                label="Capability index against monthly cost for your workload"
              />
            </section>
          )}

          <section className="profile-card" aria-labelledby="table-heading">
            <div className="profile-card-head cost-table-head">
              <div>
                <h2 id="table-heading">Every model</h2>
                <p>
                  {whole(rows.length)} {rows.length === 1 ? 'model' : 'models'},{' '}
                  {byIndex ? 'highest on the capability index first' : 'cheapest first'}.
                </p>
              </div>
              <label className="benchmark-search cost-search">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Find a model or maker"
                  placeholder="Find a model or maker…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
            <div className="cost-controls">
              <div className="dash-tabs" role="group" aria-label="Which models">
                <button
                  type="button"
                  aria-pressed={!everyModel}
                  onClick={() => update({ models: null })}
                >
                  On the capability index
                </button>
                <button
                  type="button"
                  aria-pressed={everyModel}
                  onClick={() => update({ models: 'all' })}
                >
                  Every priced model
                </button>
              </div>
              <div className="dash-tabs" role="group" aria-label="Order">
                <button
                  type="button"
                  aria-pressed={!byIndex}
                  onClick={() => update({ sort: null })}
                >
                  Cheapest first
                </button>
                <button
                  type="button"
                  aria-pressed={byIndex}
                  onClick={() => update({ sort: 'index' })}
                >
                  Most capable first
                </button>
              </div>
            </div>
            {rows.length ? (
              <table className="data-table cost-table">
                <thead>
                  <tr>
                    <th scope="col">Model</th>
                    <th scope="col">Capability index</th>
                    <th scope="col">Price per 1M, in / out</th>
                    <th scope="col">Per request</th>
                    <th scope="col">Per month</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <tr key={row[0]}>
                      <th scope="row">
                        <span className="cost-model">
                          <img
                            src={makerLogo(row[2])}
                            alt=""
                            width="28"
                            height="28"
                            loading="lazy"
                          />
                          <span>
                            <Link to={`/models/${row[0]}`}>{row[1]}</Link>
                            <small>
                              {row[3]}
                              {row[9] & COST_FLAGS.openWeights ? ', open weights' : ''}
                            </small>
                          </span>
                        </span>
                      </th>
                      <td data-label="Capability index">
                        {row[7] !== null ? (
                          indexValue(row[7])
                        ) : (
                          <>
                            <span className="cost-none" aria-hidden="true">
                              —
                            </span>
                            <span className="sr-only">Not on the index</span>
                          </>
                        )}
                      </td>
                      <td data-label="Price per 1M">
                        {price(row[4])} / {price(row[5])}
                      </td>
                      <td data-label="Per request">{cost(perRequest(row))}</td>
                      <td data-label="Per month">
                        <b>{cost(monthly(row))}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="cost-note">No model matches “{query.trim()}”.</p>
            )}
            {rows.length > FIRST_ROWS && (
              <button
                type="button"
                className="btn btn-small btn-outline cost-more"
                aria-expanded={all}
                onClick={() => setAll((open) => !open)}
              >
                {all ? `Show the first ${FIRST_ROWS}` : `Show all ${whole(rows.length)} models`}
              </button>
            )}
          </section>

          <p className="data-footnote">
            Calculated by Artificials. Each model is at its listed price per 1M tokens: the maker’s
            own paid listing, or else the middle paid listing across hosts, from{' '}
            <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
              models.dev
            </a>{' '}
            (MIT). Capability index from{' '}
            <a href="https://epoch.ai/benchmarks" target="_blank" rel="noopener noreferrer">
              Epoch AI
            </a>{' '}
            (CC BY 4.0). A month is {DAYS} days. Cached input is charged at a model’s cached price
            where it lists one, and at its full price where it does not. Batch discounts, free
            tiers, taxes and minimum fees are not included, and a model that thinks before it
            answers can write more tokens than you set.
          </p>
        </>
      )}
    </div>
  );
}
