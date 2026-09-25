import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { makerColor, makerLogo } from '../../shared/makers';
import { PageHeading } from '../components/Layout';
import { ColumnChart } from '../components/charts/ColumnChart';
import { MetricBars } from '../components/charts/MetricBars';
import { ScatterChart } from '../components/charts/ScatterChart';
import { ShareButton } from '../components/charts/ShareButton';
import { compactTokens, compactUsd } from '../components/charts/scale';
import { TrendChart, type TrendChartSeries } from '../components/charts/TrendChart';
import { checkedAt } from '../components/coding/analysis';
import { flop } from '../components/profile/Standing';
import { useTrends, type Trends as TrendsData, type TrendSeries } from '../lib/overview';
import '../components/home/dashboard.css';
import './models.css';
import './trends.css';

const time = (date: string) => Date.parse(`${date}T00:00:00Z`);
const score = (value: number) => `${Number(value.toFixed(1))}`;
const OPEN = '#199e70';
const CLOSED = '#c9ccd4';
/** Validated categorical steps, in a fixed order by how many models each country has. */
const COUNTRY_COLORS = ['#3987e5', '#d95926', '#9085e9', '#c98500'];
/** One neutral hue, brighter for higher index levels. */
const BAND_COLORS = ['#6b7080', '#8e909b', '#b5b8c2', '#f0f0f3'];
/**
 * Compute is plotted as its power of ten. Axis ticks sit on whole powers
 * ("10²⁵"); a model's own value reads in full ("6.6 × 10²⁶ FLOP").
 */
const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const power = (value: number) =>
  Math.abs(value - Math.round(value)) < 1e-6
    ? `10${String(Math.round(value))
        .split('')
        .map((digit) => SUPERSCRIPT[Number(digit)] ?? digit)
        .join('')}`
    : flop(10 ** value);

function toSeries(series: TrendSeries[], colors?: string[]): TrendChartSeries[] {
  return series.map((entry, index) => ({
    id: entry.id,
    label: entry.label,
    color: entry.makerId ? makerColor(entry.makerId) : (colors?.[index] ?? CLOSED),
    ...(entry.makerId ? { makerId: entry.makerId } : {}),
    points: entry.points.map((point) => ({
      x: time(point.date),
      y: point.value,
      name: point.name,
      ...(point.slug ? { href: `/models/${point.slug}` } : {}),
    })),
  }));
}

function Panel({
  title,
  text,
  share,
  children,
  foot,
}: {
  title: string;
  text: string;
  share?: ReactNode;
  children: ReactNode;
  foot: ReactNode;
}) {
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
        {share}
      </div>
      {children}
      <div className="dash-foot">
        <p>{foot}</p>
      </div>
    </div>
  );
}

const lineShare = (
  title: string,
  subtitle: string,
  source: string,
  series: TrendChartSeries[],
  y: { label: string; format: (value: number) => string; log?: boolean },
  options: { mode?: 'step' | 'line'; end?: number },
) => (
  <ShareButton
    title={title}
    render={(tools) =>
      tools.lineImage(
        { title, subtitle, source },
        series.map((entry) => ({
          label: entry.label,
          color: entry.color,
          points: entry.points.map((point) => ({ x: point.x, y: point.y })),
        })),
        y,
        options,
      )
    }
  />
);

