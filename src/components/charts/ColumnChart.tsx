import { useState, type KeyboardEvent } from 'react';
import { linearTicks, niceDomain, useWidth } from './scale';
import './charts.css';

export interface Column {
  key: string;
  /** Short axis label, such as "Sep 2026". */
  label: string;
  value: number;
}

/** One column per period, with its value on hover or focus and in a hidden table. */
export function ColumnChart({
  columns,
  label,
  format,
  every = 3,
}: {
  columns: Column[];
  /** Accessible name and table caption. */
  label: string;
  format: (value: number) => string;
  /** Label at most every nth column on the axis; narrow charts label fewer. */
  every?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const height = 240;
  // Room on the right for half of the last month's label.
  const margin = {
    top: 18,
    right: Math.max(8, Math.ceil(30 - (width - 48) / Math.max(1, columns.length) / 2)),
    bottom: 30,
    left: 40,
  };
  const inner = {
    width: Math.max(10, width - margin.left - margin.right),
    height: height - margin.top - margin.bottom,
  };
  const top = Math.max(1, ...columns.map((column) => column.value));
  // The axis always reaches past the tallest column.
  const [, max] = niceDomain(0, top, 4);
  const { ticks } = linearTicks(0, max, 4);
  const slot = inner.width / Math.max(1, columns.length);
  const bar = Math.max(4, slot * 0.64);
  // Each month label needs about 64px.
  const step = Math.max(every, Math.ceil(64 / slot));
  const sy = (value: number) => inner.height - (value / max) * inner.height;
  const current = active !== null ? columns[active] : undefined;
  // Arrow keys move between columns, like the other charts.
  const keys = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => (value === null ? 0 : Math.min(columns.length - 1, value + 1)));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => (value === null ? columns.length - 1 : Math.max(0, value - 1)));
    } else if (event.key === 'Escape') setActive(null);
  };
  return (
    <div ref={ref} className="scatter-frame column-chart">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label}. Use the arrow keys to move between months.`}
          tabIndex={0}
          onKeyDown={keys}
          onBlur={() => setActive(null)}
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {ticks.map((tick) => (
              <g key={tick} className="scatter-grid">
                <line x1={0} x2={inner.width} y1={sy(tick)} y2={sy(tick)} />
                <text x={-10} y={sy(tick)} textAnchor="end" dominantBaseline="middle">
                  {format(tick)}
                </text>
              </g>
            ))}
            {columns.map((column, index) => {
              const x = index * slot + (slot - bar) / 2;
              return (
                <g key={column.key}>
                  <rect
                    className={`column-bar${index === active ? ' is-active' : ''}`}
                    x={x}
                    y={sy(column.value)}
                    width={bar}
                    height={Math.max(0, inner.height - sy(column.value))}
                    rx={Math.min(4, bar / 2)}
                  />
                  {/* A tall, invisible target makes short columns easy to point at. */}
                  <rect
                    className="column-hit"
                    x={index * slot}
                    y={0}
                    width={slot}
                    height={inner.height}
                    fill="transparent"
                    onPointerEnter={() => setActive(index)}
                    onPointerLeave={() => setActive(null)}
                  />
                  {(columns.length - 1 - index) % step === 0 && (
                    <text
                      className="trend-axis-label"
                      x={index * slot + slot / 2}
                      y={inner.height + 20}
                      textAnchor="middle"
                    >
                      {column.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}
      {current && active !== null && (
        <div
          className="chart-tooltip column-tooltip"
          style={{
            left: margin.left + active * slot + slot / 2,
            top: margin.top + sy(current.value),
          }}
          role="status"
        >
          <strong>{current.label}</strong>
          <span className="chart-tooltip-value">{format(current.value)}</span>
        </div>
      )}
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <tbody>
            {columns.map((column) => (
              <tr key={column.key}>
                <th scope="row">{column.label}</th>
                <td>{format(column.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
