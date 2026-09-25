import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, Table2 } from 'lucide-react';
import { Select } from '../Select';
import { RankChart, type RankItem } from '../charts/RankChart';
import { ShareButton } from '../charts/ShareButton';
import { useTests, type ModelOverview } from '../../lib/overview';
import { DOMAINS, day, indexValue, price } from '../profile/format';
import { PendingIndex } from './PendingIndex';

const INDEX = 'capability-index';
const COUNTS = ['15', '25', '50', 'all'];

/**
 * The ranking chart: the capability index by default, or any single test.
 * Scores from different tests are never mixed in one chart.
 */
export function RankingSection({ overview }: { overview: ModelOverview }) {
  const [metric, setMetric] = useState(INDEX);
  const [count, setCount] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? '15' : '25',
  );
  const [openOnly, setOpenOnly] = useState(false);
  const [table, setTable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { data: tests, error } = useTests(metric !== INDEX, attempt);
  const test = metric === INDEX ? undefined : tests?.tests.find((entry) => entry.id === metric);
  const info = overview.metrics.find((entry) => entry.id === metric);
  const unit = metric === INDEX ? 'index' : (info?.unit ?? 'percent');
  const format = (value: number) =>
    unit === 'index' ? indexValue(value) : `${Number(value.toFixed(1))}%`;

  const all: RankItem[] = useMemo(() => {
    if (metric === INDEX)
      return overview.index
        .filter((point) => !openOnly || point.openWeights)
        .map((point) => ({
          key: point.name,
          name: point.name,
          makerId: point.makerId,
          maker: point.maker,
          value: point.index,
          low: point.ciLow,
          high: point.ciHigh,
          href: point.slug ? `/models/${point.slug}` : undefined,
          details: [
            point.releasedAt ? `Released ${day(point.releasedAt)}` : '',
            point.price ? `${price(point.price.blended)} per 1M tokens, blended` : '',
            point.openWeights ? 'Open weights' : '',
          ].filter(Boolean),
        }));
    return (test?.rows ?? []).map((row) => ({
      key: `${row.name}|${row.configuration}`,
      name: row.name,
      makerId: row.makerId,
      maker: row.maker,
      value: row.score,
      low: row.ciLow,
      high: row.ciHigh,
      href: row.slug ? `/models/${row.slug}` : undefined,
      details: [
        row.name !== row.configuration ? `Tested as ${row.configuration}` : '',
        row.stderr !== undefined ? `Standard error ±${row.stderr.toFixed(1)}` : '',
      ].filter(Boolean),
    }));
  }, [metric, openOnly, overview.index, test]);
  const items = count === 'all' ? all : all.slice(0, Number(count));
  const source = overview.sources.find(
    (entry) => entry.id === (metric === INDEX ? 'epoch' : info?.sourceId),
  );
  const loading = metric !== INDEX && !test && !error;
  const title = metric === INDEX ? 'Epoch Capabilities Index' : (info?.label ?? 'Test results');
  const description =
    metric === INDEX
      ? 'One score built from many tests. Higher is better. The scale has no fixed top, so compare models with each other rather than reading it as a percentage.'
      : test?.description;

  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <div className="dash-controls">
          <Select value={metric} onValueChange={setMetric} aria-label="Choose what to rank by">
            <option value={INDEX}>Overall: capability index</option>
            {overview.metrics.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {`${DOMAINS[entry.domain].label}: ${entry.label}`}
              </option>
            ))}
          </Select>
          <Select value={count} onValueChange={setCount} aria-label="How many models to show">
            {COUNTS.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? `All ${all.length} models` : `Top ${value}`}
              </option>
            ))}
          </Select>
          <button
            type="button"
            className="dash-toggle"
            aria-pressed={table}
            onClick={() => setTable((value) => !value)}
          >
            {table ? (
              <BarChart3 size={16} aria-hidden="true" />
            ) : (
              <Table2 size={16} aria-hidden="true" />
            )}
            {table ? 'Show chart' : 'Show table'}
          </button>
          {items.length > 0 && (
            <ShareButton
              title={`${title}: top ${Math.min(items.length, 30)} models`}
              render={(tools) =>
                tools.rankImage(
                  {
                    title: `${title}: top ${Math.min(items.length, 30)} models`,
                    subtitle:
                      metric === INDEX
                        ? 'One score built from many tests. Higher is better.'
                        : description,
                    source: source ? `${source.name} (${source.license})` : 'published results',
                  },
                  items.map((item) => ({
                    name: item.name,
                    makerId: item.makerId,
                    value: item.value,
                  })),
                  unit,
                  format,
                )
              }
            />
          )}
        </div>
      </div>
      {metric === INDEX && (
        <label className="dash-check">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(event) => setOpenOnly(event.target.checked)}
          />
          Open-weights models only
        </label>
      )}
      {error ? (
        <div className="dash-state" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="dash-state" role="status">
          Loading results…
        </div>
      ) : table ? (
        <div className="chart-table-wrap">
          <table className="chart-table">
            <caption className="sr-only">{`${title}: ${items.length} models`}</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Model</th>
                <th scope="col">Maker</th>
                <th scope="col">{unit === 'index' ? 'Index' : 'Score'}</th>
                <th scope="col">{unit === 'index' ? 'Published range' : 'Details'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.key}>
                  <td>{index + 1}</td>
                  <th scope="row">
                    {item.href ? <Link to={item.href}>{item.name}</Link> : item.name}
                  </th>
                  <td>{item.maker || 'Not reported'}</td>
                  <td>{format(item.value)}</td>
                  <td>
                    {item.low !== undefined && item.high !== undefined
                      ? `${format(item.low)}–${format(item.high)}`
                      : item.details?.join('. ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <RankChart
          items={items}
          unit={unit}
          format={format}
          label={`${title}, ${items.length} models, highest first`}
          baseline={
            test?.randomBaseline
              ? { value: test.randomBaseline, label: `Random guessing ${test.randomBaseline}%` }
              : undefined
          }
        />
      )}
      {metric === INDEX && <PendingIndex overview={overview} />}
      <div className="dash-foot">
        <p>
          {unit === 'index'
            ? 'The index has no zero point, so the axis starts near the lowest score shown. Gaps of a few points sit within its published range. '
            : 'Only models this test covered appear. Each model shows its best tested configuration. '}
          {source && (
            <>
              Results published by{' '}
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.name}
              </a>{' '}
              ({source.license}).
            </>
          )}
        </p>
        <Link className="text-link" to={`/leaderboard?category=${metric}`}>
          Full rankings <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
