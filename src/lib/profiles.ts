import { useEffect, useState } from 'react';
import {
  profileBucket,
  type ModelProfile,
  type ProfileBucket,
  type ProfileLinks,
} from '../../shared/model-profiles';

export {
  modelSlug,
  blendedPrice,
  primaryResult,
  isPaidOffer,
  isNoChargeOffer,
  testLabel,
} from '../../shared/model-profiles';
export type {
  ModelProfile,
  ProfileBucket,
  ProfileCategory,
  ProfileOffering,
  ProfileResult,
  ProfilePeer,
  ProfileLinks,
} from '../../shared/model-profiles';

const buckets = new Map<number, Promise<ProfileBucket>>();

/** One bucket file holds several profiles; cache it for the session. */
function loadBucket(index: number) {
  let request = buckets.get(index);
  if (!request) {
    request = fetch(`/data/models/${index}.json`).then(async (response) => {
      if (!response.ok) throw new Error('This model profile could not load. Please try again.');
      const bucket = (await response.json()) as ProfileBucket;
      if (bucket.version !== 1 || !Array.isArray(bucket.profiles))
        throw new Error('This model profile could not load. Please try again.');
      return bucket;
    });
    // A failed request should not be remembered, so "Try again" really retries.
    request.catch(() => buckets.delete(index));
    buckets.set(index, request);
  }
  return request;
}

export type ProfileState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: ModelProfile; bucket: ProfileBucket };

export function useModelProfile(slug: string | undefined, attempt = 0): ProfileState {
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  useEffect(() => {
    if (!slug || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) {
      setState({ status: 'missing' });
      return;
    }
    let active = true;
    setState({ status: 'loading' });
    loadBucket(profileBucket(slug))
      .then((bucket) => {
        if (!active) return;
        const profile = bucket.profiles.find((entry) => entry.slug === slug);
        setState(profile ? { status: 'ready', profile, bucket } : { status: 'missing' });
      })
      .catch((error: Error) => {
        if (active) setState({ status: 'error', message: error.message });
      });
    return () => {
      active = false;
    };
  }, [slug, attempt]);
  return state;
}

let links: Promise<ProfileLinks> | null = null;
/** Benchmark row → profile slug. Missing links simply render as plain text. */
export function loadProfileLinks(): Promise<ProfileLinks> {
  if (!links) {
    links = fetch('/data/models/links.json')
      .then((response) =>
        response.ok ? (response.json() as Promise<ProfileLinks>) : { rows: {}, names: {} },
      )
      .catch(() => ({ rows: {}, names: {} }));
  }
  return links;
}

/** Profiles for several slugs at once, for side-by-side views. Missing slugs map to null. */
export function useProfiles(slugs: string[]) {
  const key = [...new Set(slugs)].sort().join(',');
  const [profiles, setProfiles] = useState<Record<string, ModelProfile | null>>({});
  useEffect(() => {
    let active = true;
    const wanted = key ? key.split(',') : [];
    Promise.all(
      wanted.map((slug) =>
        loadBucket(profileBucket(slug))
          .then(
            (bucket) =>
              [slug, bucket.profiles.find((entry) => entry.slug === slug) ?? null] as const,
          )
          .catch(() => [slug, null] as const),
      ),
    ).then((entries) => {
      if (active) setProfiles(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [key]);
  return profiles;
}
