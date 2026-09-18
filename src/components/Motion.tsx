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
      travel = 0;
    const update = () => {
      frame = 0;
      if (!query.matches) return;
      const progress = Math.min(
        1,
        Math.max(0, -el.getBoundingClientRect().top / Math.max(1, travel)),
      );
      rail.style.transform = `translate3d(${-progress * overflow}px,0,0)`;
      el.style.setProperty('--journey-progress', String(progress));
    };
    const measure = () => {
      el.dataset.motion = query.matches ? 'horizontal' : 'static';
      if (!query.matches) {
        rail.style.transform = '';
        el.style.removeProperty('--journey-height');
        return;
      }
      // Measure on layout changes; the scroll handler writes only one transform per frame.
      overflow = Math.max(0, rail.scrollWidth - view.clientWidth);
      travel = Math.max(overflow, 1);
      el.style.setProperty('--journey-height', `${view.clientHeight + travel}px`);
      update();
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
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
    };
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    observer.observe(rail);
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', measure);
    query.addEventListener('change', measure);
    rail.addEventListener('focusin', focusPanel);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', measure);
      query.removeEventListener('change', measure);
      rail.removeEventListener('focusin', focusPanel);
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
