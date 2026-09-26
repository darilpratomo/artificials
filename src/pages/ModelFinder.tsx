import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AppWindow,
  ArrowUpRight,
  BookOpen,
  Bot,
  Brain,
  Code2,
  ListChecks,
  MessageSquare,
  Sigma,
  Table2,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { makerLogo } from '../../shared/makers';
import { FLAGS } from '../../shared/model-overview';
import { PageHeading } from '../components/Layout';
import { Select } from '../components/Select';
import { indexValue, price, tokens } from '../components/profile/format';
import { useFinder, type Finder, type FinderRow, type FinderTest } from '../lib/overview';
import '../components/home/dashboard.css';
import './models.css';
import './model-finder.css';

const ICONS: Record<string, LucideIcon> = {
  chat: MessageSquare,
  coding: Code2,
  web: AppWindow,
  agents: Bot,
  math: Sigma,
  reasoning: Brain,
  knowledge: BookOpen,
  data: Table2,
  instructions: ListChecks,
  'all-round': Trophy,
};

const NEEDS: [key: string, label: string, flag: number][] = [
  ['open', 'Open weights', FLAGS.openWeights],
  ['tools', 'Calls tools', FLAGS.toolCall],
  ['images', 'Reads images', FLAGS.imageInput],
  ['reasoning', 'Reasoning mode', FLAGS.reasoning],
];
const BUDGETS: [value: string, label: string][] = [
  ['', 'Any price'],
  ['10', 'Up to $10'],
  ['3', 'Up to $3'],
  ['1', 'Up to $1'],
  ['0.3', 'Up to $0.30'],
];
const CONTEXTS: [value: string, label: string][] = [
  ['', 'Any length'],
  ['128000', '128K tokens or more'],
  ['200000', '200K tokens or more'],
  ['1000000', '1M tokens or more'],
];

const scoreOf = (test: FinderTest, value: number) =>
  test.unit === 'index' ? indexValue(value) : `${value.toFixed(1)}%`;
/** How close counts as "about as good" on a test's own scale. */
const marginOf = (test: FinderTest, best: number) =>
  test.unit === 'percent' ? 5 : best >= 500 ? 25 : 5;
/** "20% cheaper", "3.2 times cheaper". */
const cheaper = (times: number) =>
  times < 1.95
    ? `${Math.round((1 - 1 / times) * 100)}% cheaper`
    : `${Number(times.toFixed(times < 10 ? 1 : 0))} times cheaper`;

interface Pick {
  kind: string;
  title: string;
  reason: string;
  row: FinderRow;
}

function ModelSummary({ finder, test, row }: { finder: Finder; test: FinderTest; row: FinderRow }) {
  const [slug, name, makerId, maker, cost, context, flags] = finder.models[row[0]];
  return (
    <>
      <div className="finder-model">
        <img src={makerLogo(makerId)} alt="" width="36" height="36" loading="lazy" />
        <span>
          <Link to={`/models/${slug}`}>{name}</Link>
          <small>
            {maker || 'Maker not reported'}
            {row[3] ? `, tested as ${row[3]}` : ''}
          </small>
        </span>
      </div>
      <dl className="finder-facts">
        <div>
          <dt>{test.label}</dt>
          <dd>
            {scoreOf(test, row[1])}
            <small>
              #{row[2]} of {test.total}
            </small>
          </dd>
        </div>
        <div>
          <dt>Price per 1M tokens</dt>
          <dd>{cost === null ? 'Not listed' : price(cost)}</dd>
        </div>
        <div>
          <dt>Context</dt>
          <dd>{context ? tokens(context) : 'Not reported'}</dd>
        </div>
      </dl>
      <ul className="finder-tags" aria-label="Features">
        {NEEDS.filter(([, , flag]) => flags & flag).map(([key, label]) => (
          <li key={key}>{label}</li>
        ))}
      </ul>
    </>
  );
}

/** The choices, as the address holds them: task, test, budget, context and needs set to 1. */
type Choices = Record<string, string | undefined>;
const KEYS = ['task', 'test', 'budget', 'context', ...NEEDS.map(([key]) => key)];

