import { buildChanges, type ChangeEvent, type Changes } from './changes.ts';
import { indexValue, price } from './format.ts';
import type { History } from './history.ts';
import type { OverviewTests, Timeline, TimelineEntry } from './model-overview.ts';
import type { ModelProfile, ProfileBucket } from './model-profiles.ts';
import type { WeekCounts } from './week-label.ts';

export { weekRange, weekSentence, type WeekCounts } from './week-label.ts';

/**
 * The week in AI models: one page per week, Monday to Sunday (UTC), from the
 * same events as the "What changed" page and the release timeline. The
 * highlights are facts counted from those events; nothing is scored or
 * written freely. A week counts from when the site began keeping its record.
 */

export interface WeekSummary {
  /** The week's Monday, which is also its address: /weekly/2026-09-21. */
  week: string;
  /** Its Sunday. */
  end: string;
  /** The last day the data covers, the Sunday once the week is over. */
  through: string;
  complete: boolean;
  counts: WeekCounts;
}

export type WeekRelease = Pick<
  TimelineEntry,
  | 'slug'
  | 'name'
  | 'makerId'
  | 'maker'
  | 'date'
  | 'contextWindow'
  | 'price'
  | 'index'
  | 'hosts'
  | 'openWeights'
  | 'reasoning'
>;

/** A fact about the week, with the figure it rests on. */
export interface WeekHighlight {
  kind: 'release' | 'maker' | 'leader' | 'price';
  label: string;
  text: string;
  detail: string;
  slug?: string;
  makerId: string;
}

export interface WeekPage extends WeekSummary {
  version: 1;
  highlights: WeekHighlight[];
  /** Notable releases, highest on the capability index first, then the most widely offered. */
  releases: WeekRelease[];
  leaders: Extract<ChangeEvent, { kind: 'leader' }>[];
  prices: Extract<ChangeEvent, { kind: 'price' }>[];
  indexed: Extract<ChangeEvent, { kind: 'index' }>[];
  sources: Changes['sources'];
  previous?: string;
  next?: string;
}

export interface WeekDirectory {
  version: 1;
  /** The week the data's own day falls in. */
  latest: string;
  /** Newest first. */
  weeks: WeekSummary[];
}

const DAY = 86_400_000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const time = (day: string) => Date.parse(`${day}T00:00:00Z`);
/** The Monday of a day's week. */
export function mondayOf(day: string) {
  const date = new Date(time(day));
  return iso(date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY);
}
const blend = ([input, output]: [number, number]) => (input * 3 + output) / 4;

function highlights(page: Omit<WeekPage, 'highlights' | 'version'>): WeekHighlight[] {
  const out: WeekHighlight[] = [];
  const [top] = page.releases;
  if (top)
    out.push({
      kind: 'release',
      label: 'Top new release',
      text: top.name,
      detail:
        top.index !== undefined
          ? `${top.maker}, ${indexValue(top.index)} on the capability index`
          : `${top.maker}, offered by ${top.hosts} ${top.hosts === 1 ? 'host' : 'hosts'}`,
      slug: top.slug,
      makerId: top.makerId,
    });
  const makers = new Map<string, { maker: string; makerId: string; count: number }>();
  for (const release of page.releases) {
    const entry = makers.get(release.makerId) ?? {
      maker: release.maker,
      makerId: release.makerId,
      count: 0,
    };
    entry.count += 1;
    makers.set(release.makerId, entry);
  }
  const busiest = [...makers.values()].sort(
    (a, b) => b.count - a.count || a.maker.localeCompare(b.maker),
  )[0];
  if (busiest && busiest.count > 1 && busiest.maker)
    out.push({
      kind: 'maker',
      label: 'Most releases',
      text: busiest.maker,
      detail: `${busiest.count} new models`,
      makerId: busiest.makerId,
    });
  const leaders = new Map<string, { event: WeekPage['leaders'][number]; count: number }>();
  for (const event of page.leaders) {
    const key = event.model.slug ?? event.model.name;
    const entry = leaders.get(key) ?? { event, count: 0 };
    entry.count += 1;
    leaders.set(key, entry);
  }
  const leader = [...leaders.values()].sort(
    (a, b) => b.count - a.count || a.event.model.name.localeCompare(b.event.model.name),
  )[0];
  if (leader)
    out.push({
      kind: 'leader',
      label: 'Most new top spots',
      text: leader.event.model.name,
      detail:
        leader.count === 1
          ? `New leader on ${leader.event.label}`
          : `New leader on ${leader.count} tests`,
      ...(leader.event.model.slug ? { slug: leader.event.model.slug } : {}),
      makerId: leader.event.model.makerId,
    });
  const change = [...page.prices].sort(
    (a, b) => Math.abs(blend(b.to) / blend(b.from) - 1) - Math.abs(blend(a.to) / blend(a.from) - 1),
  )[0];
  if (change) {
    const ratio = blend(change.to) / blend(change.from) - 1;
    out.push({
      kind: 'price',
      label: 'Biggest price change',
      text: change.model.name,
      detail: `${ratio > 0 ? '+' : '−'}${Math.abs(Math.round(ratio * 100))}%, now ${price(change.to[0])} in and ${price(change.to[1])} out`,
      ...(change.model.slug ? { slug: change.model.slug } : {}),
      makerId: change.model.makerId,
    });
  }
  return out;
}

