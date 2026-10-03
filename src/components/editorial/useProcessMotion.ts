import { useEffect, useRef, useState } from 'react';

/** Reversible, viewport-bound motion. Manual interaction always takes control. */
export function useProcessMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<'manual' | 'scroll' | 'play'>('manual');
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReduced(media.matches);
      setMode(media.matches ? 'manual' : 'scroll');
    };
    update();
    media.addEventListener('change', update);
    const visibility = () => setForeground(!document.hidden);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (ref.current) observer.observe(ref.current);
    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', visibility);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (mode !== 'scroll' || reduced || !visible || !foreground) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const box = ref.current?.getBoundingClientRect();
      if (box)
        setProgress(
          Math.round(
            Math.max(
              0,
              Math.min(
                100,
                ((innerHeight * 0.8 - box.top) / (box.height + innerHeight * 0.3)) * 100,
              ),
            ),
          ),
        );
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    addEventListener('scroll', scroll, { passive: true });
    addEventListener('resize', scroll);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', scroll);
      removeEventListener('resize', scroll);
    };
  }, [mode, reduced, visible, foreground]);
  useEffect(() => {
    if (mode !== 'play' || reduced || !visible || !foreground) return;
    const timer = setInterval(() => setProgress((p) => Math.min(100, p + 1)), 100);
    return () => clearInterval(timer);
  }, [mode, reduced, visible, foreground]);
  useEffect(() => {
    if (progress === 100 && mode === 'play') setMode('manual');
  }, [progress, mode]);
  const seek = (value: number) => {
    setMode('manual');
    setProgress(Math.max(0, Math.min(100, value)));
  };
  return {
    ref,
    progress,
    mode,
    reduced,
    active: visible && foreground && !reduced && mode !== 'manual',
    seek,
    pause: () => setMode('manual'),
    follow: () => setMode('scroll'),
    play: () => {
      if (progress === 100) setProgress(0);
      setMode('play');
    },
  };
}
