import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BENCHMARK_DOMAINS, type BenchmarkDomain } from '../../shared/benchmarks';
import { makerLogo } from '../../shared/makers';
import { testMetadata } from '../../shared/seo';
import { applyPageMetadata } from '../components/Metadata';
import { PageHeading } from '../components/Layout';
import { FollowButton } from '../components/Follow';
import { testFiguresOf } from '../lib/following';
import { RankChart } from '../components/charts/RankChart';
import { DomainKey } from '../components/profile/parts';
import { DOMAINS, day, score, whole } from '../components/profile/format';
import {
  useTestPage,
  useTestPages,
  type TestDirectory,
  type TestPage,
  type TestPageRow,
} from '../lib/overview';
import '../domain-colors.css';
import './model-profile.css';
import '../components/home/dashboard.css';
import './data-table.css';
import './tests.css';

/** How many results the list shows before "Show all". */
const FIRST_ROWS = 25;
const ORDER = ['overall', ...BENCHMARK_DOMAINS] as BenchmarkDomain[];

/** /tests lists every test by skill area; /tests/:id is one test's page. */
export default function Tests({ directory, test }: { directory?: TestDirectory; test?: TestPage }) {
  const { id } = useParams();
  return id ? (
    <TestView key={id} id={id} directory={directory} initial={test} />
  ) : (
    <TestList initial={directory} />
  );
}