export function buildWeeks({
  history,
  profiles,
  timeline,
  tests,
  sources,
  until,
}: {
  history?: History;
  profiles: ModelProfile[];
  timeline: Timeline;
  tests: OverviewTests;
  sources: (ProfileBucket['sources'][number] & { checkedAt?: string })[];
  /** The data's own day. */
  until: string;
}): { directory: WeekDirectory; pages: WeekPage[] } {
  const latest = mondayOf(until);
  const first = mondayOf(history?.since ?? until);
  const mondays: string[] = [];
  for (let at = time(first); at <= time(latest); at += 7 * DAY) mondays.push(iso(at));

  const pages: WeekPage[] = mondays.map((week) => {
    const end = iso(time(week) + 6 * DAY);
    const through = end < until ? end : until;
    const changes = buildChanges({
      history,
      profiles,
      timeline,
      tests,
      sources,
      until: through,
      since: week,
    });
    const kind = <K extends ChangeEvent['kind']>(name: K) =>
      changes.events.filter(
        (event): event is Extract<ChangeEvent, { kind: K }> => event.kind === name,
      );
    const releases = timeline.entries
      .filter((entry) => entry.notable && entry.date >= week && entry.date <= through)
      .map(
        ({
          slug,
          name,
          makerId,
          maker,
          date,
          contextWindow,
          price,
          index,
          hosts,
          openWeights,
          reasoning,
        }) => ({
          slug,
          name,
          makerId,
          maker,
          date,
          ...(contextWindow !== undefined ? { contextWindow } : {}),
          ...(price !== undefined ? { price } : {}),
          ...(index !== undefined ? { index } : {}),
          hosts,
          openWeights,
          reasoning,
        }),
      )
      .sort(
        (a, b) =>
          (b.index ?? -Infinity) - (a.index ?? -Infinity) ||
          b.hosts - a.hosts ||
          b.date.localeCompare(a.date) ||
          a.name.localeCompare(b.name),
      );
    const leaders = kind('leader');
    const page = {
      week,
      end,
      through,
      // A week is over once the data reaches past its Sunday.
      complete: until > end,
      counts: {
        releases: releases.length,
        leaders: leaders.length,
        withinMargin: leaders.filter((event) => event.withinMargin).length,
        prices: kind('price').length,
        indexed: kind('index').length,
      },
      releases,
      leaders,
      prices: kind('price'),
      indexed: kind('index'),
      // Releases come from the catalog, credited on the page; the test sources follow the events.
      sources: changes.sources,
    };
    return { version: 1 as const, ...page, highlights: highlights(page) };
  });
  pages.forEach((page, index) => {
    if (index > 0) page.previous = pages[index - 1].week;
    if (index < pages.length - 1) page.next = pages[index + 1].week;
  });
  pages.reverse();
  return {
    directory: {
      version: 1,
      latest,
      weeks: pages.map(({ week, end, through, complete, counts }) => ({
        week,
        end,
        through,
        complete,
        counts,
      })),
    },
    pages,
  };
}
