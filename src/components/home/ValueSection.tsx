import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Table2 } from 'lucide-react';
import { makerColor } from '../../../shared/makers';
import { ScatterChart, type ScatterAxis, type ScatterPoint } from '../charts/ScatterChart';
import { ShareButton } from '../charts/ShareButton';
import { compactTokens, compactUsd, monthYear } from '../charts/scale';
import type { IndexPoint, Release } from '../../lib/overview';
import { day, price, tokens } from '../profile/format';

type View = 'price' | 'date' | 'context';

const VIEWS: {
  id: View;
  tab: string;
  title: string;
  text: string;
  axis: ScatterAxis;
  value: (point: IndexPoint) => number | undefined;
}[] = [
  {
    id: 'price',
    tab: 'Price',
    title: 'Capability index against price',
    text: 'Up and to the left is better: a higher score for less money. The dotted line links the models that no cheaper model beats.',
    axis: {
      kind: 'log',
      label: 'Blended price per 1M tokens (USD, log scale)',
      format: compactUsd,
    },
    value: (point) => point.price?.blended,
  },
  {
    id: 'date',
    tab: 'Release date',
    title: 'Capability index over time',
    text: 'Each point is a model at its release, once Epoch AI has published its score. The line steps up each time a new model sets the highest score so far. Rings along the bottom are newer releases still waiting for a score.',
    axis: { kind: 'time', label: 'Release date', format: monthYear },
    value: (point) => (point.releasedAt ? Date.parse(point.releasedAt) : undefined),
  },
  {
    id: 'context',
    tab: 'Context window',
    title: 'Capability index against context window',
    text: 'How much text a model can take in at once, next to its score. A larger window does not make a model more capable.',
    axis: { kind: 'log', label: 'Context window (tokens, log scale)', format: compactTokens },
    value: (point) => point.contextWindow,
  },
];

