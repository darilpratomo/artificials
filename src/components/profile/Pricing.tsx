import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Select } from '../Select';
import {
  blendedPrice,
  isNoChargeOffer,
  isPaidOffer,
  type ModelProfile,
  type ProfileBucket,
} from '../../lib/profiles';
import { approxWords, cost, day, money, tokens, whole } from './format';
import { Explainer, Sources } from './parts';
import { LIMIT, PRESETS, clampInteger } from '../../lib/workload';

export default function Pricing({
  profile,
  bucket,
}: {
  profile: ModelProfile;
  bucket: ProfileBucket;
}) {
  // Only per-token list prices are compared. No-charge listings are free tiers
  // or subscription plans, noted separately so "lowest price" stays meaningful.
  const pricedOffers = useMemo(() => profile.offerings.filter(isPaidOffer), [profile]);
  const noCharge = useMemo(() => profile.offerings.filter(isNoChargeOffer), [profile]);
  const official = pricedOffers.find((offer) => offer.id === profile.official);
  const [selectedId, setSelectedId] = useState(official?.id ?? pricedOffers[0]?.id ?? '');
  const [preset, setPreset] = useState<(typeof PRESETS)[number]['id']>('chat');
  const [input, setInput] = useState(1500);
  const [output, setOutput] = useState(500);
  const [perDay, setPerDay] = useState(100);
  const selected = pricedOffers.find((offer) => offer.id === selectedId) ?? pricedOffers[0];

  const chart = useMemo(() => {
    const cheapest = pricedOffers.slice(0, 10);
    // Always show the selected and official listings, even when they are not the cheapest.
    for (const extra of [selected, official])
      if (extra && !cheapest.includes(extra)) cheapest.push(extra);
    return cheapest.sort(
      (a, b) =>
        blendedPrice(a.inputPrice, a.outputPrice)! - blendedPrice(b.inputPrice, b.outputPrice)!,
    );
  }, [pricedOffers, selected, official]);
  const prices = pricedOffers.map((offer) => blendedPrice(offer.inputPrice, offer.outputPrice)!);
  const samePrice = prices.length > 1 && Math.max(...prices) === Math.min(...prices);
  const maximum = Math.max(
    ...chart.map((offer) => blendedPrice(offer.inputPrice, offer.outputPrice) ?? 0),
    0,
  );

  if (!selected)
    return (
      <div className="profile-panel-body">
        <section className="profile-card profile-empty">
          <h2>{noCharge.length ? 'No per-token price' : 'No listed price'}</h2>
          <p>
            {noCharge.length
              ? `${whole(noCharge.length)} ${noCharge.length === 1 ? 'provider offers' : 'providers offer'} ${profile.name} with no per-token charge, usually a free tier with limits or access included in a subscription. No provider lists a per-token price to compare.`
              : `None of the ${whole(profile.offerings.length)} listings for ${profile.name} publish a price per token. Check the provider’s own page for current pricing.`}
          </p>
        </section>
        <Sources bucket={bucket} />
      </div>
    );

  const perRequest = (input * selected.inputPrice! + output * selected.outputPrice!) / 1_000_000;
  const tiers = selected.longContextPricing?.[0];
  const history = profile.priceHistory;
  const choose = (id: (typeof PRESETS)[number]['id']) => {
    setPreset(id);
    const next = PRESETS.find((entry) => entry.id === id)!;
    if (id !== 'custom') {
      setInput(next.input);
      setOutput(next.output);
    }
  };

  return (
    <div className="profile-panel-body">
      <Explainer>
        AI models are billed by the token, a small piece of text. Prices are per million tokens:
        input is what you send, output is what the model writes.
      </Explainer>

      <section className="profile-card" aria-labelledby="price-heading">
        <div className="profile-card-head profile-card-head-row">
          <div>
            <h2 id="price-heading">Price per million tokens</h2>
            <p>
              {selected.id === profile.official
                ? `${selected.provider}’s own price.`
                : selected === pricedOffers[0]
                  ? `The lowest listed price, at ${selected.provider}.`
                  : `Price at ${selected.provider}.`}
            </p>
          </div>
          {pricedOffers.length > 1 && (
            <div className="price-provider">
              <label htmlFor="price-provider">Provider</label>
              <Select
                id="price-provider"
                aria-label="Provider"
                value={selected.id}
                onValueChange={setSelectedId}
              >
                {pricedOffers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.provider}
                    {offer.id === profile.official ? ' (official)' : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
        <div className="price-tiles">
          <div>
            <span>Input</span>
            <strong>{money(selected.inputPrice)}</strong>
          </div>
          <div>
            <span>Output</span>
            <strong>{money(selected.outputPrice)}</strong>
          </div>
          {selected.cacheReadPrice !== undefined && (
            <div>
              <span>Cached input</span>
              <strong>{money(selected.cacheReadPrice)}</strong>
            </div>
          )}
          {selected.cacheWritePrice !== undefined && (
            <div>
              <span>Cache write</span>
              <strong>{money(selected.cacheWritePrice)}</strong>
            </div>
          )}
          <div>
            <span>Blended</span>
            <strong>{money(blendedPrice(selected.inputPrice, selected.outputPrice))}</strong>
          </div>
        </div>
        <p className="price-footnote">
          Blended price assumes three input tokens for every output token, a common mix for chat.
          {selected.cacheReadPrice !== undefined &&
            ' Cached input is text you send again, such as a long system prompt, and costs less.'}
          {tiers &&
            ` Requests above ${tokens(tiers.threshold)} tokens cost ${money(tiers.input)} input and ${money(tiers.output)} output.`}
          {noCharge.length > 0 &&
            ` ${whole(noCharge.length)} ${noCharge.length === 1 ? 'provider lists' : 'providers list'} it with no per-token charge, usually a free tier with limits or access included in a subscription.`}
        </p>
      </section>

      {history && history.length > 1 && (
        <section className="profile-card" aria-labelledby="history-heading">
          <div className="profile-card-head">
            <h2 id="history-heading">Price changes</h2>
            <p>
              {`${profile.maker ? `${profile.maker}’s` : 'The maker’s'} own listed price, each time it changed, newest first.`}
            </p>
          </div>
          <ol className="price-history">
            {history
              .slice(1)
              .map(([date, input, output], index) => {
                const [, fromInput, fromOutput] = history[index];
                const change =
                  blendedPrice(input, output)! / blendedPrice(fromInput, fromOutput)! - 1;
                return (
                  <li key={date}>
                    <time dateTime={date}>{day(date)}</time>
                    <span>
                      {`Input ${money(fromInput)} to ${money(input)}, output ${money(fromOutput)} to ${money(output)}`}
                    </span>
                    <b>{`${change > 0 ? '+' : '−'}${Math.abs(Math.round(change * 100))}%`}</b>
                  </li>
                );
              })
              .reverse()}
          </ol>
          <p className="price-footnote">
            Per million tokens. The percentage compares blended prices. Changes count from when the
            site began keeping this record.
          </p>
        </section>
      )}

      <section className="profile-card" aria-labelledby="calc-heading">
        <div className="profile-card-head">
          <h2 id="calc-heading">Estimate your cost</h2>
          <p>Pick a typical task or enter your own numbers.</p>
        </div>
        <div className="calc-presets" role="group" aria-label="Typical tasks">
          {PRESETS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={preset === entry.id}
              onClick={() => choose(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="calc-fields">
          <label>
            <span>Tokens sent</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={LIMIT}
              value={input}
              onChange={(event) => {
                setPreset('custom');
                setInput(clampInteger(event.target.value));
              }}
            />
            <small>about {approxWords(input)} words</small>
          </label>
          <label>
            <span>Tokens written</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={LIMIT}
              value={output}
              onChange={(event) => {
                setPreset('custom');
                setOutput(clampInteger(event.target.value));
              }}
            />
            <small>about {approxWords(output)} words</small>
          </label>
          <label>
            <span>Requests per day</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={1_000_000}
              value={perDay}
              onChange={(event) => setPerDay(clampInteger(event.target.value, 1_000_000))}
            />
            <small>{perDay === 1 ? 'one request' : `${whole(perDay)} requests`}</small>
          </label>
        </div>
        <dl className="calc-results" aria-live="polite">
          <div>
            <dt>Per request</dt>
            <dd>{cost(perRequest)}</dd>
          </div>
          <div>
            <dt>Per day</dt>
            <dd>{cost(perRequest * perDay)}</dd>
          </div>
          <div>
            <dt>Per month</dt>
            <dd>{cost(perRequest * perDay * 30)}</dd>
          </div>
        </dl>
        <p className="price-footnote">
          Estimate at {selected.provider}’s list price, for 30 days. Word counts are approximate for
          English.
          {profile.reasoning &&
            ' Models that think before answering can use extra output tokens for their reasoning.'}
        </p>
        <Link
          className="text-link calc-compare"
          to={`/cost-calculator?in=${input}&out=${output}&day=${perDay}`}
        >
          Compare this workload across every model <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>

      {chart.length > 1 && samePrice && (
        <section className="profile-card" aria-labelledby="compare-heading">
          <div className="profile-card-head">
            <h2 id="compare-heading">Price by provider</h2>
            <p>
              All {whole(pricedOffers.length)} providers with a per-token price charge the same list
              price: {money(blendedPrice(selected.inputPrice, selected.outputPrice))} blended per
              million tokens. Compare their limits and reliability on the Providers tab instead.
            </p>
          </div>
        </section>
      )}
      {chart.length > 1 && !samePrice && (
        <section className="profile-card" aria-labelledby="compare-heading">
          <div className="profile-card-head">
            <h2 id="compare-heading">Price by provider</h2>
            <p>
              Blended price per million tokens. Select a bar to use that provider above.
              {pricedOffers.length > chart.length &&
                ` Showing the ${whole(chart.length)} cheapest of ${whole(pricedOffers.length)}.`}
            </p>
          </div>
          <ul className="price-bars">
            {chart.map((offer) => {
              const value = blendedPrice(offer.inputPrice, offer.outputPrice)!;
              const active = offer.id === selected.id;
              return (
                <li key={offer.id}>
                  <button
                    type="button"
                    className={active ? 'is-active' : ''}
                    aria-pressed={active}
                    aria-label={`${offer.provider}: blended ${money(value)}, input ${money(offer.inputPrice)}, output ${money(offer.outputPrice)} per million tokens`}
                    onClick={() => setSelectedId(offer.id)}
                  >
                    <span className="price-bar-name">
                      {offer.provider}
                      {offer.id === profile.official && <small>official</small>}
                    </span>
                    <span className="price-bar-track">
                      <span
                        className="price-bar-fill"
                        style={{
                          width: `${maximum ? Math.max(1.5, (value / maximum) * 100) : 0}%`,
                        }}
                      />
                      <span className="price-bar-value">{money(value)}</span>
                    </span>
                    <span className="price-bar-tip" role="presentation">
                      {money(offer.inputPrice)} in, {money(offer.outputPrice)} out
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <Sources bucket={bucket} />
    </div>
  );
}
