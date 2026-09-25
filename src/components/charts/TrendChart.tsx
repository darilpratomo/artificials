import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { makerLogo } from '../../../shared/makers';
import { linearTicks, logTicks, niceDomain, timeTicks, useWidth } from './scale';
import './charts.css';

export interface TrendChartPoint {
  /** Milliseconds since the epoch. */
  x: number;
  y: number;
  /** The model behind the point, for the tooltip. */
  name?: string;
  href?: string;
}

export interface TrendChartSeries {
  id: string;
  label: string;
  color: string;
  /** Shows the maker's logo in the legend, for maker series. */
  makerId?: string;
  points: TrendChartPoint[];
}

interface Placed extends TrendChartPoint {
  series: TrendChartSeries;
  px: number;
  py: number;
}

const DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Lines over time, one per series. `step` draws records: the line stays level
 * until a model beats the last record, and runs on to `end`. `line` joins
 * values such as quarterly medians. Hover or arrow keys show each point's
 * model; the legend hides and shows series.
 */
export function TrendChart({
  series,
  y,
  mode = 'step',
  end,
  label,
  height: tall = 360,
}: {
  series: TrendChartSeries[];
  y: { label: string; format: (value: number) => string; log?: boolean };
  mode?: 'step' | 'line';
  /** Where record lines stop, in milliseconds; the latest point by default. */
  end?: number;
  /** Accessible name, such as "Highest capability index to date, by maker". */
  label: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hidden, setHidden] = useState<string[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const navigate = useNavigate();
  const help = useId();
  const narrow = width < 640;
  const height = narrow ? Math.round(tall * 0.85) : tall;
  const labelRoom = narrow ? 0 : 156;
  const margin = { top: 14, right: 16 + labelRoom, bottom: 34, left: narrow ? 46 : 58 };
  const inner = {
    width: Math.max(10, width - margin.left - margin.right),
    height: height - margin.top - margin.bottom,
  };
  const shown = series.filter((entry) => !hidden.includes(entry.id) && entry.points.length);

  const geometry = useMemo(() => {
    const all = series.flatMap((entry) => entry.points);
    if (!all.length) return undefined;
    const x0 = Math.min(...all.map((point) => point.x));
    const x1 = Math.max(end ?? 0, ...all.map((point) => point.x));
    const values = all.map((point) => point.y);
    const [y0, y1] = y.log
      ? [Math.min(...values) / 1.3, Math.max(...values) * 1.3]
      : niceDomain(Math.min(...values), Math.max(...values), 5);
    const sx = (value: number) => ((value - x0) / (x1 - x0 || 1)) * inner.width;
    const sy = (value: number) =>
      inner.height -
      (y.log
        ? (Math.log10(value) - Math.log10(y0)) / (Math.log10(y1) - Math.log10(y0) || 1)
        : (value - y0) / (y1 - y0 || 1)) *
        inner.height;
    const yTicks = y.log
      ? logTicks(y0, y1, 6)
      : linearTicks(y0, y1, 5).ticks.filter((tick) => tick >= y0 && tick <= y1);
    return { x0, x1, sx, sy, yTicks, xTicks: timeTicks(x0, x1) };
  }, [series, end, y, inner.width, inner.height]);

  // Points in reading order, for the keyboard and the tooltip.
  const placed: Placed[] = useMemo(
    () =>
      geometry
        ? shown
            .flatMap((entry) =>
              entry.points.map((point) => ({
                ...point,
                series: entry,
                px: geometry.sx(point.x),
                py: geometry.sy(point.y),
              })),
            )
            .sort((a, b) => a.x - b.x || a.py - b.py)
        : [],
    [geometry, shown],
  );
  if (!geometry) return <div ref={ref} className="trend-chart is-empty" />;
  const { x1, sx, sy, yTicks, xTicks } = geometry;

  const path = (entry: TrendChartSeries) => {
    const points = entry.points;
    let d = `M${sx(points[0].x)},${sy(points[0].y)}`;
    for (let index = 1; index < points.length; index += 1) {
      if (mode === 'step') d += `H${sx(points[index].x)}V${sy(points[index].y)}`;
      else d += `L${sx(points[index].x)},${sy(points[index].y)}`;
    }
    if (mode === 'step') d += `H${sx(x1)}`;
    return d;
  };

  // Series names at the right end of their lines, nudged apart so none overlap.
  const ends = shown
    .map((entry) => ({ entry, y: sy(entry.points[entry.points.length - 1].y) }))
    .sort((a, b) => a.y - b.y);
  for (let index = 1; index < ends.length; index += 1)
    if (ends[index].y - ends[index - 1].y < 16) ends[index].y = ends[index - 1].y + 16;

  const point = active !== null ? placed[active] : undefined;
  const nearest = (event: PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const yPos = event.clientY - bounds.top;
    let best = -1;
    let distance = Infinity;
    placed.forEach((entry, index) => {
      const gap = Math.hypot(entry.px - x, (entry.py - yPos) * 0.6);
      if (gap < distance) {
        distance = gap;
        best = index;
      }
    });
    setActive(distance < 60 ? best : null);
  };
  const keys = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!placed.length) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => (value === null ? 0 : Math.min(placed.length - 1, value + 1)));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => (value === null ? placed.length - 1 : Math.max(0, value - 1)));
    } else if (event.key === 'Escape') setActive(null);
    else if (event.key === 'Enter' && active !== null && placed[active]?.href)
      navigate(placed[active].href!);
  };

  return (
    <div className="trend-chart">
      <ul className="chart-legend trend-legend" aria-label="Series">
        {series.map((entry) => {
          const off = hidden.includes(entry.id);
          return (
            <li key={entry.id} className={off ? 'is-muted' : ''}>
              <button
                type="button"
                aria-pressed={!off}
                onClick={() =>
                  setHidden((list) =>
                    off ? list.filter((id) => id !== entry.id) : [...list, entry.id],
                  )
                }
              >
                {entry.makerId ? (
                  <img src={makerLogo(entry.makerId)} alt="" width="16" height="16" />
                ) : null}
                <i
                  className="trend-swatch"
                  style={{ background: entry.color }}
                  aria-hidden="true"
                />
                {entry.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div ref={ref} className="scatter-frame trend-frame">
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            aria-describedby={help}
            tabIndex={0}
            onKeyDown={keys}
            onBlur={() => setActive(null)}
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {yTicks.map((tick) => (
                <g key={tick} className="scatter-grid">
                  <line x1={0} x2={inner.width} y1={sy(tick)} y2={sy(tick)} />
                  <text x={-10} y={sy(tick)} textAnchor="end" dominantBaseline="middle">
                    {y.format(tick)}
                  </text>
                </g>
              ))}
              {xTicks.map((tick) => (
                <text
                  key={tick}
                  className="trend-axis-label"
                  x={sx(tick)}
                  y={inner.height + 22}
                  textAnchor="middle"
                >
                  {new Date(tick).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </text>
              ))}
              {shown.map((entry) => (
                <g key={entry.id}>
                  <path className="trend-line" d={path(entry)} stroke={entry.color} />
                  {entry.points.map((dot) => (
                    <circle
                      key={`${dot.x}-${dot.y}`}
                      className="trend-dot"
                      cx={sx(dot.x)}
                      cy={sy(dot.y)}
                      r={3.5}
                      fill={entry.color}
                    />
                  ))}
                </g>
              ))}
              {!narrow &&
                ends.map(({ entry, y: labelY }) => (
                  <g key={entry.id}>
                    <line
                      x1={inner.width + 8}
                      x2={inner.width + 18}
                      y1={labelY}
                      y2={labelY}
                      stroke={entry.color}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <text
                      className="trend-end-label"
                      x={inner.width + 24}
                      y={labelY}
                      dominantBaseline="middle"
                    >
                      {entry.label}
                    </text>
                  </g>
                ))}
              {point && (
                <circle
                  className="trend-focus"
                  cx={point.px}
                  cy={point.py}
                  r={7}
                  stroke={point.series.color}
                />
              )}
              <rect
                className="trend-hit"
                width={inner.width}
                height={inner.height}
                fill="transparent"
                onPointerMove={nearest}
                onPointerLeave={() => setActive(null)}
                onClick={() => point?.href && navigate(point.href)}
              />
            </g>
          </svg>
        )}
        <p id={help} className="sr-only">
          {y.label}. Use the arrow keys to move between points.
        </p>
        {point && (
          <div
            className={`chart-tooltip scatter-tooltip${point.px > inner.width * 0.62 ? ' is-left' : ''}`}
            style={{ left: margin.left + point.px, top: margin.top + point.py }}
            role="status"
          >
            <strong>{point.name ?? point.series.label}</strong>
            <span>{point.series.label}</span>
            <span className="chart-tooltip-value">{y.format(point.y)}</span>
            <span>{DATE.format(point.x)}</span>
            {point.href && <span className="trend-tooltip-hint">Select to open the model</span>}
          </div>
        )}
      </div>
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Series</th>
              <th scope="col">Date</th>
              <th scope="col">Model</th>
              <th scope="col">{y.label}</th>
            </tr>
          </thead>
          <tbody>
            {series.flatMap((entry) =>
              entry.points.map((row) => (
                <tr key={`${entry.id}-${row.x}-${row.y}`}>
                  <th scope="row">{entry.label}</th>
                  <td>{DATE.format(row.x)}</td>
                  <td>{row.name ?? '—'}</td>
                  <td>{y.format(row.y)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
