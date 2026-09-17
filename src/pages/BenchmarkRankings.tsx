import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Clock3,
  Code2,
  Image,
  Brain,
  Sigma,
  Database,
  Languages,
  ListChecks,
  Trophy,
  Search,
} from 'lucide-react';
import type { BenchmarkSnapshot } from '../../shared/benchmarks';
import { PageHeading } from '../components/Layout';
import { providerLogo } from '../lib/catalog';

const icons: Record<string, typeof Brain> = {
  overall: Trophy,
  coding: Code2,
  'agentic-coding': Code2,
  image: Image,
  reasoning: Brain,
  math: Sigma,
  'data-analysis': Database,
  language: Languages,
  'instruction-following': ListChecks,
};
const date = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }) + ' UTC';
export default function BenchmarkRankings() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<BenchmarkSnapshot | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/data/benchmarks.json', { signal: controller.signal, cache: 'no-cache' })
      .then(async (response) => {
        if (!response.ok) throw Error('Benchmark data is temporarily unavailable.');
        return response.json() as Promise<BenchmarkSnapshot>;
      })
      .then((snapshot: BenchmarkSnapshot) => {
        if (snapshot.version !== 1 || !snapshot.categories?.length)
          throw Error('Benchmark data is temporarily unavailable.');
        setData(snapshot);
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [attempt]);
  const selected =
    data?.categories.find((c) => c.id === params.get('category')) || data?.categories[0];
  const source = data?.sources.find((s) => s.id === selected?.sourceId);
  const rows =
    selected?.rows.filter((r) =>
      (r.model + ' ' + r.provider).toLowerCase().includes(query.toLowerCase()),
    ) || [];
  const stale = source && Date.now() - Date.parse(source.checkedAt) > 48 * 60 * 60 * 1000;
  const top = selected?.rows[0];
  return (
    <div className="container page benchmark-page">
      <PageHeading
        eyebrow="EVIDENCE OVER HYPE"
        title="The right model. For your task."
        text="Explore published benchmark results across coding, reasoning, image generation and more. Every score has a source."
      />
      {error ? (
        <div className="ranking-notice" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <p role="status">Loading published benchmark results…</p>
      ) : (
        <>
          <div className="benchmark-categories" aria-label="Benchmark categories">
            {data.categories.map((category) => {
              const Icon = icons[category.id] || Brain;
              return (
                <button
                  key={category.id}
                  aria-pressed={selected?.id === category.id}
                  onClick={() => {
                    setParams({ category: category.id });
                    setQuery('');
                  }}
                >
                  <Icon size={18} />
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>
          {selected && source && (
            <>
              <div className="benchmark-overview">
                <div>
                  <span className="eyebrow">
                    {source.name} / {selected.name}
                  </span>
                  <h2>
                    {selected.name === 'Overall'
                      ? 'A broader view of capability.'
                      : selected.name + ', measured.'}
                  </h2>
                  <p>{selected.description}</p>
                  <a
                    className="text-link"
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View original leaderboard <ArrowUpRight size={14} />
                  </a>
                </div>
                {top && (
                  <div className="benchmark-leader">
                    <span className="mono">HIGHEST PUBLISHED SCORE IN THIS VIEW</span>
                    <strong>{top.model}</strong>
                    <div>
                      <b>{top.score.toFixed(2)}</b>
                      <span>/ 100</span>
                    </div>
                    <small>
                      {source.name} · {source.edition}
                    </small>
                  </div>
                )}
              </div>
              <div className="benchmark-freshness">
                <Clock3 size={16} />
                <div>
                  <strong>
                    {stale
                      ? 'Update delayed · last valid results shown'
                      : 'Automatically refreshed · every 6 hours'}
                  </strong>
                  <span>
                    Source checked {date(source.checkedAt)}. {source.edition}.
                  </span>
                  {source.sourceUpdatedAt && (
                    <span>Source revision last changed {date(source.sourceUpdatedAt)}.</span>
                  )}
                  <span>
                    New scores appear after the source publishes them. Retrieval time is not the
                    evaluation date.
                  </span>
                </div>
              </div>
              <div className="benchmark-toolbar">
                <label className="benchmark-search">
                  <Search size={17} />
                  <input
                    type="search"
                    aria-label="Search benchmark models"
                    placeholder="Find a model or provider…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <span role="status">
                  {rows.length} of {selected.rows.length} evaluated configurations
                </span>
              </div>
              <div className="benchmark-list" aria-label={`${selected.name} benchmark results`}>
                <div className="benchmark-list-heading mono" aria-hidden="true">
                  <span>RANK</span>
                  <span>MODEL / CONFIGURATION</span>
                  <span>SCORE / 100</span>
                  <span />
                </div>
                {rows.map((row) => (
                  <article className="benchmark-row" key={row.id}>
                    <span className="benchmark-rank mono" aria-label={`Rank ${row.rank}`}>
                      {String(row.rank).padStart(2, '0')}
                    </span>
                    <div className="benchmark-model">
                      <img
                        src={providerLogo(row.providerId)}
                        alt=""
                        width="30"
                        height="30"
                        loading="lazy"
                      />
                      <div>
                        <h3>{row.model}</h3>
                        <span>{row.provider}</span>
                      </div>
                    </div>
                    <div className="benchmark-score">
                      <strong>{row.score.toFixed(2)}</strong>
                      <div className="benchmark-bar" aria-hidden="true">
                        <i style={{ width: row.score + '%' }} />
                      </div>
                    </div>
                    <a
                      className="icon-btn"
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Published results for ${row.model}`}
                    >
                      <ArrowUpRight size={17} />
                    </a>
                  </article>
                ))}
                {!rows.length && (
                  <p className="empty-benchmarks">No evaluated models match this search.</p>
                )}
              </div>
              <section className="ranking-method">
                <h2>What these scores mean.</h2>
                <p>{selected.methodology}</p>
                <p>
                  Scores are only comparable within the selected benchmark and edition. Models not
                  evaluated by the source are absent, not scored zero. Ties at the displayed
                  precision share a rank; small gaps do not prove a meaningful quality difference.
                </p>
                <p>
                  Source:{' '}
                  <a href={source.dataUrl} target="_blank" rel="noopener noreferrer">
                    {source.name} published results
                  </a>{' '}
                  ·{' '}
                  <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
                    {source.license}
                  </a>
                  . Artificials normalizes and ranks these results; it does not run these
                  evaluations.{' '}
                  <a href="/data/benchmark-NOTICE.txt">Data attribution and modifications</a>.
                </p>
                {source.sourceUpdatedAt && (
                  <p className="caption">
                    Source revision last modified {date(source.sourceUpdatedAt)}.
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
