import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import { makerLogo } from '../../shared/makers';
import { PageHeading } from '../components/Layout';
import { Select } from '../components/Select';
import { ShareButton } from '../components/charts/ShareButton';
import { day, price, tokens } from '../components/profile/format';
import { useTimeline, type TimelineEntry } from '../lib/overview';
import '../components/home/dashboard.css';
import './releases.css';

type Filter = 'open' | 'reasoning' | 'tested' | 'images' | 'tools';
const FILTERS: [Filter, string, (entry: TimelineEntry) => boolean][] = [
  ['tested', 'Tested', (entry) => entry.tested],
  ['open', 'Open weights', (entry) => entry.openWeights],
  ['reasoning', 'Reasoning', (entry) => entry.reasoning],
  ['tools', 'Tool use', (entry) => entry.toolCall === true],
  ['images', 'Makes images', (entry) => entry.output.includes('image')],
];
const PAGE = 60;

const monthName = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
const shortMonth = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });

/** Scientific notation that reads well: 6.6 × 10²⁵ FLOP. */
function flop(value: number) {
  const [mantissa, exponent] = value.toExponential(1).split('e');
  const superscript = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const power = String(Number(exponent))
    .split('')
    .map((digit) => (digit === '-' ? '⁻' : superscript[Number(digit)]))
    .join('');
  return `${mantissa} × 10${power} FLOP`;
}

function modalities(entry: TimelineEntry) {
  const list: string[] = [];
  const reads = entry.input.filter((kind) => kind !== 'text');
  if (reads.length) list.push(`Reads ${reads.join(', ')}`);
  const makes = entry.output.filter((kind) => kind !== 'text');
  if (makes.length) list.push(`Makes ${makes.join(', ')}`);
  return list;
}

function Entry({ entry }: { entry: TimelineEntry }) {
  const chips = [
    entry.index !== undefined ? `Index ${entry.index.toFixed(1)}` : entry.tested ? 'Tested' : '',
    entry.contextWindow ? `${tokens(entry.contextWindow)} context` : '',
    entry.maxOutput ? `${tokens(entry.maxOutput)} max output` : '',
    entry.openWeights ? 'Open weights' : '',
    entry.reasoning ? 'Reasoning' : '',
    entry.toolCall ? 'Tool use' : '',
    entry.structuredOutput ? 'JSON output' : '',
    ...modalities(entry),
  ].filter(Boolean);
  return (
    <li className="release-entry">
      <img src={makerLogo(entry.makerId)} alt="" width="44" height="44" loading="lazy" />
      <div className="release-main">
        <div className="release-title">
          <Link to={`/models/${entry.slug}`}>{entry.name}</Link>
          <span>{entry.maker || 'Maker not reported'}</span>
        </div>
        <ul className="release-chips" aria-label="Key facts">
          {chips.map((chip) => (
            <li key={chip}>{chip}</li>
          ))}
        </ul>
        {entry.record && (entry.record.organization || entry.record.trainingCompute) && (
          <p className="release-record">
            {entry.record.organization && (
              <span>
                Developer: {entry.record.organization}
                {entry.record.country ? `, ${entry.record.country}` : ''}
              </span>
            )}
            {entry.record.access && <span>Access: {entry.record.access}</span>}
            {entry.record.trainingCompute && (
              <span>Estimated training compute: {flop(entry.record.trainingCompute)}</span>
            )}
          </p>
        )}
      </div>
      <dl className="release-facts">
        <div>
          <dt>Price per 1M tokens</dt>
          <dd>
            {entry.inputPrice !== undefined
              ? `${price(entry.inputPrice)} in, ${price(entry.outputPrice!)} out`
              : 'Not listed'}
          </dd>
        </div>
        <div>
          <dt>Knowledge</dt>
          <dd>{entry.knowledge ? `Up to ${day(entry.knowledge)}` : 'Not reported'}</dd>
        </div>
        <div>
          <dt>Available from</dt>
          <dd>
            {entry.hosts} {entry.hosts === 1 ? 'host' : 'hosts'}
          </dd>
        </div>
      </dl>
    </li>
  );
}

/**
 * Every dated AI model release, newest first, grouped by month and day. Data
 * comes from the catalog and refreshes with it; nothing is entered by hand.
 */
