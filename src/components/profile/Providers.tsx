import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { providerLogo } from '../../lib/catalog';
import {
  blendedPrice,
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

function compare(sort: Sort, official: string | undefined) {
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
          blendedPrice(a.inputPrice, a.outputPrice)! - blendedPrice(b.inputPrice, b.outputPrice)! ||
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
  const [all, setAll] = useState(false);
  const rows = [...profile.offerings].sort(compare(sort, profile.official));
  const paid = profile.offerings.filter(isPaidOffer);
  const blended = paid.map((offer) => blendedPrice(offer.inputPrice, offer.outputPrice)!);
  // With a tie at the lowest price, no single listing earns the badge.
  const cheapest =
    paid.length && (paid.length === 1 || blended[0] < blended[1]) ? paid[0].id : undefined;
  const visible = all ? rows : rows.slice(0, SHOWN);

  return (
    <div className="profile-panel-body">
      <Explainer>
        The same model can be sold by several companies. Price, limits and reliability can differ
        between them, so compare before you choose.
        {profile.contextVaries && ' Context limits differ between providers for this model.'}
      </Explainer>
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
      <Sources bucket={bucket} />
    </div>
  );
}
