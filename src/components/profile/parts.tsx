import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { BenchmarkDomain } from '../../../shared/benchmarks';
import type { ProfileBucket } from '../../lib/profiles';
import { DOMAINS, ago } from './format';

export function DomainKey({ domain }: { domain: BenchmarkDomain }) {
  const Icon = DOMAINS[domain].icon;
  return (
    <span className={`domain-key domain-${DOMAINS[domain].token}`} aria-hidden="true">
      <Icon size={14} strokeWidth={2} />
    </span>
  );
}

/**
 * A horizontal measure. The fill carries the skill area's colour; the value is
 * always printed as text beside it, so colour never carries meaning alone.
 */
export function Meter({
  domain,
  value,
  label,
  markers = [],
}: {
  domain: BenchmarkDomain;
  /** 0–100 */
  value: number;
  label: string;
  markers?: { at: number; name: string; tone: 'median' | 'best' }[];
}) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className={`profile-meter domain-${DOMAINS[domain].token}`} role="img" aria-label={label}>
      <span className="profile-meter-fill" style={{ width: `${width}%` }} />
      {markers.map((marker) => (
        <span
          key={marker.name}
          className={`profile-meter-mark mark-${marker.tone}`}
          style={{ left: `${Math.min(100, Math.max(0, marker.at))}%` }}
          title={marker.name}
        />
      ))}
    </div>
  );
}

export function Explainer({ children }: { children: ReactNode }) {
  return (
    <p className="profile-explainer">
      <Info size={15} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Credits the underlying data compactly. The licences require attribution;
 * everything calculated from the data is Artificials' own analysis.
 */
export function Sources({
  bucket,
  benchmarks = false,
}: {
  bucket: ProfileBucket;
  benchmarks?: boolean;
}) {
  return (
    <details className="profile-sources">
      <summary>Sources and method</summary>
      <div>
        <p>
          Rankings, standings, blended prices, cost estimates and model grouping are calculated by
          Artificials. Figures are refreshed automatically; the catalog was last checked{' '}
          {ago(bucket.updatedAt)}.
        </p>
        <ul>
          <li>
            Model details and prices:{' '}
            <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
              models.dev
            </a>{' '}
            ({bucket.catalog.license} license).
          </li>
          {benchmarks &&
            bucket.sources.map((source) => (
              <li key={source.id}>
                Benchmark results:{' '}
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.name}
                </a>{' '}
                (
                <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {source.license}
                </a>
                ), checked {ago(source.checkedAt)}.
              </li>
            ))}
        </ul>
        <p>
          Prices are list prices per million tokens and can change without notice. Check with the
          provider before you buy.
        </p>
      </div>
    </details>
  );
}
