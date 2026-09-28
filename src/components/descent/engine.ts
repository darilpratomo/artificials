/**
 * The page's one animation loop. Every scene's canvas is drawn from two
 * numbers: how far the reader has scrolled through it (`p`, eased, so the
 * picture glides) and the time (`t`, for gentle motion that loops without
 * keeping any state). Nothing accumulates between frames, so scrolling back
 * shows exactly what was there before, and a scene that leaves the screen
 * stops drawing.
 */

export interface Frame {
  /** The canvas size in CSS pixels. */
  w: number;
  h: number;
  /** Progress through the scene: 0 at its first step, 1 at its last; eased. */
  p: number;
  /** Seconds, for motion that loops; frozen when motion is reduced. */
  t: number;
  reduced: boolean;
  /** Values from the scene's controls, such as a slider. */
  input: Record<string, number>;
  /** How much of the bottom of the canvas the controls cover: draw above it. */
  reserve: number;
}
export type Draw = (ctx: CanvasRenderingContext2D, frame: Frame) => void;

export interface SceneOptions {
  /** The element whose steps set the progress. */
  section: HTMLElement;
  canvas: HTMLCanvasElement;
  draw: Draw;
  /** The step blocks, in order: each is centred on the reading line at its keyframe. */
  steps: () => HTMLElement[];
  /** Keeps drawing while on screen, for motion between scroll steps. */
  ambient?: boolean;
  onStep?: (step: number) => void;
  input?: Record<string, number>;
  /** Where on screen a step is read, as a share of its height; by default the middle, or lower on narrow screens. */
  anchor?: number;
  /** The sharpest pixel density to draw at: soft, full-screen light needs less than labels do. */
  maxDpr?: number;
  /** Controls laid over the canvas, which the picture must keep clear of. */
  cover?: () => HTMLElement | null;
}

interface Scene extends Required<Omit<SceneOptions, 'onStep' | 'anchor' | 'maxDpr' | 'cover'>> {
  onStep?: (step: number) => void;
  anchor?: number;
  maxDpr?: number;
  cover?: () => HTMLElement | null;
  reserve: number;
  centres: number[];
  w: number;
  h: number;
  dpr: number;
  visible: boolean;
  shown: number;
  step: number;
  dirty: boolean;
  ctx: CanvasRenderingContext2D | null;
}

/** How quickly the picture catches up with the scroll: higher is snappier. */
const CATCH_UP = 9;
/** A frozen moment for reduced motion, chosen to look settled. */
const STILL = 1.25;

export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));

export interface Director {
  add(options: SceneOptions): () => void;
  setInput(canvas: HTMLCanvasElement, key: string, value: number): void;
  /** Stops the looping motion where it is, or lets it carry on from there. */
  setPaused(paused: boolean): void;
  measure(): void;
  destroy(): void;
}

