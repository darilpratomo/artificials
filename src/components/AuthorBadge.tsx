import { BadgeCheck } from 'lucide-react';

/** An in-site badge identifying the official Artificials editorial team. */
export function AuthorBadge() {
  return (
    <span className="author-badge">
      Artificials
      <BadgeCheck
        className="author-verified"
        size={17}
        aria-label="Official Artificials author"
        role="img"
      />
    </span>
  );
}
