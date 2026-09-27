import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  MoveDown,
  Pause,
  Play,
} from 'lucide-react';
import { SIGNAL_STEPS, signalFrame, scrollProgress } from '../../lib/signal-journey';
import { drawSignal } from './draw-signal';
import './signal-journey.css';

export function SignalJourney({
  paused,
  reduced,
  onPause,
}: {
  paused: boolean;
  reduced: boolean;
  onPause: () => void;
}) {
  const track = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const progress = useRef(0);
  const seek = useRef<(index: number) => void>(() => {});
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = track.current,
      panel = pin.current,
      drawing = canvas.current;
    if (!host || !panel || !drawing) return;
    const ctx = drawing.getContext('2d');
    if (!ctx) return;
    let frame = 0,
      last = 0,
      current = progress.current,
      width = 0,
      height = 0,
      visible = true,
      force = true;
    let previousDraw = -1;
    const render = (time: number) => {
      frame = 0;
      if (document.hidden || !visible) return;
      const inset = parseFloat(getComputedStyle(panel).top) || 0;
      const target = reduced
        ? progress.current
        : scrollProgress(
            host.getBoundingClientRect().top,
            host.offsetHeight,
            panel.offsetHeight,
            inset,
          );
      const dt = last ? Math.min(64, time - last) : 16;
      last = time;
      current =
        paused || reduced ? target : current + (target - current) * (1 - Math.exp(-dt / 95));
      if (Math.abs(target - current) < 0.00008) current = target;
      progress.current = current;
      const state = signalFrame(current);
      const shown = paused || reduced ? state.step / 7 : current;
      setStep(state.step);
      host.dataset.progress = current.toFixed(5);
      host.dataset.step = String(state.step);
      panel.style.setProperty('--signal-progress', String(current));
      if (force || shown !== previousDraw) {
        drawSignal(ctx, width, height, shown);
        previousDraw = shown;
        force = false;
      }
      if (current !== target && !paused && !reduced) frame = requestAnimationFrame(render);
      else last = 0;
    };
    const request = () => {
      if (!frame && !document.hidden && visible) frame = requestAnimationFrame(render);
    };
    const resize = () => {
      const bounds = drawing.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      drawing.width = Math.round(width * dpr);
      drawing.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      force = true;
      request();
    };
    seek.current = (index) => {
      const indexProgress = Math.max(0, Math.min(7, index)) / 7;
      if (reduced) {
        progress.current = indexProgress;
        force = true;
        request();
        return;
      }
      const inset = parseFloat(getComputedStyle(panel).top) || 0;
      const start = host.getBoundingClientRect().top + scrollY - inset;
      window.scrollTo({
        top: start + indexProgress * (host.offsetHeight - panel.offsetHeight),
        behavior: paused ? 'instant' : 'smooth',
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(drawing);
    observer.observe(panel);
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          force = true;
          request();
        } else {
          cancelAnimationFrame(frame);
          frame = 0;
          last = 0;
        }
      },
      { rootMargin: '100px' },
    );
    intersection.observe(host);
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
      } else {
        force = true;
        request();
      }
    };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    resize();
    setReady(true);
    return () => {
      observer.disconnect();
      intersection.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [paused, reduced]);

  const current = SIGNAL_STEPS[step];
  return (
    <>
      <header className="sj-intro">
        <div>
          <span className="ai-kicker">ARTIFICIALS / HOW AI WORKS</span>
          <h1>
            Between the question
            <br />
            <span>and the answer.</span>
          </h1>
        </div>
        <div className="sj-intro-aside">
          <p>
            A signal becomes a story.
            <br />
            Your scroll sets it in motion.
          </p>
          <a href="#signal-journey">
            <MoveDown size={16} /> Enter the experience
          </a>
        </div>
      </header>
      <section
        ref={track}
        id="signal-journey"
        className="sj-track"
        data-ready={ready}
        data-reduced={reduced}
        data-step="0"
        aria-label="The journey of one question"
      >
        <div ref={pin} className="sj-pin">
          <div className="sj-topline">
            <span>
              <i /> THE SIGNAL ROOM
            </span>
            <span className="sj-control-hint">
              <ArrowDownUp size={13} /> SCROLL TO ADVANCE · REVERSE TO REWIND
            </span>
            <button
              onClick={onPause}
              disabled={reduced}
              aria-pressed={paused || reduced}
              aria-label={
                reduced
                  ? 'Journey reduced motion enabled'
                  : paused
                    ? 'Enable continuous journey motion'
                    : 'Use stepped journey motion'
              }
            >
              {paused || reduced ? <Play size={13} /> : <Pause size={13} />}
              <span>
                {reduced ? 'Reduced motion' : paused ? 'Stepped motion' : 'Continuous motion'}
              </span>
            </button>
          </div>
          <div className="sj-scene">
            <div className="sj-narrative">
              <div className="sj-chapter-number" aria-hidden="true">
                {String(step + 1).padStart(2, '0')}
                <span>/ 08</span>
              </div>
              <div className="sj-narrative-content" key={step}>
                <span className="ai-kicker">{current.name}</span>
                <h2>
                  {current.title.split('\n').map((line, i) => (
                    <span key={line}>
                      {line}
                      {i === 0 && <br />}
                    </span>
                  ))}
                </h2>
                <p>{current.text}</p>
                <div className="sj-detail">
                  <span />
                  <p>{current.detail}</p>
                </div>
                {step === 7 && (
                  <a
                    className="sj-source"
                    href="https://science.nasa.gov/moon/moonlight/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Check the explanation at NASA <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
            </div>
            <div className="sj-instrument">
              <span className="sj-coordinate sj-coordinate-a" aria-hidden="true">
                {current.label}
              </span>
              <span className="sj-coordinate sj-coordinate-b" aria-hidden="true">
                {String(step + 1).padStart(2, '0')} / SIGNAL PATH
              </span>
              <canvas ref={canvas} aria-hidden="true" />
              {!ready && (
                <div className="sj-poster" aria-hidden="true">
                  <span>Why does the</span>
                  <strong>Moon shine?</strong>
                  <i />
                </div>
              )}
              <span className="sj-art-caption">A visual explanation, not a live model trace.</span>
            </div>
          </div>
          <div className="sj-bottomline">
            <div className="sj-step-controls">
              <button
                onClick={() => seek.current(step - 1)}
                disabled={step === 0}
                aria-label="Previous signal stage"
              >
                <ChevronLeft size={16} />
              </button>
              <nav aria-label="Signal journey stages">
                {SIGNAL_STEPS.map((item, i) => (
                  <button
                    key={item.name}
                    onClick={() => seek.current(i)}
                    aria-current={i === step ? 'step' : undefined}
                    aria-label={`Stage ${i + 1}: ${item.name}`}
                    title={item.name}
                  >
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <i />
                  </button>
                ))}
              </nav>
              <button
                onClick={() => seek.current(step + 1)}
                disabled={step === 7}
                aria-label="Next signal stage"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <a href="#tokens">
              Explore the hands-on labs <ArrowDown size={14} />
            </a>
          </div>
          <div className="sj-progress" aria-hidden="true">
            <i />
          </div>
        </div>
      </section>
      <div className="sj-after">
        <div>
          <span className="ai-kicker">THE VISUAL JOURNEY IS ONLY THE BEGINNING</span>
          <h2>
            Now get your hands
            <br />
            <em>inside the mechanics.</em>
          </h2>
        </div>
        <p>
          Change a token. Shift a probability. Train a tiny model. The experiments below let you
          explore the ideas behind the sequence, including where this simplified picture stops.
        </p>
        <details className="sj-transcript" open={reduced}>
          <summary>Read the complete visual story</summary>
          <ol>
            {SIGNAL_STEPS.map((item) => (
              <li key={item.name}>
                <h3>{item.name}</h3>
                <p>{item.text}</p>
                <p>{item.detail}</p>
              </li>
            ))}
          </ol>
        </details>
      </div>
      <noscript>
        <style>
          {
            '.sj-track{height:auto!important}.sj-pin{position:relative!important;top:auto!important}.sj-topline button,.sj-step-controls{display:none!important}'
          }
        </style>
      </noscript>
    </>
  );
}
