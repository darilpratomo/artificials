import { Link } from 'react-router-dom';
import type { Race } from '../../../shared/race';
import { HUE } from '../descent/kit';
import { createInterlude } from '../descent/scenes/interlude';
import type { Chapter, Pause } from '../descent/Story';
import { dollars, month } from './chart';
import {
  createField,
  createMakers,
  createOpenClosed,
  createPrice,
  createRecords,
  createStanding,
} from './scenes';

export const RACE_SOURCES = {
  eci: 'https://epoch.ai/benchmarks/eci',
  epoch: 'https://epoch.ai/benchmarks',
  license: 'https://creativecommons.org/licenses/by/4.0/',
  catalog: 'https://models.dev',
  mit: 'https://opensource.org/license/mit',
};

/** A list of names, as a sentence says them. */
const list = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

/** A model's name, linked to its page where it has one. */
function Model({ name, slug }: { name: string; slug?: string }) {
  return slug ? <Link to={`/models/${slug}`}>{name}</Link> : <>{name}</>;
}

/** The race's chapters, their words worked out from the data they draw. */
export function raceSequence(race: Race): (Chapter | Pause)[] {
  const { facts } = race;
  const ranked = [...race.models].sort((a, b) => b.index - a.index);
  const leaders = ranked.slice(0, 5);
  const top = ranked.slice(0, 8);
  const handovers = race.records.filter(
    (record, index) => index > 0 && record.makerId !== race.records[index - 1].makerId,
  ).length;
  const byMaker = new Map<string, { maker: string; count: number }>();
  for (const record of race.records)
    byMaker.set(record.makerId, {
      maker: record.maker,
      count: (byMaker.get(record.makerId)?.count ?? 0) + 1,
    });
  const holders = [...byMaker.values()]
    .sort((a, b) => b.count - a.count)
    .map(({ maker, count }) => `${maker} ${count}`);
  const bests = race.makers
    .map((maker) => ({ ...maker, best: maker.records.at(-1)! }))
    .sort((a, b) => b.best.index - a.best.index);
  const spread = bests[0].best.index - bests.at(-1)!.best.index;
  const bestClosed = race.closed.at(-1);
  const bestOpen = race.open.at(-1);
  const leader = top[0];
  const close = top.filter((model) => (model.high ?? model.index) >= (leader.low ?? leader.index));
  const cheaper = facts.cheaper;
  const source = (
    <>
      Capability index: <a href={RACE_SOURCES.eci}>Epoch AI</a> (
      <a href={RACE_SOURCES.license}>CC BY 4.0</a>)
    </>
  );

  return [
    {
      kind: 'chapter',
      id: 'field',
      short: 'The field',
      title: 'Every dot is a model',
      lede: 'One scale for every model: Epoch AI’s Capabilities Index.',
      label: `A chart of ${race.models.length} models by release date and capability index, filling in over time, coloured by maker, with the five highest scores named.`,
      draw: createField(race),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              The index combines results from more than fifty benchmarks into one scale. Each model
              on it becomes a dot: when it came out, across; how it scored, up.
            </p>
          ),
          fact: source,
        },
        {
          heading: 'The field fills in',
          body: (
            <p>
              {race.models.length} models, from {month(race.models[0].date)} to{' '}
              {month(race.models.at(-1)!.date)}. The scale has no top: compare the dots, and don’t
              read them as percentages.
            </p>
          ),
        },
        {
          heading: 'Who made them',
          body: (
            <p>
              Six makers have the strongest models: {list(race.makers.map((maker) => maker.maker))}.
              Every other maker’s models are grey.
            </p>
          ),
        },
        {
          heading: 'The leaders today',
          body: (
            <ol className="dsc-list">
              {leaders.map((model) => (
                <li key={model.name}>
                  <Model name={model.name} slug={model.slug} />, {model.maker}:{' '}
                  {model.index.toFixed(1)}
                </li>
              ))}
            </ol>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'records',
      short: 'Records',
      title: 'The record changes hands',
      lede: 'Each time a model beat every earlier one, the record moved up.',
      label: `A step line of ${facts.records} records on the capability index, each step in its maker’s colour, from ${facts.first.name} to ${facts.latest.name}.`,
      draw: createRecords(race),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              The first record on the index is {facts.first.name}, from {facts.first.maker}, in{' '}
              {month(facts.first.date)}, at {facts.first.index.toFixed(1)}.
            </p>
          ),
        },
        {
          heading: 'Up and up',
          body: (
            <p>
              It has been broken {facts.records - 1} times since, and passed from one maker to
              another {handovers} times.
            </p>
          ),
        },
        {
          heading: 'Who held it',
          body: (
            <p>
              {facts.records} records by {facts.holders} makers: {list(holders)}. The latest is{' '}
              <Model name={facts.latest.name} slug={facts.latest.slug} />, at{' '}
              {facts.latest.index.toFixed(1)}.
            </p>
          ),
          fact: source,
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'makers',
      short: 'Makers',
      title: 'Each maker’s climb',
      lede: 'The six strongest makers, each against its own best.',
      label: `Six step lines, one for each of ${list(race.makers.map((maker) => maker.maker))}, climbing to within ${spread.toFixed(1)} points of each other.`,
      draw: createMakers(race),
      ambient: true,
      steps: [
        {
          body: <p>Each line follows one maker’s best model to date.</p>,
        },
        {
          heading: 'Everyone climbs',
          body: (
            <p>
              Every line only steps up: each step is a model better than all that maker’s earlier
              ones.
            </p>
          ),
        },
        {
          heading: 'A close finish',
          body: (
            <p>
              Today the six best models are within {spread.toFixed(1)} points: from {bests[0].maker}{' '}
              at {bests[0].best.index.toFixed(1)} to {bests.at(-1)!.maker} at{' '}
              {bests.at(-1)!.best.index.toFixed(1)}.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'open',
      short: 'Open weights',
      title: 'Open weights close in',
      lede: 'Models anyone can download, against those only their makers run.',
      label:
        'Two step lines: the best closed model to date and the best open-weights model to date, with the gap between them marked in months.',
      draw: createOpenClosed(race),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              Open-weights models can be downloaded and run by anyone.
              {bestOpen && bestClosed
                ? ` The best of them today scores ${bestOpen.index.toFixed(1)}; the best closed model, ${bestClosed.index.toFixed(1)}.`
                : ''}
            </p>
          ),
        },
        {
          heading: 'How far behind',
          body: facts.openLag ? (
            <p>
              <Model name={facts.openLag.open.name} slug={facts.openLag.open.slug} /> reached{' '}
              {facts.openLag.open.index.toFixed(1)} in {month(facts.openLag.open.date)}. A closed
              model first scored that much {facts.openLag.months} months earlier:{' '}
              <Model name={facts.openLag.closed.name} slug={facts.openLag.closed.slug} />.
            </p>
          ) : (
            <p>The index does not yet show an open-weights model level with a closed one.</p>
          ),
          fact: source,
        },
      ],
    },
    {
      kind: 'interlude',
      id: 'part-price',
      kicker: 'Part two: price',
      question: 'Getting better is half the story.',
      label: 'Light drifting through the dark, turning from blue to amber.',
      draw: createInterlude(HUE.blue, HUE.amber, 7),
      from: HUE.blue,
      to: HUE.amber,
    },
    {
      kind: 'chapter',
      id: 'price',
      short: 'Price',
      title: 'The price of a score',
      lede: 'What the cheapest model at a given level costs, and how fast that falls.',
      label: cheaper
        ? `A falling step line on a log scale: the cheapest model scoring ${cheaper.level} or more, from ${dollars(cheaper.from.price)} to ${dollars(cheaper.to.price)} per million tokens.`
        : 'Falling step lines of the cheapest price at each level of the index.',
      draw: createPrice(race),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              Each model is placed at its release date with today’s list price per million tokens,
              blended three input tokens to one output token: not its launch price. The line follows
              the cheapest model at or above one level of the index; the scale falls by ten times at
              each gridline.
            </p>
          ),
          fact: (
            <>
              Prices: <a href={RACE_SOURCES.catalog}>models.dev</a> (
              <a href={RACE_SOURCES.mit}>MIT</a>)
            </>
          ),
        },
        {
          heading: cheaper ? `${Math.round(cheaper.factor)} times cheaper` : 'Cheaper',
          body: cheaper ? (
            <p>
              Of the models released by {month(cheaper.from.date)}, the cheapest scoring{' '}
              {cheaper.level} or more is <Model name={cheaper.from.name} slug={cheaper.from.slug} />
              , listed at {dollars(cheaper.from.price)}. Of those released by{' '}
              {month(cheaper.to.date)}, it is{' '}
              <Model name={cheaper.to.name} slug={cheaper.to.slug} />, at{' '}
              {dollars(cheaper.to.price)}.
            </p>
          ) : (
            <p>Each step down is a new cheapest model at that level.</p>
          ),
        },
        {
          heading: 'At every level',
          body: (
            <p>
              Each line is one level of the index, from 120 up. Every one only steps down: each
              point is a new cheapest model at that level.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'standing',
      short: 'Today',
      title: 'Where the race stands',
      lede: 'The highest scores today, and how sure the index is of each.',
      label: `The eight highest scores on the capability index, each with its confidence interval; ${close.length} reach into the leader’s.`,
      draw: createStanding(race),
      ambient: true,
      steps: [
        {
          body: (
            <ol className="dsc-list">
              {top.map((model) => (
                <li key={model.name}>
                  <Model name={model.name} slug={model.slug} />, {model.maker}:{' '}
                  {model.index.toFixed(1)}
                </li>
              ))}
            </ol>
          ),
        },
        {
          heading: 'Too close to call',
          body: (
            <p>
              Each score comes with a confidence interval. {close.length} models reach into{' '}
              {leader.name}’s: on this index, their order could change as more results arrive.
            </p>
          ),
          fact: source,
        },
      ],
    },
  ];
}
