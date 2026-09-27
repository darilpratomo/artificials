import { useEffect, useState } from 'react';
import type { ChangeEvent, ExplorerRow } from './overview';
import { removeLocal } from './storage';

/**
 * Models a visitor follows, kept in this browser only: no account, nothing
 * sent anywhere. Each keeps the figures it had when followed or last marked
 * seen, so the "Following" page can show what changed since.
 */

/** A model's figures, as the list of every model gives them. */
export interface Figures {
  /** Reference price per 1M tokens, blended three input tokens to one output. */
  price: number | null;
  index: number | null;
  hosts: number;
}

export interface Followed {
  slug: string;
  name: string;
  makerId: string;
  /** The day the figures in `seen` were taken. */
  since: string;
  seen: Figures;
}

export type FigureChange =
  | { kind: 'price'; from: number | null; to: number | null }
  | { kind: 'index'; from: number | null; to: number | null }
  | { kind: 'hosts'; from: number; to: number };

const KEY = 'artificials-following-v1';
const EVENT = 'artificials-following-change';
/** Enough to watch a shortlist, few enough to stay a shortlist. */
export const MAX_FOLLOWED = 50;
let memory: Followed[] = [];
let unavailable = false;

export const today = () => new Date().toISOString().slice(0, 10);

export const figuresOf = (row: ExplorerRow): Figures => ({
  price: row[6],
  index: row[8],
  hosts: row[7],
});

const figure = (value: unknown) => value === null || typeof value === 'number';

function valid(entry: unknown): entry is Followed {
  const value = entry as Followed;
  return (
    !!value &&
    typeof value.slug === 'string' &&
    /^[a-z0-9][a-z0-9-]{0,99}$/.test(value.slug) &&
    typeof value.name === 'string' &&
    typeof value.makerId === 'string' &&
    /^[a-z0-9-]{0,100}$/.test(value.makerId) &&
    typeof value.since === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.since) &&
    !!value.seen &&
    figure(value.seen.price) &&
    figure(value.seen.index) &&
    typeof value.seen.hosts === 'number'
  );
}

export function readFollowing(): Followed[] {
  if (typeof window === 'undefined') return [];
  if (unavailable) return memory;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}') as { models?: unknown[] };
    return Array.isArray(parsed.models) ? parsed.models.filter(valid).slice(0, MAX_FOLLOWED) : [];
  } catch {
    return [];
  }
}

function save(models: Followed[]) {
  memory = models;
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, models }));
  } catch {
    unavailable = true;
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Forgets every followed model, as the privacy page offers. */
export function clearFollowing() {
  memory = [];
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

/**
 * Changes from "What changed" that concern a model after the day its figures
 * were taken: its own, and a new leader taking the top spot from it.
 */
export function eventsSince(events: ChangeEvent[], slug: string, since: string) {
  return events.filter(
    (event) =>
      event.day > since &&
      (event.model.slug === slug || (event.kind === 'leader' && event.previous.slug === slug)),
  );
}

export function useFollowing() {
  const [models, setModels] = useState<Followed[]>(() => readFollowing());
  useEffect(() => {
    const sync = () => setModels(readFollowing());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return {
    models,
    isFollowing: (slug: string) => models.some((model) => model.slug === slug),
    follow: (entry: Followed) =>
      save(
        [entry, ...readFollowing().filter((model) => model.slug !== entry.slug)].slice(
          0,
          MAX_FOLLOWED,
        ),
      ),
    unfollow: (slug: string) => save(readFollowing().filter((model) => model.slug !== slug)),
    /** Takes the figures as they are now, so the model's changes read as seen. */
    markSeen: (figures: Record<string, Figures>) =>
      save(
        readFollowing().map((model) =>
          figures[model.slug] ? { ...model, since: today(), seen: figures[model.slug] } : model,
        ),
      ),
  };
}
