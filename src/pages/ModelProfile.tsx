import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Braces,
  Brain,
  ChartColumn,
  Check,
  CircleDollarSign,
  LayoutGrid,
  Plus,
  Ruler,
  ScanEye,
  Server,
  Unlock,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { EmptyState } from '../components/Layout';
import { applyPageMetadata } from '../components/Metadata';
import { modelMetadata } from '../../shared/seo';
import { useComparison } from '../lib/catalog';
import { FollowButton } from '../components/Follow';
import { referencePrice } from '../../shared/model-overview';
import { comparisonRecord } from '../lib/compare';
import { makerLogo } from '../../shared/makers';
import { useModelProfile, type ModelProfile as Profile } from '../lib/profiles';
import Overview, { type ProfileTab } from '../components/profile/Overview';
import Performance from '../components/profile/Performance';
import Pricing from '../components/profile/Pricing';
import Providers from '../components/profile/Providers';
import Tokens from '../components/profile/Tokens';
import { day } from '../components/profile/format';
import '../domain-colors.css';
import './model-profile.css';

/** Short labels, so all five tabs share one row even on a 320px phone. */
const TABS: { id: ProfileTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'performance', label: 'Scores', icon: ChartColumn },
  { id: 'pricing', label: 'Pricing', icon: CircleDollarSign },
  { id: 'providers', label: 'Providers', icon: Server },
  { id: 'tokens', label: 'Context', icon: Ruler },
];

function Chips({ profile }: { profile: Profile }) {
  const chips: [boolean, LucideIcon, string, string][] = [
    [profile.reasoning, Brain, 'Reasoning', 'reasoning'],
    [profile.inputModalities.includes('image'), ScanEye, 'Sees images', 'image'],
    [profile.toolCall === true, Wrench, 'Uses tools', 'agentic'],
    [profile.structuredOutput === true, Braces, 'JSON output', 'coding'],
    [profile.openWeights, Unlock, 'Open weights', 'overall'],
  ];
  const shown = chips.filter(([on]) => on);
  if (!shown.length) return null;
  return (
    <ul className="profile-chips" aria-label="Capabilities">
      {shown.map(([, Icon, label, token]) => (
        <li key={label} className={`domain-${token}`}>
          <Icon size={14} aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}

export default function ModelProfile() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [attempt, setAttempt] = useState(0);
  const state = useModelProfile(slug, attempt);
  const { models: comparison, toggle } = useComparison();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const requested = params.get('tab');
  const tab: ProfileTab = TABS.some((entry) => entry.id === requested)
    ? (requested as ProfileTab)
    : 'overview';

  useEffect(() => {
    if (state.status === 'ready')
      applyPageMetadata(
        modelMetadata({
          slug: state.profile.slug,
          name: state.profile.name,
          maker: state.profile.maker,
          offerings: state.profile.offerings.length,
          hasResults: state.profile.results.length > 0,
        }),
      );
    if (state.status === 'missing') applyPageMetadata(modelMetadata(null, slug));
  }, [state, slug]);

  const select = (next: ProfileTab, focus = false) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'overview') nextParams.delete('tab');
    else nextParams.set('tab', next);
    setParams(nextParams, { replace: true, preventScrollReset: true });
    if (focus) tabRefs.current[next]?.focus();
  };
  const onTabKey = (event: KeyboardEvent) => {
    const index = TABS.findIndex((entry) => entry.id === tab);
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(TABS[moves[event.key]].id, true);
  };

  if (state.status === 'loading')
    return (
      <div className="container page profile-page">
        <p className="profile-loading" role="status">
          Loading model profile…
        </p>
      </div>
    );
  if (state.status === 'missing')
    return (
      <EmptyState
        title="We couldn’t find that model."
        text="It may have been renamed or retired. Browse the catalog to find what you need."
        link="/models"
        label="Browse models"
      />
    );
  if (state.status === 'error')
    return (
      <div className="container page profile-page">
        <div className="ranking-notice" role="alert">
          <p>{state.message}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      </div>
    );

  const { profile, bucket } = state;
  const record = comparisonRecord(profile);
  const compared = comparison.some((entry) => entry.id === record.id);
  const full = comparison.length >= 3 && !compared;
  return (
    <div className="container page profile-page">
      <Link to="/models" className="text-link profile-back">
        <ArrowLeft size={16} aria-hidden="true" /> All models
      </Link>
      <header className="profile-header">
        <div className="profile-identity">
          <img src={makerLogo(profile.makerId)} width="48" height="48" alt="" />
          <div>
            <p className="profile-maker">
              {profile.makerPage ? (
                <Link to={`/makers/${profile.makerPage}`}>{profile.maker}</Link>
              ) : (
                profile.maker || 'Maker not reported'
              )}
            </p>
            <h1>{profile.name}</h1>
          </div>
        </div>
        {profile.description && <p className="profile-description">{profile.description}</p>}
        <p className="profile-meta">
          <span>Released {day(profile.releaseDate)}</span>
        </p>
        <div className="profile-actions">
          <Chips profile={profile} />
          <button
            type="button"
            className={`btn btn-small ${compared ? '' : 'btn-outline'}`}
            aria-pressed={compared}
            disabled={full}
            onClick={() => toggle(record)}
          >
            {compared ? (
              <Check size={15} aria-hidden="true" />
            ) : (
              <Plus size={15} aria-hidden="true" />
            )}
            {compared ? 'In your comparison' : full ? 'Comparison is full' : 'Add to comparison'}
          </button>
          {compared && (
            <Link to="/compare" className="text-link">
              Open comparison
            </Link>
          )}
          <FollowButton
            slug={profile.slug}
            name={profile.name}
            makerId={profile.makerId}
            figures={{
              price: referencePrice(profile)?.blended ?? null,
              index:
                profile.results.find((result) => result.category === 'capability-index')?.score ??
                null,
              hosts: profile.offerings.length,
            }}
          />
        </div>
      </header>

      <div className="profile-tabs" role="tablist" aria-label="Model analysis" onKeyDown={onTabKey}>
        {TABS.map((entry) => (
          <button
            key={entry.id}
            ref={(element) => {
              tabRefs.current[entry.id] = element;
            }}
            id={`tab-${entry.id}`}
            role="tab"
            type="button"
            aria-selected={tab === entry.id}
            aria-controls={`panel-${entry.id}`}
            tabIndex={tab === entry.id ? 0 : -1}
            onClick={() => select(entry.id)}
          >
            <entry.icon size={17} aria-hidden="true" />
            <span>{entry.label}</span>
          </button>
        ))}
      </div>
      <div
        className="profile-panel"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === 'overview' && (
          <Overview profile={profile} bucket={bucket} onTab={(next) => select(next)} />
        )}
        {tab === 'performance' && <Performance profile={profile} bucket={bucket} />}
        {tab === 'pricing' && <Pricing profile={profile} bucket={bucket} />}
        {tab === 'providers' && <Providers profile={profile} bucket={bucket} />}
        {tab === 'tokens' && <Tokens profile={profile} bucket={bucket} />}
      </div>
    </div>
  );
}
