import { useEffect, useMemo, useRef, useState } from 'react';
import { LOGO_COLUMNS, LOGO_MATRIX, LOGO_ROWS } from './logo-matrix';
import './pixel-logo.css';

/** Downloadable copies generated from this same matrix by scripts/build-logo.mjs. */
export const LOGO_FILE = '/brand/artificials-logo.png';

export interface PixelLogoProps {
  /** Height of the mark in CSS pixels; the width follows the square matrix. */
  size?: number;
  /** Overrides the inherited text colour. */
  color?: string;
  className?: string;
  /**
   * Decorative by default. The lockup supplies the accessible name, so the mark
   * itself stays hidden from assistive technology.
   */
  title?: string;
  /** Plays the scatter-and-assemble cycle. */
  animate?: boolean;
  /** Milliseconds from one assembly to the next. 0 plays once and stops. */
  repeatEvery?: number;
  /** Assembling time in milliseconds, including the staggered delays. */
  duration?: number;
  /**
   * Renders a real <img> so the mark can be saved with the browser's own
   * "Save image as" or a long press, exactly like any other logo image.
   */
  downloadable?: boolean;
  /** Slightly rounds the animated matrix blocks so the header mark reads softer. */
  soften?: boolean;
}

/** Row runs of active cells, so each run becomes one rectangle instead of many. */
export function rowRuns(row: string) {
  const runs: { start: number; length: number }[] = [];
  let start = -1;
  for (let index = 0; index <= row.length; index += 1) {
    const active = row[index] === '1';
    if (active && start === -1) start = index;
    if (!active && start !== -1) {
      runs.push({ start, length: index - start });
      start = -1;
    }
  }
  return runs;
}

interface Block {
  key: string;
  x: number;
  y: number;
  width: number;
  /** Scatter offset in matrix units, relative to the final position. */
  tx: number;
  ty: number;
  /** Stagger for assembling, and for dispersing, in milliseconds. */
  inDelay: number;
  outDelay: number;
}

const CENTER_X = (LOGO_COLUMNS - 1) / 2;
const CENTER_Y = (LOGO_ROWS - 1) / 2;
const MAX_DISTANCE = Math.hypot(CENTER_X, CENTER_Y);
/** Flight time for a single block, in each direction. */
const TRAVEL_IN_MS = 620;
const TRAVEL_OUT_MS = 520;

/**
 * Blocks scatter outward along their own angle from the centre and return along
 * the same path. Assembling is staggered from the centre out; dispersing runs
 * the other way, from the edges in, so the two halves read as one continuous
 * motion rather than the same move played twice.
 */
