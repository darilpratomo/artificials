import { Link } from 'react-router-dom';
import { ArrowRight, Check, Gauge, Minus } from 'lucide-react';
import { BENCHMARK_DOMAINS, type BenchmarkDomain } from '../../../shared/benchmarks';
import {
  isNoChargeOffer,
  isPaidOffer,
  primaryResult,
  type ModelProfile,
  type ProfileBucket,
} from '../../lib/profiles';
import {
  DOMAINS,
  approxPages,
  day,
  modalityList,
  money,
  rankLabel,
  score,
  standing,
  tokens,
  whole,
} from './format';
import { DomainKey, Meter, Sources } from './parts';

export type ProfileTab = 'overview' | 'performance' | 'pricing' | 'providers' | 'tokens';

/** The lowest per-token list price. No-charge listings are reported separately. */
export function cheapestOffering(profile: ModelProfile) {
  return profile.offerings.find(isPaidOffer);
}
export function noChargeCount(profile: ModelProfile) {
  return profile.offerings.filter(isNoChargeOffer).length;
}

export default function Overview({
  profile,
  bucket,
  onTab,
}: {
  profile: ModelProfile;
  bucket: ProfileBucket;
  onTab: (tab: ProfileTab) => void;
}) {
  const areas = (['overall', ...BENCHMARK_DOMAINS] as BenchmarkDomain[])
    .map((domain) => ({ domain, result: primaryResult(profile, domain) }))
    .filter((entry) => entry.result);
  const category = (id: string) => profile.categories.find((entry) => entry.id === id);
  const index = profile.results.find((result) => result.category === 'capability-index');
  const cheapest = cheapestOffering(profile);
  const noCharge = noChargeCount(profile);
  const facts: { ok: boolean | null; text: string }[] = [
    {
      ok: profile.reasoning,
      text: profile.reasoning
        ? `Thinks before it answers${profile.reasoningEfforts?.length ? `, with ${profile.reasoningEfforts.length} effort levels (${profile.reasoningEfforts.join(', ')})` : ''}.`
        : 'Answers directly, without a separate thinking step.',
    },
    {
      ok: profile.inputModalities.length > 0,
      text: profile.inputModalities.length
        ? `Reads ${modalityList(profile.inputModalities)}.`
        : 'Input types are not reported.',
    },
    {
      ok: profile.outputModalities.length > 0,
      text: profile.outputModalities.length
        ? `Produces ${modalityList(profile.outputModalities)}.`
        : 'Output types are not reported.',
    },
    {
      ok: profile.toolCall ?? null,
      text:
        profile.toolCall === undefined
          ? 'Tool use is not reported.'
          : profile.toolCall
            ? 'Can call tools and functions you provide.'
            : 'Does not call tools or functions.',
    },
    {
      ok: profile.structuredOutput ?? null,
      text:
        profile.structuredOutput === undefined
          ? 'Structured output is not reported.'
          : profile.structuredOutput
            ? 'Can reply in an exact data format such as JSON.'
            : 'No guaranteed structured-output mode.',
    },
    {
      ok: profile.openWeights,
      text: profile.openWeights
        ? 'Open weights: you can download it and run it yourself.'
        : 'Closed weights: available only through a provider’s service.',
    },
  ];

  return (
    <div className="profile-panel-body">
      <div className="profile-overview-grid">
        <section className="profile-card profile-skills" aria-labelledby="skills-heading">
          <div className="profile-card-head">
            <h2 id="skills-heading">Where it stands</h2>
            <p>
              Its rank among all models tested on each benchmark. A longer bar means a better rank.
            </p>
          </div>
          {areas.length ? (
            <>
              <ul className="skill-rows">
                {areas.map(({ domain, result }) => {
                  const info = category(result!.category)!;
                  const rank = rankLabel(result!.rank, result!.total);
                  return (
                    <li key={domain}>
                      <div className="skill-label">
                        <DomainKey domain={domain} />
                        <span>
                          <strong>{DOMAINS[domain].label}</strong>
                          <small>{info.label}</small>
                        </span>
                      </div>
                      <Meter
                        domain={domain}
                        value={standing(result!.rank, result!.total)}
                        label={`${DOMAINS[domain].label}: ${rank} on ${info.label}, score ${score(result!.score, info.unit)}`}
                      />
                      <span className="skill-rank">{rank}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className="text-link profile-more"
                onClick={() => onTab('performance')}
              >
                See every result <ArrowRight size={15} aria-hidden="true" />
              </button>
            </>
          ) : (
            <div className="profile-empty">
              <p>
                No published benchmark covers this model yet. Newer releases, small variants and
                models served by a single host are often not tested.
              </p>
              <div className="profile-empty-actions">
                <button type="button" className="btn btn-small" onClick={() => onTab('pricing')}>
                  Check the price
                </button>
                <Link className="btn btn-small btn-outline" to="/leaderboard">
                  See tested models
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="profile-glance" aria-label="At a glance">
          <div className="glance-tile">
            <span>Capability index</span>
            <strong>{index ? score(index.score, 'index') : 'Not rated'}</strong>
            <small>
              {index
                ? rankLabel(index.rank, index.total) + ' on general ability'
                : 'Not tested yet'}
            </small>
          </div>
          <div className="glance-tile">
            <span>Lowest price</span>
            <strong>
              {cheapest
                ? `${money(cheapest.inputPrice)} / ${money(cheapest.outputPrice)}`
                : noCharge
                  ? 'No per-token charge'
                  : 'Not reported'}
            </strong>
            <small>
              {cheapest
                ? `input / output per 1M tokens, at ${cheapest.provider}`
                : noCharge
                  ? 'Free tiers or plans only, usually with limits'
                  : 'No listed price'}
            </small>
          </div>
          <div className="glance-tile">
            <span>Context window</span>
            <strong>{tokens(profile.contextWindow)} tokens</strong>
            <small>
              {profile.contextWindow
                ? `reads about ${approxPages(profile.contextWindow)} at once`
                : 'Not reported'}
            </small>
          </div>
          <div className="glance-tile">
            <span>Where to use it</span>
            <strong>
              {whole(profile.offerings.length)}{' '}
              {profile.offerings.length === 1 ? 'provider' : 'providers'}
            </strong>
            <small>
              {profile.official ? `including ${profile.maker} directly` : 'third-party hosts'}
            </small>
          </div>
        </section>
      </div>

      <section className="profile-card" aria-labelledby="facts-heading">
        <div className="profile-card-head">
          <h2 id="facts-heading">Good to know</h2>
          <p>
            Released {day(profile.releaseDate)}
            {profile.knowledge ? `. Trained on information up to ${day(profile.knowledge)}` : ''}.
          </p>
        </div>
        <ul className="fact-list">
          {facts.map((fact) => (
            <li
              key={fact.text}
              className={fact.ok === false ? 'is-off' : fact.ok ? 'is-on' : 'is-unknown'}
            >
              {fact.ok ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Minus size={16} aria-hidden="true" />
              )}
              <span>{fact.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {profile.peers.length > 0 && (
        <section className="profile-card" aria-labelledby="peers-heading">
          <div className="profile-card-head">
            <h2 id="peers-heading">Similar models</h2>
            <p>Closest on the capability index, with their lowest listed price.</p>
          </div>
          <ul className="peer-list">
            {profile.peers.map((peer) => (
              <li key={peer.slug}>
                <Link to={`/models/${peer.slug}`}>
                  <strong>{peer.name}</strong>
                  <small>{peer.maker}</small>
                </Link>
                <span className="peer-index">
                  {peer.index === null ? '—' : peer.index.toFixed(1)}
                </span>
                <span className="peer-price">
                  {peer.inputPrice === null
                    ? 'No price'
                    : `${money(peer.inputPrice)} / ${money(peer.outputPrice)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="profile-note">
        <Gauge size={16} aria-hidden="true" />
        Response speed and latency are not measured here yet, so none are shown.
      </p>
      <Sources bucket={bucket} benchmarks={profile.results.length > 0} />
    </div>
  );
}