export default function Releases() {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useTimeline(attempt);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'known' | 'all'>('known');
  const [maker, setMaker] = useState('all');
  const [month, setMonth] = useState('all');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [query, scope, maker, month, filters]);

  const scoped = useMemo(
    () => (data?.entries ?? []).filter((entry) => scope === 'all' || entry.notable),
    [data, scope],
  );
  const makers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of scoped)
      if (entry.maker) counts.set(entry.maker, (counts.get(entry.maker) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [scoped]);
  const months = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of scoped) {
      const key = entry.date.slice(0, 7);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[0].localeCompare(a[0]));
  }, [scoped]);
  const recent = months.slice(0, 18).reverse();
  const busiest = Math.max(1, ...recent.map(([, count]) => count));

  const entries = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return scoped.filter(
      (entry) =>
        (maker === 'all' || entry.maker === maker) &&
        (month === 'all' || entry.date.startsWith(month)) &&
        filters.every((id) => FILTERS.find(([key]) => key === id)![2](entry)) &&
        words.every((word) =>
          `${entry.name} ${entry.maker} ${entry.slug}`.toLowerCase().includes(word),
        ),
    );
  }, [scoped, query, maker, month, filters]);

  // Headline counts are measured from the newest listing, so they read the
  // same whatever day the page is opened.
  const newest = data?.entries[0]?.date;
  const within = (days: number) =>
    newest
      ? scoped.filter((entry) => Date.parse(newest) - Date.parse(entry.date) < days * 86_400_000)
          .length
      : 0;
  const lastMonth = newest
    ? scoped.filter((entry) => Date.parse(newest) - Date.parse(entry.date) < 30 * 86_400_000)
    : [];
  const topMaker = [
    ...lastMonth
      .reduce(
        (counts, entry) =>
          entry.maker ? counts.set(entry.maker, (counts.get(entry.maker) ?? 0) + 1) : counts,
        new Map<string, number>(),
      )
      .entries(),
  ].sort((a, b) => b[1] - a[1])[0];

  const visible = entries.slice(0, shown);
  const grouped: [string, [string, TimelineEntry[]][]][] = [];
  for (const entry of visible) {
    const monthKey = entry.date.slice(0, 7);
    let group = grouped.at(-1);
    if (!group || group[0] !== monthKey) {
      group = [monthKey, []];
      grouped.push(group);
    }
    const days = group[1];
    const last = days.at(-1);
    if (last && last[0] === entry.date) last[1].push(entry);
    else days.push([entry.date, [entry]]);
  }
  const monthTotals = new Map<string, number>();
  for (const entry of entries)
    monthTotals.set(entry.date.slice(0, 7), (monthTotals.get(entry.date.slice(0, 7)) ?? 0) + 1);

  return (
    <div className="container page releases-page">
      <PageHeading
        eyebrow="RELEASE TIMELINE"
        title="Every AI model release."
        text="New models appear here as soon as the catalog lists them, newest first. Open any model for its scores, prices and providers."
      />
      {error && !data ? (
        <div className="dash-state" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="dash-state dash-pending is-tall" role="status">
          Loading the release timeline…
        </div>
      ) : (
        <>
          <section className="release-stats" aria-label="Release activity">
            <div>
              <span>Last 7 days</span>
              <strong>{within(7).toLocaleString('en-US')}</strong>
              <small>releases</small>
            </div>
            <div>
              <span>Last 30 days</span>
              <strong>{within(30).toLocaleString('en-US')}</strong>
              <small>releases</small>
            </div>
            <div>
              <span>Most active maker</span>
              <strong className="release-stat-name">{topMaker ? topMaker[0] : '—'}</strong>
              <small>
                {topMaker ? `${topMaker[1]} releases in 30 days` : 'No recent releases'}
              </small>
            </div>
            <div>
              <span>On the timeline</span>
              <strong>{scoped.length.toLocaleString('en-US')}</strong>
              <small>{scope === 'known' ? 'from known makers' : 'listings in total'}</small>
            </div>
          </section>

          <section className="dash-panel release-chart" aria-labelledby="per-month">
            <div className="dash-panel-head">
              <div>
                <h2 id="per-month">Releases per month</h2>
                <p>The last 18 months. Select a month to see only its releases.</p>
              </div>
              <ShareButton
                title="AI model releases per month"
                render={(tools) =>
                  tools.listImage(
                    {
                      title: 'AI model releases per month',
                      subtitle:
                        scope === 'known'
                          ? 'Models from known makers, by release month.'
                          : 'Every dated listing, by release month.',
                      source: 'models.dev (MIT)',
                    },
                    [...recent]
                      .reverse()
                      .slice(0, 16)
                      .map(([key, count]) => ({
                        label: monthName(key),
                        value: count.toLocaleString('en-US'),
                        fraction: count / busiest,
                      })),
                  )
                }
              />
            </div>
            <ol className="month-bars" style={{ '--months': recent.length } as CSSProperties}>
              {recent.map(([key, count]) => (
                <li key={key}>
                  <button
                    type="button"
                    aria-pressed={month === key}
                    aria-label={`${monthName(key)}: ${count} releases`}
                    onClick={() => setMonth((value) => (value === key ? 'all' : key))}
                    style={{ '--v': `${Math.max(3, (count / busiest) * 100)}%` } as CSSProperties}
                  >
                    <span className="month-bar">
                      <b>{count}</b>
                      <i aria-hidden="true" />
                    </span>
                    <span className="month-label">{shortMonth(key)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <div className="explorer-controls release-controls">
            <label className="explorer-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search releases"
                placeholder="Search models or makers"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <Select value={maker} onValueChange={setMaker} aria-label="Filter by maker">
              <option value="all">All makers</option>
              {makers.map(([name, count]) => (
                <option key={name} value={name}>
                  {`${name} (${count})`}
                </option>
              ))}
            </Select>
            <Select value={month} onValueChange={setMonth} aria-label="Filter by month">
              <option value="all">All months</option>
              {months.map(([key, count]) => (
                <option key={key} value={key}>
                  {`${monthName(key)} (${count})`}
                </option>
              ))}
            </Select>
          </div>
          <div className="explorer-bar">
            <div className="explorer-filters" role="group" aria-label="Show only">
              <button
                type="button"
                aria-pressed={scope === 'all'}
                onClick={() => setScope((value) => (value === 'all' ? 'known' : 'all'))}
              >
                Include every listing
              </button>
              {FILTERS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filters.includes(id)}
                  onClick={() =>
                    setFilters((value) =>
                      value.includes(id) ? value.filter((key) => key !== id) : [...value, id],
                    )
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="explorer-count" role="status">
              {entries.length.toLocaleString('en-US')}{' '}
              {entries.length === 1 ? 'release' : 'releases'}
            </p>
          </div>

          {grouped.length ? (
            <div className="release-months">
              {grouped.map(([monthKey, days]) => (
                <section key={monthKey} className="release-month" aria-label={monthName(monthKey)}>
                  <h2>
                    {monthName(monthKey)}
                    <span>
                      {monthTotals.get(monthKey)}{' '}
                      {monthTotals.get(monthKey) === 1 ? 'release' : 'releases'}
                    </span>
                  </h2>
                  <ol className="timeline-days">
                    {days.map(([date, list]) => (
                      <li key={date} className="timeline-day">
                        <h3 className="timeline-date">
                          <time dateTime={date}>{day(date)}</time>
                          <span>
                            {list.length} {list.length === 1 ? 'release' : 'releases'}
                          </span>
                        </h3>
                        <ul className="release-list">
                          {list.map((entry) => (
                            <Entry key={entry.slug} entry={entry} />
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ) : (
            <p className="explorer-empty">
              No release matches. Try a shorter search, another month or fewer filters.
            </p>
          )}
          {entries.length > shown && (
            <button
              type="button"
              className="dash-more"
              onClick={() => setShown((value) => value + PAGE)}
            >
              Show {Math.min(PAGE, entries.length - shown)} more releases
              <ChevronDown size={17} aria-hidden="true" />
            </button>
          )}
          <p className="explorer-note">
            Release dates, prices and capabilities are as listed in the models.dev catalog; the
            maker&apos;s own date is used when the maker sells the model. Developer, access and
            training compute come from Epoch AI&apos;s model records where one exists. Compute is
            Epoch AI&apos;s estimate.
          </p>
        </>
      )}
    </div>
  );
}
