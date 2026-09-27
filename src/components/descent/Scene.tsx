import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { Director, Draw } from './engine';

export const DirectorContext = createContext<Director | null>(null);

/** One step of a chapter's text: the picture reaches its keyframe as the step reaches the middle. */
export interface Step {
  heading?: string;
  body: ReactNode;
  /** A figure worth keeping, with where it comes from. */
  fact?: ReactNode;
}

interface Common {
  id: string;
  draw: Draw;
  /** What the picture shows, for screen readers. */
  label: string;
  /** Keeps moving between scroll steps while on screen. */
  ambient?: boolean;
  /** The chapter's colour, from the spectrum. */
  hue: string;
}

/** Wires a section's canvas and steps into the page's animation loop. */
function useScene(
  { draw, ambient }: Pick<Common, 'draw' | 'ambient'>,
  onStep?: (step: number) => void,
  anchor?: number,
  maxDpr?: number,
) {
  const director = useContext(DirectorContext);
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const steps = useRef<HTMLElement[]>([]);
  useEffect(() => {
    if (!director || !section.current || !canvas.current) return;
    return director.add({
      section: section.current,
      canvas: canvas.current,
      draw,
      ambient,
      onStep,
      anchor,
      maxDpr,
      steps: () => steps.current.filter(Boolean),
    });
  }, [director, draw, ambient, onStep, anchor, maxDpr]);
  const set = useCallback(
    (key: string, value: number) => {
      if (director && canvas.current) director.setInput(canvas.current, key, value);
    },
    [director],
  );
  const stepRef = (index: number) => (element: HTMLElement | null) => {
    if (element) steps.current[index] = element;
  };
  return { section, canvas, set, stepRef };
}

/**
 * A chapter: its words scroll beside (or under) a picture that stays in place
 * and moves with them.
 */
export function Scene({
  id,
  number,
  total,
  title,
  lede,
  steps,
  controls,
  ...common
}: Common & {
  number: number;
  total: number;
  title: string;
  lede: string;
  steps: Step[];
  /** Controls laid over the picture, given a way to pass their values to it. */
  controls?: (set: (key: string, value: number) => void) => ReactNode;
}) {
  const [current, setCurrent] = useState(0);
  const { section, canvas, set, stepRef } = useScene(common, setCurrent);
  return (
    <section
      id={id}
      ref={section}
      className="dsc-scene"
      style={{ '--hue': common.hue } as CSSProperties}
      aria-labelledby={`${id}-title`}
    >
      <div className="dsc-stage">
        <canvas ref={canvas} role="img" aria-label={common.label} />
        {controls && <div className="dsc-controls">{controls(set)}</div>}
      </div>
      <div className="dsc-copy">
        {steps.map((step, index) => (
          <div
            key={index}
            ref={stepRef(index)}
            className="dsc-step"
            data-current={index === current || undefined}
          >
            {index === 0 && (
              <header className="dsc-head">
                <p className="dsc-count">
                  Chapter {number} of {total}
                </p>
                <h2 id={`${id}-title`}>{title}</h2>
                <p className="dsc-lede">{lede}</p>
              </header>
            )}
            {step.heading && <h3>{step.heading}</h3>}
            <div className="dsc-body">{step.body}</div>
            {step.fact && <p className="dsc-fact">{step.fact}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

/** A pause between parts: one question, held in the middle of the screen over moving light. */
export function Interlude({
  id,
  kicker,
  question,
  ...common
}: Common & { kicker: string; question: string }) {
  const { section, canvas, stepRef } = useScene(common, undefined, 0.5, 1.5);
  return (
    <section
      id={id}
      ref={section}
      className="dsc-interlude"
      style={{ '--hue': common.hue } as CSSProperties}
      aria-labelledby={`${id}-question`}
    >
      <div className="dsc-interlude-stage">
        <canvas ref={canvas} role="img" aria-label={common.label} />
        <div className="dsc-interlude-copy">
          <p className="dsc-kicker">{kicker}</p>
          <h2 id={`${id}-question`} className="dsc-question">
            {question}
          </h2>
        </div>
      </div>
      <span ref={stepRef(0)} className="dsc-mark dsc-mark-start" aria-hidden="true" />
      <span ref={stepRef(1)} className="dsc-mark dsc-mark-end" aria-hidden="true" />
    </section>
  );
}

/** The close: the whole way down on one line, with the answer and where to go next. */
export function Finale({ children, ...common }: Common & { children: ReactNode }) {
  const { section, canvas, stepRef } = useScene(common, undefined, 0.5, 1.5);
  return (
    <section
      id={common.id}
      ref={section}
      className="dsc-finale"
      style={{ '--hue': common.hue } as CSSProperties}
      aria-labelledby={`${common.id}-title`}
    >
      <div className="dsc-finale-stage">
        <canvas ref={canvas} role="img" aria-label={common.label} />
        <div className="dsc-finale-copy">{children}</div>
      </div>
      <span ref={stepRef(0)} className="dsc-mark dsc-mark-start" aria-hidden="true" />
      <span ref={stepRef(1)} className="dsc-mark dsc-mark-end" aria-hidden="true" />
    </section>
  );
}

/** The opening: a full screen of light, the title and the question typed in. */
export function Opening({ children, ...common }: Omit<Common, 'id'> & { children: ReactNode }) {
  const { section, canvas, stepRef } = useScene(common, undefined, 0.5, 1.5);
  return (
    <section ref={section} className="dsc-opening" aria-labelledby="dsc-title">
      <div className="dsc-opening-stage">
        <canvas ref={canvas} role="img" aria-label={common.label} />
      </div>
      <div ref={stepRef(0)} className="dsc-opening-copy">
        {children}
      </div>
      <div ref={stepRef(1)} className="dsc-opening-end" aria-hidden="true" />
    </section>
  );
}
