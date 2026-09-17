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
  useEffect(() => {
    const query = matchMedia('(min-width: 1000px) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!section.current || !track.current) return;
      if (!query.matches) {
        track.current.style.transform = '';
        return;
      }
      const rect = section.current.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)));
      const overflow = Math.max(
        0,
        track.current.scrollWidth - document.documentElement.clientWidth + 64,
      );
      track.current.style.transform = `translate3d(${-progress * overflow}px,0,0)`;
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    query.addEventListener('change', request);
    request();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      query.removeEventListener('change', request);
    };
  }, []);
  return (
    <section ref={section} className="journey" aria-label="From discovery to creation">
      <div className="journey-sticky">
        <div className="journey-track" ref={track}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function NeuralOrb() {
  return (
    <div className="neural-orb" aria-hidden="true">
      <div className="orb-aura" />
      <svg viewBox="0 0 600 600" fill="none">
        <defs>
          <radialGradient id="orbLight" cx="32%" cy="22%" r="80%">
            <stop stopColor="#f7f8fa" />
            <stop offset=".28" stopColor="#858b97" />
            <stop offset=".63" stopColor="#24262d" />
            <stop offset="1" stopColor="#090a0e" />
          </radialGradient>
          <linearGradient
            id="orbStroke"
            x1="70"
            y1="60"
            x2="510"
            y2="510"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" />
            <stop offset=".48" stopColor="#8e929b" />
            <stop offset="1" stopColor="#15161a" />
          </linearGradient>
          <clipPath id="orbClip">
            <circle cx="300" cy="300" r="191" />
          </clipPath>
        </defs>
        <g className="orb-orbit">
          <ellipse
            cx="300"
            cy="300"
            rx="272"
            ry="93"
            transform="rotate(-30 300 300)"
            stroke="#545760"
            strokeWidth=".65"
          />
          <circle cx="70" cy="431" r="4" fill="#e6e7ea" />
        </g>
        <circle cx="300" cy="300" r="191" fill="url(#orbLight)" />
        <g clipPath="url(#orbClip)" stroke="url(#orbStroke)" strokeWidth="1.2" opacity=".75">
          {Array.from({ length: 23 }, (_, i) => (
            <ellipse
              key={i}
              cx="300"
              cy="300"
              rx={13 + i * 8.1}
              ry="193"
              transform={`rotate(-32 300 300)`}
            />
          ))}
          {Array.from({ length: 15 }, (_, i) => (
            <ellipse
              key={`lat${i}`}
              cx="300"
              cy={132 + i * 24}
              rx={Math.sqrt(Math.max(0, 191 ** 2 - (168 - i * 24) ** 2))}
              ry={12 + Math.sin((i / 14) * Math.PI) * 23}
              transform="rotate(-32 300 300)"
            />
          ))}
        </g>
        <ellipse
          cx="300"
          cy="300"
          rx="272"
          ry="93"
          transform="rotate(38 300 300)"
          stroke="#777b86"
          strokeWidth=".6"
          strokeDasharray="2 7"
        />
        <circle cx="300" cy="300" r="220" stroke="#a9adb8" opacity=".1" />
        <path d="M42 260h40m-20-20v40M506 381h24m-12-12v24" stroke="#9498a2" strokeWidth="1" />
      </svg>
      <span className="orb-coordinate coordinate-a">38° 53′ 23.1″</span>
      <span className="orb-coordinate coordinate-b">MULTIPLE MODELS. ONE PERSPECTIVE.</span>
    </div>
  );
}
