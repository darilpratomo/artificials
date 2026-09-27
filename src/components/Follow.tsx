import { Link, NavLink } from 'react-router-dom';
import { Star } from 'lucide-react';
import { MAX_FOLLOWED, today, useFollowing, type Figures } from '../lib/following';

/**
 * Follows a model from its page, starting from the figures the visitor sees
 * there: the same ones the list of every model gives, which the "Following"
 * page compares with later.
 */
export function FollowButton({
  slug,
  name,
  makerId,
  figures,
}: {
  slug: string;
  name: string;
  makerId: string;
  figures: Figures;
}) {
  const { models, isFollowing, follow, unfollow } = useFollowing();
  const following = isFollowing(slug);
  const full = !following && models.length >= MAX_FOLLOWED;
  return (
    <>
      <button
        type="button"
        className={`btn btn-small follow-button ${following ? '' : 'btn-outline'}`}
        aria-pressed={following}
        disabled={full}
        onClick={() =>
          following
            ? unfollow(slug)
            : follow({ slug, name, makerId, since: today(), seen: figures })
        }
      >
        <Star size={15} aria-hidden="true" fill={following ? 'currentColor' : 'none'} />
        {following ? 'Following' : full ? 'Follow list is full' : 'Follow'}
      </button>
      {full && (
        <Link to="/following" className="text-link">
          Manage followed models
        </Link>
      )}
    </>
  );
}

/**
 * The header's way to the models a visitor follows. It is always there, so the
 * header keeps its place; the number appears once they follow one.
 */
export function FollowingLink({ onClick }: { onClick?: () => void }) {
  const { models } = useFollowing();
  const count = models.length;
  return (
    <NavLink
      to="/following"
      className="following-link"
      aria-label={count ? `Models you follow: ${count}` : 'Models you follow'}
      title="Models you follow"
      onClick={onClick}
    >
      <Star size={16} aria-hidden="true" />
      {count > 0 && (
        <span className="following-count" aria-hidden="true">
          {count}
        </span>
      )}
    </NavLink>
  );
}
