import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, BarChart3, GitCompareArrows } from 'lucide-react';
import { makerLogo } from '../../shared/makers';
import { ARTICLES } from '../../shared/content';
import { ArticleCover } from '../components/ArticleCover';
import { Highlights, highlightValue } from '../components/home/Highlights';
import { ShareButton } from '../components/charts/ShareButton';
import { ModelSearch } from '../components/home/ModelSearch';
import { ReleaseTimeline } from '../components/home/ReleaseTimeline';
import { day } from '../components/profile/format';
import { useOverview, type ModelOverview } from '../lib/overview';
import '../components/home/dashboard.css';
import './home.css';

// The charts and the full model list load as one chunk, after the page is up.
const charts = () => import('../components/home/Charts');
const RankingSection = lazy(() => charts().then((module) => ({ default: module.RankingSection })));
const ValueSection = lazy(() => charts().then((module) => ({ default: module.ValueSection })));
const ModelExplorer = lazy(() => charts().then((module) => ({ default: module.ModelExplorer })));
const MarketSection = lazy(() => charts().then((module) => ({ default: module.MarketSection })));

function Pending({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`dash-state dash-pending${tall ? ' is-tall' : ''}`} role="status">
      Loading…
    </div>
  );
}

export default function Home({ initial }: { initial?: ModelOverview }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useOverview(attempt, initial);
  const leader = data?.index[0];
  const newest = data?.releases.find((release) => release.notable);
  const openLeader = data?.index.find((point) => point.openWeights);
  const total = data?.counts.models ?? 0;

  return (
    <div className="home-page">
      <div className="hero-banner-shell">
        <div className="hero-banner-art" aria-hidden="true">
          <picture>
            <source
              media="(max-width: 760px)"
              srcSet="/editorial/hero-brand-mobile-orbit-small.webp 640w, /editorial/hero-brand-mobile-orbit.webp 1024w"
              sizes="100vw"
            />
            <img
              src="/editorial/hero-brand-orbit.webp"
              srcSet="/editorial/hero-brand-orbit-small.webp 960w, /editorial/hero-brand-orbit.webp 1920w"
              sizes="100vw"
              width="1920"
              height="820"
              alt=""
              fetchPriority="high"
            />
          </picture>
        </div>
        <section className="signal-hero container">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-label mono">
            <span className="signal-light" /> A LITTLE CURIOSITY GOES A LONG WAY
            <span className="hero-edition">MODELS / SCORES / PRICES</span>
          </div>
          <div className="signal-copy">
            <h1>
              Intelligence.
              <br />
              <span>In perspective.</span>
            </h1>
            <p>
              {`Test scores, prices and new releases for ${
                total ? `${total.toLocaleString('en-US')} ` : ''
              }AI models, in one place.`}
            </p>
            <ModelSearch total={total} />
            <div className="hero-actions">
              <a className="btn" href="#rankings">
                <BarChart3 size={16} aria-hidden="true" /> See the rankings
              </a>
              <Link className="btn btn-outline" to="/compare">
                <GitCompareArrows size={16} aria-hidden="true" /> Compare models
              </Link>
            </div>
          </div>
          <div className="hero-bottom mono">
            <a href="#leaders">
              SCROLL TO EXPLORE <ArrowDown size={14} aria-hidden="true" />
            </a>
            <span>HUMAN CURIOSITY. ARTIFICIAL INTELLIGENCE.</span>
          </div>
        </section>
      </div>
      {error && !data ? (
        <div className="container dash-state dash-error" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <section className="live-band" aria-label="Right now">
            <div className="container">
              <div>
                <span>Top of the capability index</span>
                {leader ? (
                  <p>
                    <img src={makerLogo(leader.makerId)} alt="" width="28" height="28" />
                    {leader.slug ? (
                      <Link to={`/models/${leader.slug}`}>{leader.name}</Link>
                    ) : (
                      <strong>{leader.name}</strong>
                    )}
                    <b>{leader.index.toFixed(1)}</b>
                  </p>
                ) : (
                  <p className="live-pending">Loading…</p>
                )}
              </div>
              <div>
                <span>Newest release</span>
                {newest ? (
                  <p>
                    <img src={makerLogo(newest.makerId)} alt="" width="28" height="28" />
                    <Link to={`/models/${newest.slug}`}>{newest.name}</Link>
                    <b>{day(newest.date)}</b>
                  </p>
                ) : (
                  <p className="live-pending">Loading…</p>
                )}
              </div>
              <div>
                <span>Models tracked</span>
                {data ? (
                  <p>
                    <strong>{data.counts.models.toLocaleString('en-US')}</strong>
                    <b>{`${data.counts.tested} tested, ${data.counts.providers} providers`}</b>
                  </p>
                ) : (
                  <p className="live-pending">Loading…</p>
                )}
              </div>
              <div>
                <span>Best open-weights model</span>
                {openLeader ? (
                  <p>
                    <img src={makerLogo(openLeader.makerId)} alt="" width="28" height="28" />
                    {openLeader.slug ? (
                      <Link to={`/models/${openLeader.slug}`}>{openLeader.name}</Link>
                    ) : (
                      <strong>{openLeader.name}</strong>
                    )}
                    <b>{openLeader.index.toFixed(1)}</b>
                  </p>
                ) : (
                  <p className="live-pending">Loading…</p>
                )}
              </div>
            </div>
          </section>

          <section id="leaders" className="dash-section container" aria-labelledby="leaders-title">
            <header className="dash-heading">
              <div>
                <h2 id="leaders-title">Leaders right now</h2>
                <p>
                  The top model on each test, from published results. Every card names the test
                  behind it.
                </p>
              </div>
              <div className="dash-heading-actions">
                <Link className="text-link" to="/leaders">
                  Full rankings <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
                {data && (
                  <ShareButton
                    title="AI model leaders"
                    render={(tools) =>
                      tools.listImage(
                        {
                          title: 'AI model leaders',
                          subtitle: 'The top model on each test, from published results.',
                          source:
                            'Epoch AI (CC BY 4.0), LiveBench (Apache-2.0), T2I-CoReBench (CC BY-SA 4.0), models.dev (MIT)',
                        },
                        data.highlights.map((item) => ({
                          label: item.title,
                          detail: `${item.name}${item.maker ? `, ${item.maker}` : ''}. ${item.detail}`,
                          value: highlightValue(item),
                          makerId: item.makerId,
                        })),
                      )
                    }
                  />
                )}
              </div>
            </header>
            {data ? <Highlights items={data.highlights} /> : <Pending />}
          </section>

          <section
            id="rankings"
            className="dash-section container"
            aria-labelledby="rankings-title"
          >
            <header className="dash-heading">
              <h2 id="rankings-title">Rankings</h2>
              <p>
                Rank models on the capability index or on a single test. Scores from different tests
                are never mixed.
              </p>
            </header>
            <Suspense fallback={<Pending tall />}>
              {data ? <RankingSection overview={data} /> : <Pending tall />}
            </Suspense>
          </section>

          <section id="value" className="dash-section container" aria-labelledby="value-title">
            <header className="dash-heading">
              <div>
                <h2 id="value-title">Score, price and time</h2>
                <p>
                  Which models give the most for the money, how fast the top score is rising, and
                  how much text each one can take in.
                </p>
              </div>
              <Link className="text-link" to="/score-price-time">
                Explore the chart <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </header>
            <Suspense fallback={<Pending tall />}>
              {data ? (
                <ValueSection index={data.index} releases={data.releases} />
              ) : (
                <Pending tall />
              )}
            </Suspense>
          </section>

          <section id="market" className="dash-section container" aria-labelledby="market-title">
            <header className="dash-heading">
              <div>
                <h2 id="market-title">The AI model market</h2>
                <p>
                  What today’s models can do, what they cost, who makes the most of them and which
                  ones you can buy almost anywhere.
                </p>
              </div>
              <Link className="text-link" to="/market">
                Market details <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </header>
            <Suspense fallback={<Pending tall />}>
              {data ? <MarketSection overview={data} /> : <Pending tall />}
            </Suspense>
          </section>

          <section
            id="releases"
            className="dash-section container"
            aria-labelledby="releases-title"
          >
            <header className="dash-heading">
              <div>
                <h2 id="releases-title">New releases</h2>
                <p>
                  New models appear here as soon as the catalog lists them. Test scores follow once
                  a test covers the model.
                </p>
              </div>
              <Link className="text-link" to="/releases">
                Full release timeline <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </header>
            {data ? <ReleaseTimeline releases={data.releases} /> : <Pending />}
          </section>

          <section id="all-models" className="dash-section container" aria-labelledby="all-title">
            <header className="dash-heading">
              <div>
                <h2 id="all-title">Every model</h2>
                <p>
                  All {total ? total.toLocaleString('en-US') : ''} models we track, with release
                  date, context window, price and capability index where known.
                </p>
              </div>
              <Link className="text-link" to="/models">
                Open directory <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </header>
            <Suspense fallback={<Pending tall />}>
              <ModelExplorer total={total} />
            </Suspense>
          </section>
        </>
      )}

      <section className="dash-section container home-insights" aria-labelledby="insights-title">
        <header className="dash-heading">
          <h2 id="insights-title">Insights and guides</h2>
          <Link className="text-link" to="/news">
            All insights <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </header>
        <div className="editorial-grid">
          {ARTICLES.filter((article) => article.published)
            .slice(0, 3)
            .map((article) => (
              <Link to={'/news/' + article.slug} className="editorial-card" key={article.id}>
                <ArticleCover article={article} decorative />
                <div className="editorial-meta">
                  <span>{article.category}</span>
                </div>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <span className="text-link">
                  Read the guide <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
