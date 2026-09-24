import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { makerColor, makerLogo } from '../../../shared/makers';
import { linearTicks, niceDomain, useWidth } from './scale';
import './charts.css';

export interface RankItem {
  key: string;
  name: string;
  makerId: string;
  maker: string;
  value: number;
  low?: number;
  high?: number;
  href?: string;
  /** Extra tooltip lines, such as a release date or price. */
  details?: string[];
  /** Position in the full ranking, when the chart shows only part of it. */
  rank?: number;
}

/**
 * Ranked columns, one per model, coloured by maker with the maker's logo
 * underneath. Wide screens get vertical columns; narrow screens, or long
 * lists, get horizontal rows with every value printed.
 */
export function RankChart({
  items,
  unit,
  label,
  format,
  highlight,
  baseline,
}: {
  items: RankItem[];
  unit: 'percent' | 'index';
  /** Accessible name of the list, such as "Capability index, top 25 models". */
  label: string;
  format: (value: number) => string;
  /** Key of one item to emphasise; the rest are dimmed. */
  highlight?: string;
  /** A reference line, such as the score from random guessing. */
  baseline?: { value: number; label: string };
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  if (!items.length) return <div ref={ref} className="rank-chart is-empty" />;

  const vertical = width >= 640 && (width - 60) / items.length >= 32;
  const values = items.map((item) => item.value);
  const [min, max] =
    unit === 'percent'
      ? [0, Math.min(100, niceDomain(0, Math.max(...values), 5)[1])]
      : niceDomain(Math.min(...values) - 2, Math.max(...values), 4);
  const at = (value: number) => Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const ticks = linearTicks(min, max, 4).ticks.filter((tick) => tick >= min && tick <= max);
  const tone = (item: RankItem) =>
    highlight ? (item.key === highlight ? ' is-highlight' : ' is-muted') : '';
  const describe = (item: RankItem, index: number) =>
    `${item.rank ?? index + 1}. ${item.name}${item.maker ? `, ${item.maker}` : ''}: ${format(item.value)}`;
  const shown = active === null ? undefined : items[active];

  return (
    <div
      ref={ref}
      className={`rank-chart ${vertical ? 'is-vertical' : 'is-horizontal'}`}
      style={{ '--count': items.length } as CSSProperties}
      onMouseLeave={() => setActive(null)}
    >
      {width === 0 ? null : vertical ? (
        <div className="rank-plot">
          <div className="rank-axis" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} style={{ bottom: `${at(tick)}%` }}>
                <b>{unit === 'index' ? tick.toFixed(0) : `${tick}%`}</b>
              </span>
            ))}
            {baseline && baseline.value > min && (
              <span className="rank-baseline" style={{ bottom: `${at(baseline.value)}%` }}>
                <b>{baseline.label}</b>
              </span>
            )}
          </div>
          <ol className="rank-columns" aria-label={label}>
            {items.map((item, index) => {
              const body = (
                <>
                  <span className="rank-bar" aria-hidden="true">
                    <i />
                    <span className="rank-value">{format(item.value)}</span>
                  </span>
                  <img
                    className="rank-logo"
                    src={makerLogo(item.makerId)}
                    alt=""
                    width="24"
                    height="24"
                    loading="lazy"
                  />
                  <span className="rank-name" aria-hidden="true">
                    {item.name}
                  </span>
                </>
              );
              const events = {
                onMouseEnter: () => setActive(index),
                onFocus: () => setActive(index),
                onBlur: () => setActive(null),
                'aria-label': describe(item, index),
              };
              return (
                <li
                  key={item.key}
                  className={`rank-column${tone(item)}`}
                  style={
                    {
                      '--c': makerColor(item.makerId),
                      '--v': `${at(item.value)}%`,
                    } as CSSProperties
                  }
                >
                  {item.href ? (
                    <Link to={item.href} className="rank-hit" {...events}>
                      {body}
                    </Link>
                  ) : (
                    <span className="rank-hit" role="img" {...events}>
                      {body}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {shown && active !== null && (
            <div
              className="chart-tooltip rank-tooltip"
              aria-hidden="true"
              style={{ '--x': (active + 0.5) / items.length } as CSSProperties}
            >
              <strong>{shown.name}</strong>
              {shown.maker && <span>{shown.maker}</span>}
              <span className="chart-tooltip-value">
                {format(shown.value)}
                {shown.low !== undefined && shown.high !== undefined
                  ? ` (range ${format(shown.low)}–${format(shown.high)})`
                  : ''}
              </span>
              {shown.details?.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ol className="rank-rows" aria-label={label}>
          {items.map((item, index) => {
            const body = (
              <>
                <span className="rank-position" aria-hidden="true">
                  {item.rank ?? index + 1}
                </span>
                <img
                  className="rank-logo"
                  src={makerLogo(item.makerId)}
                  alt=""
                  width="28"
                  height="28"
                  loading="lazy"
                />
                <span className="rank-label">
                  <b>{item.name}</b>
                  {item.maker && <small>{item.maker}</small>}
                </span>
                <span className="rank-track" aria-hidden="true">
                  <i />
                </span>
                <span className="rank-value">{format(item.value)}</span>
              </>
            );
            return (
              <li
                key={item.key}
                className={`rank-row${tone(item)}`}
                style={
                  {
                    '--c': makerColor(item.makerId),
                    '--v': `${Math.max(1.5, at(item.value))}%`,
                  } as CSSProperties
                }
              >
                {item.href ? (
                  <Link to={item.href} className="rank-hit" aria-label={describe(item, index)}>
                    {body}
                  </Link>
                ) : (
                  <span className="rank-hit" role="img" aria-label={describe(item, index)}>
                    {body}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
