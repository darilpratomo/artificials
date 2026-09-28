import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown } from 'lucide-react';
import type { Scoring } from '../../shared/scoring';
import { useScoring } from '../lib/overview';
import { Story } from '../components/descent/Story';
import { spectrum } from '../components/descent/kit';
import { SCORING_REFERENCES, scoringSequence } from '../components/scoring/chapters';
import { createScoringFinale, createScoringOpening } from '../components/scoring/scenes';

/**
 * How AI benchmarks work: from one question to a ranking, with the error bars,
 * the votes, the leaks and the index in between.
 */
export default function HowBenchmarksWork({ initial }: { initial?: Scoring }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useScoring(attempt, initial);
  if (data) return <ScoringStory scoring={data} />;
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
          Loading…
        </div>
      )}
    </div>
  );
}

const CHECKS = [
  'Which test is it, and what does it measure?',
  'How many questions does it have?',
  'Are the differences bigger than the error bars?',
  'Could its questions have leaked into training data?',
  'Who ran it, when, and with which settings?',
];

function ScoringStory({ scoring }: { scoring: Scoring }) {
  const items = useMemo(() => scoringSequence(scoring), [scoring]);
  const opening = useMemo(() => createScoringOpening(), []);
  const finale = useMemo(() => createScoringFinale(), []);
  const first = items.find((item) => item.kind === 'chapter')!;

  return (
    <Story
      className="scoring-page"
      opening={{
        draw: opening,
        hue: spectrum(0),
        label:
          'A wall of small squares, one for each question, turning green or red in waves as they are graded.',
        children: (
          <>
            <p className="dsc-opening-kicker">From one question to a ranking</p>
            <h1 id="dsc-title">How AI benchmarks work</h1>
            <p className="dsc-opening-lede">
              How a test turns answers into a score, how sure that score is, what happens when a
              test leaks, and how many tests become one ranking. With real results from the tests on
              this site.
            </p>
            <a className="dsc-begin" href={`#${first.id}`}>
              <ArrowDown size={16} aria-hidden="true" />
              Scroll to begin
            </a>
          </>
        ),
      }}
      items={items}
      finale={{
        id: 'scoring-close',
        draw: finale,
        hue: spectrum(0.15),
        label: 'A quiet leaderboard of dots, each with a range that gently widens and narrows.',
        children: (
          <>
            <p className="dsc-kicker">Before you trust a ranking</p>
            <h2 id="scoring-close-title">Read the fine print.</h2>
            <ul className="dsc-checks">
              {CHECKS.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
            <div className="dsc-links">
              <Link className="btn" to="/leaderboard">
                See the leaderboard
              </Link>
              <Link className="btn btn-outline" to="/tests">
                Every test
              </Link>
            </div>
          </>
        ),
      }}
    >
      <section className="dsc-outro" aria-labelledby="scoring-sources">
        <h2 id="scoring-sources">Sources</h2>
        <p>
          The example question, the illustrative model and the leaked scores are written for this
          page and marked where they appear. Real results come from{' '}
          {scoring.sources.map((source, index) => (
            <span key={source.id}>
              {index ? ' and ' : ''}
              <a href={source.url}>{source.name}</a> (
              <a href={source.licenseUrl}>{source.license}</a>)
            </span>
          ))}
          . More on reading results:{' '}
          <Link to="/news/read-an-ai-benchmark">A benchmark is a signal</Link> and{' '}
          <Link to="/news/benchmark-contamination-evaluation-evidence">
            Benchmark contamination
          </Link>
          .
        </p>
        <ol className="dsc-references">
          {SCORING_REFERENCES.map(([href, text]) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                {text}
              </a>
            </li>
          ))}
        </ol>
      </section>
    </Story>
  );
}
