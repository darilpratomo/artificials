import { useState } from 'react';
import { ArrowUpRight, Check, Minus } from 'lucide-react';
import { providerLogo } from '../../lib/catalog';
import { ShareButton } from '../charts/ShareButton';
import {
  isNoChargeOffer,
  isPaidOffer,
  type ModelProfile,
  type ProfileBucket,
  type ProfileOffering,
} from '../../lib/profiles';
import { money, tokens, whole } from './format';
import { Explainer, Sources } from './parts';

type Sort = 'price' | 'context' | 'name';
const SHOWN = 15;

/**
 * Workload mixes for a blended price: shares of cached input, fresh input and
 * output tokens. Listings without a cache price are charged the input price
 * for cached tokens.
 */
const MIXES = [
  { id: 'chat', label: 'Chat', detail: '3 input : 1 output', cached: 0, input: 3, output: 1 },
  {
    id: 'agentic',
    label: 'Agents with caching',
    detail: '7 cached : 2 input : 1 output',
    cached: 7,
    input: 2,
    output: 1,
  },
  {
    id: 'writing',
    label: 'Long answers',
    detail: '1 input : 3 output',
    cached: 0,
    input: 1,
    output: 3,
  },
] as const;
type Mix = (typeof MIXES)[number];

function mixed(offer: ProfileOffering, mix: Mix) {
  if (!isPaidOffer(offer)) return null;
  const cached = offer.cacheReadPrice ?? offer.inputPrice!;
  const parts = mix.cached + mix.input + mix.output;
  return (
    (cached * mix.cached + offer.inputPrice! * mix.input + offer.outputPrice! * mix.output) / parts
  );
}

function Flag({ value, label }: { value: boolean | undefined; label: string }) {
  if (value === undefined) return <span className="flag-unknown">—</span>;
  return value ? (
    <Check size={16} aria-label={`${label}: yes`} className="flag-yes" />
  ) : (
    <Minus size={16} aria-label={`${label}: no`} className="flag-no" />
  );
}

function compare(sort: Sort, official: string | undefined, mix: Mix) {
  const group = (offer: ProfileOffering) =>
    isPaidOffer(offer) ? 0 : isNoChargeOffer(offer) ? 1 : 2;
  const officialFirst = (a: ProfileOffering, b: ProfileOffering) =>
    Number(b.id === official) - Number(a.id === official);
  return (a: ProfileOffering, b: ProfileOffering) => {
    if (sort === 'name') return a.provider.localeCompare(b.provider);
    if (sort === 'price') {
      const byGroup = group(a) - group(b);
      if (byGroup) return byGroup;
      if (group(a) === 0)
        return (
          mixed(a, mix)! - mixed(b, mix)! ||
          officialFirst(a, b) ||
          a.provider.localeCompare(b.provider)
        );
      return a.provider.localeCompare(b.provider);
    }
    if (a.contextWindow === null || b.contextWindow === null)
      return a.contextWindow === null ? (b.contextWindow === null ? 0 : 1) : -1;
    return (
      b.contextWindow - a.contextWindow ||
      officialFirst(a, b) ||
      a.provider.localeCompare(b.provider)
    );
  };
}

