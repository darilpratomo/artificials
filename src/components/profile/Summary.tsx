import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { makerColor, makerLogo } from '../../../shared/makers';
import { useOverview, type IndexPoint } from '../../lib/overview';
import type { ModelProfile } from '../../lib/profiles';
import { ShareButton } from '../charts/ShareButton';
import { faqOf, standingOf, summaryOf, type Standing } from './analysis';
import { approxPages, price, tokens } from './format';

function Units({ value, label }: { value: 1 | 2 | 3 | 4; label: string }) {
  return (
    <span className="units" role="img" aria-label={`${value} of 4 for ${label}`}>
      {[1, 2, 3, 4].map((step) => (
        <i key={step} className={step <= value ? 'is-on' : ''} />
      ))}
    </span>
  );
}

function Tile({
  label,
  standing,
  rankLabel,
  value,
  detail,
  unitsLabel,
}: {
  label: string;
  standing?: Standing;
  rankLabel?: string;
  value: string;
  detail: string;
  unitsLabel: string;
}) {
  return (
    <div className="summary-tile">
      <div className="summary-tile-top">
        <span>{label}</span>
        {standing && (
          <b>
            #{standing.rank} / {standing.total}
            {rankLabel ? ` ${rankLabel}` : ''}
          </b>
        )}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
      {standing && <Units value={standing.units} label={unitsLabel} />}
    </div>
  );
}

/**
 * The model at a glance against every model on the capability index: its
 * rank, the quarter it falls in, and a summary written from those numbers.
 */
export function ModelSummary({ profile }: { profile: ModelProfile }) {
  const { data } = useOverview();
  const standing = useMemo(() => (data ? standingOf(profile, data) : undefined), [profile, data]);
  if (!standing)
    return (
      <div className="summary-tiles is-loading" role="status">
        Loading comparison…
      </div>
    );
  return (
    <div className="summary-tiles" aria-label={`Compared with ${standing.classSize} models`}>
      <Tile
        label="Capability"
        standing={standing.index}
        value={standing.index ? standing.index.value.toFixed(1) : 'Not scored yet'}
        detail={
          standing.index
            ? `Epoch Capabilities Index, median ${standing.index.median.toFixed(1)}`
            : 'Not on the capability index yet'
        }
        unitsLabel="capability, higher is better"
      />
      <Tile
        label="Price"
        standing={standing.price}
        rankLabel="cheapest"
        value={
          standing.price
            ? `${price(standing.price.input)} / ${price(standing.price.output)}`
            : 'Not listed'
        }
        detail={
          standing.price
            ? `In / out per 1M tokens; ${price(standing.price.value)} blended`
            : 'No paid listing'
        }
        unitsLabel="cost, more is more expensive"
      />
      <Tile
        label="Context window"
        standing={standing.context}
        value={profile.contextWindow ? `${tokens(profile.contextWindow)} tokens` : 'Not reported'}
        detail={
          profile.contextWindow
            ? `About ${approxPages(profile.contextWindow)} at once`
            : 'Not reported by hosts'
        }
        unitsLabel="context size, more is larger"
      />
      <Tile
        label={standing.cacheDiscount !== undefined ? 'Cache discount' : 'Providers'}
        value={
          standing.cacheDiscount !== undefined
            ? `${Math.round(standing.cacheDiscount * 100)}%`
            : String(profile.offerings.length)
        }
        detail={
          standing.cacheDiscount !== undefined
            ? 'Cheaper when input is reused from the cache'
            : profile.official
              ? `Including ${profile.maker} directly`
              : 'Third-party hosts'
        }
        unitsLabel=""
      />
    </div>
  );
}

