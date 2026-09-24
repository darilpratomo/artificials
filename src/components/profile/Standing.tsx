import { useMemo, useState } from 'react';
import { RankChart, type RankItem } from '../charts/RankChart';
import { ScatterChart } from '../charts/ScatterChart';
import { ShareButton } from '../charts/ShareButton';
import { compactTokens, compactUsd, monthYear } from '../charts/scale';
import type { IndexPoint } from '../../lib/overview';
import { useOverview } from '../../lib/overview';
import type { ModelProfile } from '../../lib/profiles';
import { day, price } from './format';

const PRICE_AXIS = {
  kind: 'log' as const,
  label: 'Blended price per 1M tokens (USD, log scale)',
  format: compactUsd,
};
const INDEX_AXIS = { label: 'Capability index', format: (value: number) => value.toFixed(0) };
type Axis = 'price' | 'date' | 'context';
const AXES: {
  id: Axis;
  tab: string;
  title: string;
  axis: { kind: 'log' | 'time'; label: string; format: (value: number) => string };
  value: (point: IndexPoint) => number | undefined;
  frontier?: { kind: 'cheapest' | 'record'; label: string };
}[] = [
  {
    id: 'price',
    tab: 'Price',
    title: 'score against price',
    axis: PRICE_AXIS,
    value: (point) => point.price?.blended,
    frontier: { kind: 'cheapest', label: 'Best score at each price' },
  },
  {
    id: 'date',
    tab: 'Release date',
    title: 'score against release date',
    axis: { kind: 'time', label: 'Release date', format: monthYear },
    value: (point) => (point.releasedAt ? Date.parse(point.releasedAt) : undefined),
    frontier: { kind: 'record', label: 'Highest score so far' },
  },
  {
    id: 'context',
    tab: 'Context window',
    title: 'score against context window',
    axis: { kind: 'log', label: 'Context window (tokens, log scale)', format: compactTokens },
    value: (point) => point.contextWindow,
  },
];

/**
 * How this model compares with its neighbours: nearby models on the
 * capability index, and every tested model's score against its price.
 */
