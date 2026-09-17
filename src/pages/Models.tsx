import { useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  GitCompareArrows,
  RefreshCw,
  Database,
} from 'lucide-react';
import { useCatalogPage, useComparison, updatedDate } from '../lib/catalog';
import { PageHeading } from '../components/Layout';
import ModelCard from '../components/ModelCard';
export default function Models() {
  const [params, setParams] = useSearchParams();
  const latestParams = useRef(params);
  latestParams.current = params;
  const { data, error, loading } = useCatalogPage(params.toString());
  const comparison = useComparison();
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(latestParams.current);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    latestParams.current = next;
    setParams(next, { replace: true });
  };
  return (
    <div className="container page catalog-page">
      <PageHeading
        eyebrow="THE INTELLIGENCE INDEX"
        title="Find your next model."
        text="A source-attributed view of AI. Explore capabilities, compare costs, and look beyond the headline."
      />
      <div className="catalog-search-panel">
        <div className="catalog-search">
          <Search size={19} />
          <input
            type="search"
            aria-label="Search models"
            placeholder="Search models, labs, or providers…"
            value={params.get('query') || ''}
            onChange={(e) => update('query', e.target.value)}
          />
          <span className="search-hint mono">THE AI DIRECTORY</span>
        </div>
        <div className="catalog-filters">
          <span className="filter-label">
            <SlidersHorizontal size={14} /> Refine
          </span>
          <label>
            <span className="sr-only">Provider</span>
            <select
              value={params.get('provider') || ''}
              onChange={(e) => update('provider', e.target.value)}
            >
              <option value="">All providers</option>
              {data?.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.modelCount})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Modality</span>
            <select
              value={params.get('modality') || ''}
              onChange={(e) => update('modality', e.target.value)}
            >
              <option value="">All modalities</option>
              {['text', 'image', 'audio', 'video'].map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort models</span>
            <select
              value={params.get('sort') || 'newest'}
              onChange={(e) => update('sort', e.target.value)}
            >
              <option value="newest">Newest release</option>
              <option value="name">Name: A to Z</option>
              <option value="context">Largest context</option>
              <option value="input-price">Lowest input price</option>
              <option value="output-price">Lowest output price</option>
            </select>
          </label>
          <button
            className={`filter-chip ${params.get('reasoning') === 'true' ? 'active' : ''}`}
            aria-pressed={params.get('reasoning') === 'true'}
            onClick={() => update('reasoning', params.get('reasoning') === 'true' ? '' : 'true')}
          >
            Reasoning
          </button>
          <button
            className={`filter-chip ${params.get('openWeights') === 'true' ? 'active' : ''}`}
            aria-pressed={params.get('openWeights') === 'true'}
            onClick={() =>
              update('openWeights', params.get('openWeights') === 'true' ? '' : 'true')
            }
          >
            Open weights
          </button>
          {params.toString() && (
            <button className="text-link" onClick={() => setParams({}, { replace: true })}>
              Reset
            </button>
          )}
        </div>
      </div>
      <div className="catalog-results-meta">
        <span role="status">
          {loading
            ? 'Searching the catalog…'
            : data
              ? `${data.total.toLocaleString('en-US')} model offerings`
              : 'Model catalog'}
        </span>
        <span className="mono">
          <RefreshCw size={12} /> {updatedDate(data?.updatedAt)}
        </span>
      </div>
      {error ? (
        <div className="empty-state" role="alert">
          <Database size={32} />
          <h2>One moment. The index is unavailable.</h2>
          <p>{error}</p>
          <button className="btn" onClick={() => location.reload()}>
            Try again <RefreshCw size={14} />
          </button>
        </div>
      ) : (
        <>
          <div
            className={`model-directory ${loading ? 'catalog-loading' : ''}`}
            aria-busy={loading}
          >
            {data?.models.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                selected={comparison.models.some((s) => s.id === m.id)}
                disabled={comparison.models.length >= 3}
                onCompare={comparison.toggle}
              />
            )) || Array.from({ length: 9 }, (_, i) => <div key={i} className="model-skeleton" />)}
          </div>
          {data && !loading && data.total === 0 && (
            <div className="empty-state">
              <Search size={30} />
              <h2>No matches in this snapshot.</h2>
              <p>
                Try a shorter name or remove a filter. Source coverage may not include every model.
              </p>
              <button className="btn btn-outline" onClick={() => setParams({})}>
                Clear filters
              </button>
            </div>
          )}
          {data && data.pageCount > 1 && (
            <nav className="catalog-pagination" aria-label="Catalog pages">
              <button
                className="btn btn-outline btn-small"
                disabled={loading || data.page === 1}
                onClick={() => update('page', String(data.page - 1))}
              >
                <ArrowLeft size={15} /> Previous
              </button>
              <span>
                Page {data.page} of {data.pageCount}
              </span>
              <button
                className="btn btn-outline btn-small"
                disabled={loading || data.page === data.pageCount}
                onClick={() => update('page', String(data.page + 1))}
              >
                Next <ArrowRight size={15} />
              </button>
            </nav>
          )}
        </>
      )}
      <div className="catalog-source-note">
        <Database size={18} />
        <div>
          <strong>Understand the source.</strong>
          <p>
            Each entry represents a model offered by an API provider. Multiple providers may serve
            the same model. Prices are base USD per million tokens; volume tiers and extras can
            differ. Unknown fields stay unreported. Updates are scheduled, and source coverage is
            not exhaustive.
          </p>
          <a
            href="https://models.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            Data from models.dev <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
      {comparison.models.length > 0 && (
        <aside className="comparison-tray" aria-label="Selected models for comparison">
          <GitCompareArrows size={19} />
          <div>
            <strong>{comparison.models.length} of 3 models selected</strong>
            <span>See the differences that matter.</span>
          </div>
          <Link className="btn btn-small" to="/compare">
            Compare models <ArrowRight size={14} />
          </Link>
          <button className="text-link" onClick={comparison.clear}>
            Clear
          </button>
        </aside>
      )}
    </div>
  );
}
