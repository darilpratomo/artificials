import { useEffect, useRef, type ReactNode } from 'react';

export function Reveal({
  children,
  className = '',
  from = 'bottom',
}: {
  children: ReactNode;
  className?: string;
  from?: 'left' | 'right' | 'bottom';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    )
      return;
    el.classList.add('reveal-ready');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal from-${from} ${className}`}>
      {children}
    </div>
  );
}

export function ScrollJourney({ children }: { children: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = section.current,
      rail = track.current,
      view = viewport.current;
    if (!el || !rail || !view) return;
    const query = matchMedia('(prefers-reduced-motion: no-preference) and (min-height: 560px)');
    let frame = 0,
      overflow = 0,
      travel = 1,
      position = 0,
      target = 0,
      previousTime = 0,
      previousScroll = window.scrollY,
      wasPinned = false,
      needsRead = false;

    const paint = () => {
      rail.style.transform = `translate3d(${-position}px,0,0)`;
      el.style.setProperty('--journey-progress', String(overflow ? position / overflow : 0));
    };
    const readTarget = (snap = false) => {
      const distance = -el.getBoundingClientRect().top;
      const pinned = distance > 0 && distance < travel;
      const scroll = window.scrollY;
      const jumped = Math.abs(scroll - previousScroll) > Math.max(180, view.clientHeight * 0.45);
      target = Math.min(1, Math.max(0, distance / travel)) * overflow;
      // Follow ordinary wheel/touch movement softly, but never trail behind an
      // unpinned section, a large navigation jump, or newly focused content.
      if (snap || !pinned || !wasPinned || jumped) position = target;
      previousScroll = scroll;
      wasPinned = pinned;
      needsRead = false;
    };
    const animate = (time: number) => {
      frame = 0;
      if (!query.matches || document.hidden) return;
      if (needsRead) readTarget();
      // Exponential damping has the same feel at 60 Hz and 120 Hz. Read layout
      // only after a scroll event; settling frames update the transform alone.
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 1000 / 60;
      previousTime = time;
      position += (target - position) * (1 - Math.exp(-elapsed / 85));
      if (Math.abs(target - position) < 0.1) position = target;
      paint();
      if (position !== target) frame = requestAnimationFrame(animate);
      else previousTime = 0;
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    };
    const measure = () => {
      stop();
      el.dataset.motion = query.matches ? 'horizontal' : 'static';
      if (!query.matches) {
        rail.style.transform = '';
        el.style.removeProperty('--journey-height');
        el.style.removeProperty('--journey-progress');
        wasPinned = false;
        return;
      }
      overflow = Math.max(0, rail.scrollWidth - view.clientWidth);
      travel = Math.max(overflow, 1);
      el.style.setProperty('--journey-height', `${view.clientHeight + travel}px`);
      readTarget(true);
      paint();
    };
    const request = () => {
      if (!query.matches || document.hidden) return;
      needsRead = true;
      if (!frame) frame = requestAnimationFrame(animate);
    };
    const visibility = () => {
      if (document.hidden) stop();
      else measure();
    };
    const focusPanel = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (!query.matches || !target.matches(':focus-visible')) return;
      const panel = target.closest<HTMLElement>('.journey-panel');
      if (!panel) return;
      const left = Math.max(
        0,
        Math.min(overflow, panel.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft)),
      );
      window.scrollTo({
        top: scrollY + el.getBoundingClientRect().top + left,
        behavior: 'instant',
      });
      stop();
      readTarget(true);
      paint();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    observer.observe(rail);
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', measure);
    query.addEventListener('change', measure);
    rail.addEventListener('focusin', focusPanel);
    document.addEventListener('visibilitychange', visibility);
    measure();
    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', measure);
      query.removeEventListener('change', measure);
      rail.removeEventListener('focusin', focusPanel);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return (
    <section ref={section} className="journey" aria-label="From discovery to creation">
      <div ref={viewport} className="journey-sticky">
        <div className="journey-track" ref={track}>
          {children}
        </div>
        <div className="journey-scroll-cue" aria-hidden="true">
          <span>SCROLL TO EXPLORE</span>
          <div>
            <i />
          </div>
          <span>DISCOVER / UNDERSTAND / CREATE</span>
        </div>
      </div>
    </section>
  );
}
