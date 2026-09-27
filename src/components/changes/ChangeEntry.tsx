import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChartColumn, Sparkles, Tag, Trophy, type LucideIcon } from 'lucide-react';
import { makerLogo } from '../../../shared/makers';
import { price, score } from '../profile/format';
import type { ChangeEvent, ChangeModel } from '../../lib/overview';
import './change-entry.css';

/**
 * One change as a sentence, with its maker's logo and kind: the "What changed"
 * page and the weekly recap write them the same way.
 */
export type Kind = ChangeEvent['kind'];
export const KINDS: [kind: Kind, label: string, icon: LucideIcon][] = [
  ['release', 'New release', Sparkles],
  ['leader', 'New leader', Trophy],
  ['index', 'Joined the index', ChartColumn],
  ['price', 'Price change', Tag],
];

/** A model's name, linked to its profile when it has one. */
function Name({ model }: { model: ChangeModel }) {
  return model.slug ? (
    <Link to={`/models/${model.slug}`}>{model.name}</Link>
  ) : (
    <strong>{model.name}</strong>
  );
}

/** Blended three input tokens to one output token, as the site's reference price. */
const blend = ([input, output]: [number, number]) => (input * 3 + output) / 4;

export function sentence(event: ChangeEvent): { text: ReactNode; chip?: string } {
  switch (event.kind) {
    case 'release':
      return {
        text: (
          <>
            <Name model={event.model} /> was released
            {event.model.maker ? ` by ${event.model.maker}` : ''}.
          </>
        ),
      };
    case 'leader':
      return {
        text: (
          <>
            <Name model={event.model} /> took the top spot on{' '}
            <Link to={`/tests/${event.test}`}>{event.label}</Link> at{' '}
            {score(event.score, event.unit)}, from <Name model={event.previous} />.
          </>
        ),
        ...(event.withinMargin ? { chip: 'Within margin' } : {}),
      };
    case 'index':
      return {
        text: (
          <>
            <Name model={event.model} /> joined the{' '}
            <Link to="/tests/capability-index">capability index</Link> at{' '}
            {score(event.score, 'index')}.
          </>
        ),
      };
    case 'price': {
      const change = blend(event.to) / blend(event.from) - 1;
      return {
        text: (
          <>
            {event.model.maker ? `${event.model.maker}’s` : 'The'} listed price for{' '}
            <Name model={event.model} /> went from {price(event.from[0])} in and{' '}
            {price(event.from[1])} out to {price(event.to[0])} in and {price(event.to[1])} out per
            1M tokens.
          </>
        ),
        chip: `${change > 0 ? '+' : '−'}${Math.abs(Math.round(change * 100))}%`,
      };
    }
  }
}

/** A change's row: the maker's logo, its kind, the sentence and a chip such as a price change. */
export function ChangeEntry({ event }: { event: ChangeEvent }) {
  const [, label, Icon] = KINDS.find(([id]) => id === event.kind)!;
  const { text, chip } = sentence(event);
  return (
    <li className="change-entry">
      <img src={makerLogo(event.model.makerId)} alt="" width="36" height="36" loading="lazy" />
      <div>
        <span className={`change-kind is-${event.kind}`}>
          <Icon size={13} aria-hidden="true" />
          {label}
        </span>
        <p>{text}</p>
      </div>
      {chip && <span className="change-chip">{chip}</span>}
    </li>
  );
}
