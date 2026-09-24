import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { makerLogo } from '../../../shared/makers';
import { useOverview, type IndexPoint, type ModelOverview } from '../../lib/overview';
import { MetricBars } from '../charts/MetricBars';
import { ShareButton } from '../charts/ShareButton';
import { ModelExplorer } from '../home/ModelExplorer';
import { RankingSection } from '../home/RankingSection';
import { ValueSection } from '../home/ValueSection';
import { day, price, tokens } from '../profile/format';
import { flop } from '../profile/Standing';

type Named = { name: string; slug?: string; makerId: string; note?: string };

function ModelName({ model }: { model: Named }) {
  return (
    <span className="glance-model">
      <img src={makerLogo(model.makerId)} alt="" width="22" height="22" loading="lazy" />
      {model.slug ? <Link to={`/models/${model.slug}`}>{model.name}</Link> : <b>{model.name}</b>}
      {model.note && <span> ({model.note})</span>}
    </span>
  );
}

/** "A and B are the …, followed by C and D." */
function Sentence({ models, verb }: { models: Named[]; verb: string }) {
  if (models.length < 2) return null;
  const [first, second, third, fourth] = models;
  return (
    <p>
      <ModelName model={first} /> and <ModelName model={second} /> {verb}
      {third && (
        <>
          , followed by <ModelName model={third} />
          {fourth && (
            <>
              {' '}
              and <ModelName model={fourth} />
            </>
          )}
        </>
      )}
      .
    </p>
  );
}

const named = (point: IndexPoint, note?: string): Named => ({
  name: point.name,
  ...(point.slug ? { slug: point.slug } : {}),
  makerId: point.makerId,
  ...(note ? { note } : {}),
});

function AtAGlance({ overview }: { overview: ModelOverview }) {
  const { index, releases } = overview;
  const cheapest = index
    .filter((point) => point.price)
    .sort((a, b) => a.price!.blended - b.price!.blended);
  const widest = index
    .filter((point) => point.contextWindow)
    .sort((a, b) => b.contextWindow! - a.contextWindow! || b.index - a.index);
  const open = index.filter((point) => point.openWeights);
  const newest = releases.filter((release) => release.notable);
  const rows: [string, ReactNode][] = [
    [
      'Capability',
      <Sentence
        key="capability"
        verb="are the most capable models"
        models={index.slice(0, 4).map((point) => named(point, point.index.toFixed(1)))}
      />,
    ],
    [
      'Price',
      <Sentence
        key="price"
        verb="are the cheapest models with a capability score"
        models={cheapest.slice(0, 4).map((point) => named(point, price(point.price!.blended)))}
      />,
    ],
    [
      'Context window',
      <Sentence
        key="context"
        verb="take in the most text at once"
        models={widest.slice(0, 4).map((point) => named(point, tokens(point.contextWindow)))}
      />,
    ],
    [
      'Open weights',
      <Sentence
        key="open"
        verb="are the most capable open-weights models"
        models={open.slice(0, 4).map((point) => named(point, point.index.toFixed(1)))}
      />,
    ],
    [
      'New',
      <Sentence
        key="new"
        verb="are the newest releases"
        models={newest.slice(0, 4).map((release) => ({
          name: release.name,
          slug: release.slug,
          makerId: release.makerId,
          note: day(release.date),
        }))}
      />,
    ],
  ];
  return (
    <dl className="glance-sentences">
      {rows.map(([label, sentence]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{sentence}</dd>
        </div>
      ))}
    </dl>
  );
}

function TopHighlights({ overview }: { overview: ModelOverview }) {
  const top = overview.index.slice(0, 10);
  const row = (point: IndexPoint, value: number) => ({
    key: point.name,
    label: point.name,
    detail: point.maker,
    makerId: point.makerId,
    value,
    ...(point.slug ? { href: `/models/${point.slug}` } : {}),
  });
  const source = { source: 'Epoch AI (CC BY 4.0) and models.dev (MIT)' };
  return (
    <div className="dash-panel">
      <div className="hub-highlights">
        <MetricBars
          title="Capability index"
          caption="The ten highest scores. Higher is better."
          rows={top.map((point) => row(point, point.index))}
          format={(value) => value.toFixed(1)}
          share={{
            title: 'The ten most capable AI models',
            subtitle: 'Epoch Capabilities Index. Higher is better.',
            ...source,
          }}
        />
        <MetricBars
          title="Blended price"
          caption="Same ten models, USD per 1M tokens. Lower is cheaper."
          rows={top
            .filter((point) => point.price)
            .map((point) => row(point, point.price!.blended))
            .sort((a, b) => a.value - b.value)}
          format={price}
          share={{
            title: 'Price of the ten most capable AI models',
            subtitle: 'Blended list price, three input tokens per output token, USD per 1M tokens.',
            ...source,
          }}
        />
        <MetricBars
          title="Context window"
          caption="Same ten models, tokens. Higher takes in more."
          rows={top
            .filter((point) => point.contextWindow)
            .map((point) => row(point, point.contextWindow!))
            .sort((a, b) => b.value - a.value)}
          format={(value) => tokens(value)}
          share={{
            title: 'Context window of the ten most capable AI models',
            subtitle: 'Tokens a model takes in at once.',
            ...source,
          }}
        />
      </div>
    </div>
  );
}