function TestList({ initial }: { initial?: TestDirectory }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useTestPages(attempt, initial);
  return (
    <div className="container page tests-page">
      <PageHeading
        eyebrow="TESTS"
        title="What each test measures."
        text="Every published test on the site, by skill: who runs it, how many models it covers and which model scores highest."
      />
      {error && !data ? (
        <div className="dash-state" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="dash-state dash-pending is-tall" role="status">
          Loading the tests…
        </div>
      ) : (
        <>
          {ORDER.map((domain) => {
            const group = data.tests.filter((test) => test.domain === domain);
            if (!group.length) return null;
            return (
              <section
                key={domain}
                className={`test-group domain-${DOMAINS[domain].token}`}
                aria-labelledby={`group-${domain}`}
              >
                <h2 id={`group-${domain}`}>
                  <DomainKey domain={domain} />
                  {DOMAINS[domain].label}
                </h2>
                <ul className="test-grid">
                  {group.map((test) => (
                    <li key={test.id}>
                      <Link to={`/tests/${test.id}`} className="test-card">
                        <span className="test-card-name">
                          <b>{test.label}</b>
                          <small>
                            {test.source}, {whole(test.models)}{' '}
                            {test.models === 1 ? 'model' : 'models'}
                          </small>
                        </span>
                        {test.top && (
                          <span className="test-card-top">
                            <img
                              src={makerLogo(test.top.makerId)}
                              alt=""
                              width="28"
                              height="28"
                              loading="lazy"
                            />
                            <span>
                              <small>Top score</small>
                              <b>
                                {test.top.name} {score(test.top.score, test.unit)}
                              </b>
                            </span>
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="data-footnote">
            Each test’s results are its publisher’s own, credited on its page with its licence. A
            test page lists every model once, at its best configuration.
          </p>
        </>
      )}
    </div>
  );
}

function TestView({
  id,
  directory,
  initial,
}: {
  id: string;
  directory?: TestDirectory;
  initial?: TestPage;
}) {
  const [attempt, setAttempt] = useState(0);
  const tests = useTestPages(attempt, directory);
  const listed = tests.data?.tests.some((entry) => entry.id === id);
  const missing = tests.data !== undefined && !listed;
  const { data: test, error } = useTestPage(
    id,
    listed === true || initial?.id === id,
    attempt,
    initial,
  );

  useEffect(() => {
    if (test) applyPageMetadata(testMetadata(test));
    else if (missing) applyPageMetadata(testMetadata(null, id));
  }, [test, missing, id]);

  if (missing && !test)
    return (
      <div className="container page tests-page">
        <div className="dash-state is-tall">
          <h1 className="test-missing">We couldn’t find this test.</h1>
          <Link className="btn btn-small" to="/tests">
            See every test
          </Link>
        </div>
      </div>
    );
  if (!test)
    return (
      <div className="container page tests-page">
        {error || tests.error ? (
          <div className="dash-state" role="alert">
            <p>{error || tests.error}</p>
            <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          </div>
        ) : (
          <div className="dash-state dash-pending is-tall" role="status">
            Loading the test…
          </div>
        )}
      </div>
    );
  return <TestDetail test={test} others={tests.data?.tests ?? []} />;
}

/** A result's model, linked to its profile when it has one. */
function ModelName({ row }: { row: Pick<TestPageRow, 'slug' | 'name'> }) {
  return row.slug ? <Link to={`/models/${row.slug}`}>{row.name}</Link> : row.name;
}

function TestDetail({ test, others }: { test: TestPage; others: TestDirectory['tests'] }) {
  const [all, setAll] = useState(false);
  const value = (number: number) => score(number, test.unit);
  const range = (row: TestPageRow) =>
    row.ciLow !== undefined && row.ciHigh !== undefined
      ? `${value(row.ciLow)} to ${value(row.ciHigh)}`
      : '';
  const rows = all ? test.rows : test.rows.slice(0, FIRST_ROWS);
  const makers = new Set(test.rows.map((row) => row.makerId)).size;
  const related = others.filter((other) => other.domain === test.domain && other.id !== test.id);
  const [top] = test.rows;

  return (
    <div className={`container page profile-page test-page domain-${DOMAINS[test.domain].token}`}>
      <Link to="/tests" className="text-link profile-back">
        <ArrowLeft size={16} aria-hidden="true" /> All tests
      </Link>
      <header className="profile-header">
        <p className="test-kicker">
          <DomainKey domain={test.domain} />
          {DOMAINS[test.domain].label}
        </p>
        <h1 className="test-title">{test.label}</h1>
        <p className="profile-description">{test.description}</p>
        <p className="test-source">
          Published by{' '}
          <a href={test.sourceInfo.url} target="_blank" rel="noopener noreferrer">
            {test.sourceInfo.name}
          </a>{' '}
          under{' '}
          <a href={test.sourceInfo.licenseUrl} target="_blank" rel="noopener noreferrer">
            {test.sourceInfo.license}
          </a>
          . <Link to={`/leaderboard?category=${test.id}`}>Compare it with other tests</Link>
        </p>
        <div className="profile-actions">
          <FollowButton
            kind="tests"
            entry={{ slug: test.id, name: test.label, seen: testFiguresOf(test) }}
          />
        </div>
      </header>

      <section className="test-glance" aria-label={`${test.label} at a glance`}>
        <div className="glance-tile">
          <span>Top score</span>
          <strong>{value(top.score)}</strong>
          <small>
            <ModelName row={top} />, {top.maker || 'maker not reported'}
          </small>
          {test.nearTop !== undefined && (
            <small className="test-near">
              {test.nearTop
                ? `${counted(test.nearTop, 'other model', 'other models')} within its margin`
                : 'No other model within its margin'}
            </small>
          )}
        </div>
        <div className="glance-tile">
          <span>Models tested</span>
          <strong>{whole(test.models)}</strong>
          <small>from {counted(makers, 'maker', 'makers')}</small>
        </div>
        <div className="glance-tile">
          <span>Median score</span>
          <strong>{value(test.median)}</strong>
          <small>Half the models score above it</small>
        </div>
        {test.randomBaseline !== undefined ? (
          <div className="glance-tile">
            <span>Random guessing</span>
            <strong>{value(test.randomBaseline)}</strong>
            <small>What guessing alone would score</small>
          </div>
        ) : (
          <div className="glance-tile">
            <span>Scale</span>
            <strong>{test.unit === 'percent' ? '0 to 100%' : 'Open-ended'}</strong>
            <small>
              {test.unit === 'percent'
                ? 'The share of tasks done right'
                : 'Compare models, not the number itself'}
            </small>
          </div>
        )}
      </section>

      <section className="profile-card" aria-labelledby="top-heading">
        <div className="profile-card-head">
          <h2 id="top-heading">Top {Math.min(15, test.rows.length)}</h2>
          <p>
            Each model at its best configuration, coloured by maker.
            {test.randomBaseline !== undefined
              ? ' The dashed line marks what random guessing would score.'
              : ''}
            {test.nearTop !== undefined
              ? ' The publisher gives each score a range; a model whose score falls inside the leader’s range is not clearly behind it.'
              : ''}
          </p>
        </div>
        <RankChart
          items={test.rows.slice(0, 15).map((row) => ({
            key: row.name,
            name: row.name,
            makerId: row.makerId,
            maker: row.maker,
            value: row.score,
            low: row.ciLow,
            high: row.ciHigh,
            rank: row.rank,
            href: row.slug ? `/models/${row.slug}` : undefined,
          }))}
          unit={test.unit}
          format={(number) => (test.unit === 'percent' ? number.toFixed(1) : value(number))}
          label={`${test.label}, top ${Math.min(15, test.rows.length)} models`}
          baseline={
            test.randomBaseline !== undefined
              ? {
                  value: test.randomBaseline,
                  label: `Random guessing ${value(test.randomBaseline)}`,
                }
              : undefined
          }
        />
      </section>

      {test.makers.length > 1 && (
        <section className="profile-card" aria-labelledby="makers-heading">
          <div className="profile-card-head">
            <h2 id="makers-heading">The best model from each maker</h2>
            <p>Each maker’s highest-scoring model on this test, and its rank.</p>
          </div>
          <table className="data-table test-makers">
            <thead>
              <tr>
                <th scope="col">Maker</th>
                <th scope="col">Best model</th>
                <th scope="col">Score</th>
                <th scope="col">Rank</th>
              </tr>
            </thead>
            <tbody>
              {test.makers.map((row) => (
                <tr key={row.makerId}>
                  <th scope="row">
                    <span className="test-maker">
                      <img
                        src={makerLogo(row.makerId)}
                        alt=""
                        width="24"
                        height="24"
                        loading="lazy"
                      />
                      {row.page ? (
                        <Link to={`/makers/${row.page}`}>{row.maker}</Link>
                      ) : (
                        row.maker || 'Maker not reported'
                      )}
                    </span>
                  </th>
                  <td data-label="Best model">
                    <ModelName row={row} />
                  </td>
                  <td data-label="Score">{value(row.score)}</td>
                  <td data-label="Rank">
                    <Rank rank={row.rank} total={test.models} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {test.leaders.length > 0 && (
        <section className="profile-card" aria-labelledby="leaders-heading">
          <div className="profile-card-head">
            <h2 id="leaders-heading">New top scores</h2>
            <p>
              Each time a different model took the top spot, since the site began keeping this
              record.
              {test.leaders.some((change) => change.withinMargin)
                ? ' “Within margin” means the next model’s score was inside the range the publisher gives for the new leader’s score.'
                : ''}
            </p>
          </div>
          <ol className="test-leaders">
            {test.leaders.map((change) => (
              <li key={`${change.day}-${change.name}`}>
                <time dateTime={change.day}>{day(change.day)}</time>
                <span>
                  <ModelName row={change} /> took the top spot at {value(change.score)} from{' '}
                  <ModelName row={change.previous} />, which had led at{' '}
                  {value(change.previous.score)}.
                  {change.withinMargin && <b className="test-margin">Within margin</b>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="profile-card" aria-labelledby="results-heading">
        <div className="profile-card-head">
          <h2 id="results-heading">Every result</h2>
          <p>
            {whole(test.models)} models, each once at its best configuration, highest score first.
            Models with the same score share a rank.
          </p>
        </div>
        <table className="data-table test-results">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Model</th>
              <th scope="col">Maker</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.name}-${row.makerId}`}>
                <td data-label="Rank">
                  <Rank rank={row.rank} />
                </td>
                <th scope="row">
                  <ModelName row={row} />
                </th>
                <td data-label="Maker">
                  <span className="test-maker">
                    <img
                      src={makerLogo(row.makerId)}
                      alt=""
                      width="20"
                      height="20"
                      loading="lazy"
                    />
                    {row.maker || 'Not reported'}
                  </span>
                </td>
                <td data-label="Score">
                  {value(row.score)}
                  {range(row) && <small className="test-range">{range(row)}</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {test.rows.length > FIRST_ROWS && (
          <button
            type="button"
            className="btn btn-small btn-outline test-more"
            aria-expanded={all}
            onClick={() => setAll((open) => !open)}
          >
            {all ? 'Show the top 25' : `Show all ${whole(test.models)} models`}
          </button>
        )}
      </section>

      <section className="profile-card" aria-labelledby="method-heading">
        <div className="profile-card-head">
          <h2 id="method-heading">How it is scored</h2>
          <p>{test.methodology}</p>
        </div>
      </section>

      {related.length > 0 && (
        <nav className="test-related" aria-labelledby="related-heading">
          <h2 id="related-heading">Other {DOMAINS[test.domain].label.toLowerCase()} tests</h2>
          <ul>
            {related.map((other) => (
              <li key={other.id}>
                <Link to={`/tests/${other.id}`}>{other.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p className="data-footnote">
        Results from{' '}
        <a href={test.sourceInfo.url} target="_blank" rel="noopener noreferrer">
          {test.sourceInfo.name}
        </a>{' '}
        (
        <a href={test.sourceInfo.licenseUrl} target="_blank" rel="noopener noreferrer">
          {test.sourceInfo.license}
        </a>
        ), as published. Model names link to their pages where the site can match them; makers come
        from the model’s page, or else from the publisher.
      </p>
    </div>
  );
}

function counted(count: number, one: string, many: string) {
  return `${whole(count)} ${count === 1 ? one : many}`;
}

/** A rank as a chip, all of one shape; the top spot's is gold. */
function Rank({ rank, total }: { rank: number; total?: number }) {
  return (
    <span className={`rank-chip${rank === 1 ? ' is-first' : ''}`}>
      #{whole(rank)}
      {total ? ` of ${whole(total)}` : ''}
    </span>
  );
}
