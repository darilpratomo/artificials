import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock3, Search } from 'lucide-react';
import {
  BENCHMARK_DOMAINS,
  type BenchmarkCategory,
  type BenchmarkDomain,
  type BenchmarkSnapshot,
} from '../../shared/benchmarks';
import { PageHeading } from '../components/Layout';
import { DomainKey } from '../components/profile/parts';
import { DOMAINS, indexValue } from '../components/profile/format';
import { makerLogo } from '../../shared/makers';
import { ShareButton } from '../components/charts/ShareButton';
import { loadProfileLinks, testLabel, type ProfileLinks } from '../lib/profiles';
import '../domain-colors.css';

const domainOf = (category: BenchmarkCategory): BenchmarkDomain => category.domain ?? 'overall';
const formatScore = (value: number, category: BenchmarkCategory) =>
  category.unit === 'index' ? indexValue(value) : value.toFixed(2);

export default function BenchmarkRankings() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<BenchmarkSnapshot | null>(null);
  const [links, setLinks] = useState<ProfileLinks>({ rows: {}, names: {} });
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
  useEffect(() => {
    let active = true;
    // Links to model pages are an enhancement; rankings render without them.
    loadProfileLinks().then((value) => active && setLinks(value));
    return () => {
      active = false;
    };
  }, []);

  const domains = useMemo(
    () =>
      (['overall', ...BENCHMARK_DOMAINS] as BenchmarkDomain[])
        .map((domain) => ({
          domain,
          // The broad capability index leads its group, matching the default view.
          categories: (data?.categories.filter((category) => domainOf(category) === domain) ?? [])
            .map((category, index) => ({ category, index }))
            .sort(
              (a, b) =>
                Number(b.category.id === 'capability-index') -
                  Number(a.category.id === 'capability-index') || a.index - b.index,
            )
            .map(({ category }) => category),
        }))
        .filter((group) => group.categories.length),
    [data],
  );
  const selected =
    data?.categories.find((c) => c.id === params.get('category')) ||
    data?.categories.find((c) => c.id === 'capability-index') ||
    data?.categories[0];
  const selectedDomain = selected ? domainOf(selected) : 'overall';
  const siblings = domains.find((group) => group.domain === selectedDomain)?.categories ?? [];
  const source = data?.sources.find((s) => s.id === selected?.sourceId);
  const nameOf = (id: string) => {
    const slug = selected ? links.rows[`${selected.id}:${id}`] : undefined;
    return slug ? { slug, name: links.names[slug] } : null;
  };
  const rows =
    selected?.rows.filter((r) =>
      `${r.model} ${r.provider} ${nameOf(r.id)?.name ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ) || [];
  const stale = source && Date.now() - Date.parse(source.checkedAt) > 48 * 60 * 60 * 1000;
  const top = selected?.rows[0];
  const best = top?.score || 1;
  const choose = (category: BenchmarkCategory) => {
    setParams({ category: category.id });
    setQuery('');
  };

  return (
    <div className="container page benchmark-page">
      <PageHeading
        eyebrow="EVIDENCE OVER HYPE"
        title="The right model. For your task."
        text="See how AI models rank on coding, math, reasoning, knowledge and more. Pick a skill to compare every model tested on it."
      />
      {error ? (
        <div className="ranking-notice" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <p role="status">Loading benchmark results…</p>
      ) : (
        <>
          <div className="benchmark-domains" aria-label="Skill areas">
            {domains.map(({ domain, categories }) => (
              <button
                key={domain}
                type="button"
                className={`domain-${DOMAINS[domain].token}`}
                aria-pressed={selectedDomain === domain}
                onClick={() => choose(categories[0])}
              >
                <DomainKey domain={domain} />
                <span>{DOMAINS[domain].label}</span>
              </button>
            ))}
          </div>
          {siblings.length > 1 && (
            <div className="benchmark-tests" aria-label={`${DOMAINS[selectedDomain].label} tests`}>
              {siblings.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selected?.id === category.id}
                  onClick={() => choose(category)}
                >
                  {testLabel(category)}
                </button>
              ))}
            </div>
          )}
          {selected && source && (
            <div className={`domain-${DOMAINS[selectedDomain].token}`}>
              <div className="benchmark-overview">
                <div>
                  <span className="benchmark-kicker">
                    <DomainKey domain={selectedDomain} />
                    {DOMAINS[selectedDomain].label}
                  </span>
                  <h2>{testLabel(selected)}</h2>
                  <p>{selected.description}</p>
                  <Link className="text-link benchmark-test-link" to={`/tests/${selected.id}`}>
                    Open the {testLabel(selected)} page <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
                {top && (
                  <div className="benchmark-leader">
                    <span>Top score</span>
                    <strong>{nameOf(top.id)?.name ?? top.model}</strong>
                    <div>
                      <b>{formatScore(top.score, selected)}</b>
                      <span>
                        {selected.sourceId === 'arena'
                          ? 'Arena score'
                          : selected.unit === 'index'
                            ? 'index points'
                            : '/ 100'}
                      </span>
                    </div>
                    {nameOf(top.id) && <small>Setting: {top.model}</small>}
                  </div>
                )}
              </div>
              {/* Only a delayed refresh is announced; update times are not shown. */}
              {stale && (
                <div className="benchmark-freshness">
                  <Clock3 size={16} aria-hidden="true" />
                  <div>
                    <strong>Update delayed. Showing the last valid results.</strong>
                  </div>
                </div>
              )}
              <div className="benchmark-toolbar">
                <label className="benchmark-search">
                  <Search size={17} aria-hidden="true" />
                  <input
                    type="search"
                    aria-label="Search benchmark models"
                    placeholder="Find a model or maker…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <span role="status">
                  {rows.length} of {selected.rows.length} evaluated configurations
                </span>
                {rows.length > 0 && (
                  <ShareButton
                    title={`${testLabel(selected)}: top ${Math.min(rows.length, 25)}`}
                    render={(tools) =>
                      tools.rankImage(
                        {
                          title: `${testLabel(selected)}: top ${Math.min(rows.length, 25)}`,
                          subtitle: selected.description,
                          source: source
                            ? `${source.name} (${source.license})`
                            : 'published results',
                        },
                        rows.slice(0, 25).map((row) => ({
                          name: nameOf(row.id)?.name ?? row.model,
                          makerId: row.providerId,
                          value: row.score,
                        })),
                        selected.unit === 'index' ? 'index' : 'percent',
                        (value) => formatScore(value, selected),
                      )
                    }
                  />
                )}
              </div>
              <div className="benchmark-list" aria-label={`${testLabel(selected)} results`}>
                <div className="benchmark-list-heading" aria-hidden="true">
                  <span>Rank</span>
                  <span>Model</span>
                  <span>
                    {selected.unit === 'index' && selected.sourceId !== 'arena' ? 'Index' : 'Score'}
                  </span>
                </div>
                {rows.map((row) => {
                  const profile = nameOf(row.id);
                  const width =
                    selected.unit === 'index' ? (row.score / best) * 100 : Math.min(100, row.score);
                  return (
                    <article className="benchmark-row" key={row.id}>
                      <span className="benchmark-rank" aria-label={`Rank ${row.rank}`}>
                        {row.rank}
                      </span>
                      <div className="benchmark-model">
                        <img
                          src={makerLogo(row.providerId)}
                          alt=""
                          width="30"
                          height="30"
                          loading="lazy"
                        />
                        <div>
                          <h3>
                            {profile ? (
                              <Link to={`/models/${profile.slug}`}>{profile.name}</Link>
                            ) : (
                              row.model
                            )}
                          </h3>
                          <span>
                            {row.provider}
                            {profile && row.model !== profile.name ? ` · ${row.model}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="benchmark-score">
                        <strong>{formatScore(row.score, selected)}</strong>
                        <div className="benchmark-bar" aria-hidden="true">
                          <i style={{ width: `${Math.max(1, width)}%` }} />
                        </div>
                      </div>
                    </article>
                  );
                })}
                {!rows.length && (
                  <p className="empty-benchmarks">No evaluated models match this search.</p>
                )}
              </div>
              <section className="ranking-method">
                <h2>What these scores mean.</h2>
                <p>{selected.methodology}</p>
                <p>
                  Scores are only comparable within the selected test and edition. Models that were
                  not tested are absent, not scored zero. Ties at the displayed precision share a
                  rank, and small gaps do not prove a meaningful difference.
                </p>
                <p className="ranking-credit">
                  Analysis by Artificials, based on results published by{' '}
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.name}
                  </a>{' '}
                  (
                  <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
                    {source.license}
                  </a>
                  ). <a href="/data/benchmark-NOTICE.txt">Data credits</a>.
                </p>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
