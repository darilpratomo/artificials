import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowDownWideNarrow,
  ArrowUpRight,
  Info,
  ArrowLeft,
  ArrowRight,
  ListFilter,
} from 'lucide-react';
import { PageHeading } from '../components/Layout';
import {
  useCatalogPage,
  compactNumber,
  tokenPrice,
  updatedDate,
  providerLogo,
} from '../lib/catalog';
export default function Leaderboard() {
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') || 'context';
  const query = new URLSearchParams(params);
  query.set('sort', sort);
  query.set('limit', '20');
  const { data, error, loading } = useCatalogPage(query.toString());
  const update = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  const metric =
    sort === 'input-price'
      ? 'Input price'
      : sort === 'output-price'
        ? 'Output price'
        : 'Context window';
  return (
    <div className="container page leaderboard-page">
      <PageHeading
        eyebrow="RANKINGS WITH CONTEXT"
        title="A metric. A clear comparison."
        text="Compare model offerings by reported specifications and base pricing. Choose your metric, then explore the trade-offs."
      />
      <div className="ranking-notice">
        <Info size={19} />
        <p>
          <strong>What this ranking measures.</strong> This is a specification and price ranking,
          not an overall intelligence leaderboard. The source does not provide independently
          measured benchmark, speed or latency scores. We leave those unreported.
        </p>
      </div>
      <div className="rank-controls">
        <div>
          <ArrowDownWideNarrow size={18} />
          <label htmlFor="ranking-metric">Rank by</label>
          <select
            id="ranking-metric"
            aria-label="Ranking metric"
            value={sort}
            onChange={(e) => update('sort', e.target.value)}
          >
            <option value="context">Largest context window</option>
            <option value="input-price">Lowest input price</option>
            <option value="output-price">Lowest output price</option>
          </select>
        </div>
        <div>
          <ListFilter size={16} />
          <label className="sr-only" htmlFor="rank-provider">
            Provider
          </label>
          <select
            id="rank-provider"
            value={params.get('provider') || ''}
            onChange={(e) => update('provider', e.target.value)}
          >
            <option value="">All providers</option>
            {data?.providers.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="catalog-results-meta">
        <span role="status">
          {loading
            ? 'Loading rankings…'
            : `${data?.total.toLocaleString('en-US') || 0} provider-model offerings`}
        </span>
        <span className="mono">{updatedDate(data?.updatedAt)}</span>
      </div>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : (
        <div className="ranking-scroll" aria-busy={loading}>
          <table className="ranking-table">
            <caption className="sr-only">
              AI model offerings ranked by {metric.toLowerCase()}
            </caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Model / provider</th>
                <th scope="col">
                  {metric} <ArrowDownWideNarrow size={13} />
                </th>
                <th scope="col">{sort === 'context' ? 'Input / 1M tokens' : 'Context window'}</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {data?.models.map((m, i) => {
                const value =
                  sort === 'input-price'
                    ? m.inputPrice
                    : sort === 'output-price'
                      ? m.outputPrice
                      : m.contextWindow;
                return (
                  <tr key={m.id}>
                    <td className="rank-number mono">
                      {value === null
                        ? '—'
                        : String((data.page - 1) * data.limit + i + 1).padStart(2, '0')}
                    </td>
                    <td>
                      <div className="rank-model">
                        <img
                          className="provider-mark"
                          src={providerLogo(m.providerId)}
                          width="32"
                          height="32"
                          alt=""
                        />
                        <div>
                          <strong>{m.name}</strong>
                          <span>{m.provider}</span>
                        </div>
                        {m.reasoning && <span className="rank-reasoning mono">REASONING</span>}
                      </div>
                    </td>
                    <td>
                      <strong className="rank-value">
                        {sort === 'context' ? compactNumber(value) : tokenPrice(value)}
                      </strong>
                      <span className="rank-unit">
                        {sort === 'context' ? 'tokens' : 'per 1M tokens'}
                      </span>
                    </td>
                    <td>
                      {sort === 'context'
                        ? tokenPrice(m.inputPrice)
                        : compactNumber(m.contextWindow)}
                    </td>
                    <td>
                      <a
                        className="icon-btn"
                        href={m.sourceUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                        aria-label={`Source for ${m.name}`}
                      >
                        <ArrowUpRight size={16} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && data.pageCount > 1 && (
        <nav className="catalog-pagination" aria-label="Ranking pages">
          <button
            className="btn btn-outline btn-small"
            disabled={loading || data.page === 1}
            onClick={() => update('page', String(data.page - 1))}
          >
            <ArrowLeft size={14} /> Previous
          </button>
          <span>
            Page {data.page} of {data.pageCount}
          </span>
          <button
            className="btn btn-outline btn-small"
            disabled={loading || data.page === data.pageCount}
            onClick={() => update('page', String(data.page + 1))}
          >
            Next <ArrowRight size={14} />
          </button>
        </nav>
      )}
      <div className="ranking-method">
        <h2>Numbers need context.</h2>
        <div>
          <p>
            Prices exclude caching discounts, tiered pricing, tools and other extras. A reported $0
            may reflect a promotional or limited free route. Check provider terms.
          </p>
          <p>
            Multiple API hosts can offer the same model. A larger context window does not imply
            better reasoning. Unknown values sort last and receive no rank.
          </p>
        </div>
        <Link className="text-link" to="/about#source-methodology">
          Read our data methodology <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