/** Cached input, input and output list prices for the most capable models. */
function PriceBreakdown({ overview }: { overview: ModelOverview }) {
  const rows = overview.index.filter((point) => point.price).slice(0, 15);
  const top = Math.max(...rows.map((point) => point.price!.output), 1);
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h3>Input, cached input and output prices</h3>
          <p>
            The fifteen most capable models with a list price, per 1M tokens. Output usually costs
            several times more than input, and cached input much less.
          </p>
        </div>
        <ShareButton
          title="Prices of the most capable AI models"
          render={(tools) =>
            tools.listImage(
              {
                title: 'Prices of the most capable AI models',
                subtitle: 'Input, cached input and output list prices, USD per 1M tokens.',
                source: 'models.dev (MIT) and Epoch AI (CC BY 4.0)',
              },
              rows.map((point) => ({
                label: point.name,
                detail: `${price(point.price!.input)} in${
                  point.price!.cached !== undefined ? `, ${price(point.price!.cached)} cached` : ''
                }`,
                value: `${price(point.price!.output)} out`,
                fraction: point.price!.output / top,
                makerId: point.makerId,
              })),
            )
          }
        />
      </div>
      <ul className="price-legend" aria-hidden="true">
        <li className="is-cached">Cached input</li>
        <li className="is-input">Input</li>
        <li className="is-output">Output</li>
      </ul>
      <ol className="price-rows">
        {rows.map((point) => (
          <li key={point.name}>
            <span className="price-rows-name">
              <img src={makerLogo(point.makerId)} alt="" width="22" height="22" loading="lazy" />
              {point.slug ? <Link to={`/models/${point.slug}`}>{point.name}</Link> : point.name}
            </span>
            <span className="price-rows-bars" aria-hidden="true">
              {point.price!.cached !== undefined && (
                <i
                  className="is-cached"
                  style={{ width: `${Math.max(1, (point.price!.cached / top) * 100)}%` }}
                />
              )}
              <i
                className="is-input"
                style={{ width: `${Math.max(1, (point.price!.input / top) * 100)}%` }}
              />
              <i
                className="is-output"
                style={{ width: `${Math.max(1, (point.price!.output / top) * 100)}%` }}
              />
            </span>
            <span className="price-rows-values">
              {price(point.price!.input)} / {price(point.price!.output)}
              {point.price!.cached !== undefined && (
                <small>{price(point.price!.cached)} cached</small>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Rankings({ overview }: { overview: ModelOverview }) {
  const withContext = [...overview.index]
    .filter((point) => point.contextWindow)
    .sort((a, b) => b.contextWindow! - a.contextWindow! || b.index - a.index)
    .slice(0, 12);
  const withCompute = [...overview.index]
    .filter((point) => point.compute)
    .sort((a, b) => b.compute! - a.compute!)
    .slice(0, 12);
  const row = (point: IndexPoint, value: number) => ({
    key: point.name,
    label: point.name,
    detail: point.maker,
    makerId: point.makerId,
    value,
    ...(point.slug ? { href: `/models/${point.slug}` } : {}),
  });
  return (
    <div className="hub-pair">
      <div className="dash-panel">
        <MetricBars
          title="Largest context windows"
          caption="Among models with a capability score. Tokens taken in at once."
          rows={withContext.map((point) => row(point, point.contextWindow!))}
          format={(value) => tokens(value)}
          share={{
            title: 'Largest context windows among tested AI models',
            subtitle: 'Tokens a model takes in at once.',
            source: 'models.dev (MIT) and Epoch AI (CC BY 4.0)',
          }}
        />
      </div>
      {withCompute.length >= 3 && (
        <div className="dash-panel">
          <MetricBars
            title="Largest training runs"
            caption="Estimated training compute, from Epoch AI's records. Log scale."
            rows={withCompute.map((point) => row(point, point.compute!))}
            format={flop}
            scale="log"
            share={{
              title: 'AI models with the largest estimated training compute',
              subtitle: "Epoch AI's estimates, in floating-point operations.",
              source: 'Epoch AI (CC BY 4.0)',
            }}
          />
        </div>
      )}
    </div>
  );
}

function questions(overview: ModelOverview): [string, string][] {
  const { index, releases, highlights } = overview;
  const [first, second] = index;
  const top = index.slice(0, 5).map((point) => point.name);
  const cheapest = index
    .filter((point) => point.price)
    .sort((a, b) => a.price!.blended - b.price!.blended)[0];
  const open = index.find((point) => point.openWeights);
  const reasoning = index.find((point) => point.reasoning);
  const context = highlights.find((entry) => entry.id === 'context');
  const newest = releases.find((release) => release.notable);
  const list: [string, string][] = [];
  if (first && second)
    list.push([
      'Which is the most capable AI model?',
      `${first.name} leads the Epoch Capabilities Index at ${first.index.toFixed(1)}, ahead of ${second.name} at ${second.index.toFixed(1)}. Small gaps are within the index's published range.`,
    ]);
  list.push(['What are the top AI models?', `By capability index: ${top.join(', ')}.`]);
  if (cheapest)
    list.push([
      'Which is the cheapest AI model?',
      `Among models with a capability score, ${cheapest.name} has the lowest blended list price, ${price(cheapest.price!.blended)} per 1M tokens. Smaller untested models can cost less.`,
    ]);
  if (context)
    list.push([
      'Which AI model has the largest context window?',
      `${context.name} lists the largest context window, ${tokens(context.value)} tokens.`,
    ]);
  if (open)
    list.push([
      'Which is the best open-weights AI model?',
      `${open.name} scores highest among open-weights models on the capability index, at ${open.index.toFixed(1)}.`,
    ]);
  if (reasoning)
    list.push([
      'Which is the best reasoning model?',
      `${reasoning.name} scores highest among reasoning models on the capability index, at ${reasoning.index.toFixed(1)}.`,
    ]);
  if (newest)
    list.push([
      'Which is the newest AI model?',
      `${newest.name}${newest.maker ? ` from ${newest.maker}` : ''} is the newest release from a known maker, listed on ${day(newest.date)}.`,
    ]);
  list.push([
    'How are AI models compared on Artificials?',
    'Capability comes from published tests: the Epoch Capabilities Index and Epoch AI evaluations, LiveBench and T2I-CoReBench. Prices, context windows and features come from the models.dev catalog. Artificials groups every listing of a model, links results to it and calculates the rankings and charts. Speed and latency are not measured yet.',
  ]);
  list.push([
    'How do I compare a specific model with others?',
    'Open the model’s page from any chart or list for its scores, prices, providers and the models closest to it, or add up to three models to the side-by-side comparison.',
  ]);
  return list;
}

const SECTIONS: [string, string][] = [
  ['capability', 'Capability'],
  ['comparisons', 'Score, price and time'],
  ['prices', 'Prices'],
  ['context', 'Context and scale'],
  ['all-models', 'Every model'],
  ['faq', 'Questions'],
];

/** The model comparison: summaries, highlights, charts and every model in one place. */
export function ModelsHub({ initial }: { initial?: ModelOverview }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useOverview(attempt, initial);
  const faq = useMemo(() => (data ? questions(data) : []), [data]);
  if (error && !data)
    return (
      <div className="dash-state" role="alert">
        <p>{error}</p>
        <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
          Try again
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="dash-state dash-pending is-tall" role="status">
        Loading the model comparison…
      </div>
    );
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }).replace(/</g, '\\u003c');
  return (
    <div className="models-hub">
      <nav className="hub-sections" aria-label="On this page">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <section className="dash-panel" aria-labelledby="glance-title">
        <div className="dash-panel-head">
          <div>
            <h2 id="glance-title">At a glance</h2>
            <p>The leaders on each measure right now. Open any model for its full profile.</p>
          </div>
        </div>
        <AtAGlance overview={data} />
      </section>
      <section aria-labelledby="highlights-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="highlights-title">Highlights</h2>
          <p>The ten most capable models, compared on score, price and context window.</p>
        </header>
        <TopHighlights overview={data} />
      </section>
      <section id="capability" aria-labelledby="capability-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="capability-title">Capability</h2>
          <p>
            Rank models on the capability index or on any single test. Scores from different tests
            are never mixed.
          </p>
        </header>
        <RankingSection overview={data} />
      </section>
      <section id="comparisons" aria-labelledby="comparisons-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="comparisons-title">Score, price and time</h2>
          <p>Every model on the index against its price, release date and context window.</p>
        </header>
        <ValueSection index={data.index} releases={data.releases} />
      </section>
      <section id="prices" aria-labelledby="prices-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="prices-title">Prices</h2>
          <p>What the most capable models cost to use, token by token.</p>
        </header>
        <PriceBreakdown overview={data} />
      </section>
      <section id="context" aria-labelledby="context-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="context-title">Context and scale</h2>
          <p>How much text models take in at once, and how large their training runs were.</p>
        </header>
        <Rankings overview={data} />
      </section>
      <section id="all-models" aria-labelledby="all-models-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="all-models-title">Every model</h2>
          <p>
            All {data.counts.models.toLocaleString('en-US')} models we track, highest capability
            score first. Search, filter or sort to find the right one.
          </p>
        </header>
        <ModelExplorer total={data.counts.models} defaultSort="index" />
      </section>
      <section id="faq" aria-labelledby="faq-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="faq-title">Frequently asked questions</h2>
          <p>Answered from the data on this page.</p>
        </header>
        <div className="dash-panel faq-items hub-faq">
          {faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      </section>
    </div>
  );
}