export function Standing({ profile }: { profile: ModelProfile }) {
  const { data } = useOverview();
  const position = data ? data.index.findIndex((point) => point.slug === profile.slug) : -1;
  const own = position >= 0 ? data!.index[position] : undefined;

  const neighbours: RankItem[] = useMemo(() => {
    if (!data || position < 0) return [];
    const size = Math.min(13, data.index.length);
    const start = Math.max(0, Math.min(position - 6, data.index.length - size));
    return data.index.slice(start, start + size).map((point, offset) => ({
      key: point.name,
      name: point.name,
      makerId: point.makerId,
      maker: point.maker,
      value: point.index,
      low: point.ciLow,
      high: point.ciHigh,
      rank: start + offset + 1,
      href: point.slug && point.slug !== profile.slug ? `/models/${point.slug}` : undefined,
      details: [
        point.releasedAt ? `Released ${day(point.releasedAt)}` : '',
        point.price ? `${price(point.price.blended)} per 1M tokens, blended` : '',
      ].filter(Boolean),
    }));
  }, [data, position, profile.slug]);

  const [axisId, setAxisId] = useState<Axis>('price');
  const axis = AXES.find((entry) => entry.id === axisId)!;
  const points = useMemo(
    () =>
      (data?.index ?? [])
        .filter((point) => axis.value(point) !== undefined)
        .map((point) => ({
          key: point.name,
          name: point.name,
          makerId: point.makerId,
          maker: point.maker,
          x: axis.value(point)!,
          y: point.index,
          href: point.slug && point.slug !== profile.slug ? `/models/${point.slug}` : undefined,
        })),
    [data, profile.slug, axis],
  );

  if (!own) return null;
  return (
    <>
      <section className="profile-card" aria-labelledby="neighbours-heading">
        <div className="profile-card-head has-action">
          <div>
            <h2 id="neighbours-heading">Nearby on the capability index</h2>
            <p>
              {profile.name} ranks #{position + 1} of {data!.index.length} models on the Epoch
              Capabilities Index. These are the models just above and below it.
            </p>
          </div>
          <ShareButton
            title={`${profile.name} on the capability index`}
            render={(tools) =>
              tools.rankImage(
                {
                  title: `${profile.name} on the capability index`,
                  subtitle: `#${position + 1} of ${data!.index.length} models on the Epoch Capabilities Index, with the models ranked just above and below it.`,
                  source: 'Epoch AI (CC BY 4.0)',
                },
                neighbours.map((item) => ({
                  name: item.name,
                  makerId: item.makerId,
                  value: item.value,
                  highlight: item.key === own.name,
                })),
                'index',
                (value) => value.toFixed(1),
              )
            }
          />
        </div>
        <RankChart
          items={neighbours}
          unit="index"
          format={(value) => value.toFixed(1)}
          highlight={own.name}
          label={`Capability index around ${profile.name}`}
        />
      </section>
      <section className="profile-card" aria-labelledby="value-heading">
        <div className="profile-card-head has-action">
          <div>
            <h2 id="value-heading">Compared with every model on the index</h2>
            <p>
              {axisId === 'price'
                ? own.price
                  ? `Up and to the left is better value. At ${
                      own.price.from === 'maker'
                        ? `${profile.maker || 'the maker'}’s own list price`
                        : 'the middle price across hosts'
                    }, ${profile.name} costs ${price(own.price.blended)} per 1M tokens, blended three input tokens to one output token.`
                  : `${profile.name} has no paid listing, so it is not on the price view.`
                : axisId === 'date'
                  ? 'Each point is a model at its release. The line steps up each time a new model sets the highest score so far.'
                  : 'How much text each model takes in at once, next to its score. A larger window does not make a model more capable.'}
            </p>
          </div>
          <ShareButton
            title={`${profile.name}: ${axis.title}`}
            render={(tools) =>
              tools.scatterImage(
                {
                  title: `${profile.name}: ${axis.title}`,
                  subtitle: `Capability index of every model on the index. ${profile.name} is highlighted.`,
                  source:
                    axisId === 'date'
                      ? 'Epoch AI (CC BY 4.0)'
                      : 'Epoch AI (CC BY 4.0) and models.dev (MIT)',
                },
                points.map((point) => ({
                  name: point.name,
                  makerId: point.makerId,
                  maker: point.maker,
                  x: point.x,
                  y: point.y,
                  highlight: point.key === own.name,
                })),
                axis.axis,
                INDEX_AXIS,
                { frontier: axis.frontier?.kind, quadrant: axisId === 'price' },
              )
            }
          />
        </div>
        <div
          className="dash-tabs profile-axis-tabs"
          role="group"
          aria-label="Compare the index with"
        >
          {AXES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={axisId === entry.id}
              onClick={() => setAxisId(entry.id)}
            >
              {entry.tab}
            </button>
          ))}
        </div>
        <ScatterChart
          points={points}
          x={axis.axis}
          y={INDEX_AXIS}
          frontier={axis.frontier}
          quadrant={axisId === 'price' ? 'Above-median score, below-median price' : undefined}
          highlight={points.some((point) => point.key === own.name) ? own.name : undefined}
          label={`Capability index, ${axis.title.replace('score ', '')}, with ${profile.name} highlighted`}
        />
      </section>
    </>
  );
}

/** Scientific notation that reads well: 6.6 × 10²⁵. */
export function flop(value: number) {
  const [mantissa, exponent] = value.toExponential(1).split('e');
  const superscript = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const power = String(Number(exponent))
    .split('')
    .map((digit) => (digit === '-' ? '⁻' : superscript[Number(digit)]))
    .join('');
  return `${mantissa} × 10${power} FLOP`;
}

/** Epoch AI's record of the model: who built it, when, how to access it, and its training scale. */
export function ResearchRecord({ profile }: { profile: ModelProfile }) {
  const facts = profile.facts;
  if (!facts) return null;
  const rows: [string, string][] = [];
  if (facts.name.toLowerCase() !== profile.name.toLowerCase())
    rows.push(['Recorded as', facts.name]);
  if (facts.organization)
    rows.push([
      'Developer',
      facts.country ? `${facts.organization}, ${facts.country}` : facts.organization,
    ]);
  if (facts.releasedAt)
    rows.push([
      'Released',
      profile.releaseDate && profile.releaseDate !== facts.releasedAt
        ? `${day(facts.releasedAt)} (the catalog lists ${day(profile.releaseDate)})`
        : day(facts.releasedAt),
    ]);
  if (facts.access) rows.push(['Access', facts.access]);
  if (facts.trainingCompute) rows.push(['Training compute', flop(facts.trainingCompute)]);
  if (!rows.length) return null;
  return (
    <section className="profile-card" aria-labelledby="record-heading">
      <div className="profile-card-head">
        <h2 id="record-heading">Research record</h2>
        <p>
          What Epoch AI’s model records say about {profile.name}.
          {facts.trainingCompute
            ? ' Training compute is Epoch AI’s estimate; for closed models it is inferred from public information and can be uncertain.'
            : ''}
        </p>
      </div>
      <dl className="record-list">
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
