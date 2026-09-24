import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { makerColor, makerLogo } from '../../../shared/makers';
import { linearTicks, logTicks, niceDomain, timeTicks, useWidth } from './scale';
import './charts.css';

export interface ScatterPoint {
  key: string;
  name: string;
  makerId: string;
  maker: string;
  x: number;
  y: number;
  href?: string;
  /** Extra tooltip lines, such as a release date. */
  details?: string[];
}

export interface ScatterAxis {
  kind: 'log' | 'time' | 'linear';
  label: string;
  format: (value: number) => string;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** A model without a y value yet, such as a release that has not been scored. */
export type PendingPoint = Omit<ScatterPoint, 'y'>;

interface Placed extends ScatterPoint {
  px: number;
  py: number;
  pending?: boolean;
}

/**
 * Models as points, coloured by maker. Optional extras: the frontier (the best
 * score at each price, or the record so far over time) and a shaded region of
 * above-median scores at below-median values.
 *
 * Pointer: the nearest point within reach shows its details. Keyboard: arrow
 * keys move between points and Enter opens the model. A table view is offered
 * by the page for screen readers.
 */
export function ScatterChart({
  points,
  x,
  y,
  frontier,
  quadrant,
  highlight,
  label,
  pending = [],
  pendingLabel = 'Not scored yet',
}: {
  points: ScatterPoint[];
  /** Shown as hollow rings along the bottom of the plot, placed by x only. */
  pending?: PendingPoint[];
  pendingLabel?: string;
  x: ScatterAxis;
  y: { label: string; format: (value: number) => string };
  frontier?: { kind: 'cheapest' | 'record'; label: string };
  /** Label for the shaded region of lower x and higher y than the medians. */
  quadrant?: string;
  highlight?: string;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const navigate = useNavigate();
  const help = useId();
  const narrow = width < 640;
  const height = narrow ? 380 : 500;
  const margin = { top: 16, right: narrow ? 12 : 20, bottom: 50, left: narrow ? 42 : 54 };
  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = height - margin.top - margin.bottom;

  const view = useMemo(() => {
    if (!points.length || !width) return null;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const allX = [...xs, ...pending.map((point) => point.x)];
    let [x0, x1] = [Math.min(...allX), Math.max(...allX)];
    if (x.kind === 'log') [x0, x1] = [x0 / 1.4, x1 * 1.4];
    else {
      const pad = (x1 - x0) * 0.04 || 1;
      [x0, x1] = [x0 - pad, x1 + pad];
    }
    const [y0, y1] = niceDomain(Math.min(...ys), Math.max(...ys), 5);
    const sx = (value: number) =>
      margin.left +
      (x.kind === 'log'
        ? (Math.log10(value) - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0))
        : (value - x0) / (x1 - x0)) *
        innerWidth;
    const sy = (value: number) => margin.top + (1 - (value - y0) / (y1 - y0)) * innerHeight;
    const xTicks =
      x.kind === 'log'
        ? logTicks(x0, x1, narrow ? 5 : 9)
        : x.kind === 'time'
          ? timeTicks(x0, x1)
          : linearTicks(x0, x1, narrow ? 4 : 6).ticks;
    const yTicks = linearTicks(y0, y1, narrow ? 4 : 6).ticks.filter((t) => t >= y0 && t <= y1);
    const placed: Placed[] = points.map((point) => ({
      ...point,
      px: sx(point.x),
      py: sy(point.y),
    }));
    // Unscored models sit on a row just above the x axis, in two staggered
    // lanes so neighbours released days apart stay distinguishable.
    const waiting: Placed[] = [...pending]
      .sort((a, b) => a.x - b.x)
      .map((point, index) => ({
        ...point,
        y: Number.NaN,
        px: sx(point.x),
        py: margin.top + innerHeight - (index % 2 ? 22 : 10),
        pending: true,
      }));

    let path = '';
    let front: Placed[] = [];
    if (frontier) {
      let best = -Infinity;
      for (const point of [...placed].sort((a, b) => a.x - b.x || b.y - a.y))
        if (point.y > best) {
          best = point.y;
          front.push(point);
        }
      path =
        frontier.kind === 'cheapest'
          ? front.map((p, i) => `${i ? 'L' : 'M'}${p.px},${p.py}`).join('')
          : front.map((p, i) => (i ? `H${p.px}V${p.py}` : `M${p.px},${p.py}`)).join('') +
            `H${margin.left + innerWidth}`;
    }
    const region = quadrant ? { right: sx(median(xs)), bottom: sy(median(ys)) } : undefined;

    // Direct labels for the few points that matter most, placed without overlaps.
    const wanted = [
      ...placed.filter((point) => point.key === highlight),
      ...front.sort((a, b) => b.y - a.y),
      ...[...placed].sort((a, b) => b.y - a.y),
    ];
    const limit = narrow ? 5 : 12;
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    const labels: { key: string; text: string; x: number; y: number; anchor: 'start' | 'end' }[] =
      [];
    const seen = new Set<string>();
    for (const point of wanted) {
      if (labels.length >= limit) break;
      if (seen.has(point.key)) continue;
      seen.add(point.key);
      const text = point.name.length > 26 ? `${point.name.slice(0, 25)}…` : point.name;
      const w = text.length * 6.6 + 4;
      const h = 15;
      const options = [
        { x: point.px + 9, y: point.py - h / 2, anchor: 'start' as const },
        { x: point.px - 9 - w, y: point.py - h / 2, anchor: 'end' as const },
        { x: point.px - w / 2, y: point.py - h - 8, anchor: 'start' as const },
        { x: point.px - w / 2, y: point.py + 8, anchor: 'start' as const },
      ];
      for (const option of options) {
        const box = { x: option.x, y: option.y, w, h };
        const inside =
          box.x >= margin.left &&
          box.x + w <= margin.left + innerWidth &&
          box.y >= margin.top &&
          box.y + h <= margin.top + innerHeight;
        const clear = boxes.every(
          (other) =>
            box.x + box.w < other.x ||
            other.x + other.w < box.x ||
            box.y + box.h < other.y ||
            other.y + other.h < box.y,
        );
        if (inside && clear) {
          boxes.push(box);
          labels.push({
            key: point.key,
            text,
            x: option.anchor === 'end' ? option.x + w : option.x,
            y: option.y + h - 4,
            anchor: option.anchor,
          });
          break;
        }
      }
    }
    return { sx, sy, xTicks, yTicks, placed, waiting, path, region, labels, x0, x1, y0, y1 };
    // The margins derive from `narrow`, which follows `width`.
  }, [points, pending, width, narrow, x, frontier, quadrant, highlight, innerWidth, innerHeight]);

  const everything = useMemo(() => (view ? [...view.placed, ...view.waiting] : []), [view]);
  const order = useMemo(
    () => [...everything].sort((a, b) => a.x - b.x || (b.y || 0) - (a.y || 0)),
    [everything],
  );
  const current = everything.find((point) => point.key === active);

  const nearest = (event: PointerEvent<SVGSVGElement>) => {
    if (!view) return undefined;
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left;
    const py = event.clientY - box.top;
    let best: Placed | undefined;
    let distance = 28 * 28;
    for (const point of everything) {
      const d = (point.px - px) ** 2 + (point.py - py) ** 2;
      if (d < distance) {
        distance = d;
        best = point;
      }
    }
    return best;
  };

  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!order.length) return;
    const index = order.findIndex((point) => point.key === active);
    const move = (to: number) => {
      event.preventDefault();
      setActive(order[(to + order.length) % order.length].key);
    };
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') move(index < 0 ? -1 : index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(order.length - 1);
    else if (event.key === 'Escape') setActive(null);
    else if (event.key === 'Enter' && current?.href) navigate(current.href);
  };

  const makers = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const point of points) {
      const id = point.makerId;
      const entry = counts.get(id) ?? { name: point.maker || 'Maker not reported', count: 0 };
      entry.count += 1;
      counts.set(id, entry);
    }
    return [...counts].sort(
      (a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name),
    );
  }, [points]);

  return (
    <div className="scatter-chart">
      <ul className="chart-legend" aria-label="Makers">
        {makers.map(([id, entry]) => (
          <li key={id}>
            <i style={{ background: makerColor(id) }} aria-hidden="true" />
            <img src={makerLogo(id)} alt="" width="18" height="18" loading="lazy" />
            {entry.name}
          </li>
        ))}
        {frontier && (
          <li className="legend-line">
            <svg width="26" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="25" y2="4" />
            </svg>
            {frontier.label}
          </li>
        )}
        {quadrant && (
          <li className="legend-region">
            <i aria-hidden="true" />
            {quadrant}
          </li>
        )}
        {pending.length > 0 && (
          <li className="legend-pending">
            <i aria-hidden="true" />
            {pendingLabel}
          </li>
        )}
      </ul>
      <div ref={ref} className="scatter-frame" style={{ height }}>
        {view && (
          <svg
            width={width}
            height={height}
            tabIndex={0}
            role="group"
            aria-label={label}
            aria-describedby={help}
            onKeyDown={onKey}
            onFocus={() => !active && order[0] && setActive(order[order.length - 1].key)}
            onPointerMove={(event) => {
              if (event.pointerType === 'mouse' && !pinned) setActive(nearest(event)?.key ?? null);
            }}
            onPointerDown={(event) => {
              const point = nearest(event);
              setActive(point?.key ?? null);
              setPinned(!!point && event.pointerType !== 'mouse');
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === 'mouse' && !pinned) setActive(null);
            }}
            onClick={() => {
              if (!pinned && current?.href) navigate(current.href);
            }}
          >
            {view.region && (
              <g className="scatter-region" aria-hidden="true">
                <rect
                  x={margin.left}
                  y={margin.top}
                  width={Math.max(0, view.region.right - margin.left)}
                  height={Math.max(0, view.region.bottom - margin.top)}
                />
              </g>
            )}
            <g className="scatter-grid" aria-hidden="true">
              {view.yTicks.map((tick) => (
                <g key={`y${tick}`}>
                  <line
                    x1={margin.left}
                    x2={margin.left + innerWidth}
                    y1={view.sy(tick)}
                    y2={view.sy(tick)}
                  />
                  <text x={margin.left - 8} y={view.sy(tick) + 4} textAnchor="end">
                    {y.format(tick)}
                  </text>
                </g>
              ))}
              {view.xTicks.map((tick) => (
                <g key={`x${tick}`}>
                  <line
                    className="tick"
                    x1={view.sx(tick)}
                    x2={view.sx(tick)}
                    y1={margin.top + innerHeight}
                    y2={margin.top + innerHeight + 5}
                  />
                  <text x={view.sx(tick)} y={margin.top + innerHeight + 20} textAnchor="middle">
                    {x.format(tick)}
                  </text>
                </g>
              ))}
              <line
                className="axis"
                x1={margin.left}
                x2={margin.left + innerWidth}
                y1={margin.top + innerHeight}
                y2={margin.top + innerHeight}
              />
              <text
                className="axis-title"
                x={margin.left + innerWidth / 2}
                y={height - 6}
                textAnchor="middle"
              >
                {x.label}
              </text>
            </g>
            {view.path && <path className="scatter-frontier" d={view.path} aria-hidden="true" />}
            <g aria-hidden="true">
              {[...view.placed]
                .sort((a, b) => Number(a.key === highlight) - Number(b.key === highlight))
                .map((point) => (
                  <circle
                    key={point.key}
                    className={
                      highlight ? (point.key === highlight ? 'is-highlight' : 'is-muted') : ''
                    }
                    cx={point.px}
                    cy={point.py}
                    r={point.key === highlight ? 8 : narrow ? 5 : 6}
                    fill={makerColor(point.makerId)}
                  />
                ))}
              {view.waiting.map((point) => (
                <circle
                  key={point.key}
                  className="scatter-pending"
                  cx={point.px}
                  cy={point.py}
                  r={narrow ? 4.5 : 5.5}
                  style={{ stroke: makerColor(point.makerId) }}
                />
              ))}
              {current && (
                <circle className="scatter-focus" cx={current.px} cy={current.py} r={11} />
              )}
            </g>
            <g className="scatter-labels" aria-hidden="true">
              {view.labels.map((entry) => (
                <text key={entry.key} x={entry.x} y={entry.y} textAnchor={entry.anchor}>
                  {entry.text}
                </text>
              ))}
            </g>
          </svg>
        )}
        {current && view && (
          <div
            className={`chart-tooltip scatter-tooltip${current.px > width * 0.6 ? ' is-left' : ''}${
              pinned ? ' is-pinned' : ''
            }`}
            style={{ left: current.px, top: current.py }}
          >
            <strong>{current.name}</strong>
            {current.maker && <span>{current.maker}</span>}
            <span className="chart-tooltip-value">
              {current.pending ? pendingLabel : `${y.label}: ${y.format(current.y)}`}
            </span>
            <span>
              {x.label}: {x.format(current.x)}
            </span>
            {current.details?.map((line) => (
              <span key={line}>{line}</span>
            ))}
            {current.href && pinned && (
              <Link to={current.href} className="chart-tooltip-link">
                View model
              </Link>
            )}
          </div>
        )}
        <p id={help} className="sr-only">
          Use the arrow keys to move between models. Press Enter to open the selected model. A table
          with the same data follows the chart.
        </p>
        <p className="sr-only" aria-live="polite">
          {current
            ? `${current.name}${current.maker ? `, ${current.maker}` : ''}. ${current.pending ? pendingLabel : `${y.label} ${y.format(current.y)}`}. ${x.label} ${x.format(current.x)}.`
            : ''}
        </p>
      </div>
    </div>
  );
}
