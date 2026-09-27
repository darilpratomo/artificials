import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, Pause, Play } from 'lucide-react';
import { REFERENCES, Source, sequence } from '../components/descent/chapters';
import { createDirector, type Director } from '../components/descent/engine';
import { DirectorContext, Finale, Interlude, Opening, Scene } from '../components/descent/Scene';
import { spectrum } from '../components/descent/kit';
import { createFinale } from '../components/descent/scenes/finale';
import { createOpening } from '../components/descent/scenes/opening';
import './descent.css';

/**
 * How AI works: one question followed down through an AI system, from the
 * words to the chips and the buildings they run in, and back up to the answer.
 */
export default function Descent() {
  const [director, setDirector] = useState<Director | null>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [current, setCurrent] = useState('');
  const opening = useMemo(() => createOpening(), []);
  const finale = useMemo(() => createFinale(), []);
  const items = useMemo(() => sequence(), []);
  const chapters = items.filter((item) => item.kind === 'chapter');
  const total = chapters.length;
  // Each chapter's colour, from violet at the surface to red at the bottom and back.
  const hueOf = (id: string) => {
    const index = chapters.findIndex((chapter) => chapter.id === id);
    return spectrum(index / Math.max(1, total - 1));
  };

  useEffect(() => {
    const next = createDirector();
    setDirector(next);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(motion.matches);
    sync();
    motion.addEventListener('change', sync);
    return () => {
      motion.removeEventListener('change', sync);
      next.destroy();
    };
  }, []);
  useEffect(() => director?.setPaused(paused), [director, paused]);

  // The chapter under the middle of the screen, for the rail.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setCurrent(entry.target.id);
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    for (const item of items) {
      const element = document.getElementById(item.id);
      if (element && item.kind === 'chapter') observer.observe(element);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <DirectorContext.Provider value={director}>
      <div className={`dsc-page${director ? ' dsc-live' : ''}`}>
        <nav className="dsc-rail" aria-label="Chapters">
          <ol>
            {chapters.map(({ id, short }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={current === id ? 'step' : undefined}
                  style={{ '--hue': hueOf(id) } as CSSProperties}
                >
                  <span className="dsc-rail-dot" aria-hidden="true" />
                  <span className="dsc-rail-label">{short}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <button
          type="button"
          className="dsc-motion"
          aria-pressed={paused || reduced}
          disabled={reduced}
          onClick={() => setPaused((value) => !value)}
        >
          {paused || reduced ? (
            <Play size={14} aria-hidden="true" />
          ) : (
            <Pause size={14} aria-hidden="true" />
          )}
          {reduced ? 'Reduced motion' : paused ? 'Play motion' : 'Pause motion'}
        </button>

        <Opening
          draw={opening}
          ambient
          hue={spectrum(0)}
          label="A tunnel of connected points of light, flown into as you scroll: the way down into an AI system."
        >
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
          <a className="dsc-begin" href={`#${chapters[0].id}`}>
            <ArrowDown size={16} aria-hidden="true" />
            Scroll to go in
          </a>
        </Opening>

        {items.map((item) =>
          item.kind === 'chapter' ? (
            <Scene
              key={item.id}
              id={item.id}
              number={chapters.indexOf(item) + 1}
              total={total}
              hue={hueOf(item.id)}
              draw={item.draw}
              ambient={item.ambient}
              title={item.title}
              lede={item.lede}
              label={item.label}
              steps={item.steps}
              controls={item.controls}
            />
          ) : (
            <Interlude
              key={item.id}
              id={item.id}
              hue={item.to}
              draw={item.draw}
              ambient
              kicker={item.kicker}
              question={item.question}
              label={item.label}
            />
          ),
        )}

        <Finale
          id="the-answer"
          draw={finale}
          ambient
          hue={spectrum(0.1)}
          label="Every layer of the journey on one line, from your question down to the data centre, with a pulse of light travelling down and back up."
        >
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
        </Finale>

        <section className="dsc-outro" aria-labelledby="dsc-sources">
          <h2 id="dsc-sources">Sources</h2>
          <p>
            The pictures are simplified teaching models drawn in your browser, not a live view of
            any product. Figures and results come from these sources; illustrative values are marked
            where they appear.
          </p>
          <ol className="dsc-references">
            {REFERENCES.map(([href, text]) => (
              <li key={href}>
                <Source href={href}>{text}</Source>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </DirectorContext.Provider>
  );
}
