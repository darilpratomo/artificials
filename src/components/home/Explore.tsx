import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Clapperboard,
  Compass,
  ImageIcon,
  ListOrdered,
  SquareTerminal,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { makerLogo } from '../../../shared/makers';
import type { Explore as ExploreData, ExploreCard, ExploreResult } from '../../../shared/explore';
import { indexValue, price } from '../profile/format';

/** The pages the home page has no section for, three to a row on wide screens. */
const CARDS: { id: ExploreCard; to: string; title: string; text: string; icon: LucideIcon }[] = [
  {
    id: 'rankings',
    to: '/leaderboard',
    title: 'Model rankings',
    text: 'Every model on every published test, ranked one test at a time.',
    icon: ListOrdered,
  },
  {
    id: 'coding',
    to: '/coding-agents',
    title: 'Coding agents',
    text: 'Coding agents and the models inside them, on real programming work.',
    icon: SquareTerminal,
  },
  {
    id: 'finder',
    to: '/model-finder',
    title: 'Model finder',
    text: 'Pick a task, a budget and what the model must do, and get the best match.',
    icon: Compass,
  },
  {
    id: 'images',
    to: '/image-models',
    title: 'Image models',
    text: 'Making and editing images, ranked by the votes of people comparing them.',
    icon: ImageIcon,
  },
  {
    id: 'videos',
    to: '/video-models',
    title: 'Video models',
    text: 'Text to video, image to video and video editing, ranked by votes.',
    icon: Clapperboard,
  },
  {
    id: 'trends',
    to: '/trends',
    title: 'AI trends',
    text: 'How fast capability rises and prices fall, and who is catching up.',
    icon: TrendingUp,
  },
];

function value(result: ExploreResult) {
  if (result.unit === 'usd') return price(result.value);
  if (result.unit === 'percent') return `${result.value.toFixed(1)}%`;
  return indexValue(result.value);
}

/** A card for each deeper page, leading with that page's current result. */
export function Explore({ explore }: { explore?: ExploreData }) {
  const tests = explore?.credits.filter((credit) => !credit.prices) ?? [];
  const prices = explore?.credits.find((credit) => credit.prices);
  return (
    <>
      <ul className="explore-grid">
        {CARDS.map(({ id, to, title, text, icon: Icon }) => {
          const result = explore?.results[id];
          return (
            <li key={id} className="explore-card">
              <div className="explore-head">
                <span className="explore-icon">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <h3>
                  <Link to={to} className="explore-link">
                    {title}
                  </Link>
                </h3>
                <ArrowUpRight className="explore-go" size={17} aria-hidden="true" />
              </div>
              <p className="explore-text">{text}</p>
              {result ? (
                <>
                  <div className="explore-model">
                    <img
                      src={makerLogo(result.makerId)}
                      alt=""
                      width="32"
                      height="32"
                      loading="lazy"
                    />
                    <span>
                      <strong>{result.name}</strong>
                      <small>{result.by || 'Maker not reported'}</small>
                    </span>
                    <b>{value(result)}</b>
                  </div>
                  <p className="explore-detail">{`${result.detail}.`}</p>
                </>
              ) : (
                <p className="explore-detail is-empty">The page has the latest results.</p>
              )}
            </li>
          );
        })}
      </ul>
      {tests.length > 0 && (
        <p className="explore-credits">
          Results from{' '}
          {tests.map((credit, index) => (
            <span key={credit.name}>
              {index ? (index === tests.length - 1 ? ' and ' : ', ') : ''}
              <a href={credit.url} target="_blank" rel="noopener noreferrer">
                {credit.name}
              </a>{' '}
              ({credit.via ? `${credit.license}, compiled by ${credit.via}` : credit.license})
            </span>
          ))}
          {prices && (
            <>
              ; prices from{' '}
              <a href={prices.url} target="_blank" rel="noopener noreferrer">
                {prices.name}
              </a>{' '}
              ({prices.license})
            </>
          )}
          .
        </p>
      )}
    </>
  );
}
