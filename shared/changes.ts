import { withinMargin, type History } from './history.ts';
import { readableName } from './model-names.ts';
import type { ModelProfile, ProfileBucket } from './model-profiles.ts';
import type { OverviewTests, Timeline } from './model-overview.ts';

/**
 * The "What changed" page's data: the last 30 days of new releases, listed
 * price changes, new top models on each test and models joining the
 * capability index, newest first. Every event comes from the history the data
 * refresh keeps (shared/history.ts) or the release timeline; none is inferred.
 */

export interface ChangeModel {
  slug?: string;
  name: string;
  maker: string;
  makerId: string;
}

export type ChangeEvent =
  | { day: string; kind: 'release'; model: ChangeModel }
  | {
      day: string;
      kind: 'price';
      model: ChangeModel;
      /** [input, output] per 1M tokens, before and after. */
      from: [number, number];
      to: [number, number];
    }
  | {
      day: string;
      kind: 'leader';
      model: ChangeModel;
      test: string;
      label: string;
      unit: 'percent' | 'index';
      score: number;
      previous: ChangeModel;
      /** The next model's score is inside the range the publisher gives for this one. */
      withinMargin?: true;
    }
  | { day: string; kind: 'index'; model: ChangeModel; score: number };

export interface Changes {
  version: 1;
  /** The window's first and last day. */
  since: string;
  until: string;
  events: ChangeEvent[];
  /** The test sources behind the events, as the page credits them. */
  sources: Source[];
}

/** A source's credit, without the time it was fetched, which the site does not show. */
type Source = Omit<ProfileBucket['sources'][number], 'checkedAt'>;

export const CHANGE_DAYS = 30;
const ORDER: ChangeEvent['kind'][] = ['release', 'leader', 'index', 'price'];

export function buildChanges({
  history,
  profiles,
  timeline,
  tests,
  sources,
  until,
  since: from,
}: {
  history?: History;
  profiles: ModelProfile[];
  timeline: Timeline;
  tests: OverviewTests;
  sources: (Source & { checkedAt?: string })[];
  /** The data's own day, from the catalog snapshot. */
  until: string;
  /** The window's first day; the last 30 days when left out. */
  since?: string;
}): Changes {
  const start = new Date(`${until}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (CHANGE_DAYS - 1));
  const since = from ?? start.toISOString().slice(0, 10);
  const inWindow = (day: string) => day >= since && day <= until;
  const bySlug = new Map(profiles.map((profile) => [profile.slug, profile]));
  const model = (slug: string | undefined, name: string, makerId: string): ChangeModel => {
    const profile = slug ? bySlug.get(slug) : undefined;
    return profile
      ? { slug: profile.slug, name: profile.name, maker: profile.maker, makerId: profile.makerId }
      : { name: readableName(name), maker: '', makerId };
  };
  const events: ChangeEvent[] = [];

  for (const entry of timeline.entries)
    if (entry.notable && inWindow(entry.date))
      events.push({
        day: entry.date,
        kind: 'release',
        model: { slug: entry.slug, name: entry.name, maker: entry.maker, makerId: entry.makerId },
      });

  for (const [slug, points] of Object.entries(history?.prices ?? {})) {
    const profile = bySlug.get(slug);
    if (!profile) continue;
    for (const [index, [day, input, output]] of points.entries())
      if (index && inWindow(day))
        events.push({
          day,
          kind: 'price',
          model: model(slug, profile.name, profile.makerId),
          from: [points[index - 1][1], points[index - 1][2]],
          to: [input, output],
        });
  }

  const labels = new Map(tests.tests.map((test) => [test.id, test]));
  const used = new Set<string>();
  for (const change of history?.leaders ?? []) {
    const test = labels.get(change.test);
    if (!test || !inWindow(change.day)) continue;
    used.add(test.sourceId);
    events.push({
      day: change.day,
      kind: 'leader',
      model: model(change.slug, change.name, change.makerId),
      test: test.id,
      label: test.label,
      unit: test.unit,
      score: change.score,
      previous: model(change.previous.slug, change.previous.name, change.previous.makerId),
      ...(withinMargin(change) ? { withinMargin: true as const } : {}),
    });
  }

  for (const [day, slug, score] of history?.indexed ?? []) {
    const profile = bySlug.get(slug);
    if (!profile || !inWindow(day)) continue;
    used.add('epoch');
    events.push({ day, kind: 'index', model: model(slug, profile.name, profile.makerId), score });
  }

  events.sort(
    (a, b) =>
      b.day.localeCompare(a.day) ||
      ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) ||
      a.model.name.localeCompare(b.model.name),
  );
  return {
    version: 1,
    since,
    until,
    events,
    sources: sources
      .filter((source) => used.has(source.id))
      .map(({ id, name, url, license, licenseUrl }) => ({ id, name, url, license, licenseUrl })),
  };
}
