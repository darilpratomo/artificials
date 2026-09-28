import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown } from 'lucide-react';
import type { Race as RaceData } from '../../shared/race';
import { useRace } from '../lib/overview';
import { Story } from '../components/descent/Story';
import { spectrum } from '../components/descent/kit';
import { RACE_SOURCES, raceSequence } from '../components/race/chapters';
import { month } from '../components/race/chart';
import { createRaceFinale, createRaceOpening } from '../components/race/scenes';

/**
 * The AI race: every model on the capability index, by the day it came out,
 * told as the records it set, the makers behind them and what a score costs.
 */
export default function Race({ initial }: { initial?: RaceData }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useRace(attempt, initial);
  if (data) return <RaceStory race={data} />;
  return (
    <div className="container page">
      {error ? (
        <div className="dash-state" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : (
        <div className="dash-state dash-pending is-tall" role="status">
          Loading the race…
        </div>
      )}
    </div>
  );
}

function RaceStory({ race }: { race: RaceData }) {
  const items = useMemo(() => raceSequence(race), [race]);
  const opening = useMemo(() => createRaceOpening(race), [race]);
  const finale = useMemo(() => createRaceFinale(race), [race]);
  const first = race.models[0];
  const latest = race.facts.latest;

  return (
    <Story
      className="race-page"
      opening={{
        draw: opening,
        hue: spectrum(0),
        label: `Every model on the capability index as a point of light, with the line of records drawn across them from ${month(first.date)} to today.`,
        children: (
          <>
            <p className="dsc-opening-kicker">Every record, year by year</p>
            <h1 id="dsc-title">The AI race</h1>
            <p className="dsc-opening-lede">
              {race.models.length} models on one scale since {month(first.date)}. Follow the
              records, the makers who set them, open models closing in, and what a score costs.
            </p>
            <a className="dsc-begin" href={`#${items.find((item) => item.kind === 'chapter')!.id}`}>
              <ArrowDown size={16} aria-hidden="true" />
              Scroll to begin
            </a>
          </>
        ),
      }}
      items={items}
      finale={{
        id: 'race-close',
        draw: finale,
        hue: spectrum(0.2),
        label: 'The line of records once more, with its newest record glowing.',
        children: (
          <>
            <p className="dsc-kicker">The race goes on</p>
            <h2 id="race-close-title">Who leads next?</h2>
            <p className="dsc-answer">
              {latest.name}, from {latest.maker}, holds the record at {latest.index.toFixed(1)}.
            </p>
            <p className="dsc-finale-note">
              This page is drawn from the same data as the rest of the site, so new models appear
              here as they join the index.
            </p>
            <div className="dsc-links">
              <Link className="btn" to="/trends">
                See every trend
              </Link>
              <Link className="btn btn-outline" to="/leaderboard">
                Open the leaderboard
              </Link>
            </div>
          </>
        ),
      }}
    >
      <section className="dsc-outro" aria-labelledby="race-sources">
        <h2 id="race-sources">Sources and method</h2>
        <p>
          Scores are the <a href={RACE_SOURCES.eci}>Epoch Capabilities Index</a>, with release dates
          and weight access as <a href={RACE_SOURCES.epoch}>Epoch AI</a> records them (
          <a href={RACE_SOURCES.license}>CC BY 4.0</a>). Prices are today’s list prices per million
          tokens from the <a href={RACE_SOURCES.catalog}>models.dev</a> catalog (
          <a href={RACE_SOURCES.mit}>MIT</a>), placed at each model’s release date, not launch
          prices: the maker’s own listing, or the middle listing across hosts, blended three input
          tokens to one output token.
        </p>
        <p>
          A record is a model that scored higher than every model released before it. Artificials
          draws these charts from the published data; it does not test models itself.
        </p>
      </section>
    </Story>
  );
}
