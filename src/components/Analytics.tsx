import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { pageMetadata } from '../../shared/seo';
type Consent = 'granted' | 'denied' | null;
declare global {
  interface Window {
    artificialsAnalytics?: {
      getConsent: () => Consent;
      setConsent: (value: Exclude<Consent, null>) => void;
      page: (page: { location: string; title: string } | null) => void;
    };
  }
}
export function Analytics() {
  const { pathname } = useLocation();
  const [consent, setConsent] = useState<Consent>(
    () => window.artificialsAnalytics?.getConsent() ?? null,
  );
  const [editing, setEditing] = useState(false);
  const publicPage = pageMetadata(pathname).known;
  useEffect(() => {
    const meta = pageMetadata(pathname);
    // Never pass query strings, fragments, account URLs, prompts or CMS path tokens.
    window.artificialsAnalytics?.page(
      meta.known ? { location: meta.canonical, title: meta.title } : null,
    );
  }, [pathname]);
  useEffect(() => {
    const sync = () => setConsent(window.artificialsAnalytics?.getConsent() ?? null);
    const edit = () => setEditing(true);
    window.addEventListener('artificials:analytics-consent', sync);
    window.addEventListener('artificials:analytics-settings', edit);
    return () => {
      window.removeEventListener('artificials:analytics-consent', sync);
      window.removeEventListener('artificials:analytics-settings', edit);
    };
  }, []);
  if ((!publicPage || consent !== null) && !editing) return null;
  const choose = (value: Exclude<Consent, null>) => {
    window.artificialsAnalytics?.setConsent(value);
    setConsent(value);
    setEditing(false);
  };
  return (
    <section className="analytics-choice" role="region" aria-label="Analytics preferences">
      <div className="analytics-choice-heading">
        <ShieldCheck size={19} aria-hidden="true" />
        <strong>Your privacy, your choice.</strong>
      </div>
      <p>
        Allow Google Analytics to help us understand visits to our public pages? Analytics stays off
        until you agree. You can change your choice anytime.
      </p>
      <div className="analytics-choice-actions">
        <button className="btn btn-outline btn-small" onClick={() => choose('denied')}>
          Decline analytics
        </button>
        <button className="btn btn-outline btn-small" onClick={() => choose('granted')}>
          Allow analytics
        </button>
        <Link to="/privacy#preferences">Privacy policy</Link>
      </div>
    </section>
  );
}
export function AnalyticsPreferencesButton() {
  return (
    <button
      type="button"
      className="analytics-settings-link"
      onClick={() => window.dispatchEvent(new Event('artificials:analytics-settings'))}
    >
      Analytics preferences
    </button>
  );
}
