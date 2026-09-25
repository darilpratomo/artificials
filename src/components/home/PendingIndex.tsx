import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { ModelOverview } from '../../lib/overview';

const DAY = 86_400_000;

/**
 * Recent releases that already have published test results but no capability
 * index score yet, so a new model is never simply missing from a ranking.
 */
export function PendingIndex({ overview }: { overview: ModelOverview }) {
  const newest = overview.releases[0]?.date;
  if (!newest) return null;
  const since = Date.parse(newest) - 60 * DAY;
  const pending = overview.releases.filter(
    (release) =>
      release.notable &&
      release.tested &&
      release.index === undefined &&
      Date.parse(release.date) >= since,
  );
  if (!pending.length) return null;
  const shown = pending.slice(0, 6);
  const date = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  return (
    <p className="pending-index">
      <b>Not on the index yet:</b>{' '}
      {shown.map((release, index) => (
        <Fragment key={release.slug}>
          {index ? ', ' : ''}
          <Link to={`/models/${release.slug}`}>{release.name}</Link> ({date(release.date)})
        </Fragment>
      ))}
      {pending.length > shown.length ? ` and ${pending.length - shown.length} more` : ''}. Epoch AI
      adds a model once enough of its tests have run; the results already published are on each
      model’s page.
    </p>
  );
}
