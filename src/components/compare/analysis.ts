import { referencePrice, type ReferencePrice } from '../../../shared/model-overview';
import { cheaper } from '../../../shared/finder';
import type { ModelProfile, ProfileCategory } from '../../lib/profiles';
import { DOMAINS, day, price, score, tokens } from '../profile/format';

/** One test every compared model has taken, and who scores highest on it. */
export interface SharedTest {
  category: ProfileCategory;
  scores: number[];
  /** The model with the highest score, or null when the top scores read the same. */
  leader: number | null;
  /** How far the leader is ahead of the next model, on the test's own scale. */
  margin: number;
}

/** A measure the summary compares, with one value per model and a plain sentence. */
export interface Measure {
  label: string;
  values: string[];
  /** Models with the better value, when the values differ. */
  best: number[];
  sentence: string;
}

export interface HeadToHead {
  measures: Measure[];
  shared: SharedTest[];
  /** Tests only some of the models have results on. */
  unshared: number;
}

const INDEX = 'capability-index';
const DOMAIN_ORDER = Object.keys(DOMAINS);

/** "2.9 points", or "18 points" on a rating scale in the hundreds. */
export function margin(test: SharedTest) {
  const unit = test.category.unit;
  const shown = unit === 'index' && Math.max(...test.scores) >= 500 ? 0 : 1;
  return `${test.margin.toFixed(shown)} points`;
}

/**
 * Models with the highest (or lowest) value, as the page shows it: values that
 * read the same share the mark, and none is marked when all read the same.
 */
function extremes(
  values: (number | null | undefined)[],
  format: (value: number) => string,
  lowest = false,
) {
  const known = values.filter((value): value is number => typeof value === 'number');
  if (known.length < 2) return [];
  const edge = format(lowest ? Math.min(...known) : Math.max(...known));
  if (known.every((value) => format(value) === edge)) return [];
  return values.flatMap((value, index) =>
    typeof value === 'number' && format(value) === edge ? [index] : [],
  );
}

function months(from: string, to: string) {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
  if (days < 1) return 'the same day';
  if (days < 60) return `${days} ${days === 1 ? 'day' : 'days'}`;
  const count = Math.round(days / 30.44);
  return count < 24 ? `${count} months` : `${Math.round(count / 12)} years`;
}

/**
 * What the summary says about the compared models. Every figure comes from one
 * published test or listing at a time: scores from different tests are never
 * combined, and a model counts as ahead on a test only where every compared
 * model has a result.
 */
export function headToHead(profiles: ModelProfile[]): HeadToHead {
  const names = profiles.map((profile) => profile.name);
  const resultOf = (profile: ModelProfile, id: string) =>
    profile.results.find((result) => result.category === id);

  const index = profiles.map((profile) => resultOf(profile, INDEX)?.score ?? null);
  const indexed = index.flatMap((value, i) => (value === null ? [] : [i]));
  const [top, next] = [...indexed].sort((a, b) => index[b]! - index[a]!);
  const indexSentence =
    indexed.length === 0
      ? `${profiles.length > 2 ? 'None of them is' : 'Neither is'} on the index yet.`
      : indexed.length === 1
        ? `Only ${names[top]} is on the index so far.`
        : index[top]!.toFixed(1) === index[next]!.toFixed(1)
          ? 'They score the same on the index.'
          : `${names[top]} is ${(index[top]! - index[next]!).toFixed(1)} points higher${
              indexed.length > 2 ? `, ahead of ${names[next]}` : ''
            }.`;

  const prices: (ReferencePrice | undefined)[] = profiles.map(referencePrice);
  const blended = prices.map((entry) => entry?.blended);
  const priced = blended.flatMap((value, i) => (value === undefined ? [] : [i]));
  const [cheapest] = [...priced].sort((a, b) => blended[a]! - blended[b]!);
  const [dearest] = [...priced].sort((a, b) => blended[b]! - blended[a]!);
  const priceSentence =
    priced.length === 0
      ? 'No paid listing reports a price yet.'
      : priced.length === 1
        ? `Only ${names[cheapest]} has a listed price.`
        : blended[cheapest] === blended[dearest]
          ? 'They cost the same.'
          : `${names[cheapest]} is ${cheaper(blended[dearest]! / blended[cheapest]!)}${
              priced.length > 2 ? ` than ${names[dearest]}` : ''
            }.`;

  const context = profiles.map((profile) => profile.contextWindow);
  const sized = context.flatMap((value, i) => (value === null ? [] : [i]));
  const [largest] = [...sized].sort((a, b) => context[b]! - context[a]!);
  const [smallest] = [...sized].sort((a, b) => context[a]! - context[b]!);
  const ratio = sized.length > 1 ? context[largest]! / context[smallest]! : 1;
  const contextSentence =
    sized.length < 2
      ? sized.length
        ? `Only ${names[largest]} reports a context window.`
        : 'No context window is reported yet.'
      : tokens(context[largest]!) === tokens(context[smallest]!)
        ? 'They take in about the same.'
        : `${names[largest]} takes in ${
            ratio < 1.95
              ? `${Math.round((ratio - 1) * 100)}% more`
              : `${ratio.toFixed(1)} times as much`
          }${sized.length > 2 ? ` as ${names[smallest]}` : ''}.`;

  const released = profiles.map((profile) => profile.releaseDate);
  const dated = released.flatMap((value, i) => (value ? [i] : []));
  const [newest] = [...dated].sort((a, b) => released[b]!.localeCompare(released[a]!));
  const [oldest] = [...dated].sort((a, b) => released[a]!.localeCompare(released[b]!));
  const gap = dated.length > 1 ? months(released[oldest]!, released[newest]!) : '';
  const releaseSentence =
    dated.length < 2
      ? 'Not every release date is reported.'
      : gap === 'the same day'
        ? 'Released on the same day.'
        : `${names[newest]} is ${gap} newer${dated.length > 2 ? ` than ${names[oldest]}` : ''}.`;

  const measures: Measure[] = [
    {
      label: 'Capability index',
      values: index.map((value) => (value === null ? 'Not on the index yet' : value.toFixed(1))),
      best: extremes(index, (value) => value.toFixed(1)),
      sentence: indexSentence,
    },
    {
      label: 'Price per 1M tokens',
      values: blended.map((value) => (value === undefined ? 'No listed price' : price(value))),
      best: extremes(blended, price, true),
      sentence: priceSentence,
    },
    {
      label: 'Context window',
      values: context.map((value) => (value === null ? 'Not reported' : `${tokens(value)} tokens`)),
      best: extremes(context, tokens),
      sentence: contextSentence,
    },
    {
      label: 'Released',
      values: released.map((value) => day(value)),
      best: [],
      sentence: releaseSentence,
    },
  ];

  // Tests every model has a result on, in the table's order.
  const tests = profiles[0].categories
    .filter(
      (category) =>
        category.id !== INDEX && profiles.every((profile) => resultOf(profile, category.id)),
    )
    .sort((a, b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain));
  const shared = tests.map((category) => {
    const scores = profiles.map((profile) => resultOf(profile, category.id)!.score);
    const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
    const level = score(scores[order[0]], category.unit) === score(scores[order[1]], category.unit);
    return {
      category,
      scores,
      leader: level ? null : order[0],
      margin: scores[order[0]] - scores[order[1]],
    };
  });
  const all = new Set(profiles.flatMap((profile) => profile.results.map((r) => r.category)));
  all.delete(INDEX);
  return { measures, shared, unshared: all.size - shared.length };
}
