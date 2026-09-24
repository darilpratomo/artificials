import { Link } from 'react-router-dom';
import { makerLogo } from '../../../shared/makers';
import type { Highlight } from '../../lib/overview';
import { DomainKey } from '../profile/parts';
import { day, tokens } from '../profile/format';

const KIND: Record<Highlight['kind'], string> = {
  measured: 'Test result',
  catalog: 'Listing data',
  derived: 'Calculated',
};

export function highlightValue(highlight: Highlight) {
  switch (highlight.unit) {
    case 'index':
      return highlight.value.toFixed(1);
    case 'percent':
      return `${highlight.value.toFixed(1)}%`;
    case 'tokens':
      return `${tokens(highlight.value)} tokens`;
    case 'usd':
      return `$${highlight.value.toFixed(2)}`;
    case 'date':
      return day(highlight.date);
  }
}

/** The current leader for each skill, one card each. Every card names its test. */
export function Highlights({ items }: { items: Highlight[] }) {
  return (
    <ul className="highlight-grid">
      {items.map((item) => (
        <li key={item.id} className="highlight-card">
          <div className="highlight-top">
            <DomainKey domain={item.domain} />
            <h3>{item.title}</h3>
          </div>
          <div className="highlight-model">
            <img src={makerLogo(item.makerId)} alt="" width="36" height="36" loading="lazy" />
            <div>
              {item.slug ? (
                <Link to={`/models/${item.slug}`} className="highlight-link">
                  {item.name}
                </Link>
              ) : (
                <strong>{item.name}</strong>
              )}
              {item.maker && <span>{item.maker}</span>}
            </div>
          </div>
          <p className="highlight-value">{highlightValue(item)}</p>
          <p className="highlight-detail">
            <span>{item.detail}</span>
            <span className={`highlight-kind kind-${item.kind}`}>{KIND[item.kind]}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