function Results({ finder }: { finder: Finder }) {
  const [params, setParams] = useSearchParams();
  // The page answers at once from its own state; the address follows, so a
  // result can be shared or bookmarked.
  const [choices, setChoices] = useState<Choices>(() =>
    Object.fromEntries(KEYS.map((key) => [key, params.get(key) ?? undefined])),
  );
  useEffect(() => {
    const next = new URLSearchParams();
    for (const key of KEYS) if (choices[key]) next.set(key, choices[key]!);
    if (next.toString() !== new URLSearchParams(window.location.search).toString())
      setParams(next, { replace: true, preventScrollReset: true });
  }, [choices, setParams]);
  const task = finder.tasks.find((entry) => entry.id === choices.task) ?? finder.tasks[0];
  const testId = task.tests.includes(choices.test ?? '') ? choices.test! : task.tests[0];
  const test = finder.tests.find((entry) => entry.id === testId)!;
  const budget = Number(choices.budget) || undefined;
  const context = Number(choices.context) || undefined;
  const needs = NEEDS.filter(([key]) => choices[key] === '1');
  const set = (changes: Choices) => setChoices((current) => ({ ...current, ...changes }));

  const rows = test.rows.filter(([model]) => {
    const [, , , , cost, window, flags] = finder.models[model];
    if (budget !== undefined && (cost === null || cost > budget)) return false;
    if (context !== undefined && (window === null || window < context)) return false;
    return needs.every(([, , flag]) => flags & flag);
  });

  const picks: Pick[] = [];
  const [best] = rows;
  if (best) {
    picks.push({
      kind: 'best',
      title: 'Best match',
      reason: `The highest ${test.label} score among the models that meet your needs.`,
      row: best,
    });
    // The cheapest model scoring about as well, on the same test.
    const bestPrice = finder.models[best[0]][4];
    const margin = marginOf(test, best[1]);
    const value = rows
      .filter(
        (row) => row !== best && row[1] >= best[1] - margin && finder.models[row[0]][4] !== null,
      )
      .sort((a, b) => finder.models[a[0]][4]! - finder.models[b[0]][4]!)[0];
    if (value && bestPrice !== null && finder.models[value[0]][4]! < bestPrice) {
      picks.push({
        kind: 'value',
        title: 'Best value',
        reason: `Within ${margin} points of the best match, and ${cheaper(
          bestPrice / finder.models[value[0]][4]!,
        )}.`,
        row: value,
      });
    }
    if (!needs.some(([key]) => key === 'open')) {
      const open = rows.find(
        (row) =>
          finder.models[row[0]][6] & FLAGS.openWeights && !picks.some((pick) => pick.row === row),
      );
      if (open)
        picks.push({
          kind: 'open',
          title: 'Best open weights',
          reason: 'The best model here that you can download and run yourself.',
          row: open,
        });
    }
  }
  const shown = picks.map((pick) => pick.row);
  const more = rows.filter((row) => !shown.includes(row)).slice(0, 10);
  const credit = finder.sources.find((source) => source.id === test.sourceId);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <form className="dash-panel finder-form" onSubmit={(event) => event.preventDefault()}>
        <fieldset className="finder-tasks">
          <legend>What will you use it for?</legend>
          <div>
            {finder.tasks.map((entry) => {
              const Icon = ICONS[entry.id] ?? Trophy;
              return (
                <label key={entry.id} className={entry.id === task.id ? 'is-checked' : undefined}>
                  <input
                    type="radio"
                    name="task"
                    value={entry.id}
                    checked={entry.id === task.id}
                    onChange={() => set({ task: entry.id, test: undefined })}
                  />
                  <Icon size={20} aria-hidden="true" />
                  <b>{entry.label}</b>
                  <small>{entry.description}</small>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="finder-needs">
          <fieldset>
            <legend>It must have</legend>
            <div className="finder-checks">
              {NEEDS.map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={choices[key] === '1'}
                    onChange={(event) => set({ [key]: event.target.checked ? '1' : undefined })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="finder-select">
            <span>Budget, per 1M tokens</span>
            <Select
              value={choices.budget ?? ''}
              onValueChange={(value) => set({ budget: value || undefined })}
              aria-label="Budget per 1M tokens"
            >
              {BUDGETS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="finder-select">
            <span>Context window</span>
            <Select
              value={choices.context ?? ''}
              onValueChange={(value) => set({ context: value || undefined })}
              aria-label="Minimum context window"
            >
              {CONTEXTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </form>

      <section className="finder-results" aria-labelledby="results-title" aria-live="polite">
        <header className="finder-results-head">
          <div>
            <h2 id="results-title">Ranked by {test.label}</h2>
            <p>{test.description}</p>
          </div>
          {task.tests.length > 1 && (
            <div className="dash-tabs" role="group" aria-label="Rank by">
              {task.tests.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={id === test.id}
                  onClick={() => set({ test: id === task.tests[0] ? undefined : id })}
                >
                  {finder.tests.find((entry) => entry.id === id)!.label}
                </button>
              ))}
            </div>
          )}
        </header>
        <p className="finder-count">
          {rows.length
            ? `${rows.length} of the ${test.rows.length} tested models meet your needs.`
            : 'No tested model meets all of these needs.'}
        </p>

        {picks.length > 0 ? (
          <div className="finder-picks" style={{ '--picks': picks.length } as CSSProperties}>
            {picks.map((pick) => (
              <article key={pick.kind} className={`dash-panel finder-pick is-${pick.kind}`}>
                <h3>{pick.title}</h3>
                <p className="finder-reason">{pick.reason}</p>
                <ModelSummary finder={finder} test={test} row={pick.row} />
              </article>
            ))}
          </div>
        ) : (
          <div className="dash-state finder-empty">
            <p>Remove a requirement, or raise the budget, to see models again.</p>
            <button
              type="button"
              className="btn btn-small btn-outline"
              onClick={() =>
                set({
                  budget: undefined,
                  context: undefined,
                  ...Object.fromEntries(NEEDS.map(([key]) => [key, undefined])),
                })
              }
            >
              Clear the requirements
            </button>
          </div>
        )}

        {more.length > 0 && (
          <div className="dash-panel finder-more">
            <h3>Also worth a look</h3>
            <ol>
              {(expanded ? more : more.slice(0, 5)).map((row) => {
                const [slug, name, makerId, , cost, window] = finder.models[row[0]];
                return (
                  <li key={slug}>
                    <span className="finder-rank">
                      <span className="sr-only">Rank on the test: </span>#{row[2]}
                    </span>
                    <img src={makerLogo(makerId)} alt="" width="22" height="22" loading="lazy" />
                    <Link to={`/models/${slug}`}>{name}</Link>
                    <b>{scoreOf(test, row[1])}</b>
                    <small>
                      {cost === null ? 'Price not listed' : `${price(cost)} per 1M`}
                      {window ? `, ${tokens(window)} context` : ''}
                    </small>
                  </li>
                );
              })}
            </ol>
            {more.length > 5 && (
              <button
                type="button"
                className="text-link"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? 'Show fewer' : `Show ${more.length - 5} more`}
              </button>
            )}
          </div>
        )}

        <p className="data-footnote">
          Models are ranked by one published test at a time; scores from different tests are never
          combined. Prices are list prices per million tokens, three input to one output.
          {credit && (
            <>
              {' '}
              Results published by{' '}
              <a href={credit.url} target="_blank" rel="noopener noreferrer">
                {credit.name}
              </a>{' '}
              ({credit.license}).
            </>
          )}{' '}
          <Link to={`/leaderboard?category=${test.id}`}>
            Every result on this test <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </p>
      </section>
    </>
  );
}

export default function ModelFinder({ initial }: { initial?: Finder }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useFinder(attempt, initial);
  return (
    <div className="container page models-page finder-page">
      <PageHeading
        eyebrow="MODEL FINDER"
        title="Find the right model for the job."
        text="Pick what you need it for and what it must do. The finder ranks every tested model on the published test for that task, within your budget."
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
          Loading the finder…
        </div>
      ) : (
        <Results finder={data} />
      )}
    </div>
  );
}
