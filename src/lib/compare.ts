import { isPaidOffer, useProfiles, type ModelProfile, type ProfileBucket } from './profiles';
import type { ModelRecord } from './catalog';

export {
  MAX_COMPARED,
  canonicalComparison,
  comparisonPath,
  parseComparison,
} from '../../shared/compare';
export type { Comparisons, FeaturedComparison } from '../../shared/compare';

/** A profile as a comparison column: the maker's own listing, else the cheapest one. */
export function comparisonRecord(profile: ModelProfile): ModelRecord {
  const offer =
    profile.offerings.find((entry) => entry.id === profile.official) ??
    profile.offerings.find(isPaidOffer) ??
    profile.offerings[0];
  return {
    id: offer.id,
    modelId: offer.id.slice(offer.providerId.length + 1),
    name: profile.name,
    provider: offer.provider,
    providerId: offer.providerId,
    contextWindow: offer.contextWindow,
    inputPrice: offer.inputPrice,
    outputPrice: offer.outputPrice,
    releaseDate: profile.releaseDate,
    modalities: [...new Set([...profile.inputModalities, ...profile.outputModalities])].sort(),
    inputModalities: profile.inputModalities,
    outputModalities: profile.outputModalities,
    reasoning: profile.reasoning,
    openWeights: profile.openWeights,
    sourceUrl: 'https://models.dev',
    providerUrl: offer.providerUrl,
  };
}

/** A prerendered comparison's profiles, carried inline so the page shows at once. */
export interface ComparisonData {
  version: 1;
  profiles: ModelProfile[];
  sources: ProfileBucket['sources'];
}

/** The inline data, when it covers exactly these models, in the address's order. */
function inline(slugs: string[], initial?: ComparisonData): ComparisonData | undefined {
  let data = initial;
  if (!data && typeof document !== 'undefined') {
    const text = document.getElementById('compare-data')?.textContent;
    try {
      data = text ? (JSON.parse(text) as ComparisonData) : undefined;
    } catch {
      data = undefined;
    }
  }
  if (data?.version !== 1 || data.profiles.length !== slugs.length) return undefined;
  const profiles = slugs.map((slug) => data.profiles.find((profile) => profile.slug === slug));
  return profiles.every(Boolean) ? { ...data, profiles: profiles as ModelProfile[] } : undefined;
}

/**
 * The compared models' profiles, in the address's order: from the page's inline
 * data when it has them, otherwise loaded. A missing model maps to null.
 */
export function useComparedProfiles(slugs: string[], initial?: ComparisonData) {
  const ready = inline(slugs, initial);
  const loaded = useProfiles(ready ? [] : slugs);
  if (ready)
    return {
      profiles: ready.profiles as (ModelProfile | null)[],
      sources: ready.sources,
      done: true,
    };
  const profiles = slugs.map((slug) => loaded.profiles[slug]);
  return {
    profiles: profiles.map((profile) => profile ?? null),
    sources: loaded.sources,
    done: profiles.every((profile) => profile !== undefined),
  };
}
