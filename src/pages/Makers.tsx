import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { makerColor, makerLogo } from '../../shared/makers';
import { makerMetadata } from '../../shared/seo';
import { applyPageMetadata } from '../components/Metadata';
import { PageHeading } from '../components/Layout';
import { RankChart } from '../components/charts/RankChart';
import { DomainKey, Meter } from '../components/profile/parts';
import {
  DOMAINS,
  day,
  indexValue,
  price,
  rankLabel,
  score,
  standing,
  tokens,
  whole,
} from '../components/profile/format';
import {
  useMaker,
  useMakers,
  type MakerDirectory,
  type MakerPage,
  type MakerResult,
} from '../lib/overview';
import '../domain-colors.css';
import './model-profile.css';
import '../components/home/dashboard.css';
import './data-table.css';
import './makers.css';

/** How many models the list shows before "Show all". */
const FIRST_MODELS = 15;

/** /makers lists every maker; /makers/:slug is one maker's page. */
export default function Makers({
  directory,
  maker,
}: {
  directory?: MakerDirectory;
  maker?: MakerPage;
}) {
  const { slug } = useParams();
  return slug ? (
    <MakerView key={slug} slug={slug} directory={directory} initial={maker} />
  ) : (
    <MakerList initial={directory} />
  );
}

