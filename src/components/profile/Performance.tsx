import { Link } from 'react-router-dom';
import { BENCHMARK_DOMAINS, type BenchmarkDomain } from '../../../shared/benchmarks';
import type {
  ModelProfile,
  ProfileBucket,
  ProfileCategory,
  ProfileResult,
} from '../../lib/profiles';
import { DOMAINS, day, rankLabel, score, whole } from './format';
import { DomainKey, Explainer, Meter, Sources } from './parts';

function Detail({ result }: { result: ProfileResult }) {
  const parts = [`Setting: ${result.configuration}`];
  if (result.evaluatedAt) parts.push(`tested ${day(result.evaluatedAt)}`);
  if (result.stderr !== undefined) parts.push(`±${result.stderr.toFixed(1)} points`);
  return <p className="result-detail">{parts.join(', ')}</p>;
}

function ResultCard({
  category,
  results,
}: {
  category: ProfileCategory;
  results: ProfileResult[];
}) {
  const [best, ...others] = results;
  const domain = category.domain;
  return (
    <article className={`result-card domain-${DOMAINS[domain].token}`}>
      <header>
        <h4>{category.label}</h4>
        <span className="result-rank">{rankLabel(best.rank, best.total)}</span>
      </header>
      <p className="result-description">{category.description}</p>
      <div className="result-score">
        <strong>{score(best.score, category.unit)}</strong>
        <span>
          #{whole(best.rank)} of {whole(best.total)} models tested
        </span>
      </div>
      <Meter
        domain={domain}
        value={best.score}
        label={`${category.label}: ${score(best.score, category.unit)}. Median ${score(category.median, category.unit)}, top score ${score(category.best, category.unit)}.`}
        markers={[
          {
            at: category.median,
            name: `Median ${score(category.median, category.unit)}`,
            tone: 'median',
          },
          {
            at: category.best,
            name: `Top score ${score(category.best, category.unit)}`,
            tone: 'best',
          },
        ]}
      />
      <p className="result-legend">
        <span className="legend-median">Median {score(category.median, category.unit)}</span>
        <span className="legend-best">Top score {score(category.best, category.unit)}</span>
        {category.randomBaseline !== undefined && category.randomBaseline >= 1 && (
          <span>Guessing scores {score(category.randomBaseline, category.unit)}</span>
        )}
      </p>
      <Detail result={best} />
      {others.length > 0 && (
        <details className="result-others">
          <summary>
            {others.length} other {others.length === 1 ? 'setting' : 'settings'} tested
          </summary>
          <ul>
            {others.map((result) => (
              <li key={result.configuration}>
                <span>{result.configuration}</span>
                <strong>{score(result.score, category.unit)}</strong>
                <small>#{whole(result.rank)}</small>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

export default function Performance({
  profile,
  bucket,
}: {
  profile: ModelProfile;
  bucket: ProfileBucket;
}) {
  const index = profile.results.filter((result) => result.category === 'capability-index');
  const indexInfo = profile.categories.find((entry) => entry.id === 'capability-index');
  const groups = (['overall', ...BENCHMARK_DOMAINS] as BenchmarkDomain[])
    .map((domain) => ({
      domain,
      categories: profile.categories.filter(
        (category) => category.domain === domain && category.unit === 'percent',
      ),
    }))
    .filter((group) => group.categories.length);

  if (!profile.results.length)
    return (
      <div className="profile-panel-body">
        <section className="profile-card profile-empty">
          <h2>Not tested yet</h2>
          <p>
            No published benchmark covers {profile.name} yet. Newer releases, small variants and
            models served by a single host are often not tested. You can still compare its price,
            providers and context window.
          </p>
          <Link className="btn btn-small" to="/leaderboard">
            Browse tested models
          </Link>
        </section>
        <Sources bucket={bucket} />
      </div>
    );

  return (
    <div className="profile-panel-body">
      <Explainer>
        A benchmark is a standard test. Scores show the share of tasks solved. Each rank compares{' '}
        {profile.name} with every model tested on the same benchmark, so ranks from different tests
        are not added together.
      </Explainer>

      {index.length > 0 && indexInfo && (
        <section className="profile-card index-card" aria-labelledby="index-heading">
          <div>
            <h2 id="index-heading">Capability index</h2>
            <p>{indexInfo.description}</p>
          </div>
          <div className="index-figure">
            <strong>{index[0].score.toFixed(1)}</strong>
            <span>{rankLabel(index[0].rank, index[0].total)}</span>
            {index[0].ciLow !== undefined && (
              <small>
                Likely between {index[0].ciLow.toFixed(1)} and {index[0].ciHigh!.toFixed(1)}. The
                best model scores {indexInfo.best.toFixed(1)}; the median is{' '}
                {indexInfo.median.toFixed(1)}.
              </small>
            )}
          </div>
        </section>
      )}

      {groups.map(({ domain, categories }) => (
        <section key={domain} className="result-group" aria-labelledby={`group-${domain}`}>
          <div className="result-group-head">
            <DomainKey domain={domain} />
            <div>
              <h3 id={`group-${domain}`}>{DOMAINS[domain].label}</h3>
              <p>{DOMAINS[domain].plain}</p>
            </div>
          </div>
          <div className="result-grid">
            {categories.map((category) => (
              <ResultCard
                key={category.id}
                category={category}
                results={profile.results.filter((result) => result.category === category.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <p className="profile-note">
        Response speed and latency are not measured here yet, so none are shown.
      </p>
      <Sources bucket={bucket} benchmarks />
    </div>
  );
}
