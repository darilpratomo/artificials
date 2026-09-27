import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Rss } from 'lucide-react';
import { makerLogo } from '../../shared/makers';
import { weekMetadata } from '../../shared/seo';
import { weekRange, weekSentence } from '../../shared/week-label';
import { applyPageMetadata } from '../components/Metadata';
import { PageHeading } from '../components/Layout';
import { ChangeEntry } from '../components/changes/ChangeEntry';
import { day, indexValue, price, tokens, whole } from '../components/profile/format';
import {
  useWeek,
  useWeeks,
  type WeekDirectory,
  type WeekPage,
  type WeekSummary,
} from '../lib/overview';
import '../domain-colors.css';
import './model-profile.css';
import '../components/home/dashboard.css';
import './data-table.css';
import './weekly.css';

const WEEK = /^\d{4}-\d{2}-\d{2}$/;

/** /weekly is the latest week; /weekly/2026-09-21 is the week starting that Monday. */
export default function Weekly({
  directory,
  week,
}: {
  directory?: WeekDirectory;
  week?: WeekPage;
}) {
  const { week: param } = useParams();
  const [attempt, setAttempt] = useState(0);
  const weeks = useWeeks(attempt, directory);
  const id = param ?? weeks.data?.latest ?? week?.week;
  const listed = id ? weeks.data?.weeks.some((entry) => entry.week === id) : undefined;
  const missing =
    (param !== undefined && !WEEK.test(param)) || (weeks.data !== undefined && listed === false);
  const page = useWeek(id ?? '', !!id && (listed === true || week?.week === id), attempt, week);

  useEffect(() => {
    if (page.data) applyPageMetadata(weekMetadata(page.data));
    else if (missing) applyPageMetadata(weekMetadata(null, param));
  }, [page.data, missing, param]);

  if (missing)
    return (
      <div className="container page weekly-page">
        <div className="dash-state is-tall">
          <h1 className="weekly-missing">There is no recap for this week.</h1>
          <Link className="btn btn-small" to="/weekly">
            See the latest week
          </Link>
        </div>
      </div>
    );
  if (!page.data)
    return (
      <div className="container page weekly-page">
        {page.error || weeks.error ? (
          <div className="dash-state" role="alert">
            <p>{page.error || weeks.error}</p>
            <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          </div>
        ) : (
          <div className="dash-state dash-pending is-tall" role="status">
            Loading the week…
          </div>
        )}
      </div>
    );
  return <Week week={page.data} weeks={weeks.data?.weeks ?? []} />;
}

