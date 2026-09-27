import { useEffect, useState } from 'react';
import { FLAGS } from '../../shared/model-overview';
import type { ChangeEvent, ExplorerRow, MakerSummary, TestSummary } from './overview';
import { removeLocal } from './storage';

/**
 * What a visitor follows (models, makers and tests), kept in this browser
 * only: no account, nothing sent anywhere. Each entry keeps the figures it had
 * when followed or last marked as seen, so the "Following" page can show what
 * changed since.
 */

/** A model's figures, as its page and the list of every model give them. */
export interface Figures {
  /** Reference price per 1M tokens, blended three input tokens to one output. */
  price: number | null;
  index: number | null;
  hosts: number;
}

/** A maker's figures, as its page and the list of makers give them. */
export interface MakerFigures {
  models: number;
  /** Its best model's capability index. */
  index: number | null;
  /** Tests on which its best model scores highest. */
  leads: number;
  /** Its models' pages, to tell which models are new. */
  lineup: string[];
}

/** A test's figures, as its page and the list of tests give them. */
export interface TestFigures {
  /** The top model's page, or its name on the test where it has none. */
  leader: string | null;
  leaderName: string | null;
  score: number | null;
  models: number;
}

interface Entry<T> {
  /** The page's address: a model's or maker's slug, or a test's id. */
  slug: string;
  name: string;
  /** The day the figures in `seen` were taken. */
  since: string;
  seen: T;
}
export interface FollowedModel extends Entry<Figures> {
  makerId: string;
}
export interface FollowedMaker extends Entry<MakerFigures> {
  makerId: string;
}
export type FollowedTest = Entry<TestFigures>;

export interface FollowList {
  models: FollowedModel[];
  makers: FollowedMaker[];
  tests: FollowedTest[];
}
export type Kind = keyof FollowList;
export type Followed<K extends Kind> = FollowList[K][number];

type Moved<K extends string, T> = { kind: K; from: T; to: T };
export type FigureChange = Moved<'price' | 'index', number | null> | Moved<'hosts', number>;
export type MakerChange = Moved<'models' | 'leads', number> | Moved<'index', number | null>;
export type TestChange =
  Moved<'leader', string | null> | Moved<'score', number | null> | Moved<'models', number>;

const KEY = 'artificials-following-v1';
const EVENT = 'artificials-following-change';
/** Of each kind: enough to watch a shortlist, few enough to stay one. */
export const MAX_FOLLOWED = 50;
const empty = (): FollowList => ({ models: [], makers: [], tests: [] });
let memory = empty();
let unavailable = false;

export const today = () => new Date().toISOString().slice(0, 10);

export const figuresOf = (row: ExplorerRow): Figures => ({
  price: row[6],
  index: row[8],
  hosts: row[7],
});

/** A maker's lineup in the list of every model: the models its page lists. */
export const lineupOf = (rows: ExplorerRow[], makerId: string) =>
  rows.filter((row) => row[2] === makerId && row[9] & FLAGS.notable).map((row) => row[0]);

export const makerFiguresOf = (
  maker: Pick<MakerSummary, 'models' | 'best' | 'leads'>,
  lineup: string[],
): MakerFigures => ({
  models: maker.models,
  index: maker.best?.index ?? null,
  leads: maker.leads,
  lineup,
});

export const testFiguresOf = (test: Pick<TestSummary, 'top' | 'models'>): TestFigures => ({
  leader: test.top ? (test.top.slug ?? test.top.name) : null,
  leaderName: test.top?.name ?? null,
  score: test.top?.score ?? null,
  models: test.models,
});

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;
const MAKER_ID = /^[a-z0-9-]{0,100}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isFigure = (value: unknown) =>
  value === null || (typeof value === 'number' && Number.isFinite(value));
const isCount = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isName = (value: unknown) =>
  value === null || (typeof value === 'string' && value.length <= 200);

function isEntry(value: unknown): value is Entry<Record<string, unknown>> {
  const entry = value as Entry<Record<string, unknown>>;
  return (
    !!entry &&
    typeof entry === 'object' &&
    typeof entry.slug === 'string' &&
    SLUG.test(entry.slug) &&
    typeof entry.name === 'string' &&
    entry.name.length <= 200 &&
    typeof entry.since === 'string' &&
    DAY.test(entry.since) &&
    !!entry.seen &&
    typeof entry.seen === 'object'
  );
}
const hasMaker = (value: unknown) => {
  const { makerId } = value as { makerId?: unknown };
  return typeof makerId === 'string' && MAKER_ID.test(makerId);
};

/** What a stored entry of each kind must hold; anything else is dropped. */
const VALID: { [K in Kind]: (value: unknown) => value is Followed<K> } = {
  models: (value): value is FollowedModel =>
    isEntry(value) &&
    hasMaker(value) &&
    isFigure(value.seen.price) &&
    isFigure(value.seen.index) &&
    isCount(value.seen.hosts),
  makers: (value): value is FollowedMaker =>
    isEntry(value) &&
    hasMaker(value) &&
    isCount(value.seen.models) &&
    isFigure(value.seen.index) &&
    isCount(value.seen.leads) &&
    Array.isArray(value.seen.lineup) &&
    value.seen.lineup.length <= 5000 &&
    value.seen.lineup.every((slug) => typeof slug === 'string' && SLUG.test(slug)),
  tests: (value): value is FollowedTest =>
    isEntry(value) &&
    isName(value.seen.leader) &&
    isName(value.seen.leaderName) &&
    isFigure(value.seen.score) &&
    isCount(value.seen.models),
};

