import { useCallback, useEffect, useState } from 'react';
import { PixelLogo } from './PixelLogo';
import './logo-intro.css';

const SESSION_KEY = 'artificialsIntroPlayed';
/** Time to fade the overlay away once the logo has settled. */
const EXIT_MS = 520;

function alreadyPlayed() {
  if (typeof window === 'undefined') return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    // Private browsing can block storage; play once rather than fail.
    return false;
  }
}

function markPlayed() {
  try {
    sessionStorage.setItem(SESSION_KEY, 'true');
  } catch {
    /* The intro simply plays again next navigation. */
  }
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Full-screen reveal shown once per browser session. It never renders during
 * prerendering, so the crawlable HTML and the visitor's first paint still show
 * the real page rather than an overlay.
 */
export function LogoIntro() {
  const [active, setActive] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (alreadyPlayed() || reducedMotion()) {
      markPlayed();
      return;
    }
    setActive(true);
    document.body.classList.add('intro-locked');
    return () => document.body.classList.remove('intro-locked');
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    markPlayed();
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      setActive(false);
      document.body.classList.remove('intro-locked');
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  // Let a visitor skip ahead instead of waiting out the animation.
  useEffect(() => {
    if (!active || leaving) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, leaving, dismiss]);

  const replay = useCallback(() => {
    setLeaving(false);
    setRun((value) => value + 1);
    setActive(true);
    document.body.classList.add('intro-locked');
  }, []);

  // A development-only handle for checking the animation without clearing
  // storage by hand. `import.meta.env.DEV` is false in the production build, so
  // this block is removed by the bundler rather than shipped and hidden.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const target = window as unknown as { replayAnimation?: () => void };
    target.replayAnimation = replay;
    return () => {
      delete target.replayAnimation;
    };
  }, [replay]);

  if (!active) {
    return import.meta.env.DEV ? (
      <button type="button" className="logo-intro-replay" onClick={replay}>
        Replay intro
      </button>
    ) : null;
  }

  return (
    <div
      className={`logo-intro${leaving ? ' is-leaving' : ''}`}
      role="presentation"
      onClick={dismiss}
    >
      <PixelLogo key={run} pixelSize={16} gap={0} duration={1800} onComplete={dismiss} />
      <button type="button" className="logo-intro-skip" onClick={dismiss}>
        Skip
      </button>
    </div>
  );
}

export default LogoIntro;