export function buildBlocks(duration: number, seed = Math.random): Block[] {
  const blocks: Block[] = [];
  const inBudget = Math.max(0, duration - TRAVEL_IN_MS);
  const outBudget = Math.max(0, Math.round(duration * 0.55) - TRAVEL_OUT_MS);
  for (let row = 0; row < LOGO_ROWS; row += 1) {
    for (const run of rowRuns(LOGO_MATRIX[row])) {
      const midX = run.start + run.length / 2 - 0.5;
      const dx = midX - CENTER_X;
      const dy = row - CENTER_Y;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      // Distances are in matrix units, so the scatter scales with any size.
      const radius = 5 + seed() * 7;
      const ordered = MAX_DISTANCE ? distance / MAX_DISTANCE : 0;
      blocks.push({
        key: `${row}-${run.start}`,
        x: run.start,
        y: row,
        width: run.length,
        tx: Math.cos(angle) * radius + (seed() - 0.5) * 4,
        ty: Math.sin(angle) * radius + (seed() - 0.5) * 4,
        // Jitter is kept small and centred on the ordered position. A large
        // random share lets one block land far ahead of the rest, which shows
        // as a single flash followed by a pause before the others arrive.
        inDelay: Math.round(Math.max(0, ordered * inBudget + (seed() - 0.5) * inBudget * 0.12)),
        // Reversed ordering: the outer blocks leave first.
        outDelay: Math.round(
          Math.max(0, (1 - ordered) * outBudget + (seed() - 0.5) * outBudget * 0.12),
        ),
      });
    }
  }
  return blocks;
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

type Phase = 'assembled' | 'scattered';

/**
 * The finished mark as one shape. Separate row rectangles leave faint seams
 * where their anti-aliased edges meet at fractions of a pixel; a single path
 * is filled in one pass, so the resting logo reads as solid, and it is one
 * element instead of dozens.
 */
export const SOLID_PATH = LOGO_MATRIX.flatMap((row, y) =>
  rowRuns(row).map(({ start, length }) => `M${start} ${y}h${length}v1h-${length}z`),
).join('');

/**
 * The Artificials mark, drawn from the pixel matrix as a single inline SVG.
 *
 * SVG rather than a raster file so the mark stays crisp at any size and follows
 * the surrounding text colour. Horizontal runs are merged into one rectangle
 * each, which removes the hairline seams separate squares would show and keeps
 * the element count low.
 */
export function PixelLogo({
  size = 32,
  color,
  className = '',
  title,
  animate = false,
  repeatEvery = 0,
  duration = 1400,
  downloadable = false,
  soften = false,
}: PixelLogoProps) {
  // Server rendering and reduced-motion visitors get the finished mark, so the
  // logo is never missing from prerendered HTML or from a static preference.
  // An animating mark starts scattered instead, otherwise the finished logo
  // paints for one frame before the animation begins and reads as a flicker.
  const [phase, setPhase] = useState<Phase>(() =>
    animate && typeof window !== 'undefined' && !prefersReducedMotion() ? 'scattered' : 'assembled',
  );
  const [run, setRun] = useState(0);
  // Prerendered HTML must show the plain finished mark. Marking it as animated
  // in the static markup paints the assembled logo before JavaScript runs, and
  // the switch to the scattered start then reads as a flicker.
  const [active, setActive] = useState(false);
  useEffect(() => setActive(true), []);
  const moving = animate && active;
  // Before React takes over, the prerendered markup shows the finished mark.
  // Handing straight to a scattered start makes that first paint read as a
  // flicker, so an animating mark is held invisible until the run begins. The
  // static markup keeps the full logo for crawlers and for no-JavaScript.
  const pending = animate && !active;
  // Blocks keep stable keys so React updates them in place. Recreating them, or
  // changing their offsets mid-flight, restarts the animation and paints as a
  // blink, so new scatter values are only taken while the mark is hidden.
  const blocks = useMemo(
    () => buildBlocks(duration),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duration, run],
  );
  const timers = useRef<number[]>([]);
  // Once every block has landed, the solid shape takes their place until the
  // next dispersal; the blocks stay mounted, hidden, so no animation restarts.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!moving || phase !== 'assembled') {
      setSettled(false);
      return;
    }
    if (prefersReducedMotion()) {
      setSettled(true);
      return;
    }
    const timer = window.setTimeout(() => setSettled(true), duration + 120);
    return () => window.clearTimeout(timer);
  }, [moving, phase, duration, run]);

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setPhase('assembled');
      return;
    }
    // One frame is enough for the browser to pick up the scattered starting
    // keyframe before the assembly is released.
    const frame = requestAnimationFrame(() => setPhase('assembled'));
    return () => cancelAnimationFrame(frame);
  }, [animate, run]);

  useEffect(() => {
    if (!animate || !repeatEvery || prefersReducedMotion()) return;
    const outTime = Math.round(duration * 0.55) + TRAVEL_OUT_MS;
    // Hold the finished mark, disperse it, then start the next assembly.
    const hold = Math.max(1200, repeatEvery - duration - outTime);
    const clear = () => {
      for (const timer of timers.current) window.clearTimeout(timer);
      timers.current = [];
    };
    const cycle = () => {
      clear();
      timers.current.push(
        window.setTimeout(() => {
          // Skip the cycle while the tab is hidden; no work happens off-screen.
          if (document.hidden) {
            cycle();
            return;
          }
          // Blocks take over from the solid shape in the same frame they start to move.
          setSettled(false);
          setPhase('scattered');
          // Wait for the slowest block to finish leaving before reseeding, so
          // no visible block is ever moved to a new starting offset.
          timers.current.push(window.setTimeout(() => setRun((value) => value + 1), outTime + 80));
        }, duration + hold),
      );
    };
    cycle();
    return clear;
  }, [animate, repeatEvery, duration, run]);

  const style = moving
    ? ({
        '--logo-travel-in': `${TRAVEL_IN_MS}ms`,
        '--logo-travel-out': `${TRAVEL_OUT_MS}ms`,
      } as React.CSSProperties)
    : undefined;

  // A plain image, for the static case and for saving. Browsers only offer
  // "Save image as" and long-press save on a real <img>.
  if (downloadable && !animate) {
    return (
      <img
        className={`pixel-logo${className ? ` ${className}` : ''}`}
        src={LOGO_FILE}
        width={size}
        height={size}
        alt={title ?? ''}
        aria-hidden={title ? undefined : true}
        draggable
        decoding="async"
      />
    );
  }

  const mark = (
    <svg
      className={`pixel-logo${moving ? ' is-animated' : ''}${phase === 'assembled' ? ' is-assembled' : ''}${settled ? ' is-settled' : ''}${pending ? ' is-pending' : ''}${className && !downloadable ? ` ${className}` : ''}`}
      // Present in the prerendered HTML so CSS can hold the mark from the very
      // first paint. Waiting for React to add a class leaves the finished logo
      // on screen for a few frames, which reads as a flicker.
      data-animates={animate ? '' : undefined}
      viewBox={`0 0 ${LOGO_COLUMNS} ${LOGO_ROWS}`}
      width={size}
      height={size}
      style={style}
      fill={color ?? 'currentColor'}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      shapeRendering={soften ? 'geometricPrecision' : 'crispEdges'}
    >
      {moving && <path className="pixel-solid" d={SOLID_PATH} />}
      {blocks.map((block) =>
        moving ? (
          // The transform lives on a wrapping <g>. Transitioning a 3D transform
          // directly on an SVG <rect> is unreliable: browsers accept the value
          // but refuse to interpolate it, leaving the mark static.
          <g
            key={block.key}
            className="pixel-block"
            style={
              {
                '--tx': `${block.tx.toFixed(2)}px`,
                '--ty': `${block.ty.toFixed(2)}px`,
                '--in-delay': `${block.inDelay}ms`,
                '--out-delay': `${block.outDelay}ms`,
              } as React.CSSProperties
            }
          >
            <rect
              x={block.x}
              y={block.y}
              width={block.width}
              height={1}
              rx={soften ? 0.18 : undefined}
              ry={soften ? 0.18 : undefined}
            />
          </g>
        ) : (
          <rect
            key={block.key}
            x={block.x}
            y={block.y}
            width={block.width}
            height={1}
            rx={soften ? 0.18 : undefined}
            ry={soften ? 0.18 : undefined}
          />
        ),
      )}
    </svg>
  );

  if (!downloadable) return mark;

  // The animation needs SVG, but saving needs an image. Stack both: the SVG
  // shows the motion, and a matching <img> sits on top to receive the context
  // menu and long press. The image is transparent so the SVG stays visible.
  return (
    <span className={`pixel-logo-saveable${className ? ` ${className}` : ''}`}>
      {mark}
      <img
        className="pixel-logo-file"
        src={LOGO_FILE}
        width={size}
        height={size}
        alt={title ?? ''}
        aria-hidden={title ? undefined : true}
        draggable
        decoding="async"
        loading="lazy"
      />
    </span>
  );
}

export { LOGO_MATRIX };
export default PixelLogo;