/** Each entry once, valid, and no more than the limit. */
function listOf<K extends Kind>(kind: K, value: unknown): Followed<K>[] {
  if (!Array.isArray(value)) return [];
  const slugs = new Set<string>();
  return value
    .filter((entry): entry is Followed<K> => {
      if (!VALID[kind](entry) || slugs.has(entry.slug)) return false;
      slugs.add(entry.slug);
      return true;
    })
    .slice(0, MAX_FOLLOWED);
}

export function readFollowing(): FollowList {
  if (typeof window === 'undefined') return empty();
  if (unavailable) return memory;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<FollowList> | null;
    return {
      models: listOf('models', parsed?.models),
      makers: listOf('makers', parsed?.makers),
      tests: listOf('tests', parsed?.tests),
    };
  } catch {
    return empty();
  }
}

function save(list: FollowList) {
  memory = list;
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, ...list }));
  } catch {
    unavailable = true;
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Forgets everything followed, as the privacy page offers. */
export function clearFollowing() {
  memory = empty();
  removeLocal(KEY);
  window.dispatchEvent(new Event(EVENT));
}

const same = (a: number | null, b: number | null) =>
  a === b || (a !== null && b !== null && Math.abs(a - b) < 1e-9);

/** What moved between the figures a model had and the ones it has now. */
export function figureChanges(seen: Figures, now: Figures): FigureChange[] {
  const changes: FigureChange[] = [];
  if (!same(seen.price, now.price))
    changes.push({ kind: 'price', from: seen.price, to: now.price });
  if (!same(seen.index, now.index))
    changes.push({ kind: 'index', from: seen.index, to: now.index });
  if (seen.hosts !== now.hosts) changes.push({ kind: 'hosts', from: seen.hosts, to: now.hosts });
  return changes;
}

/** What moved between a maker's figures then and now; its new models are listed apart. */
export function makerChanges(seen: MakerFigures, now: MakerFigures): MakerChange[] {
  const changes: MakerChange[] = [];
  if (seen.models !== now.models)
    changes.push({ kind: 'models', from: seen.models, to: now.models });
  if (!same(seen.index, now.index))
    changes.push({ kind: 'index', from: seen.index, to: now.index });
  if (seen.leads !== now.leads) changes.push({ kind: 'leads', from: seen.leads, to: now.leads });
  return changes;
}

/** Models in a maker's lineup now that were not in it when the visitor last looked. */
export function newModels(seen: MakerFigures, now: MakerFigures) {
  const before = new Set(seen.lineup);
  return now.lineup.filter((slug) => !before.has(slug));
}

/** What moved on a test: its top model (by page, or name), its top score and how many it covers. */
export function testChanges(seen: TestFigures, now: TestFigures): TestChange[] {
  const changes: TestChange[] = [];
  if (seen.leader !== now.leader)
    changes.push({ kind: 'leader', from: seen.leaderName, to: now.leaderName });
  if (!same(seen.score, now.score))
    changes.push({ kind: 'score', from: seen.score, to: now.score });
  if (seen.models !== now.models)
    changes.push({ kind: 'models', from: seen.models, to: now.models });
  return changes;
}

/** News from "What changed" after the day an entry's figures were taken. */
export function newsSince(
  events: ChangeEvent[],
  since: string,
  about: (event: ChangeEvent) => boolean,
) {
  return events.filter((event) => event.day > since && about(event));
}

type Seen = { [K in Kind]: Record<string, Followed<K>['seen']> };

export function useFollowing() {
  const [list, setList] = useState<FollowList>(() => readFollowing());
  useEffect(() => {
    const sync = () => setList(readFollowing());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const change = (edit: (current: FollowList) => FollowList) => save(edit(readFollowing()));
  return {
    ...list,
    total: list.models.length + list.makers.length + list.tests.length,
    isFollowing: (kind: Kind, slug: string) =>
      list[kind].some((entry: Followed<Kind>) => entry.slug === slug),
    follow: <K extends Kind>(kind: K, entry: Followed<K>) =>
      change(
        (current) =>
          ({
            ...current,
            [kind]: [
              entry,
              ...current[kind].filter((item: Followed<Kind>) => item.slug !== entry.slug),
            ].slice(0, MAX_FOLLOWED),
          }) as FollowList,
      ),
    unfollow: (kind: Kind, slug: string) =>
      change(
        (current) =>
          ({
            ...current,
            [kind]: current[kind].filter((item: Followed<Kind>) => item.slug !== slug),
          }) as FollowList,
      ),
    /** Takes the figures as they are now, so the changes until today read as seen. */
    markSeen: (now: Partial<Seen>) => {
      const day = today();
      const refresh = <T extends Entry<unknown>>(
        entries: T[],
        figures?: Record<string, T['seen']>,
      ) =>
        entries.map((entry) =>
          figures && Object.hasOwn(figures, entry.slug)
            ? { ...entry, since: day, seen: figures[entry.slug] }
            : entry,
        );
      change((current) => ({
        models: refresh(current.models, now.models),
        makers: refresh(current.makers, now.makers),
        tests: refresh(current.tests, now.tests),
      }));
    },
  };
}
