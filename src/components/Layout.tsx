import { AnalyticsPreferencesButton } from './Analytics';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Globe2, Command } from 'lucide-react';
import { Brand } from './Brand';
import { NavGroup } from './NavGroup';
import { NAV_GROUPS, TOP_LINKS } from './navigation';

/** The footer's Intelligence links: the model pages, then the analysis pages, in two columns. */
const INTELLIGENCE: [to: string, label: string][] = [
  ['/models', 'Model directory'],
  ['/leaders', 'Current leaders'],
  ['/leaderboard', 'Model rankings'],
  ['/releases', 'Model releases'],
  ['/changes', 'What changed'],
  ['/compare', 'Compare models'],
  ['/model-finder', 'Model finder'],
  ['/coding-agents', 'Coding agents'],
  ['/trends', 'AI trends'],
  ['/image-models', 'Image models'],
  ['/video-models', 'Video models'],
  ['/score-price-time', 'Score, price & time'],
  ['/market', 'Market overview'],
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const header = useRef<HTMLElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    setOpen(false);
    // The visitor can already scroll prerendered HTML before React activates.
    // Reset only for an actual in-app route change, never the initial mount.
    if (previousPath.current !== location.pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const wide = matchMedia('(min-width: 1101px)');
    let frame = 0,
      previousTime = 0,
      progress = 0;
    const target = () => {
      if (open) return 1;
      const linear = Math.min(1, Math.max(0, (window.scrollY - 8) / 104));
      return linear * linear * (3 - 2 * linear);
    };
    const paint = () => el.style.setProperty('--header-progress', progress.toFixed(5));
    const update = (time: number) => {
      frame = 0;
      const goal = target();
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 1000 / 60;
      previousTime = time;
      progress = reduced.matches
        ? goal
        : progress + (goal - progress) * (1 - Math.exp(-elapsed / 95));
      if (Math.abs(goal - progress) < 0.0001) progress = goal;
      paint();
      setScrolled(window.scrollY > 48);
      if (progress !== goal) frame = requestAnimationFrame(update);
      else previousTime = 0;
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      if (wide.matches) setOpen(false);
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        previousTime = 0;
      } else request();
    };
    const savedProgress = el.style.getPropertyValue('--header-progress');
    progress = savedProgress ? Number(savedProgress) : target();
    paint();
    request();
    window.addEventListener('scroll', request, { passive: true });
    reduced.addEventListener('change', request);
    wide.addEventListener('change', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', request);
      reduced.removeEventListener('change', request);
      wide.removeEventListener('change', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(
        surface.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') || [],
      ).filter((el) => el.getClientRects().length && !el.closest('[inert]'));
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const closeMenu = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  // The phone menu lists every page, grouped like the header.
  const mobileGroups = [
    {
      label: 'Explore',
      items: [...TOP_LINKS, { to: '/compare', label: 'Compare models', description: '' }],
    },
    ...NAV_GROUPS,
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header
        ref={header}
        className={`site-header${scrolled ? ' is-island' : ''}${open ? ' menu-open' : ''}`}
      >
        <div className="menu-scrim" aria-hidden="true" onClick={closeMenu} />
        <div
          ref={surface}
          className="header-surface"
          role={open ? 'dialog' : undefined}
          aria-modal={open ? true : undefined}
          aria-label={open ? 'Site navigation' : undefined}
        >
          <div className="site-nav container">
            <Link
              to="/"
              className="brand-home"
              aria-label="Artificials home"
              onClick={() => setOpen(false)}
            >
              <Brand animate />
            </Link>
            <nav className="site-links" aria-label="Main navigation">
              {TOP_LINKS.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {item.label}
                </NavLink>
              ))}
              {NAV_GROUPS.map((group) => (
                <NavGroup key={group.label} group={group} />
              ))}
            </nav>
            <div className="site-actions">
              <Link className="btn btn-small" to="/compare">
                Compare models <ArrowUpRight size={14} />
              </Link>
              <button
                ref={trigger}
                className="icon-btn menu-trigger"
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                aria-controls="mobile-navigation"
                onClick={() => setOpen(!open)}
              >
                <span className="hamburger-lines" aria-hidden="true">
                  <i />
                  <i />
                </span>
              </button>
            </div>
          </div>
          <div className="navigation-drawer" inert={!open} aria-hidden={!open}>
            <nav id="mobile-navigation" className="site-mobile" aria-label="Mobile navigation">
              <div className="mobile-menu-heading">
                <span className="mono">EXPLORE ARTIFICIALS</span>
                <span className="signal-light" />
              </div>
              <div className="mobile-menu-links">
                {mobileGroups.map((group, groupIndex) => {
                  const before = mobileGroups
                    .slice(0, groupIndex)
                    .reduce((total, entry) => total + entry.items.length, 0);
                  return (
                    <section key={group.label} aria-label={group.label}>
                      <h2 className="mobile-menu-group">{group.label}</h2>
                      {group.items.map((item, index) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          style={
                            { '--menu-order': before + index } as import('react').CSSProperties
                          }
                          onClick={() => setOpen(false)}
                        >
                          <span className="menu-link-number" aria-hidden="true">
                            {String(before + index + 1).padStart(2, '0')}
                          </span>
                          <span>{item.label}</span>
                          <ArrowUpRight size={16} />
                        </NavLink>
                      ))}
                    </section>
                  );
                })}
              </div>
              <div className="mobile-menu-bottom">
                <span>Intelligence, in perspective.</span>
                <Link to="/contact" onClick={() => setOpen(false)}>
                  Get in touch <ArrowUpRight size={13} />
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} inert={open}>
        <Outlet />
      </main>
      <footer className="site-footer" inert={open}>
        <div className="container footer-top">
          <div className="footer-identity">
            <Link to="/" aria-label="Artificials home">
              <Brand />
            </Link>
            <p>
              Intelligence, in perspective.
              <br />A clearer view of what comes next.
            </p>
            <div className="social-links" aria-label="Artificials social profiles">
              <a
                href="https://www.instagram.com/artificialsnet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Artificials on Instagram"
              >
                <img src="/social/instagram.svg" width="20" height="20" alt="" />
              </a>
              <a
                href="https://x.com/artificialsnet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Artificials on X"
              >
                <img src="/social/x.svg" width="19" height="20" alt="" />
              </a>
            </div>
            <span className="mono">
              <Globe2 size={13} /> INDEPENDENT. GLOBAL. CURIOUS.
            </span>
          </div>
          <div className="footer-group is-wide">
            <h3>Intelligence</h3>
            <div
              className="footer-links is-split"
              style={{ '--rows': Math.ceil(INTELLIGENCE.length / 2) } as CSSProperties}
            >
              {INTELLIGENCE.map(([to, label]) => (
                <Link key={to} to={to}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="footer-group">
            <h3>Learn</h3>
            <div className="footer-links">
              <Link to="/news">Insights & guides</Link>
              <Link to="/learn">Learn AI</Link>
              <Link to="/tools">Free file tools</Link>
              <Link to="/about">About Artificials</Link>
            </div>
          </div>
          <div className="footer-group">
            <h3>Information</h3>
            <div className="footer-links">
              <Link to="/about#source-methodology">Data & methodology</Link>
              <Link to="/privacy">Privacy policy</Link>
              <AnalyticsPreferencesButton />
              <Link to="/terms">Terms & conditions</Link>
              <Link to="/contact">
                Contact <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </div>
        <div className="container footer-baseline">
          <span>© {new Date().getFullYear()} Artificials</span>
          <span>Free and non-commercial. Provider trademarks belong to their owners.</span>
          <span>
            EN / USD <ArrowUpRight size={12} />
          </span>
        </div>
      </footer>
    </>
  );
}
export function PageHeading({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function EmptyState({
  title,
  text,
  link,
  label,
}: {
  title: string;
  text: string;
  link?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Command size={28} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {link && (
        <Link className="btn" to={link}>
          {label}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
