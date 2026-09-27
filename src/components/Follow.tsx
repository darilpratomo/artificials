import { useSyncExternalStore } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Star } from 'lucide-react';
import { MAX_FOLLOWED, today, useFollowing, type Followed, type Kind } from '../lib/following';

const unchanging = () => () => {};
/** False in a prerendered page's HTML, true from the app's first render on. */
const useLive = () =>
  useSyncExternalStore(
    unchanging,
    () => true,
    () => false,
  );

/**
 * Follows a model, maker or test from its page, starting from the figures the
 * visitor sees there: the same ones the "Following" page compares with later.
 * `compact` is the small toggle in a list, named with what it follows.
 */
export function FollowButton<K extends Kind>({
  kind,
  entry,
  compact = false,
}: {
  kind: K;
  entry: Omit<Followed<K>, 'since'>;
  compact?: boolean;
}) {
  const following = useFollowing();
  // A prerendered page cannot know what this browser follows: the button keeps
  // its room, unseen, until the app shows it in its real state.
  const live = useLive();
  const on = following.isFollowing(kind, entry.slug);
  const full = !on && following[kind].length >= MAX_FOLLOWED;
  const label = on
    ? 'Following'
    : full
      ? compact
        ? 'List full'
        : 'Follow list is full'
      : 'Follow';
  return (
    <>
      <button
        type="button"
        className={`btn btn-small follow-button${on ? '' : ' btn-outline'}${compact ? ' is-compact' : ''}${live ? '' : ' is-pending'}`}
        aria-pressed={on}
        aria-label={compact ? `${label}: ${entry.name}` : undefined}
        disabled={full || !live}
        onClick={() =>
          on
            ? following.unfollow(kind, entry.slug)
            : following.follow(kind, { ...entry, since: today() } as Followed<K>)
        }
      >
        <Star size={compact ? 14 : 15} aria-hidden="true" fill={on ? 'currentColor' : 'none'} />
        {label}
      </button>
      {full && !compact && (
        <Link to="/following" className="text-link">
          Manage what you follow
        </Link>
      )}
    </>
  );
}

/**
 * The header's way to what a visitor follows. It is always there, so the
 * header keeps its place; the number appears once they follow something.
 */
export function FollowingLink({ onClick }: { onClick?: () => void }) {
  const { total } = useFollowing();
  return (
    <NavLink
      to="/following"
      className="following-link"
      aria-label={total ? `Following: ${total}` : 'Following'}
      title="What you follow"
      onClick={onClick}
    >
      <Star size={16} aria-hidden="true" />
      {total > 0 && (
        <span className="following-count" aria-hidden="true">
          {total}
        </span>
      )}
    </NavLink>
  );
}
