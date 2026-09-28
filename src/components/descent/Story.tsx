import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Pause as PauseIcon, Play } from 'lucide-react';
import { createDirector, type Director, type Draw } from './engine';
import { DirectorContext, Finale, Interlude, Opening, Scene, type Step } from './Scene';
import { spectrum } from './kit';
import './story.css';

/** A chapter: a picture, and the steps of text that move it. */
export interface Chapter {
  kind: 'chapter';
  id: string;
  /** The name on the rail. */
  short: string;
  title: string;
  lede: string;
  label: string;
  steps: Step[];
  draw: Draw;
  ambient?: boolean;
  controls?: (set: (key: string, value: number) => void) => ReactNode;
}
/** A pause between parts: one question over moving light. */
export interface Pause {
  kind: 'interlude';
  id: string;
  kicker: string;
  question: string;
  label: string;
  draw: Draw;
  from: string;
  to: string;
}

interface Section {
  draw: Draw;
  label: string;
  hue: string;
  children: ReactNode;
}

/**
 * A page of moving pictures: an opening, chapters whose pictures follow the
 * reader's scroll, pauses between parts and a close, with a rail of chapters
 * and a control to pause the motion. Anything after the close, such as the
 * sources, comes as children.
 */
export function Story({
  className,
  opening,
  items,
  finale,
  children,
}: {
  /** The page's own class, for its own styles beside the shared ones. */
  className?: string;
  opening: Section;
  items: (Chapter | Pause)[];
  finale: Section & { id: string };
  children?: ReactNode;
}) {
  const [director, setDirector] = useState<Director | null>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [current, setCurrent] = useState('');
  const chapters = useMemo(
    () => items.filter((item): item is Chapter => item.kind === 'chapter'),
    [items],
  );
  const total = chapters.length;
  // Each chapter's colour, from violet at the start to red at the end.
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
    for (const chapter of chapters) {
      const element = document.getElementById(chapter.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [chapters]);

  return (
    <DirectorContext.Provider value={director}>
      <div className={`dsc-page${className ? ` ${className}` : ''}${director ? ' dsc-live' : ''}`}>
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
            <PauseIcon size={14} aria-hidden="true" />
          )}
          {reduced ? 'Reduced motion' : paused ? 'Play motion' : 'Pause motion'}
        </button>

        <Opening draw={opening.draw} ambient hue={opening.hue} label={opening.label}>
          {opening.children}
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

        <Finale id={finale.id} draw={finale.draw} ambient hue={finale.hue} label={finale.label}>
          {finale.children}
        </Finale>

        {children}
      </div>
    </DirectorContext.Provider>
  );
}
