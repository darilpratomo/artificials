import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Cpu,
  Braces,
  Layers3,
  Command,
  ShieldCheck,
  Code2,
  Database,
  ChevronRight,
} from 'lucide-react';
import { Reveal, ScrollJourney } from '../components/Motion';
import { useCatalogSummary, compactNumber, updatedDate, providerLogo } from '../lib/catalog';
import ModelCard from '../components/ModelCard';
import { ARTICLES } from '../../shared/content';
import { ArticleCover } from '../components/ArticleCover';
export default function Home() {
  const { data, error } = useCatalogSummary();
  const [prompt, setPrompt] = useState('');
  return (
    <>
      <div className="hero-banner-shell">
        <div className="hero-banner-art" aria-hidden="true">
          <picture>
            <source
              media="(max-width: 760px)"
              srcSet="/editorial/hero-mobile-small.webp 480w, /editorial/hero-mobile.webp 768w"
              sizes="100vw"
            />
            <img
              src="/editorial/hero-engraved.webp"
              srcSet="/editorial/hero-engraved-small.webp 960w, /editorial/hero-engraved.webp 1920w"
              sizes="100vw"
              width="1920"
              height="819"
              alt=""
              fetchPriority="high"
            />
          </picture>
        </div>
        <section className="signal-hero container">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-label mono">
            <span className="signal-light" /> THE NEXT ERA IS ALREADY HERE
            <span className="hero-edition">ARTIFICIALS / INTELLIGENCE INDEX</span>
          </div>
          <div className="signal-copy">
            <h1>
              Intelligence.
              <br />
              <span>In perspective.</span>
            </h1>
            <p>
              Make sense of a world moving at machine speed.
              <br className="desktop-break" /> Explore the models. Understand the possibilities.
              <br className="desktop-break" /> Build what comes next.
            </p>
            <div className="hero-actions">
              <Link className="btn" to="/models">
                Explore AI models <ArrowUpRight size={16} />
              </Link>
              <Link className="btn btn-outline" to="/studio">
                <Command size={15} /> Open Studio
              </Link>
            </div>
            <div className="hero-trust mono">
              <ShieldCheck size={14} /> EXPLORE. LEARN. BUILD. <span /> FREE TO EXPLORE
            </div>
          </div>
          <div className="hero-bottom mono">
            <a href="#intelligence">
              SCROLL TO DISCOVER <ArrowDown size={14} />
            </a>
            <span>HUMAN CURIOSITY. ARTIFICIAL INTELLIGENCE.</span>
            <span>[ 01 — 05 ]</span>
          </div>
        </section>
      </div>
      <section className="provider-band" aria-label="Explore leading AI providers">
        <div className="container">
          <span className="mono">
            A WIDER VIEW
            <br />
            <b>OF INTELLIGENCE</b>
          </span>
          {[
            ['openai', 'OpenAI'],
            ['anthropic', 'Anthropic'],
            ['google', 'Google'],
            ['xai', 'xAI'],
            ['deepseek', 'DeepSeek'],
            ['mistral', 'Mistral'],
          ].map(([id, name]) => (
            <Link key={id} to={`/models?provider=${id}`}>
              <img src={providerLogo(id)} width="25" height="25" alt="" />
              <span>{name}</span>
            </Link>
          ))}
        </div>
      </section>
      <section id="intelligence" className="section container intelligence-section">
        <Reveal>
          <div className="section-kicker mono">
            <span>01 / THE INTELLIGENCE INDEX</span>
            <span className="data-stamp">
              <span className="signal-light" />
              {data ? `SYNCED ${updatedDate(data.updatedAt)}` : 'SOURCE-ATTRIBUTED CATALOG'}
            </span>
          </div>
          <div className="section-heading">
            <h2>
              A fast-moving field.
              <br />
              <span>A clearer point of view.</span>
            </h2>
            <p>
              Discover capabilities, context windows and pricing
              <br className="desktop-break" /> across the AI landscape. Every number has a source.
            </p>
          </div>
        </Reveal>
        <Reveal from="right">
          <div className="index-stats">
            {[
              [compactNumber(data?.totalModels), 'MODEL OFFERINGS'],
              [compactNumber(data?.totalProviders), 'API PROVIDERS'],
              [compactNumber(data?.reasoningModels), 'REASONING OFFERINGS'],
              ['Open access', 'NO ACCOUNT REQUIRED'],
            ].map(([n, label]) => (
              <div key={label}>
                <span className="mono">{label}</span>
                <strong>{n === 'Not reported' ? '—' : n}</strong>
                <span className="stat-line" />
              </div>
            ))}
          </div>
        </Reveal>
        <div className="catalog-section-label">
          <h3>From the frontier</h3>
          <Link className="text-link" to="/models">
            View the directory <ArrowUpRight size={15} />
          </Link>
        </div>
        {error ? (
          <p className="notice" role="status">
            {error} <Link to="/models">Open the model directory.</Link>
          </p>
        ) : (
          <div className="home-model-grid">
            {data?.featured?.slice(0, 6).map((m) => (
              <Reveal key={m.id}>
                <ModelCard model={m} />
              </Reveal>
            )) ||
              Array.from({ length: 6 }, (_, i) => (
                <div className="model-skeleton" key={i} aria-label="Loading model details" />
              ))}
          </div>
        )}
        <p className="data-footnote">
          Offerings include the same model at different hosts. Scheduled updates; coverage depends
          on the source.
        </p>
      </section>
      <ScrollJourney>
        <div className="journey-panel journey-intro">
          <span className="section-kicker mono">02 / CONNECT THE DOTS</span>
          <h2>
            From a signal.
            <br />
            To your
            <br />
            <span>next big thing.</span>
          </h2>
          <p>A better way to navigate artificial intelligence, one perspective at a time.</p>
          <span className="journey-hint mono">
            SCROLL TO EXPLORE <ArrowRight size={17} />
          </span>
          <div className="journey-orbits" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
        {[
          {
            n: '01',
            title: 'Discover.',
            text: 'Find the models behind the moment. Explore a source-attributed catalog across leading labs and API providers.',
            icon: Cpu,
            to: '/models',
            label: 'Explore the index',
            visual: 'discover',
          },
          {
            n: '02',
            title: 'Understand.',
            text: 'Context, capabilities and cost. Compare up to three models side by side and find the trade-offs that matter to you.',
            icon: Layers3,
            to: '/compare',
            label: 'Make a comparison',
            visual: 'understand',
          },
          {
            n: '03',
            title: 'Create.',
            text: 'Turn a prompt into a working starting point. Build an application with its own interface, API and database schema.',
            icon: Braces,
            to: '/studio',
            label: 'Enter the studio',
            visual: 'create',
          },
        ].map(({ n, title, text, icon: Icon, to, label, visual }) => (
          <article className={`journey-panel ${visual}`} key={n}>
            <div className="journey-panel-top mono">
              <span>{n} / THE PROCESS</span>
              <Icon size={22} />
            </div>
            <div className={`journey-visual visual-${visual}`} aria-hidden="true">
              {visual === 'discover' ? (
                <>
                  <div className="scan-ring" />
                  <Cpu size={54} strokeWidth={1} />
                </>
              ) : visual === 'understand' ? (
                <>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </>
              ) : (
                <>
                  <span className="code-bracket">{'{'}</span>
                  <Command size={40} />
                  <span className="code-bracket">{'}'}</span>
                </>
              )}
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <Link className="text-link" to={to}>
              {label}
              <ArrowUpRight size={16} />
            </Link>
          </article>
        ))}
      </ScrollJourney>
      <section className="section container studio-home">
        <Reveal from="left" className="studio-manifesto">
          <span className="section-kicker mono">03 / ARTIFICIALS STUDIO</span>
          <h2>
            Less between
            <br />
            <span>idea and reality.</span>
          </h2>
          <p>
            Your imagination is the starting point. Describe an app and let AI help you build its
            first version, with real code you can take with you.
          </p>
          <div className="studio-features">
            <span>
              <Code2 size={17} /> Your source code
            </span>
            <span>
              <Database size={17} /> Your database schema
            </span>
            <span>
              <ShieldCheck size={17} /> Clear monthly limits
            </span>
          </div>
          <Link className="text-link" to="/pricing">
            Explore Studio plans <ArrowUpRight size={16} />
          </Link>
        </Reveal>
        <Reveal from="right">
          <div className="studio-console">
            <div className="console-top">
              <span>
                <Command size={16} /> ARTIFICIALS STUDIO
              </span>
              <span className="mono">PROMPT → PRODUCT</span>
            </div>
            <div className="console-content">
              <span className="console-icon">
                <Braces size={29} strokeWidth={1} />
              </span>
              <h3>What will you build?</h3>
              <p>Start with an idea. Make it your own.</p>
              <label className="sr-only" htmlFor="home-prompt">
                Describe your app idea
              </label>
              <textarea
                id="home-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={4000}
                placeholder="A client portal for my design studio, with projects, sign-in and a database…"
              />
              <div className="console-input-foot">
                <span>
                  <Layers3 size={13} /> Full-stack application
                </span>
                <Link
                  to={'/studio' + (prompt ? '?prompt=' + encodeURIComponent(prompt) : '')}
                  className="prompt-submit"
                  aria-label="Build this idea"
                >
                  <ArrowUpRight size={19} />
                </Link>
              </div>
              <div className="console-suggestions">
                {['A client portal', 'A habit tracker', 'A reading list'].map((s) => (
                  <button
                    onClick={() =>
                      setPrompt(
                        `Build ${s.toLowerCase()} with sign-in, a beautiful dashboard and a database.`,
                      )
                    }
                    key={s}
                  >
                    {s} <PlusIcon />
                  </button>
                ))}
              </div>
            </div>
            <div className="console-bottom mono">
              <span className="signal-light" /> YOUR NEXT IDEA STARTS HERE <span>V.01</span>
            </div>
          </div>
        </Reveal>
      </section>
      <section className="section container home-insights">
        <Reveal>
          <div className="section-kicker mono">04 / BEYOND THE HEADLINES</div>
          <div className="section-heading">
            <h2>
              Stay one thought
              <br />
              <span>ahead.</span>
            </h2>
            <Link className="text-link" to="/news">
              All insights <ArrowUpRight size={15} />
            </Link>
          </div>
        </Reveal>
        <div className="editorial-grid">
          {ARTICLES.slice(0, 3).map((a, i) => (
            <Reveal key={a.id} from={i % 2 ? 'right' : 'left'}>
              <Link to={'/news/' + a.slug} className="editorial-card">
                <ArticleCover article={a} decorative />
                <div className="editorial-meta mono">
                  <span>{a.category}</span>
                  <span>EDITORIAL GUIDE</span>
                </div>
                <h3>{a.title}</h3>
                <p>{a.excerpt}</p>
                <span className="text-link">
                  Read the perspective <ArrowUpRight size={14} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <Reveal>
        <section className="closing-signal container">
          <span className="section-kicker mono">05 / THE FUTURE IS AN OPEN QUESTION</span>
          <h2>
            Let your curiosity
            <br />
            <span>lead the way.</span>
          </h2>
          <Link className="btn" to="/models">
            Find your next perspective <ArrowUpRight size={16} />
          </Link>
          <div className="closing-cross" aria-hidden="true">
            <span />
            <span />
          </div>
        </section>
      </Reveal>
    </>
  );
}
function PlusIcon() {
  return <ChevronRight size={12} />;
}