function MakerList({ initial }: { initial?: MakerDirectory }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useMakers(attempt, initial);
  return (
    <div className="container page makers-page">
      <PageHeading
        eyebrow="MODEL MAKERS"
        title="Who makes the models."
        text="Every maker with models on the site: how many it has, how many are tested, and the best score each reaches on the capability index."
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
          Loading the makers…
        </div>
      ) : (
        <>
          <ul className="maker-grid">
            {data.makers.map((maker) => (
              <li key={maker.slug}>
                <Link
                  to={`/makers/${maker.slug}`}
                  className="maker-card"
                  style={{ '--maker': makerColor(maker.id) } as CSSProperties}
                >
                  <img src={makerLogo(maker.id)} alt="" width="40" height="40" loading="lazy" />
                  <span className="maker-card-name">
                    <b>{maker.name}</b>
                    <small>
                      {whole(maker.models)} {maker.models === 1 ? 'model' : 'models'},{' '}
                      {whole(maker.tested)} tested
                    </small>
                  </span>
                  {maker.best ? (
                    <span className="maker-card-best">
                      <b>{indexValue(maker.best.index)}</b>
                      <small>{maker.best.name}</small>
                    </span>
                  ) : (
                    <span className="maker-card-best is-empty">
                      <small>Not on the index yet</small>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <p className="data-footnote">
            A maker is listed with at least three models that it sells, that several hosts list or
            that a test covers, or with one tested model. The score is its best model on the Epoch
            Capabilities Index, from{' '}
            <a href="https://epoch.ai/benchmarks" target="_blank" rel="noopener noreferrer">
              Epoch AI
            </a>{' '}
            (CC BY 4.0). Models from{' '}
            <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
              models.dev
            </a>{' '}
            (MIT).
          </p>
        </>
      )}
    </div>
  );
}

function MakerView({
  slug,
  directory,
  initial,
}: {
  slug: string;
  directory?: MakerDirectory;
  initial?: MakerPage;
}) {
  const [attempt, setAttempt] = useState(0);
  const makers = useMakers(attempt, directory);
  const listed = makers.data?.makers.some((entry) => entry.slug === slug);
  const missing = makers.data !== undefined && !listed;
  const { data: maker, error } = useMaker(
    slug,
    listed === true || initial?.slug === slug,
    attempt,
    initial,
  );

  useEffect(() => {
    if (maker) applyPageMetadata(makerMetadata(maker));
    else if (missing) applyPageMetadata(makerMetadata(null, slug));
  }, [maker, missing, slug]);

  if (missing && !maker)
    return (
      <div className="container page makers-page">
        <div className="dash-state is-tall">
          <h1 className="maker-missing">We couldn’t find this maker.</h1>
          <Link className="btn btn-small" to="/makers">
            See every maker
          </Link>
        </div>
      </div>
    );
  if (!maker)
    return (
      <div className="container page makers-page">
        {error || makers.error ? (
          <div className="dash-state" role="alert">
            <p>{error || makers.error}</p>
            <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          </div>
        ) : (
          <div className="dash-state dash-pending is-tall" role="status">
            Loading the maker…
          </div>
        )}
      </div>
    );
  return <MakerDetail maker={maker} others={makers.data?.makers ?? []} />;
}

/** A missing value: a dash to the eye, words to a screen reader. */
function None({ text }: { text: string }) {
  return (
    <>
      <span className="maker-none" aria-hidden="true">
        —
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}

/** A result's model, linked to its profile when it has one. */
function ModelLink({ result }: { result: Pick<MakerResult, 'slug' | 'name'> }) {
  return result.slug ? <Link to={`/models/${result.slug}`}>{result.name}</Link> : result.name;
}

function MakerDetail({ maker, others }: { maker: MakerPage; others: MakerDirectory['makers'] }) {
  const [all, setAll] = useState(false);
  const index = maker.results.find((result) => result.test === 'capability-index');
  // Its best standing on any test, for makers that lead none.
  const strongest = [...maker.results].sort(
    (a, b) => a.rank / a.total - b.rank / b.total || b.total - a.total,
  )[0];
  const ranking = maker.ranking;
  const models = all ? maker.lineup : maker.lineup.slice(0, FIRST_MODELS);
  const counted = (count: number, one: string, many: string) =>
    `${whole(count)} ${count === 1 ? one : many}`;

  return (
    <div className="container page profile-page maker-page">
      <Link to="/makers" className="text-link profile-back">
        <ArrowLeft size={16} aria-hidden="true" /> All makers
      </Link>
      <header className="profile-header">
        <div className="profile-identity">
          <img src={makerLogo(maker.id)} width="48" height="48" alt="" />
          <div>
            <p className="profile-maker">AI model maker</p>
            <h1>{maker.name}</h1>
          </div>
        </div>
        <p className="profile-description">
          {counted(maker.models, 'model', 'models')} on Artificials,{' '}
          {maker.tested ? `${whole(maker.tested)} with published test results` : 'none tested yet'}
          {maker.openWeights
            ? ` and ${whole(maker.openWeights)} with open weights you can download`
            : ''}
          .
        </p>
      </header>

      <section className="maker-glance" aria-label={`${maker.name} at a glance`}>
        <div className="glance-tile">
          <span>Best on the capability index</span>
          {maker.best && index ? (
            <>
              <strong>{indexValue(maker.best.index)}</strong>
              <small>
                <ModelLink result={maker.best} />, #{whole(index.rank)} of {whole(index.total)}
              </small>
            </>
          ) : (
            <>
              <strong>Not yet</strong>
              <small>None of its models is on the index yet</small>
            </>
          )}
        </div>
        <div className="glance-tile">
          {maker.leads > 0 ? (
            <>
              <span>Top score on</span>
              <strong>{counted(maker.leads, 'test', 'tests')}</strong>
              <small>of the {whole(maker.results.length)} its models are tested on</small>
            </>
          ) : strongest ? (
            <>
              <span>Best rank</span>
              <strong>{rankLabel(strongest.rank, strongest.total)}</strong>
              <small>
                {strongest.name} on {strongest.label}
              </small>
            </>
          ) : (
            <>
              <span>Test results</span>
              <strong>None yet</strong>
              <small>No published test covers its models</small>
            </>
          )}
        </div>
        <div className="glance-tile">
          <span>Newest release</span>
          {maker.newest ? (
            <>
              <strong>
                <Link to={`/models/${maker.newest.slug}`}>{maker.newest.name}</Link>
              </strong>
              <small>{day(maker.newest.date)}</small>
            </>
          ) : (
            <>
              <strong>Not reported</strong>
              <small>No release date is listed</small>
            </>
          )}
        </div>
        <div className="glance-tile">
          <span>Models</span>
          <strong>{whole(maker.models)}</strong>
          <small>
            {whole(maker.tested)} tested, {whole(maker.openWeights)} with open weights
          </small>
        </div>
      </section>

      {maker.areas.length > 0 && (
        <section className="profile-card profile-skills" aria-labelledby="areas-heading">
          <div className="profile-card-head">
            <h2 id="areas-heading">Where {maker.name} stands</h2>
            <p>
              Its best model’s rank among all models tested on each skill area’s main test, the same
              tests model pages use. A longer bar means a better rank.
            </p>
          </div>
          <ul className="skill-rows maker-skills">
            {maker.areas.map((result) => {
              const rank = rankLabel(result.rank, result.total);
              return (
                <li key={result.area}>
                  <div className="skill-label">
                    <DomainKey domain={result.area} />
                    <span>
                      <strong>{DOMAINS[result.area].label}</strong>
                      <small>
                        {result.name} on {result.label}
                      </small>
                    </span>
                  </div>
                  <Meter
                    domain={result.area}
                    value={standing(result.rank, result.total)}
                    label={`${DOMAINS[result.area].label}: ${result.name}, ${rank} on ${result.label}, score ${score(result.score, result.unit)}`}
                  />
                  <span className="skill-rank">{rank}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {ranking && (
        <section className="profile-card" aria-labelledby="ranking-heading">
          <div className="profile-card-head">
            <h2 id="ranking-heading">On the capability index</h2>
            <p>
              {ranking.count === 1
                ? 'Its one model on the Epoch Capabilities Index'
                : ranking.count > ranking.models.length
                  ? `Its best ${ranking.models.length} of ${whole(ranking.count)} models on the Epoch Capabilities Index`
                  : `Its ${whole(ranking.count)} models on the Epoch Capabilities Index`}
              , each with its rank among all {whole(ranking.total)} models.{' '}
              {ranking.top.makerId === maker.id
                ? `${ranking.top.name} holds the top score, ${indexValue(ranking.top.index)}.`
                : `The top score is ${indexValue(ranking.top.index)}, held by ${ranking.top.name} from ${ranking.top.maker}.`}
            </p>
          </div>
          <RankChart
            items={ranking.models.map((model) => ({
              key: model.name,
              name: model.name,
              makerId: maker.id,
              // Every model here is the maker's own, so rows need not repeat its name.
              maker: '',
              value: model.index,
              rank: model.rank,
              href: model.slug ? `/models/${model.slug}` : undefined,
              details: [
                `#${whole(model.rank)} of ${whole(ranking.total)}`,
                model.date ? `Released ${day(model.date)}` : '',
                model.price !== undefined ? `${price(model.price)} per 1M tokens, blended` : '',
              ].filter(Boolean),
            }))}
            unit="index"
            format={(value) => value.toFixed(1)}
            label={`${maker.name} models on the capability index`}
            baseline={
              ranking.top.makerId === maker.id
                ? undefined
                : { value: ranking.top.index, label: `Top score ${indexValue(ranking.top.index)}` }
            }
          />
        </section>
      )}

      {maker.results.length > 0 && (
        <section className="profile-card" aria-labelledby="tests-heading">
          <div className="profile-card-head">
            <h2 id="tests-heading">Every test</h2>
            <p>
              Its best result on each published test, and that result’s rank among every model
              tested. Scores from different tests are never combined.
            </p>
          </div>
          <table className="data-table maker-tests">
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col">Best model</th>
                <th scope="col">Score</th>
                <th scope="col">Rank</th>
              </tr>
            </thead>
            <tbody>
              {maker.results.map((result) => (
                <tr key={result.test}>
                  <th scope="row">
                    <span className="maker-test">
                      <i className={`domain-${DOMAINS[result.domain].token}`} aria-hidden="true" />
                      <Link to={`/tests/${result.test}`}>{result.label}</Link>
                    </span>
                  </th>
                  <td data-label="Best model">
                    <ModelLink result={result} />
                  </td>
                  <td data-label="Score">{score(result.score, result.unit)}</td>
                  <td data-label="Rank">
                    <span className={`rank-chip${result.rank === 1 ? ' is-first' : ''}`}>
                      #{whole(result.rank)} of {whole(result.total)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="profile-card" aria-labelledby="models-heading">
        <div className="profile-card-head">
          <h2 id="models-heading">Every model</h2>
          <p>
            Newest first. The price is per 1M tokens, blended three input tokens to one output
            token: {maker.name}’s own listing, or else the middle price across hosts.
          </p>
        </div>
        <table className="data-table maker-models">
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Released</th>
              <th scope="col">Context</th>
              <th scope="col">Price</th>
              <th scope="col">Capability index</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.slug}>
                <th scope="row">
                  <Link to={`/models/${model.slug}`}>{model.name}</Link>
                </th>
                <td data-label="Released">{day(model.date)}</td>
                <td data-label="Context">
                  {model.context ? `${tokens(model.context)} tokens` : <None text="Not reported" />}
                </td>
                <td data-label="Price">
                  {model.price !== null ? price(model.price) : <None text="No paid listing" />}
                </td>
                <td data-label="Capability index">
                  {model.index !== null ? (
                    indexValue(model.index)
                  ) : (
                    <None text="Not on the index" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {maker.lineup.length > FIRST_MODELS && (
          <button
            type="button"
            className="btn btn-small btn-outline maker-more"
            aria-expanded={all}
            onClick={() => setAll((value) => !value)}
          >
            {all ? 'Show fewer models' : `Show all ${whole(maker.lineup.length)} models`}
          </button>
        )}
      </section>

      {others.length > 1 && (
        <nav className="maker-others" aria-labelledby="others-heading">
          <h2 id="others-heading">Other makers</h2>
          <ul>
            {others
              .filter((other) => other.slug !== maker.slug)
              .map((other) => (
                <li key={other.slug}>
                  <Link to={`/makers/${other.slug}`}>
                    <img src={makerLogo(other.id)} alt="" width="24" height="24" loading="lazy" />
                    {other.name}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      )}

      <p className="data-footnote">
        Models, prices, context windows and release dates from{' '}
        <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
          models.dev
        </a>{' '}
        (MIT).
        {maker.sources.length > 0 && ' Test results from '}
        {maker.sources.map((source, position) => (
          <span key={source.id}>
            {position === 0 ? '' : position === maker.sources.length - 1 ? ' and ' : ', '}
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.name}
            </a>{' '}
            (
            <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
              {source.license}
            </a>
            )
          </span>
        ))}
        {maker.sources.length > 0 && '.'} A model counts here when {maker.name} sells it, several
        hosts list it or a test covers it. Each figure is the source’s own; nothing is combined into
        a new score.
      </p>
    </div>
  );
}
