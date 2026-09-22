import { useEffect, useMemo, useRef, useState } from 'react';
import { LOGO_MATRIX, LOGO_COLUMNS, LOGO_ROWS } from './logo-matrix';
import './pixel-logo.css';

export interface PixelLogoProps {
  /** Edge of one pixel in CSS pixels. Mobile scales down via CSS. */
  pixelSize?: number;
  /** Space between pixels in CSS pixels. */
  gap?: number;
  /** Total assembling time in milliseconds, including per-pixel delays. */
  duration?: number;
  color?: string;
  background?: string;
  /** Rendered next to the mark once the assembly finishes. */
  wordmark?: string;
  /** Skips the animation and paints the finished logo immediately. */
  still?: boolean;
  className?: string;
  onComplete?: () => void;
}

interface PixelSeed {
  key: string;
  column: number;
  row: number;
  /** Start offset from the final position, in CSS pixels. */
  tx: number;
  ty: number;
  rotation: number;
  delay: number;
}

const ROWS = LOGO_ROWS;
const COLUMNS = LOGO_COLUMNS;
const CENTER_X = (COLUMNS - 1) / 2;
const CENTER_Y = (ROWS - 1) / 2;
const MAX_DISTANCE = Math.hypot(CENTER_X, CENTER_Y);
/** Longest single pixel flight; the rest of the budget is spent on delays. */
const TRAVEL_MS = 620;
const FADE_MS = 260;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Pixels start scattered around the logo and fly inward. Delay grows with the
 * distance from the centre so the shape resolves from the middle outward, with
 * a little jitter so the order never looks mechanical.
 */
function buildSeeds(duration: number): PixelSeed[] {
  const seeds: PixelSeed[] = [];
  // Reserve the flight time so the last pixel lands on the requested duration.
  const delayBudget = Math.max(0, duration - TRAVEL_MS);
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (LOGO_MATRIX[row][column] !== '1') continue;
      const dx = column - CENTER_X;
      const dy = row - CENTER_Y;
      const distance = Math.hypot(dx, dy);
      // Push each pixel outward along its own angle from the centre.
      const angle = Math.atan2(dy, dx);
      const radius = 60 + Math.random() * 100;
      const ordered = MAX_DISTANCE ? distance / MAX_DISTANCE : 0;
      seeds.push({
        key: `${row}-${column}`,
        column,
        row,
        tx: Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        ty: Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        rotation: (Math.random() - 0.5) * 90,
        delay: Math.round(ordered * delayBudget * 0.72 + Math.random() * delayBudget * 0.28),
      });
    }
  }
  return seeds;
}

export function PixelLogo({
  pixelSize = 14,
  gap = 2,
  duration = 1800,
  color = '#ffffff',
  background = 'transparent',
  wordmark = 'ARTIFICIALS',
  still = false,
  className = '',
  onComplete,
}: PixelLogoProps) {
  // Server rendering and reduced-motion visitors get the finished logo, so the
  // shape is never missing from prerendered HTML or from a static preference.
  const [assembled, setAssembled] = useState(true);
  const [generation, setGeneration] = useState(0);
  const completion = useRef(onComplete);
  completion.current = onComplete;

  const seeds = useMemo(
    () => buildSeeds(duration),
    // A replay reseeds the scatter so the second run is not a copy of the first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duration, generation],
  );

  useEffect(() => {
    if (still || prefersReducedMotion()) {
      setAssembled(true);
      return;
    }
    setAssembled(false);
    // Paint the scattered state once before releasing the transition, otherwise
    // the browser collapses both states into a single frame and nothing moves.
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAssembled(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [still, generation]);

  useEffect(() => {
    if (!assembled) return;
    // No timers or loops keep running once the logo has settled.
    const settle = window.setTimeout(
      () => completion.current?.(),
      still || prefersReducedMotion() ? 0 : duration + FADE_MS,
    );
    return () => window.clearTimeout(settle);
  }, [assembled, duration, still]);

  const style = {
    '--pixel-size': `${pixelSize}px`,
    '--pixel-gap': `${gap}px`,
    '--pixel-columns': COLUMNS,
    '--pixel-color': color,
    '--pixel-travel': `${TRAVEL_MS}ms`,
    '--pixel-fade': `${FADE_MS}ms`,
    '--wordmark-delay': `${duration + 60}ms`,
    background,
  } as React.CSSProperties;

  return (
    <div
      className={`pixel-logo${assembled ? ' is-assembled' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      role="img"
      aria-label={wordmark ? `${wordmark} logo` : 'ARTIFICIALS logo'}
    >
      <div className="pixel-logo-grid" data-solid={gap <= 0 ? 'true' : 'false'} aria-hidden="true">
        {seeds.map((seed) => (
          <span
            key={`${generation}-${seed.key}`}
            className="pixel"
            style={
              {
                gridColumn: seed.column + 1,
                gridRow: seed.row + 1,
                '--tx': `${seed.tx.toFixed(2)}px`,
                '--ty': `${seed.ty.toFixed(2)}px`,
                '--rotation': `${seed.rotation.toFixed(2)}deg`,
                '--delay': `${seed.delay}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      {wordmark && (
        <span className="pixel-logo-wordmark" aria-hidden="true">
          {wordmark}
        </span>
      )}
    </div>
  );
}

export { LOGO_MATRIX };
export default PixelLogo;
