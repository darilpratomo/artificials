import type { BenchmarkSnapshot } from './benchmarks.ts';
import { referencePrice } from './model-overview.ts';
import type { ModelProfile } from './model-profiles.ts';

/**
 * What changed, snapshot by snapshot: the makers' own listed prices, models
 * joining the capability index, and a new top model on each test. Each data
 * refresh compares its snapshot with the last one it saw (`latest`) and adds
 * any change, dated by the day it was seen. Only the maker's own listing
 * counts as a price: the middle price across hosts moves whenever a host
 * comes or goes, which is not a price change.
 */

/** A listed price from a day on: [day, input, output], per 1M tokens. */
export type PricePoint = [day: string, input: number, output: number];

/** The top model on a test: its profile when it has one, or the test's own name for it. */
export interface Leader {
  slug?: string;
  name: string;
  makerId: string;
  score: number;
}

export interface LeaderChange extends Leader {
  day: string;
  test: string;
  previous: Leader;
}

/** What one snapshot says, kept to compare the next with. */
export interface HistoryState {
  /** The maker's own listed price: [input, output, the day it was first seen at that price]. */
  prices: Record<string, [input: number, output: number, since: string]>;
  /** Capability index scores. */
  index: Record<string, number>;
  /** The top model on each test. */
  leaders: Record<string, Leader>;
}

export interface History {
  version: 1;
  /** The first snapshot's day. Nothing before it is known. */
  since: string;
  /** Models whose listed price has changed: each price, oldest first. */
  prices: Record<string, PricePoint[]>;
  /** Models as they joined the capability index: [day, slug, score]. */
  indexed: [day: string, slug: string, score: number][];
  leaders: LeaderChange[];
  latest: HistoryState & { day: string };
}

/** The prices, index scores and leaders one snapshot shows. */
export function historyState(
  profiles: ModelProfile[],
  links: Record<string, string>,
  benchmarks: BenchmarkSnapshot,
  day: string,
): HistoryState {
  const prices: HistoryState['prices'] = {};
  for (const profile of profiles) {
    const reference = referencePrice(profile);
    if (reference?.from === 'maker')
      prices[profile.slug] = [reference.input, reference.output, day];
  }
  const bySlug = new Map(profiles.map((profile) => [profile.slug, profile]));
  const index: HistoryState['index'] = {};
  const leaders: HistoryState['leaders'] = {};
  for (const category of benchmarks.categories) {
    let top: (typeof category.rows)[number] | undefined;
    for (const row of category.rows) {
      if (!top || row.score > top.score) top = row;
      const slug = links[`${category.id}:${row.id}`];
      if (category.id === 'capability-index' && slug && !(slug in index)) index[slug] = row.score;
    }
    if (!top) continue;
    const slug = links[`${category.id}:${top.id}`];
    const profile = slug ? bySlug.get(slug) : undefined;
    leaders[category.id] = profile
      ? { slug: profile.slug, name: profile.name, makerId: profile.makerId, score: top.score }
      : { name: top.model, makerId: top.providerId, score: top.score };
  }
  return { prices, index, leaders };
}

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const leaderKey = (leader: Leader) => leader.slug ?? leader.name;
/**
 * More models than this joining the index in one snapshot means a source or
 * matching change, not new results: it sets a new baseline without events.
 */
const MAX_JOINED = 20;

/** Adds what changed since the last snapshot. The first snapshot only sets the baseline. */
export function recordHistory(
  previous: History | undefined,
  state: HistoryState,
  day: string,
): History {
  if (!previous)
    return {
      version: 1,
      since: day,
      prices: {},
      indexed: [],
      leaders: [],
      latest: { ...state, day },
    };
  const history: History = {
    ...previous,
    prices: { ...previous.prices },
    indexed: [...previous.indexed],
    leaders: [...previous.leaders],
  };
  const prices: HistoryState['prices'] = {};
  for (const [slug, [input, output]] of Object.entries(state.prices)) {
    const before = previous.latest.prices[slug];
    if (before && same(before[0], input) && same(before[1], output)) {
      prices[slug] = before;
      continue;
    }
    prices[slug] = [input, output, day];
    if (!before) continue;
    const points = history.prices[slug]
      ? [...history.prices[slug]]
      : [[before[2], before[0], before[1]] as PricePoint];
    points.push([day, input, output]);
    history.prices[slug] = points;
  }
  // A listing that disappears for a snapshot keeps its last price, so it does not
  // count as a change when it returns unchanged.
  for (const [slug, price] of Object.entries(previous.latest.prices))
    if (!(slug in prices)) prices[slug] = price;
  const joined = Object.entries(state.index).filter(([slug]) => !(slug in previous.latest.index));
  if (Object.keys(previous.latest.index).length && joined.length <= MAX_JOINED)
    for (const [slug, score] of joined) history.indexed.push([day, slug, score]);
  for (const [test, leader] of Object.entries(state.leaders)) {
    const before = previous.latest.leaders[test];
    // The same result under a better-matched name is not a new leader, and
    // neither is a tie changing places: a new leader has a different score.
    if (before && leaderKey(before) !== leaderKey(leader) && !same(before.score, leader.score))
      history.leaders.push({ day, test, ...leader, previous: before });
  }
  history.latest = {
    prices,
    index: { ...previous.latest.index, ...state.index },
    leaders: { ...previous.latest.leaders, ...state.leaders },
    day,
  };
  return history;
}