export function ComparisonSummary({ profile }: { profile: ModelProfile }) {
  const { data } = useOverview();
  const lines = useMemo(
    () => (data ? summaryOf(profile, standingOf(profile, data)) : []),
    [profile, data],
  );
  if (!lines.length) return null;
  return (
    <section className="profile-card" aria-labelledby="summary-heading">
      <div className="profile-card-head">
        <h2 id="summary-heading">Comparison summary</h2>
        <p>Written automatically from the figures on this page.</p>
      </div>
      <div className="summary-text">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

type Metric = {
  id: string;
  title: string;
  caption: string;
  value: (point: IndexPoint) => number | undefined;
  format: (value: number) => string;
  lowerIsBetter?: boolean;
};

const METRICS: Metric[] = [
  {
    id: 'index',
    title: 'Capability index',
    caption: 'Higher is better',
    value: (point) => point.index,
    format: (value) => value.toFixed(1),
  },
  {
    id: 'price',
    title: 'Blended price',
    caption: 'USD per 1M tokens, lower is better',
    value: (point) => point.price?.blended,
    format: (value) => price(value),
    lowerIsBetter: true,
  },
  {
    id: 'context',
    title: 'Context window',
    caption: 'Tokens, higher is more',
    value: (point) => point.contextWindow,
    format: (value) => tokens(value),
  },
];

/** The model beside the nine closest models on the index, on three measures. */
export function PeerHighlights({ profile }: { profile: ModelProfile }) {
  const { data } = useOverview();
  const own = data?.index.find((point) => point.slug === profile.slug);
  const peers = useMemo(() => {
    if (!data || !own) return [];
    return [...data.index]
      .filter((point) => point !== own && point.price && point.contextWindow)
      .sort((a, b) => Math.abs(a.index - own.index) - Math.abs(b.index - own.index))
      .slice(0, 9)
      .concat(own);
  }, [data, own]);
  if (!own || peers.length < 3) return null;
  return (
    <section className="profile-card" aria-labelledby="highlights-heading">
      <div className="profile-card-head">
        <h2 id="highlights-heading">Highlights</h2>
        <p>{profile.name} beside the nine models closest to it on the capability index.</p>
      </div>
      <div className="peer-charts">
        {METRICS.map((metric) => {
          const rows = peers
            .map((point) => ({ point, value: metric.value(point) }))
            .filter((row): row is { point: IndexPoint; value: number } => row.value !== undefined)
            .sort((a, b) => (metric.lowerIsBetter ? a.value - b.value : b.value - a.value));
          const top = Math.max(...rows.map((row) => row.value));
          return (
            <div key={metric.id} className="peer-chart">
              <div className="peer-chart-head">
                <div>
                  <h3>{metric.title}</h3>
                  <small>{metric.caption}</small>
                </div>
                <ShareButton
                  title={`${profile.name}: ${metric.title.toLowerCase()} against similar models`}
                  render={(tools) =>
                    tools.listImage(
                      {
                        title: `${profile.name}: ${metric.title.toLowerCase()}`,
                        subtitle: `Against the nine models closest to it on the capability index. ${metric.caption}.`,
                        source: 'Epoch AI (CC BY 4.0) and models.dev (MIT)',
                      },
                      rows.map((row) => ({
                        label: row.point.name,
                        detail: row.point.maker,
                        value: metric.format(row.value),
                        fraction: row.value / top,
                        makerId: row.point.makerId,
                      })),
                    )
                  }
                />
              </div>
              <ol>
                {rows.map((row) => (
                  <li key={row.point.name} className={row.point === own ? 'is-own' : ''}>
                    <img
                      src={makerLogo(row.point.makerId)}
                      alt=""
                      width="22"
                      height="22"
                      loading="lazy"
                    />
                    <span className="peer-name">
                      {row.point.slug && row.point !== own ? (
                        <Link to={`/models/${row.point.slug}`}>{row.point.name}</Link>
                      ) : (
                        row.point.name
                      )}
                    </span>
                    <span className="peer-bar" aria-hidden="true">
                      <i
                        style={{
                          width: `${Math.max(3, (row.value / top) * 100)}%`,
                          background: makerColor(row.point.makerId),
                        }}
                      />
                    </span>
                    <b>{metric.format(row.value)}</b>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Faq({ profile }: { profile: ModelProfile }) {
  const { data } = useOverview();
  const questions = useMemo(
    () => (data ? faqOf(profile, standingOf(profile, data)) : []),
    [profile, data],
  );
  if (!questions.length) return null;
  // Structured data lets search engines show these answers directly.
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }).replace(/</g, '\\u003c');
  return (
    <section className="profile-card" aria-labelledby="faq-heading">
      <div className="profile-card-head">
        <h2 id="faq-heading">Frequently asked questions</h2>
        <p>Answered from the data on this page.</p>
      </div>
      <div className="faq-items">
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
    </section>
  );
}