function Summary({ trends }: { trends: TrendsData }) {
  const lead = trends.leaders[0];
  const [closed, open] = [
    trends.openClosed.find((entry) => entry.id === 'closed')?.points.at(-1),
    trends.openClosed.find((entry) => entry.id === 'open')?.points.at(-1),
  ];
  const [first, second] = trends.countries.map((entry) => ({
    label: entry.label,
    best: entry.points.at(-1)!,
  }));
  const band = trends.priceBands.at(-1);
  const cheapest = band?.points.at(-1);
  const opening = band?.points[0];
  const last = trends.context.at(-1);
  const year = trends.releases.slice(-12).reduce((total, month) => total + month.count, 0);
  const rows: [string, ReactNode][] = [];
  if (lead)
    rows.push([
      'Frontier',
      <p key="frontier">
        <ModelName name={lead.name} slug={lead.slug} makerId={lead.makerId} /> holds the highest
        capability index ({score(lead.value)}), with{' '}
        {trends.leaders
          .slice(1, 3)
          .map((entry) => entry.maker)
          .join(' and ')}{' '}
        close behind.
      </p>,
    ]);
  if (closed && open)
    rows.push([
      'Open weights',
      <p key="open">
        The best open-weights model, {open.name} ({score(open.value)}), is{' '}
        {score(closed.value - open.value)} points behind the best closed model, {closed.name}.
      </p>,
    ]);
  if (first && second)
    rows.push([
      'Countries',
      <p key="countries">
        Models from the {first.label} lead at {score(first.best.value)}; the best from{' '}
        {second.label} reaches {score(second.best.value)},{' '}
        {score(first.best.value - second.best.value)} points behind.
      </p>,
    ]);
  if (band && cheapest && opening && opening.value > cheapest.value)
    rows.push([
      'Cost',
      <p key="cost">
        Reaching {band.label.replace(' or higher', '').toLowerCase()} or better cost{' '}
        {compactUsd(opening.value)} per 1M tokens with {opening.name}; {cheapest.name} does it for{' '}
        {compactUsd(cheapest.value)}, {Math.round(opening.value / cheapest.value)} times less, at
        today’s list prices.
      </p>,
    ]);
  if (last?.closed && last.open)
    rows.push([
      'Context',
      <p key="context">
        New models released in {last.quarter.replace('-', ' ')} take in a median of{' '}
        {compactTokens(last.closed)} tokens (closed) and {compactTokens(last.open)} (open weights).
      </p>,
    ]);
  rows.push([
    'Releases',
    <p key="releases">
      {year.toLocaleString('en-US')} notable models were released in the last twelve months, about{' '}
      {Math.round(year / 12)} a month.
    </p>,
  ]);
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

function ModelName({ name, slug, makerId }: { name: string; slug?: string; makerId: string }) {
  return (
    <span className="glance-model">
      <img src={makerLogo(makerId)} alt="" width="22" height="22" loading="lazy" />
      {slug ? <Link to={`/models/${slug}`}>{name}</Link> : <b>{name}</b>}
    </span>
  );
}

const SECTIONS: [string, string][] = [
  ['frontier', 'Frontier'],
  ['open-weights', 'Open weights'],
  ['countries', 'Countries'],
  ['cost', 'Cost'],
  ['context', 'Context'],
  ['scale', 'Scale'],
  ['releases', 'Releases'],
];

function TrendsContent({ trends }: { trends: TrendsData }) {
  const end = time(trends.asOf);
  const epoch = trends.sources.find((source) => source.id === 'epoch');
  const indexCredit = epoch ? `${epoch.name} (${epoch.license})` : 'Epoch AI (CC BY 4.0)';
  const frontier = useMemo(() => toSeries(trends.frontier), [trends]);
  const openClosed = useMemo(() => toSeries(trends.openClosed, [CLOSED, OPEN]), [trends]);
  const countries = useMemo(() => toSeries(trends.countries, COUNTRY_COLORS), [trends]);
  const bands = useMemo(() => toSeries(trends.priceBands, BAND_COLORS), [trends]);
  const context = useMemo(
    (): TrendChartSeries[] =>
      (
        [
          ['closed', 'Closed models', CLOSED],
          ['open', 'Open-weights models', OPEN],
        ] as const
      ).map(([id, label, color]) => ({
        id,
        label,
        color,
        points: trends.context.flatMap((quarter) => {
          const value = quarter[id];
          if (value === undefined) return [];
          const [year, part] = quarter.quarter.split('-Q').map(Number);
          return [
            {
              x: Date.UTC(year, (part - 1) * 3 + 1, 15),
              y: value,
              name: quarter.quarter.replace('-', ' '),
            },
          ];
        }),
      })),
    [trends],
  );
  const [computeSince, setComputeSince] = useState('2022');
  const compute = trends.compute.filter((row) => row.date >= `${computeSince}-01-01`);
  const indexAxis = { label: 'Capability index', format: score };
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
            <p>Where AI stands now, from published results and the model catalog.</p>
          </div>
        </div>
        <Summary trends={trends} />
      </section>

      <section id="frontier" aria-labelledby="frontier-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="frontier-title">The frontier</h2>
          <p>The highest capability index each maker has reached, and when.</p>
        </header>
        <Panel
          title="Highest capability index to date, by maker"
          text="Each step is a model that beat the maker’s own best. Select a maker in the legend to hide or show it."
          share={lineShare(
            'Highest AI capability index to date, by maker',
            'Epoch Capabilities Index; each step is a model that beat its maker’s previous best.',
            indexCredit,
            frontier,
            indexAxis,
            { end },
          )}
          foot={`Epoch Capabilities Index, published by ${indexCredit}, by release date. Makers with at least three models on the index.`}
        >
          <TrendChart
            series={frontier}
            y={indexAxis}
            end={end}
            label="Highest capability index to date, by maker"
          />
        </Panel>
        <div className="dash-panel trends-leaders">
          <MetricBars
            title="Each maker’s best model"
            caption="Highest capability index per maker."
            rows={trends.leaders.map((entry) => ({
              key: entry.makerId,
              label: entry.name,
              detail: entry.maker,
              makerId: entry.makerId,
              value: entry.value,
              ...(entry.slug ? { href: `/models/${entry.slug}` } : {}),
            }))}
            format={score}
            share={{
              title: 'Each AI maker’s best model',
              subtitle: 'Highest Epoch Capabilities Index per maker.',
              source: indexCredit,
            }}
          />
        </div>
      </section>

      <section id="open-weights" aria-labelledby="open-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="open-title">Open weights and closed models</h2>
          <p>How close downloadable models come to the best closed ones.</p>
        </header>
        <Panel
          title="Highest capability index to date: open weights and closed"
          text="Open-weights models can be downloaded and run anywhere; closed models are only offered by their makers and hosts."
          share={lineShare(
            'Open-weights and closed AI models: highest capability index to date',
            'Epoch Capabilities Index; each step is a new record for its group.',
            indexCredit,
            openClosed,
            indexAxis,
            { end },
          )}
          foot={`Weight access as recorded by Epoch AI. Data: ${indexCredit}.`}
        >
          <TrendChart
            series={openClosed}
            y={indexAxis}
            end={end}
            label="Highest capability index to date, open weights and closed"
          />
        </Panel>
      </section>

      <section id="countries" aria-labelledby="countries-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="countries-title">Countries</h2>
          <p>Where the most capable models are made, by the developer’s country.</p>
        </header>
        <Panel
          title="Highest capability index to date, by country"
          text="Countries with at least five models on the index."
          share={lineShare(
            'Highest AI capability index to date, by country',
            'Epoch Capabilities Index by the developer’s country.',
            indexCredit,
            countries,
            indexAxis,
            { end },
          )}
          foot={`Developer countries from Epoch AI’s model records. Data: ${indexCredit}.`}
        >
          <TrendChart
            series={countries}
            y={indexAxis}
            end={end}
            label="Highest capability index to date, by country"
          />
        </Panel>
      </section>

      <section id="cost" aria-labelledby="cost-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="cost-title">The cost of capability</h2>
          <p>What it costs to use a model at least as capable as each level.</p>
        </header>
        <Panel
          title="Cheapest list price to reach each capability level"
          text="Each step is a new model that reaches the level for less. Log scale; lower is cheaper."
          share={lineShare(
            'Cheapest price to reach each AI capability level',
            'Blended list price per 1M tokens (three input to one output), for models at or above each capability index level.',
            `${indexCredit} and models.dev (MIT)`,
            bands,
            { label: 'USD per 1M tokens', format: compactUsd, log: true },
            { end },
          )}
          foot="Prices are today’s list prices from models.dev (MIT), blended three input tokens to one output token, not the price each model launched at. Capability: Epoch Capabilities Index."
        >
          <TrendChart
            series={bands}
            y={{ label: 'USD per 1M tokens', format: compactUsd, log: true }}
            end={end}
            label="Cheapest list price to reach each capability level"
          />
        </Panel>
      </section>

      <section id="context" aria-labelledby="context-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="context-title">Context windows</h2>
          <p>How much text new models take in at once.</p>
        </header>
        <Panel
          title="Median context window of new models, by quarter"
          text="Notable releases from known makers. Log scale."
          share={lineShare(
            'Median context window of new AI models, by quarter',
            'Notable releases from known makers, tokens.',
            'models.dev (MIT)',
            context,
            { label: 'Tokens', format: compactTokens, log: true },
            { mode: 'line' },
          )}
          foot="Context windows as listed in the models.dev catalog (MIT), by release date. Quarters need at least three models in a group."
        >
          <TrendChart
            series={context}
            mode="line"
            y={{ label: 'Tokens', format: compactTokens, log: true }}
            label="Median context window of new models, by quarter"
          />
        </Panel>
      </section>

      <section id="scale" aria-labelledby="scale-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="scale-title">Training scale</h2>
          <p>How much computation went into training notable models.</p>
        </header>
        <Panel
          title="Estimated training compute, by release date"
          text="Floating-point operations, on a log scale. The line marks the largest run so far."
          share={
            <div className="dash-controls">
              <div className="dash-tabs" role="group" aria-label="Since">
                {['2020', '2022', '2024'].map((year) => (
                  <button
                    key={year}
                    type="button"
                    aria-pressed={computeSince === year}
                    onClick={() => setComputeSince(year)}
                  >
                    Since {year}
                  </button>
                ))}
              </div>
              <ShareButton
                title="Estimated training compute of AI models"
                render={(tools) =>
                  tools.scatterImage(
                    {
                      title: 'Estimated training compute of AI models',
                      subtitle: 'Floating-point operations, log scale, by release date.',
                      source: 'Epoch AI (CC BY 4.0)',
                    },
                    compute.map((row) => ({
                      name: row.name,
                      makerId: row.makerId,
                      maker: row.maker,
                      x: time(row.date),
                      y: Math.log10(row.value),
                    })),
                    {
                      kind: 'time',
                      label: 'Release date',
                      format: (value) => new Date(value).getUTCFullYear().toString(),
                    },
                    { label: 'Training compute (FLOP)', format: power },
                    { frontier: 'record' },
                  )
                }
              />
            </div>
          }
          foot="Training compute is Epoch AI’s estimate (CC BY 4.0); for closed models it is inferred from public information and can be uncertain."
        >
          <ScatterChart
            points={compute.map((row) => ({
              key: `${row.name}-${row.date}`,
              name: row.name,
              makerId: row.makerId,
              maker: row.maker,
              x: time(row.date),
              y: Math.log10(row.value),
              ...(row.slug ? { href: `/models/${row.slug}` } : {}),
              details: [flop(row.value)],
            }))}
            x={{
              kind: 'time',
              label: 'Release date',
              format: (value) =>
                new Date(value).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC',
                }),
            }}
            y={{ label: 'Training compute (FLOP)', format: power }}
            frontier={{ kind: 'record', label: 'Largest so far' }}
            label="Estimated training compute of notable models by release date"
          />
        </Panel>
      </section>

      <section id="releases" aria-labelledby="releases-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="releases-title">The pace of releases</h2>
          <p>How many notable models arrive each month, and who ships the most.</p>
        </header>
        <div className="hub-pair">
          <Panel
            title="Notable releases per month"
            text="Models from known makers that the maker sells, several hosts list, or a test covers."
            share={
              <ShareButton
                title="Notable AI model releases per month"
                render={(tools) =>
                  tools.columnImage(
                    {
                      title: 'Notable AI model releases per month',
                      subtitle: 'Models from known makers in the models.dev catalog.',
                      source: 'models.dev (MIT)',
                    },
                    trends.releases.map((month) => ({
                      label: monthLabel(month.month),
                      value: month.count,
                    })),
                    (value) => `${Math.round(value)}`,
                  )
                }
              />
            }
            foot="Release dates as listed in the models.dev catalog (MIT)."
          >
            <ColumnChart
              columns={trends.releases.map((month) => ({
                key: month.month,
                label: monthLabel(month.month),
                value: month.count,
              }))}
              label="Notable model releases per month"
              format={(value) => `${Math.round(value)}`}
            />
          </Panel>
          <div className="dash-panel">
            <MetricBars
              title="Most releases in the last twelve months"
              caption="Notable models per maker."
              rows={trends.activeMakers.map((entry) => ({
                key: entry.makerId,
                label: entry.maker,
                makerId: entry.makerId,
                value: entry.count,
              }))}
              format={(value) => `${value}`}
              share={{
                title: 'AI makers with the most model releases in the last twelve months',
                subtitle: 'Notable models per maker, from the models.dev catalog.',
                source: 'models.dev (MIT)',
              }}
            />
          </div>
        </div>
      </section>

      <details className="profile-sources coding-sources">
        <summary>Sources and method</summary>
        <div>
          <p>
            Every chart is calculated by Artificials from published data: records are the models
            that beat every earlier model in their group, by release date.
          </p>
          <ul>
            {trends.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.name}
                </a>{' '}
                (
                <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {source.license}
                </a>
                ). Retrieved {checkedAt(source.checkedAt)}.
              </li>
            ))}
            <li>
              Prices, context windows and release dates:{' '}
              <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
                models.dev
              </a>{' '}
              (MIT).
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
}

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });

export default function Trends({ initial }: { initial?: TrendsData }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useTrends(attempt, initial);
  return (
    <div className="container page models-page trends-page">
      <PageHeading
        eyebrow="AI TRENDS"
        title="How AI is changing."
        text="The frontier of capability, what it costs, where models are made and how fast new ones arrive, from published results and the model catalog."
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
          Loading trends…
        </div>
      ) : (
        <TrendsContent trends={data} />
      )}
    </div>
  );
}
