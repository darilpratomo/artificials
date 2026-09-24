import { referencePrice } from '../../../shared/model-overview';
import type { IndexPoint, ModelOverview } from '../../lib/overview';
import { isNoChargeOffer, isPaidOffer, type ModelProfile } from '../../lib/profiles';
import { approxPages, day, modalityList, money, price, tokens, whole } from './format';
import { flop } from './Standing';

/**
 * Standing against the comparison class: every model on the capability index.
 * Units are quartiles, 1 to 4, shown as filled blocks. For price they measure
 * cost (4 is the most expensive quarter), never quality.
 */
export interface Standing {
  rank: number;
  total: number;
  units: 1 | 2 | 3 | 4;
  median: number;
  value: number;
}

export interface ModelStanding {
  classSize: number;
  point?: IndexPoint;
  index?: Standing;
  price?: Standing & {
    input: number;
    output: number;
    from: 'maker' | 'median';
    medianInput: number;
    medianOutput: number;
  };
  context?: Standing;
  /** 1 − cached input price ÷ input price, from the same listing as the price. */
  cacheDiscount?: number;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const quartile = (rank: number, total: number) =>
  (Math.min(3, Math.floor(((rank - 1) / Math.max(1, total)) * 4)) + 1) as 1 | 2 | 3 | 4;

/** Rank among values where a larger number ranks first; ties share the better rank. */
function rankHigh(values: number[], value: number) {
  return values.filter((other) => other > value).length + 1;
}
function rankLow(values: number[], value: number) {
  return values.filter((other) => other < value).length + 1;
}

export function standingOf(profile: ModelProfile, overview: ModelOverview): ModelStanding {
  const points = overview.index;
  const point = points.find((entry) => entry.slug === profile.slug);
  const out: ModelStanding = { classSize: points.length, ...(point ? { point } : {}) };

  if (point) {
    const scores = points.map((entry) => entry.index);
    const rank = rankHigh(scores, point.index);
    out.index = {
      rank,
      total: scores.length,
      units: (5 - quartile(rank, scores.length)) as 1 | 2 | 3 | 4,
      median: median(scores),
      value: point.index,
    };
  }

  // A model on the index is ranked with its own entry; any other model is
  // ranked as one more member of the class, so a rank never exceeds the total.
  const price = point?.price ?? referencePrice(profile);
  const priced = points.filter((entry) => entry.price);
  if (price && priced.length) {
    const blended = priced.map((entry) => entry.price!.blended);
    const rank = rankLow(blended, price.blended);
    const total = blended.length + (point?.price ? 0 : 1);
    out.price = {
      rank,
      total,
      units: quartile(rank, total),
      median: median(blended),
      value: price.blended,
      input: price.input,
      output: price.output,
      from: price.from,
      medianInput: median(priced.map((entry) => entry.price!.input)),
      medianOutput: median(priced.map((entry) => entry.price!.output)),
    };
    const listing =
      profile.offerings.find((offer) => offer.id === profile.official && isPaidOffer(offer)) ??
      profile.offerings.find(
        (offer) => offer.inputPrice === price.input && offer.outputPrice === price.output,
      );
    if (listing?.cacheReadPrice !== undefined && price.input > 0)
      out.cacheDiscount = Math.max(0, 1 - listing.cacheReadPrice / price.input);
  }

  const windows = points
    .map((entry) => entry.contextWindow)
    .filter((value): value is number => !!value);
  if (profile.contextWindow && windows.length) {
    const rank = rankHigh(windows, profile.contextWindow);
    const total = windows.length + (point?.contextWindow ? 0 : 1);
    out.context = {
      rank,
      total,
      units: (5 - quartile(rank, total)) as 1 | 2 | 3 | 4,
      median: median(windows),
      value: profile.contextWindow,
    };
  }
  return out;
}

const share = (rank: number, total: number) => rank / Math.max(1, total);

function capabilityPhrase(standing: Standing) {
  const top = share(standing.rank, standing.total);
  if (top <= 0.1) return 'among the most capable models tested';
  if (top <= 0.25) return 'well above average in capability';
  if (top <= 0.5) return 'above the middle of the field in capability';
  return 'below the middle of the field in capability';
}

function pricePhrase(standing: Standing) {
  const cheaper = share(standing.rank, standing.total);
  if (cheaper <= 0.25) return 'one of the least expensive';
  if (cheaper <= 0.5) return 'priced below the median';
  if (cheaper <= 0.75) return 'priced above the median';
  return 'one of the most expensive';
}

function versus(value: number, typical: number) {
  if (typical <= 0) return '';
  const ratio = value / typical;
  if (ratio >= 1.5) return `higher than the median of ${price(typical)}`;
  if (ratio <= 0.67) return `lower than the median of ${price(typical)}`;
  return `close to the median of ${price(typical)}`;
}

/**
 * A plain-language summary written from the numbers on the page, so every
 * claim traces back to a figure a reader can check.
 */
export function summaryOf(profile: ModelProfile, standing: ModelStanding): string[] {
  const lines: string[] = [];
  const parts: string[] = [];
  if (standing.index) parts.push(capabilityPhrase(standing.index));
  if (standing.price) parts.push(`${pricePhrase(standing.price)} of the models with a list price`);
  const reads = modalityList(profile.inputModalities) || 'text';
  const makes = modalityList(profile.outputModalities) || 'text';
  lines.push(
    `${profile.name}${profile.maker ? `, made by ${profile.maker},` : ''} ${
      parts.length
        ? `is ${parts.join(', and ')}`
        : 'has not been scored on the capability index yet'
    }. It reads ${reads}, produces ${makes}${
      profile.contextWindow
        ? `, and takes up to ${tokens(profile.contextWindow)} tokens at once`
        : ''
    }.`,
  );
  if (standing.index)
    lines.push(
      `It scores ${standing.index.value.toFixed(1)} on the Epoch Capabilities Index, #${standing.index.rank} of ${standing.index.total} models, against a median of ${standing.index.median.toFixed(1)}.${
        standing.point?.ciLow !== undefined
          ? ` Epoch AI puts the likely range at ${standing.point.ciLow.toFixed(1)} to ${standing.point.ciHigh!.toFixed(1)}.`
          : ''
      }`,
    );
  if (standing.price)
    lines.push(
      `${
        standing.price.from === 'maker'
          ? `At ${profile.maker || 'the maker'}'s own list price`
          : 'At the middle price across hosts'
      } it costs ${price(standing.price.input)} per 1M input tokens, ${versus(standing.price.input, standing.price.medianInput)}, and ${price(standing.price.output)} per 1M output tokens, ${versus(standing.price.output, standing.price.medianOutput)}.${
        standing.cacheDiscount !== undefined
          ? ` Cached input is ${Math.round(standing.cacheDiscount * 100)}% cheaper than regular input.`
          : ''
      }`,
    );
  if (profile.reasoning)
    lines.push(
      `It is a reasoning model${
        profile.reasoningEfforts?.length
          ? ` with ${profile.reasoningEfforts.length} effort levels (${profile.reasoningEfforts.join(', ')})`
          : ''
      }${profile.reasoningToggle ? ', and thinking can be switched off' : ''}.`,
    );
  return lines;
}

/** Common questions, answered only from data on this page. */
export function faqOf(profile: ModelProfile, standing: ModelStanding): [string, string][] {
  const name = profile.name;
  const paid = profile.offerings.filter(isPaidOffer);
  const official = profile.offerings.find((offer) => offer.id === profile.official);
  const free = profile.offerings.filter(isNoChargeOffer).length;
  const facts = profile.facts;
  const questions: [string, string][] = [];
  questions.push([
    `When was ${name} released?`,
    profile.releaseDate
      ? `${name} was released on ${day(profile.releaseDate)}, according to the catalog.${
          facts?.releasedAt && facts.releasedAt !== profile.releaseDate
            ? ` Epoch AI's records give ${day(facts.releasedAt)}.`
            : ''
        }`
      : `The catalog does not list a release date for ${name}.`,
  ]);
  questions.push([
    `Who made ${name}?`,
    profile.maker
      ? `${name} was made by ${profile.maker}${
          facts?.country ? `, based in ${facts.country}` : ''
        }.`
      : `None of our sources names the maker of ${name}.`,
  ]);
  questions.push([
    `How capable is ${name}?`,
    standing.index
      ? `${name} scores ${standing.index.value.toFixed(1)} on the Epoch Capabilities Index, #${standing.index.rank} of ${standing.index.total} models (median ${standing.index.median.toFixed(1)}). Results on individual tests are on the Performance tab.`
      : profile.results.length
        ? `${name} has results on ${profile.categories.length} tests but is not on the capability index yet. See the Performance tab.`
        : `No published test covers ${name} yet.`,
  ]);
  questions.push([
    `How much does ${name} cost?`,
    paid.length
      ? `${
          official && isPaidOffer(official)
            ? `${profile.maker} charges ${money(official.inputPrice)} per 1M input tokens and ${money(official.outputPrice)} per 1M output tokens. `
            : ''
        }Across ${paid.length} ${paid.length === 1 ? 'host' : 'hosts'}, input ranges from ${money(Math.min(...paid.map((offer) => offer.inputPrice!)))} to ${money(Math.max(...paid.map((offer) => offer.inputPrice!)))} and output from ${money(Math.min(...paid.map((offer) => offer.outputPrice!)))} to ${money(Math.max(...paid.map((offer) => offer.outputPrice!)))} per 1M tokens.${
          free
            ? ` ${free} ${free === 1 ? 'listing has' : 'listings have'} no per-token charge.`
            : ''
        }`
      : free
        ? `${name} is offered without a per-token charge, usually as a limited free tier or inside a subscription.`
        : `No host lists a price for ${name}.`,
  ]);
  if (paid.length > 1)
    questions.push([
      `Which provider is cheapest for ${name}?`,
      `${paid[0].provider} lists the lowest blended price: ${money(paid[0].inputPrice)} in and ${money(paid[0].outputPrice)} out per 1M tokens. Limits and reliability differ between providers, so compare them on the API providers tab.`,
    ]);
  questions.push([
    `Is ${name} a reasoning model?`,
    profile.reasoning
      ? `Yes. ${name} thinks before it answers${
          profile.reasoningEfforts?.length
            ? `, with effort levels ${profile.reasoningEfforts.join(', ')}`
            : ''
        }.`
      : `No. ${name} answers directly, without a separate thinking step.`,
  ]);
  questions.push([
    `What can ${name} read and produce?`,
    `${name} reads ${modalityList(profile.inputModalities) || 'text'} and produces ${modalityList(profile.outputModalities) || 'text'}.`,
  ]);
  questions.push([
    `What is the context window of ${name}?`,
    profile.contextWindow
      ? `${name} takes up to ${tokens(profile.contextWindow)} tokens at once, about ${approxPages(profile.contextWindow)} of English text${
          profile.maxOutput
            ? `, and writes up to ${tokens(profile.maxOutput)} tokens per reply`
            : ''
        }.`
      : `The context window of ${name} is not reported.`,
  ]);
  questions.push([
    `Is ${name} open source?`,
    profile.openWeights
      ? `Its weights are open: you can download and run ${name} yourself${
          facts?.access ? ` (Epoch AI lists it as ${facts.access.toLowerCase()})` : ''
        }. Check the license for your use.`
      : `No. ${name} is proprietary and available only through a provider's service.`,
  ]);
  questions.push([
    `How large is ${name}?`,
    facts?.trainingCompute
      ? `Our sources do not list a parameter count. Epoch AI estimates its training compute at about ${flop(facts.trainingCompute)}.`
      : `Our sources do not list its parameter count or training compute.`,
  ]);
  questions.push([
    `Does ${name} support tool calling and JSON output?`,
    `${profile.toolCall === undefined ? 'Tool calling is not reported' : profile.toolCall ? 'It can call tools' : 'It does not call tools'}, and ${
      profile.structuredOutput === undefined
        ? 'structured output is not reported'
        : profile.structuredOutput
          ? 'it can reply in an exact format such as JSON'
          : 'it has no guaranteed JSON mode'
    }. Support can differ by provider.`,
  ]);
  questions.push([
    `Where can I use ${name}?`,
    `${name} is listed by ${whole(profile.offerings.length)} ${profile.offerings.length === 1 ? 'provider' : 'providers'}${
      profile.official ? `, including ${profile.maker} directly` : ''
    }.`,
  ]);
  questions.push([
    `How fast is ${name}?`,
    `Artificials does not measure speed or latency yet, and no public source we can republish covers them, so none are shown.`,
  ]);
  return questions;
}
