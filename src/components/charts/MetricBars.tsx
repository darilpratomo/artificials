import { Link } from 'react-router-dom';
import { makerColor, makerLogo } from '../../../shared/makers';
import { ShareButton } from './ShareButton';
import './charts.css';

export interface MetricRow {
  key: string;
  label: string;
  detail?: string;
  makerId: string;
  value: number;
  href?: string;
}

/**
 * A short ranked list with one bar per model, coloured by maker. Used for
 * highlights such as the top models' prices or context windows.
 */
export function MetricBars({
  title,
  caption,
  rows,
  format,
  highlight,
  share,
  scale = 'linear',
}: {
  title: string;
  caption: string;
  rows: MetricRow[];
  format: (value: number) => string;
  highlight?: string;
  /** Title, subtitle and data credit for the downloadable image. */
  share: { title: string; subtitle: string; source: string };
  /** Log bars keep small values visible when values span many orders of magnitude. */
  scale?: 'linear' | 'log';
}) {
  const values = rows.map((row) => row.value);
  const top = Math.max(...values, Number.MIN_VALUE);
  const bottom = Math.min(...values);
  const width = (value: number) => {
    if (scale === 'log' && bottom > 0 && top > bottom) {
      const span = Math.log10(top) - Math.log10(bottom);
      return 8 + ((Math.log10(value) - Math.log10(bottom)) / span) * 92;
    }
    return Math.max(3, (value / top) * 100);
  };
  return (
    <div className="metric-bars">
      <div className="metric-bars-head">
        <div>
          <h3>{title}</h3>
          <small>{caption}</small>
        </div>
        <ShareButton
          title={share.title}
          render={(tools) =>
            tools.listImage(
              share,
              rows.map((row) => ({
                label: row.label,
                detail: row.detail,
                value: format(row.value),
                fraction: width(row.value) / 100,
                makerId: row.makerId,
              })),
            )
          }
        />
      </div>
      <ol>
        {rows.map((row) => (
          <li key={row.key} className={row.key === highlight ? 'is-own' : ''}>
            <img src={makerLogo(row.makerId)} alt="" width="22" height="22" loading="lazy" />
            <span className="metric-bars-name">
              {row.href ? <Link to={row.href}>{row.label}</Link> : row.label}
            </span>
            <span className="metric-bars-track" aria-hidden="true">
              <i style={{ width: `${width(row.value)}%`, background: makerColor(row.makerId) }} />
            </span>
            <b>{format(row.value)}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}
