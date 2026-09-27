import { isNotable, referencePrice, type ModelOverview } from './model-overview.ts';
import type { ModelProfile } from './model-profiles.ts';

/**
 * The cost calculator's list: every model from a known maker that the maker
 * sells, several hosts list or a test covers, with a paid reference price (the
 * maker's own listing, or else the middle one across hosts) and its capability
 * index when Epoch AI has scored it. The page multiplies these prices by a
 * workload; nothing here is estimated.
 */

export const COST_FLAGS = { openWeights: 1, reasoning: 2 } as const;

/**
 * [slug, name, maker id, maker, input price, output price, cached input price,
 * capability index, context window, flags, whose listing the price is], prices
 * per 1M tokens.
 */
export type CostRow = [
  slug: string,
  name: string,
  makerId: string,
  maker: string,
  input: number,
  output: number,
  cached: number | null,
  index: number | null,
  context: number | null,
  flags: number,
  from: 'maker' | 'median',
];

export interface Costs {
  version: 1;
  rows: CostRow[];
}

export function buildCosts(profiles: ModelProfile[], overview: ModelOverview): Costs {
  // A model's best score when the index lists it more than once.
  const index = new Map<string, number>();
  for (const point of overview.index)
    if (point.slug && point.index > (index.get(point.slug) ?? -Infinity))
      index.set(point.slug, point.index);
  const rows: CostRow[] = [];
  for (const profile of profiles) {
    if (!isNotable(profile)) continue;
    const price = referencePrice(profile);
    if (!price) continue;
    rows.push([
      profile.slug,
      profile.name,
      profile.makerId,
      profile.maker,
      price.input,
      price.output,
      price.cached ?? null,
      index.get(profile.slug) ?? null,
      profile.contextWindow,
      (profile.openWeights ? COST_FLAGS.openWeights : 0) |
        (profile.reasoning ? COST_FLAGS.reasoning : 0),
      price.from,
    ]);
  }
  rows.sort((a, b) => (b[7] ?? -Infinity) - (a[7] ?? -Infinity) || a[1].localeCompare(b[1]));
  return { version: 1, rows };
}

/** What one request and a month of them cost: tokens per request times each price. */
export function workloadCost(row: CostRow, input: number, output: number) {
  return (input * row[4] + output * row[5]) / 1_000_000;
}
