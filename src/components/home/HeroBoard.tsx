import { useState, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { makerColor, makerLogo } from '../../../shared/makers';
import type { Explore } from '../../../shared/explore';
import { day } from '../profile/format';
import type { ModelOverview } from '../../lib/overview';

const time = (date: string) => Date.parse(`${date}T00:00:00Z`);

/**
 * The record on the capability index over three years, as a step line coloured
 * by the maker that held it. The legend pairs each colour with the maker's
 * logo and name, and pointing at the line names the model behind each step.
 */
function RecordLine({ explore }: { explore: Explore }) {
  const [active, setActive] = useState<number | null>(null);
  const { records } = explore;
  const start = time(explore.since);
  const end = time(explore.until);
  const values = records.map((record) => record.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  // Percentages of the plot, so the line scales with its box; strokes keep their width.
  const x = (date: string) => Math.max(0, ((time(date) - start) / (end - start)) * 100);
  const y = (value: number) => 6 + (1 - (value - low) / (high - low || 1)) * 88;
  const steps = records.map((record, index) => ({
    record,
    from: x(record.date),
    to: index + 1 < records.length ? x(records[index + 1].date) : 100,
    level: y(record.value),
    // Each step rises from the record before it, so the line has no gaps.
    rise: y((records[index - 1] ?? record).value),
  }));
  const area = `M0 100 ${steps
    .map(({ from, to, level }) => `L${from} ${level} L${to} ${level}`)
    .join(' ')} L100 100 Z`;
  const makers = [...new Set(records.map((record) => record.makerId))]
    .map((makerId) => ({
      makerId,
      maker: records.find((record) => record.makerId === makerId)!.maker,
      count: records.filter((record) => record.makerId === makerId).length,
    }))
    .sort((a, b) => b.count - a.count);
  const first = records[0];
  const last = records.at(-1)!;
  const shown = active === null ? undefined : records[active];

  function point(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const at = start + ((event.clientX - box.left) / box.width) * (end - start);
    let index = 0;
    for (const [position, record] of records.entries())
      if (time(record.date) <= at) index = position;
    setActive(index);
  }

  return (
    <figure className="hero-record">
      <figcaption className="hero-record-head">
        {shown ? (
          <>
            <span className="hero-record-model">
              <img src={makerLogo(shown.makerId)} alt="" width="18" height="18" />
              <b>{shown.name}</b> {shown.value.toFixed(1)}
            </span>
            <span>{day(shown.date)}</span>
          </>
        ) : (
          <>
            <span>Top score over three years</span>
            <b>{`+${(last.value - first.value).toFixed(1)} points`}</b>
          </>
        )}
      </figcaption>
      <div
        className="hero-record-plot"
        onPointerMove={point}
        onPointerLeave={() => setActive(null)}
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          <defs>
            <linearGradient id="hero-record-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#e4e6eb" stopOpacity="0.1" />
              <stop offset="1" stopColor="#e4e6eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#hero-record-fill)" />
          {steps.map(({ record, from, to, level, rise }) => (
            <path
              key={record.date + record.name}
              d={`M${from} ${rise} V${level} H${to}`}
              stroke={makerColor(record.makerId)}
            />
          ))}
        </svg>
        {shown && <span className="hero-record-guide" style={{ left: `${x(shown.date)}%` }} />}
        <span
          className="hero-record-dot"
          style={{
            left: `${x((shown ?? last).date)}%`,
            top: `${y((shown ?? last).value)}%`,
            background: makerColor((shown ?? last).makerId),
          }}
        />
      </div>
      <div className="hero-record-axis">
        <span>{day(explore.since.slice(0, 7))}</span>
        <span>{day(explore.until.slice(0, 7))}</span>
      </div>
      <p className="sr-only">
        {`Over three years the highest capability index score rose from ${first.value.toFixed(
          1,
        )}, held by ${first.name}, to ${last.value.toFixed(1)}, set by ${last.name} on ${day(
          last.date,
        )}.`}
      </p>
      <ul className="hero-record-key" aria-label="Who held the record">
        {makers.map(({ makerId, maker }) => (
          <li key={makerId}>
            <i style={{ background: makerColor(makerId) }} aria-hidden="true" />
            <img src={makerLogo(makerId)} alt="" width="16" height="16" />
            {maker}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** The hero's live board: the top five on the capability index and how the record has moved. */
export function HeroBoard({ overview }: { overview?: ModelOverview }) {
  const top = overview ? [...overview.index].sort((a, b) => b.index - a.index).slice(0, 5) : [];
  const source = overview?.sources.find((entry) => entry.id === 'epoch');
  const explore = overview?.explore;
  return (
    <section className="hero-board" aria-labelledby="hero-board-title">
      <div className="hero-board-head">
        <h2 id="hero-board-title">Top of the capability index</h2>
        <Link className="text-link" to="/leaderboard?category=capability-index">
          Full rankings <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {overview ? (
        <ol className="hero-board-list">
          {top.map((point, index) => (
            <li key={point.name}>
              <span className="hero-board-rank">{index + 1}</span>
              <img src={makerLogo(point.makerId)} alt="" width="32" height="32" />
              <span className="hero-board-model">
                {point.slug ? (
                  <Link to={`/models/${point.slug}`}>{point.name}</Link>
                ) : (
                  <strong>{point.name}</strong>
                )}
                <small>{point.maker}</small>
              </span>
              <b>{point.index.toFixed(1)}</b>
            </li>
          ))}
        </ol>
      ) : (
        <div className="hero-board-list is-pending" role="status">
          Loading…
        </div>
      )}
      {explore && explore.records.length > 1 && <RecordLine explore={explore} />}
      {/* On phones the link sits under the board, as a full-width button. */}
      <Link className="hero-board-more" to="/leaderboard?category=capability-index">
        Full rankings <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
      {source && (
        <p className="hero-board-source">
          Epoch Capabilities Index from{' '}
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            {source.name}
          </a>{' '}
          ({source.license})
        </p>
      )}
    </section>
  );
}