/** Where each model sits on two measures at once. */
export function ValueSection({
  index,
  releases = [],
  detailed = false,
}: {
  index: IndexPoint[];
  /** Recent releases, so the time view can show models not scored yet. */
  releases?: Release[];
  detailed?: boolean;
}) {
  const [view, setView] = useState<View>('price');
  const [openOnly, setOpenOnly] = useState(false);
  const [table, setTable] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const current = VIEWS.find((entry) => entry.id === view)!;
  const points: ScatterPoint[] = useMemo(
    () =>
      index
        .filter((point) => (!openOnly || point.openWeights) && current.value(point) !== undefined)
        .map((point) => ({
          key: point.slug ?? `${point.name}:${point.makerId}`,
          name: point.name,
          makerId: point.makerId,
          maker: point.maker,
          x: current.value(point)!,
          y: point.index,
          href: point.slug ? `/models/${point.slug}` : undefined,
          details: [
            view !== 'date' && point.releasedAt ? `Released ${day(point.releasedAt)}` : '',
            view === 'price' && point.price
              ? `${price(point.price.input)} in, ${price(point.price.output)} out per 1M tokens${
                  point.price.from === 'median' ? ' (middle host price)' : ''
                }`
              : '',
          ].filter(Boolean),
        })),
    [index, openOnly, current, view],
  );
  // Releases since shortly before the newest scored model, not scored yet.
  const pending = useMemo(() => {
    if (view !== 'date') return [];
    const scored = index
      .map((point) => (point.releasedAt ? Date.parse(point.releasedAt) : 0))
      .reduce((a, b) => Math.max(a, b), 0);
    const seen = new Set(index.map((point) => point.slug).filter(Boolean));
    return releases
      .filter(
        (release) =>
          release.notable &&
          release.index === undefined &&
          !seen.has(release.slug) &&
          (!openOnly || release.openWeights) &&
          Date.parse(release.date) > scored - 30 * 86_400_000,
      )
      .slice(0, 48)
      .map((release) => ({
        key: `pending:${release.slug}`,
        name: release.name,
        makerId: release.makerId,
        maker: release.maker,
        x: Date.parse(release.date),
        href: `/models/${release.slug}`,
        details: [`Released ${day(release.date)}`],
      }));
  }, [view, index, releases, openOnly]);
  useEffect(() => {
    setSelected((current) =>
      current.filter((key) => points.some((point) => point.key === key)),
    );
  }, [points]);
  const filteredPoints = selected.length
    ? points.filter((point) => selected.includes(point.key))
    : points;
  const filteredPending = selected.length ? [] : pending;
  const filterChoices = useMemo(
    () =>
      [...points]
        .sort((a, b) => b.y - a.y || a.name.localeCompare(b.name))
        .slice(0, detailed ? 36 : 14),
    [points, detailed],
  );
  const toggleModel = (key: string) =>
    setSelected((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    );
  const y = useMemo(
    () => ({ label: 'Capability index', format: (value: number) => value.toFixed(0) }),
    [],
  );
  const frontier = useMemo(
    () =>
      view === 'price'
        ? { kind: 'cheapest' as const, label: 'Best score at each price' }
        : view === 'date'
          ? { kind: 'record' as const, label: 'Highest score so far' }
          : undefined,
    [view],
  );

  return (
    <div className="dash-panel">
      <div className="dash-tabs" role="group" aria-label="Compare the capability index with">
        {VIEWS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={view === entry.id}
            onClick={() => setView(entry.id)}
          >
            {entry.tab}
          </button>
        ))}
      </div>
      <div className="dash-panel-head">
        <div>
          <h3>{current.title}</h3>
          <p>{current.text}</p>
        </div>
        <div className="dash-controls">
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
          <ShareButton
            title={current.title}
            render={(tools) =>
              tools.scatterImage(
                {
                  title: current.title,
                  subtitle: current.text,
                  source:
                    view === 'date'
                      ? 'Epoch AI (CC BY 4.0)'
                      : 'Epoch AI (CC BY 4.0) and models.dev (MIT)',
                },
                filteredPoints.map((point) => ({
                  name: point.name,
                  makerId: point.makerId,
                  maker: point.maker,
                  x: point.x,
                  y: point.y,
                })),
                current.axis,
                y,
                { frontier: frontier?.kind, quadrant: view === 'price', pending: filteredPending },
              )
            }
          />
        </div>
      </div>
      <label className="dash-check">
        <input
          type="checkbox"
          checked={openOnly}
          onChange={(event) => setOpenOnly(event.target.checked)}
        />
        Open-weights models only
      </label>
      {filterChoices.length > 0 && (
        <div className={`model-filter${selected.length ? ' has-selection' : ''}`}>
          <div className="model-filter-head">
            <span>
              {selected.length
                ? `${filteredPoints.length} selected model${filteredPoints.length === 1 ? '' : 's'}`
                : 'Tap model labels to focus the chart'}
            </span>
            <button
              type="button"
              className="text-link"
              disabled={!selected.length}
              onClick={() => setSelected([])}
            >
              Show all
            </button>
          </div>
          <div className="model-filter-list" role="group" aria-label="Filter models in the chart">
            {filterChoices.map((point) => (
              <button
                key={point.key}
                type="button"
                aria-pressed={selected.includes(point.key)}
                onClick={() => toggleModel(point.key)}
              >
                <i style={{ background: makerColor(point.makerId) }} aria-hidden="true" />
                <span>{point.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {table ? (
        <div className="chart-table-wrap">
          <table className="chart-table">
            <caption className="sr-only">{`${current.title}: ${filteredPoints.length} models`}</caption>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Maker</th>
                <th scope="col">Index</th>
                <th scope="col">{current.tab}</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredPoints]
                .sort((a, b) => b.y - a.y)
                .map((point) => (
                  <tr key={point.key}>
                    <th scope="row">
                      {point.href ? <Link to={point.href}>{point.name}</Link> : point.name}
                    </th>
                    <td>{point.maker || 'Not reported'}</td>
                    <td>{point.y.toFixed(1)}</td>
                    <td>
                      {view === 'price'
                        ? price(point.x)
                        : view === 'date'
                          ? day(new Date(point.x).toISOString().slice(0, 10))
                          : `${tokens(point.x)} tokens`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ScatterChart
          points={filteredPoints}
          x={current.axis}
          y={y}
          frontier={frontier}
          quadrant={view === 'price' ? 'Above-median score, below-median price' : undefined}
          pending={filteredPending}
          pendingLabel="Released, not scored yet"
          label={`${current.title}, ${filteredPoints.length} models`}
        />
      )}
      <div className="dash-foot">
        <p>
          {view === 'price'
            ? 'Price is the maker’s own list price, or the middle price across hosts when the maker does not sell the model directly, blended as three input tokens for every output token. It is not the cost of any particular task. '
            : view === 'date'
              ? 'Release dates come from Epoch AI’s records, or the catalog listing when Epoch AI has none. '
              : 'Context windows are the maker’s listed value, or the most common value across hosts. '}
          {filteredPoints.length} of {index.length} models on the index are visible in this view.
        </p>
      </div>
    </div>
  );
}