export function createDirector(): Director {
  const scenes = new Set<Scene>();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 1023px)');
  let reduced = motion.matches;
  let raf = 0;
  let last = 0;
  // The looping motion's own clock, which a pause stops without a jump.
  let paused = false;
  let pausedAt = 0;
  let offset = 0;
  const clock = (now: number) => ((paused ? pausedAt : now) - offset) / 1000;

  // Where a step must sit to be current: mid-screen beside the picture, or
  // below the picture on narrow screens, where the words scroll under it.
  const readingLine = (scene: Scene) =>
    innerHeight * (scene.anchor ?? (narrow.matches ? 0.78 : 0.5));

  function measureScene(scene: Scene) {
    const y = scrollY;
    scene.centres = scene.steps().map((step) => {
      const box = step.getBoundingClientRect();
      return box.top + y + box.height / 2;
    });
    scene.dirty = true;
  }

  function progress(scene: Scene) {
    const { centres } = scene;
    const last = centres.length - 1;
    if (last < 1) return 0;
    const line = scrollY + readingLine(scene);
    if (line <= centres[0]) return 0;
    if (line >= centres[last]) return 1;
    let index = 0;
    while (index < last - 1 && line > centres[index + 1]) index += 1;
    const span = centres[index + 1] - centres[index] || 1;
    return (index + clamp((line - centres[index]) / span)) / last;
  }

  function size(scene: Scene) {
    const box = scene.canvas.getBoundingClientRect();
    const dpr = Math.min(scene.maxDpr ?? 2, devicePixelRatio || 1);
    const w = Math.max(1, Math.round(box.width));
    const h = Math.max(1, Math.round(box.height));
    // The controls sit over the bottom of the picture, with a little air above them.
    const cover = scene.cover?.()?.getBoundingClientRect();
    const reserve = cover?.height ? Math.max(0, Math.round(box.bottom - cover.top) + 10) : 0;
    if (reserve !== scene.reserve) {
      scene.reserve = reserve;
      scene.dirty = true;
    }
    if (w === scene.w && h === scene.h && dpr === scene.dpr) return;
    scene.w = w;
    scene.h = h;
    scene.dpr = dpr;
    scene.canvas.width = Math.round(w * dpr);
    scene.canvas.height = Math.round(h * dpr);
    scene.dirty = true;
  }

  function paint(scene: Scene, t: number) {
    const ctx = scene.ctx ?? (scene.ctx = scene.canvas.getContext('2d'));
    if (!ctx || scene.w < 2 || scene.h < 2) return;
    ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, scene.w, scene.h);
    try {
      scene.draw(ctx, {
        w: scene.w,
        h: scene.h,
        p: scene.shown,
        t,
        reduced,
        input: scene.input,
        reserve: scene.reserve,
      });
    } catch (error) {
      // One broken picture must not stop the others.
      console.error(error);
    }
  }

  function tick(now: number) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    const t = reduced ? STILL : clock(now);
    let busy = false;
    for (const scene of scenes) {
      if (!scene.visible) continue;
      const target = progress(scene);
      const steps = Math.max(1, scene.centres.length - 1);
      // Reduced motion shows each step's finished picture, with no gliding.
      const goal = reduced ? Math.round(target * steps) / steps : target;
      const next = reduced
        ? goal
        : scene.shown + (goal - scene.shown) * (1 - Math.exp(-dt * CATCH_UP));
      const settled = Math.abs(goal - next) < 0.0004;
      const moved = next !== scene.shown;
      scene.shown = settled ? goal : next;
      if (!settled) busy = true;
      const step = Math.round(target * steps);
      if (step !== scene.step) {
        scene.step = step;
        scene.onStep?.(step);
      }
      const animated = scene.ambient && !reduced && !paused;
      if (scene.dirty || moved || animated) {
        scene.dirty = false;
        paint(scene, t);
      }
      if (animated) busy = true;
    }
    if (busy && document.visibilityState === 'visible') raf = requestAnimationFrame(tick);
    else last = 0;
  }

  const request = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        for (const scene of scenes)
          if (scene.section === entry.target) {
            scene.visible = entry.isIntersecting;
            if (scene.visible) {
              size(scene);
              scene.dirty = true;
            }
          }
      request();
    },
    { rootMargin: '25% 0px 25% 0px' },
  );
  // A section that grows moves every section below it, so any change of size
  // measures every scene again.
  const resized = new ResizeObserver((entries) => {
    let moved = false;
    for (const entry of entries)
      for (const scene of scenes)
        if (scene.canvas === entry.target || scene.cover?.() === entry.target) size(scene);
        else if (scene.section === entry.target) moved = true;
    if (moved) for (const scene of scenes) measureScene(scene);
    request();
  });

  const onScroll = () => request();
  const onResize = () => {
    for (const scene of scenes) {
      size(scene);
      measureScene(scene);
    }
    request();
  };
  const onMotion = () => {
    reduced = motion.matches;
    for (const scene of scenes) scene.dirty = true;
    request();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') request();
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  motion.addEventListener('change', onMotion);
  narrow.addEventListener('change', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  // Labels are drawn in the page's fonts; once they arrive, draw again.
  document.fonts?.ready.then(() => {
    for (const scene of scenes) {
      size(scene);
      measureScene(scene);
      scene.dirty = true;
    }
    request();
  });

  return {
    add(options) {
      const scene: Scene = {
        ambient: false,
        input: {},
        ...options,
        centres: [],
        w: 0,
        h: 0,
        dpr: 1,
        visible: false,
        shown: 0,
        step: -1,
        dirty: true,
        ctx: null,
        reserve: 0,
      };
      scenes.add(scene);
      size(scene);
      measureScene(scene);
      // Start where the reader already is, rather than gliding from the top.
      scene.shown = progress(scene);
      const cover = scene.cover?.();
      visibility.observe(scene.section);
      resized.observe(scene.canvas);
      resized.observe(scene.section);
      if (cover) resized.observe(cover);
      request();
      return () => {
        scenes.delete(scene);
        visibility.unobserve(scene.section);
        resized.unobserve(scene.canvas);
        resized.unobserve(scene.section);
        if (cover) resized.unobserve(cover);
      };
    },
    setPaused(value) {
      if (value === paused) return;
      const now = performance.now();
      if (value) pausedAt = now;
      else offset += now - pausedAt;
      paused = value;
      for (const scene of scenes) scene.dirty = true;
      request();
    },
    setInput(canvas, key, value) {
      for (const scene of scenes)
        if (scene.canvas === canvas) {
          scene.input = { ...scene.input, [key]: value };
          scene.dirty = true;
        }
      request();
    },
    measure() {
      for (const scene of scenes) measureScene(scene);
      request();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      visibility.disconnect();
      resized.disconnect();
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      motion.removeEventListener('change', onMotion);
      narrow.removeEventListener('change', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      scenes.clear();
    },
  };
}
