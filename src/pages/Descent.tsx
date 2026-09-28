import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown } from 'lucide-react';
import { REFERENCES, Source, sequence } from '../components/descent/chapters';
import { Story } from '../components/descent/Story';
import { spectrum } from '../components/descent/kit';
import { createFinale } from '../components/descent/scenes/finale';
import { createOpening } from '../components/descent/scenes/opening';

/**
 * How AI works: one question followed down through an AI system, from the
 * words to the chips and the buildings they run in, and back up to the answer.
 */
export default function Descent() {
  const opening = useMemo(() => createOpening(), []);
  const finale = useMemo(() => createFinale(), []);
  const items = useMemo(() => sequence(), []);
  const first = items.find((item) => item.kind === 'chapter')!;

  return (
    <Story
      opening={{
        draw: opening,
        hue: spectrum(0),
        label:
          'A tunnel of connected points of light, flown into as you scroll: the way down into an AI system.',
        children: (
          <>
            <p className="dsc-opening-kicker">
              An animated journey, from your keyboard to the silicon and back
            </p>
            <h1 id="dsc-title">How AI works</h1>
            <p className="dsc-opening-lede">
              Follow one question down through every layer of a modern AI system: the words, the
              mathematics, the learning, the chips, the data centres. Then back up to the answer.
            </p>
            <p className="dsc-prompt">
              <span className="sr-only">The question we follow: </span>
              <span className="dsc-prompt-text">Why is the sky blue?</span>
              <span className="dsc-prompt-key" aria-hidden="true">
                Enter
              </span>
            </p>
            <a className="dsc-begin" href={`#${first.id}`}>
              <ArrowDown size={16} aria-hidden="true" />
              Scroll to go in
            </a>
          </>
        ),
      }}
      items={items}
      finale={{
        id: 'the-answer',
        draw: finale,
        hue: spectrum(0.1),
        label:
          'Every layer of the journey on one line, from your question down to the data centre, with a pulse of light travelling down and back up.',
        children: (
          <>
            <p className="dsc-kicker">The way back up</p>
            <h2 id="the-answer-title">That is how AI works.</h2>
            <p className="dsc-finale-asked">
              You asked: <q>Why is the sky blue?</q>
            </p>
            <p className="dsc-answer">Air molecules scatter blue light more than red.</p>
            <p className="dsc-finale-note">
              Tokens, vectors and attention; a walk downhill through billions of weights; arithmetic
              on thousands of cores, in buildings full of them; and back to one sentence on your
              screen.
            </p>
            <div className="dsc-links">
              <Link className="btn" to="/learn">
                Learn AI with Python
              </Link>
              <Link className="btn btn-outline" to="/leaderboard">
                See which models lead
              </Link>
            </div>
          </>
        ),
      }}
    >
      <section className="dsc-outro" aria-labelledby="dsc-sources">
        <h2 id="dsc-sources">Sources</h2>
        <p>
          The pictures are simplified teaching models drawn in your browser, not a live view of any
          product. Figures and results come from these sources; illustrative values are marked where
          they appear.
        </p>
        <ol className="dsc-references">
          {REFERENCES.map(([href, text]) => (
            <li key={href}>
              <Source href={href}>{text}</Source>
            </li>
          ))}
        </ol>
      </section>
    </Story>
  );
}
