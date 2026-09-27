import type { ChangeEvent } from './changes.ts';
import { price, score } from './format.ts';

/**
 * RSS feeds of changes: the site's "What changed" feed, and each model's,
 * maker's and test's own. Items read the way the pages write them, newest first.
 */

const SITE = 'https://artificials.net';

export const xml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!,
  );

/** A change as one line, in the pages' words. */
export function changeTitle(event: ChangeEvent) {
  const { name, maker } = event.model;
  switch (event.kind) {
    case 'release':
      return `${name} was released${maker ? ` by ${maker}` : ''}`;
    case 'leader':
      return `${name} took the top spot on ${event.label} at ${score(event.score, event.unit)}, from ${event.previous.name}${event.withinMargin ? ', within the published margin' : ''}`;
    case 'index':
      return `${name} joined the capability index at ${score(event.score, 'index')}`;
    case 'price':
      return `${maker ? `${maker}’s` : 'The'} listed price for ${name} went from ${price(event.from[0])} in and ${price(event.from[1])} out to ${price(event.to[0])} in and ${price(event.to[1])} out per 1M tokens`;
  }
}

export interface FeedChannel {
  title: string;
  /** The page the feed follows. */
  path: string;
  /** The feed's own address. */
  feed: string;
  description: string;
}

export const SITE_CHANNEL: FeedChannel = {
  title: 'What changed in AI models — Artificials',
  path: '/changes',
  feed: '/changes.xml',
  description:
    'New AI model releases, listed price changes, new leaders on each benchmark and models joining the capability index.',
};

export const WEEKLY_CHANNEL: FeedChannel = {
  title: 'The week in AI models — Artificials',
  path: '/weekly',
  feed: '/weekly.xml',
  description:
    'Each week’s new AI model releases, new leaders on benchmark tests and listed price changes.',
};

/** One model's feed: its own changes, and the top spots other models took from it. */
export function modelChannel(slug: string, name: string): FeedChannel {
  return {
    title: `${name}: what changed — Artificials`,
    path: `/models/${slug}`,
    feed: `/models/${slug}/changes.xml`,
    description: `What changed for ${name}: its release, changes to its listed price, the top spots it took or lost on tests and its entry on the capability index.`,
  };
}

/** A maker's feed: its models' changes, and the top spots other makers took from them. */
export function makerChannel(slug: string, name: string): FeedChannel {
  return {
    title: `${name}: what changed — Artificials`,
    path: `/makers/${slug}`,
    feed: `/makers/${slug}/changes.xml`,
    description: `What changed for ${name}’s models: new releases, changes to listed prices, top spots taken or lost on tests and entries on the capability index.`,
  };
}

/** A test's feed: its new leaders, and on the capability index its new entries too. */
export function testChannel(id: string, label: string): FeedChannel {
  return {
    title: `${label}: what changed — Artificials`,
    path: `/tests/${id}`,
    feed: `/tests/${id}/changes.xml`,
    description:
      id === 'capability-index'
        ? 'Each new leader on the capability index, and each model that joins it.'
        : `Each new leader on ${label}.`,
  };
}

/**
 * Up to a hundred changes, one item each, newest first. An item links to its
 * model's page, or to the feed's own page for a model without one.
 */
export function changesFeed(events: ChangeEvent[], channel: FeedChannel) {
  const items = events.slice(0, 100).map((event) => {
    const { name, slug } = event.model;
    const link = SITE + (slug ? `/models/${slug}` : channel.path);
    const guid = `${event.kind}:${event.day}:${slug ?? name}${event.kind === 'leader' ? `:${event.test}` : ''}`;
    return `<item><title>${xml(changeTitle(event))}</title><link>${xml(link)}</link><guid isPermaLink="false">${xml(guid)}</guid><pubDate>${new Date(`${event.day}T00:00:00Z`).toUTCString()}</pubDate></item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(channel.title)}</title><link>${xml(SITE + channel.path)}</link><atom:link href="${xml(SITE + channel.feed)}" rel="self" type="application/rss+xml"/><description>${xml(channel.description)}</description><language>en</language>${items.join('')}</channel></rss>\n`;
}