export default function Providers({
  profile,
  bucket,
}: {
  profile: ModelProfile;
  bucket: ProfileBucket;
}) {
  const [sort, setSort] = useState<Sort>('price');
  const [mixId, setMixId] = useState<Mix['id']>('chat');
  const mix = MIXES.find((entry) => entry.id === mixId)!;
  const [all, setAll] = useState(false);
  const rows = [...profile.offerings].sort(compare(sort, profile.official, mix));
  const paid = profile.offerings
    .filter(isPaidOffer)
    .sort((a, b) => mixed(a, mix)! - mixed(b, mix)!);
  const blended = paid.map((offer) => mixed(offer, mix)!);
  // With a tie at the lowest price, no single listing earns the badge.
  const cheapest =
    paid.length && (paid.length === 1 || blended[0] < blended[1]) ? paid[0].id : undefined;
  const visible = all ? rows : rows.slice(0, SHOWN);

  // Leaders on each price and limit, over paid listings.
  const lowest = (value: (offer: ProfileOffering) => number | undefined | null) => {
    const ranked = paid
      .map((offer) => ({ offer, value: value(offer) }))
      .filter(
        (entry): entry is { offer: ProfileOffering; value: number } =>
          typeof entry.value === 'number',
      )
      .sort((a, b) => a.value - b.value);
    return ranked[0] ? { ...ranked[0], total: ranked.length } : undefined;
  };
  const highest = (value: (offer: ProfileOffering) => number | undefined | null) => {
    const ranked = profile.offerings
      .map((offer) => ({ offer, value: value(offer) }))
      .filter(
        (entry): entry is { offer: ProfileOffering; value: number } =>
          typeof entry.value === 'number',
      )
      .sort((a, b) => b.value - a.value);
    return ranked[0] ? { ...ranked[0], total: ranked.length } : undefined;
  };
  const leaders = [
    [
      'Lowest blended price',
      lowest((offer) => mixed(offer, mix)),
      money,
      `${mix.label}, ${mix.detail}`,
    ],
    ['Lowest input price', lowest((offer) => offer.inputPrice), money, 'per 1M input tokens'],
    ['Lowest output price', lowest((offer) => offer.outputPrice), money, 'per 1M output tokens'],
    [
      'Cheapest cached input',
      lowest((offer) => offer.cacheReadPrice),
      money,
      'per 1M cached tokens',
    ],
    [
      'Largest context',
      highest((offer) => offer.contextWindow),
      (value: number) => `${tokens(value)} tokens`,
      'per request',
    ],
    [
      'Longest replies',
      highest((offer) => offer.maxOutput),
      (value: number) => `${tokens(value)} tokens`,
      'maximum output',
    ],
  ] as const;
  const chartRows = paid.slice(0, 12);
  const chartTop = Math.max(
    1,
    ...chartRows.map((offer) => Math.max(offer.outputPrice!, offer.inputPrice!)),
  );

  return (
    <div className="profile-panel-body">
      <Explainer>
        The same model can be sold by several companies. Price, limits and reliability can differ
        between them, so compare before you choose.
        {profile.contextVaries && ' Context limits differ between providers for this model.'}
      </Explainer>
      <section className="provider-leaders" aria-label="Provider highlights">
        {leaders.map(([label, leader, format, detail]) =>
          leader ? (
            <div key={label} className="provider-leader">
              <span>{label}</span>
              <p>
                <img
                  src={providerLogo(leader.offer.providerId)}
                  alt=""
                  width="26"
                  height="26"
                  loading="lazy"
                />
                <b>{leader.offer.provider}</b>
              </p>
              <strong>{format(leader.value)}</strong>
              <small>
                {detail}. #1 of {leader.total}
              </small>
            </div>
          ) : null,
        )}
      </section>

      {paid.length > 0 && (
        <section className="profile-card" aria-labelledby="provider-prices-heading">
          <div className="profile-card-head has-action">
            <div>
              <h2 id="provider-prices-heading">Price by provider</h2>
              <p>
                Input, cached input and output price per 1M tokens for the{' '}
                {Math.min(12, paid.length)} cheapest listings for your workload.
              </p>
            </div>
            <ShareButton
              title={`${profile.name}: price by provider`}
              render={(tools) =>
                tools.listImage(
                  {
                    title: `${profile.name}: price by provider`,
                    subtitle: `Blended for ${mix.label.toLowerCase()} (${mix.detail}), USD per 1M tokens.`,
                    source: 'models.dev (MIT)',
                  },
                  chartRows.map((offer) => ({
                    label: offer.provider,
                    detail: `${money(offer.inputPrice)} in, ${money(offer.outputPrice)} out${
                      offer.cacheReadPrice !== undefined
                        ? `, ${money(offer.cacheReadPrice)} cached`
                        : ''
                    }`,
                    value: money(mixed(offer, mix)),
                    fraction:
                      mixed(offer, mix)! / Math.max(...chartRows.map((row) => mixed(row, mix)!)),
                    color: '#c9ccd4',
                  })),
                )
              }
            />
          </div>
          <div className="mix-picker" role="group" aria-label="Workload for the blended price">
            {MIXES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={mix.id === entry.id}
                onClick={() => setMixId(entry.id)}
              >
                <b>{entry.label}</b>
                <small>{entry.detail}</small>
              </button>
            ))}
          </div>
          <ul className="price-legend" aria-hidden="true">
            <li className="is-cached">Cached input</li>
            <li className="is-input">Input</li>
            <li className="is-output">Output</li>
          </ul>
          <ol className="provider-prices">
            {chartRows.map((offer) => (
              <li key={offer.id}>
                <span className="provider-prices-name">
                  <img
                    src={providerLogo(offer.providerId)}
                    alt=""
                    width="22"
                    height="22"
                    loading="lazy"
                  />
                  {offer.provider}
                </span>
                <span className="provider-prices-bars" aria-hidden="true">
                  {offer.cacheReadPrice !== undefined && (
                    <i
                      className="is-cached"
                      style={{ width: `${(offer.cacheReadPrice / chartTop) * 100}%` }}
                    />
                  )}
                  <i
                    className="is-input"
                    style={{ width: `${(offer.inputPrice! / chartTop) * 100}%` }}
                  />
                  <i
                    className="is-output"
                    style={{ width: `${(offer.outputPrice! / chartTop) * 100}%` }}
                  />
                </span>
                <span className="provider-prices-value">
                  {money(mixed(offer, mix))}
                  <small>blended</small>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="profile-card" aria-labelledby="providers-heading">
        <div className="profile-card-head profile-card-head-row">
          <div>
            <h2 id="providers-heading">
              {whole(profile.offerings.length)}{' '}
              {profile.offerings.length === 1 ? 'provider' : 'providers'}
            </h2>
            <p>Prices per million tokens.</p>
          </div>
          <div className="provider-sort" role="group" aria-label="Sort providers">
            {(
              [
                ['price', 'Lowest price'],
                ['context', 'Largest context'],
                ['name', 'Name'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={sort === value}
                onClick={() => setSort(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="provider-table" role="table" aria-label={`Providers for ${profile.name}`}>
          <div className="provider-row provider-head" role="row">
            <span role="columnheader">Provider</span>
            <span role="columnheader">Input</span>
            <span role="columnheader">Output</span>
            <span role="columnheader">Cached input</span>
            <span role="columnheader">Context</span>
            <span role="columnheader">Max output</span>
            <span role="columnheader">Tools</span>
            <span role="columnheader">JSON</span>
          </div>
          {visible.map((offer) => (
            <div className="provider-row" role="row" key={offer.id}>
              <span role="cell" className="provider-name">
                <img
                  src={providerLogo(offer.providerId)}
                  width="28"
                  height="28"
                  alt=""
                  loading="lazy"
                />
                <span>
                  {offer.providerUrl ? (
                    <a href={offer.providerUrl} target="_blank" rel="noopener noreferrer">
                      {offer.provider}
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </a>
                  ) : (
                    <strong>{offer.provider}</strong>
                  )}
                  <span className="provider-badges">
                    {offer.id === profile.official && <em className="badge-official">Official</em>}
                    {offer.id === cheapest && <em className="badge-cheapest">Lowest price</em>}
                    {isNoChargeOffer(offer) && <em className="badge-plan">No per-token charge</em>}
                    {offer.status && <em className="badge-status">{offer.status}</em>}
                  </span>
                </span>
              </span>
              <span role="cell" data-label="Input">
                {isNoChargeOffer(offer) ? 'No charge' : money(offer.inputPrice)}
              </span>
              <span role="cell" data-label="Output">
                {isNoChargeOffer(offer) ? 'No charge' : money(offer.outputPrice)}
              </span>
              <span role="cell" data-label="Cached input">
                {offer.cacheReadPrice === undefined ? '—' : money(offer.cacheReadPrice)}
              </span>
              <span role="cell" data-label="Context">
                {tokens(offer.contextWindow)}
              </span>
              <span role="cell" data-label="Max output">
                {offer.maxOutput === undefined ? '—' : tokens(offer.maxOutput)}
              </span>
              <span role="cell" data-label="Tools">
                <Flag value={offer.toolCall} label="Tool calling" />
              </span>
              <span role="cell" data-label="JSON">
                <Flag value={offer.structuredOutput} label="JSON output" />
              </span>
            </div>
          ))}
        </div>
        {rows.length > SHOWN && (
          <button
            type="button"
            className="btn btn-small btn-outline provider-more"
            onClick={() => setAll(!all)}
          >
            {all ? 'Show fewer' : `Show all ${whole(rows.length)} providers`}
          </button>
        )}
      </section>
      <section className="profile-card" aria-labelledby="provider-faq-heading">
        <div className="profile-card-head">
          <h2 id="provider-faq-heading">Choosing a provider</h2>
          <p>Answered from the listings above.</p>
        </div>
        <div className="faq-items">
          {providerQuestions(profile, paid, mix).map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <p className="profile-note">
        Speed, latency and uptime are not measured here yet, so providers are compared on price,
        limits and features only.
      </p>
      <Sources bucket={bucket} />
    </div>
  );
}

function providerQuestions(
  profile: ModelProfile,
  paid: ProfileOffering[],
  mix: Mix,
): [string, string][] {
  const name = profile.name;
  const withTools = profile.offerings
    .filter((offer) => offer.toolCall)
    .map((offer) => offer.provider);
  const withJson = profile.offerings
    .filter((offer) => offer.structuredOutput)
    .map((offer) => offer.provider);
  const list = (names: string[]) =>
    names.length <= 5
      ? names.join(', ')
      : `${names.slice(0, 5).join(', ')} and ${names.length - 5} more`;
  const byInput = [...paid].sort((a, b) => a.inputPrice! - b.inputPrice!)[0];
  const byOutput = [...paid].sort((a, b) => a.outputPrice! - b.outputPrice!)[0];
  const questions: [string, string][] = [
    [
      `How many providers offer ${name}?`,
      `${whole(profile.offerings.length)} ${profile.offerings.length === 1 ? 'listing' : 'listings'}${
        profile.official ? `, including ${profile.maker} itself` : ''
      }. ${paid.length} ${paid.length === 1 ? 'has' : 'have'} a per-token price.`,
    ],
  ];
  if (paid.length) {
    questions.push([
      `Which provider is cheapest for ${name}?`,
      `For ${mix.label.toLowerCase()} (${mix.detail}), ${paid[0].provider} is cheapest at ${money(mixed(paid[0], mix))} per 1M tokens blended. Change the workload above to compare for your own mix.`,
    ]);
    questions.push([
      `Which provider has the lowest input and output price?`,
      `${byInput.provider} has the lowest input price (${money(byInput.inputPrice)}) and ${byOutput.provider} the lowest output price (${money(byOutput.outputPrice)}), per 1M tokens.`,
    ]);
  }
  questions.push([
    `Which providers support tool calling for ${name}?`,
    withTools.length
      ? `${list(withTools)} report tool calling for their listing.`
      : 'No listing reports tool calling.',
  ]);
  questions.push([
    `Which providers support JSON output for ${name}?`,
    withJson.length
      ? `${list(withJson)} report structured output such as JSON.`
      : 'No listing reports structured output.',
  ]);
  questions.push([
    `How do I choose a provider for ${name}?`,
    'Start from your workload: chat traffic weighs input price most, agents that reuse long prompts benefit from cheap cached input, and long answers weigh output price. Then check the context window and maximum reply length you need, whether tool calling and JSON output are supported, and the provider’s own terms, limits and reliability.',
  ]);
  return questions;
}
