import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X, ArrowRight, Globe2, Command } from 'lucide-react';
import { useApp } from '../lib/context';
export function Layout() {
  const [open, setOpen] = useState(false);
  const { session } = useApp();
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const links = [
    ['/models', 'Models'],
    ['/leaderboard', 'Rankings'],
    ['/compare', 'Compare'],
    ['/news', 'Insights'],
    ['/learn', 'Learn AI'],
    ['/studio', 'Studio'],
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-nav container">
          <Link to="/" aria-label="Artificials home">
            <img className="brand-logo" src="/logo.svg" alt="Artificials" width="183" height="34" />
          </Link>
          <nav className="site-links" aria-label="Main navigation">
            {links.map(([url, label]) => (
              <NavLink key={url} to={url}>
                {label}
                {label === 'Studio' && <span className="nav-tag">AI</span>}
              </NavLink>
            ))}
          </nav>
          <div className="site-actions">
            <Link className="nav-login" to={session.user ? '/dashboard' : '/login'}>
              {session.user ? 'Workspace' : 'Log in'}
            </Link>
            <Link className="btn btn-small" to="/studio">
              Start building <ArrowUpRight size={14} />
            </Link>
            <button
              className="icon-btn menu-trigger"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-navigation" className="site-mobile" aria-label="Mobile navigation">
            {[
              ...links,
              ['/pricing', 'Pricing'],
              [session.user ? '/dashboard' : '/login', session.user ? 'Workspace' : 'Log in'],
            ].map(([url, label]) => (
              <Link key={url} to={url}>
                {label}
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-top">
          <div className="footer-identity">
            <Link to="/">
              <img src="/logo.svg" width="183" height="34" alt="Artificials" />
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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
                <span>Instagram</span>
              </a>
              <a
                href="https://x.com/artificialsnet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Artificials on X"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.4l8.2-9.4L.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" />
                </svg>
                <span>X</span>
              </a>
            </div>
            <span className="mono">
              <Globe2 size={13} /> INDEPENDENT. GLOBAL. CURIOUS.
            </span>
          </div>
          <div>
            <h3>Intelligence</h3>
            <Link to="/models">Model directory</Link>
            <Link to="/leaderboard">Model rankings</Link>
            <Link to="/compare">Compare models</Link>
            <Link to="/news">Insights & guides</Link>
            <Link to="/learn">Learn AI</Link>
          </div>
          <div>
            <h3>Create</h3>
            <Link to="/studio">Artificials Studio</Link>
            <Link to="/pricing">Plans & pricing</Link>
            <Link to="/dashboard">Your workspace</Link>
            <Link to="/about">About Artificials</Link>
          </div>
          <div>
            <h3>Information</h3>
            <Link to="/about#source-methodology">Data & methodology</Link>
            <Link to="/privacy">Privacy policy</Link>
            <Link to="/terms">Terms & conditions</Link>
            <Link to="/contact">
              Contact <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
        <div className="container footer-baseline">
          <span>© {new Date().getFullYear()} Artificials</span>
          <span>Independent research. Provider trademarks belong to their owners.</span>
          <span>
            EN / USD <ArrowUpRight size={12} />
          </span>
        </div>
        <div className="footer-wordmark" aria-hidden="true">
          artificials
          <ArrowUpRight />
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