function Week({ week, weeks }: { week: WeekPage; weeks: WeekSummary[] }) {
  const range = weekRange(week.week, week.end);
  const tiles: [label: string, count: number, note: string][] = [
    ['New releases', week.counts.releases, 'Models from known makers'],
    [
      'New leaders',
      week.counts.leaders,
      week.counts.withinMargin
        ? `${whole(week.counts.withinMargin)} within the published margin`
        : 'A new top score on a test',
    ],
    ['Price changes', week.counts.prices, 'Makers’ own listed prices'],
    ['Joined the index', week.counts.indexed, 'New on the capability index'],
  ];
  return (
    <div className="container page profile-page weekly-page">
      <PageHeading
        eyebrow="WEEKLY RECAP"
        title="The week in AI models."
        text={`${range}${week.complete ? '' : ', so far'}. ${weekSentence(week.counts)}.`}
      />
      <nav className="weekly-steps" aria-label="Other weeks">
        {week.previous ? (
          <Link className="btn btn-small btn-outline" to={`/weekly/${week.previous}`}>
            <ArrowLeft size={15} aria-hidden="true" /> Previous week
          </Link>
        ) : (
          <span />
        )}
        {week.next && (
          <Link className="btn btn-small btn-outline" to={`/weekly/${week.next}`}>
            Next week <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </nav>

      <section className="weekly-glance" aria-label={`${range} in numbers`}>
        {tiles.map(([label, count, note]) => (
          <div key={label} className="glance-tile">
            <span>{label}</span>
            <strong>{whole(count)}</strong>
            <small>{note}</small>
          </div>
        ))}
      </section>

      {week.highlights.length > 0 && (
        <section className="profile-card" aria-labelledby="highlights-heading">
          <div className="profile-card-head">
            <h2 id="highlights-heading">Highlights</h2>
            <p>Counted from this week’s releases, new leaders and price changes.</p>
          </div>
          <ul className="weekly-highlights">
            {week.highlights.map((highlight) => (
              <li key={highlight.kind}>
                <img
                  src={makerLogo(highlight.makerId)}
                  alt=""
                  width="36"
                  height="36"
                  loading="lazy"
                />
                <span>
                  <small>{highlight.label}</small>
                  <b>
                    {highlight.slug ? (
                      <Link to={`/models/${highlight.slug}`}>{highlight.text}</Link>
                    ) : (
                      highlight.text
                    )}
                  </b>
                  <small>{highlight.detail}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="profile-card" aria-labelledby="releases-heading">
        <div className="profile-card-head">
          <h2 id="releases-heading">New releases</h2>
          <p>
            Models from known makers that the maker sells, several hosts list or a test covers,
            highest on the capability index first, then the most widely offered.
          </p>
        </div>
        {week.releases.length ? (
          <table className="data-table weekly-releases">
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Released</th>
                <th scope="col">Capability index</th>
                <th scope="col">Price</th>
                <th scope="col">Context</th>
              </tr>
            </thead>
            <tbody>
              {week.releases.map((release) => (
                <tr key={release.slug}>
                  <th scope="row">
                    <span className="weekly-model">
                      <img
                        src={makerLogo(release.makerId)}
                        alt=""
                        width="28"
                        height="28"
                        loading="lazy"
                      />
                      <span>
                        <Link to={`/models/${release.slug}`}>{release.name}</Link>
                        <small>{release.maker}</small>
                      </span>
                    </span>
                  </th>
                  <td data-label="Released">{day(release.date)}</td>
                  <td data-label="Capability index">
                    {release.index !== undefined ? (
                      indexValue(release.index)
                    ) : (
                      <None text="Not on the index yet" />
                    )}
                  </td>
                  <td data-label="Price">
                    {release.price !== undefined ? (
                      price(release.price)
                    ) : (
                      <None text="No paid listing" />
                    )}
                  </td>
                  <td data-label="Context">
                    {release.contextWindow ? (
                      tokens(release.contextWindow)
                    ) : (
                      <None text="Not reported" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="weekly-empty">No notable releases this week.</p>
        )}
      </section>

      {(
        [
          ['leaders', 'New leaders', week.leaders, 'No test had a new leader this week.'],
          ['prices', 'Price changes', week.prices, 'No maker changed a listed price this week.'],
          [
            'indexed',
            'Joined the capability index',
            week.indexed,
            'No model joined the index this week.',
          ],
        ] as const
      ).map(([key, title, events, empty]) => (
        <section key={key} className="profile-card" aria-labelledby={`${key}-heading`}>
          <div className="profile-card-head">
            <h2 id={`${key}-heading`}>{title}</h2>
          </div>
          {events.length ? (
            <ul className="timeline-entries weekly-events">
              {events.map((event, index) => (
                <ChangeEntry key={`${event.day}-${event.model.name}-${index}`} event={event} />
              ))}
            </ul>
          ) : (
            <p className="weekly-empty">{empty}</p>
          )}
        </section>
      ))}

      {weeks.length > 1 && (
        <nav className="weekly-archive" aria-labelledby="archive-heading">
          <h2 id="archive-heading">Every week</h2>
          <ul>
            {weeks.map((entry) => (
              <li key={entry.week}>
                <Link
                  to={`/weekly/${entry.week}`}
                  aria-current={entry.week === week.week ? 'page' : undefined}
                >
                  {weekRange(entry.week, entry.end)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p className="data-footnote">
        Releases, prices and context windows from{' '}
        <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
          models.dev
        </a>{' '}
        (MIT)
        {week.sources.map((source) => (
          <span key={source.id}>
            ;{' '}
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.name}
            </a>{' '}
            (
            <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
              {source.license}
            </a>
            )
          </span>
        ))}
        . A week runs Monday to Sunday, UTC. Changes count from when the site began keeping this
        record, as on <Link to="/changes">What changed</Link>.{' '}
        <a href="/weekly.xml">
          <Rss size={13} aria-hidden="true" /> RSS feed
        </a>
      </p>
    </div>
  );
}

/** A missing value: a dash to the eye, words to a screen reader. */
function None({ text }: { text: string }) {
  return (
    <>
      <span className="weekly-none" aria-hidden="true">
        —
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
