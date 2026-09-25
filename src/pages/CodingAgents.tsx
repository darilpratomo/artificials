import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { makerLogo } from '../../shared/makers';
import { PageHeading } from '../components/Layout';
import { AgentBoard } from '../components/coding/AgentBoard';
import { AgentDirectory } from '../components/coding/AgentDirectory';
import { AgentEffect } from '../components/coding/AgentEffect';
import { CodingTests } from '../components/coding/CodingTests';
import { CodingValue } from '../components/coding/CodingValue';
import { TaskCost } from '../components/coding/TaskCost';
import { TimeHorizons, duration } from '../components/coding/TimeHorizons';
import {
  agentsOf,
  median,
  percent,
  spreads,
  type AgentSpread,
  type AgentSummary,
} from '../components/coding/analysis';
import { day } from '../components/profile/format';
import {
  useCoding,
  type Coding,
  type CodingAgentRow,
  type CodingAgentTest,
  type CodingTest,
} from '../lib/overview';
import '../components/home/dashboard.css';
import './models.css';
import './coding-agents.css';

function ModelLink({ name, slug, makerId }: { name: string; slug?: string; makerId: string }) {
  return (
    <span className="glance-model">
      <img src={makerLogo(makerId)} alt="" width="22" height="22" loading="lazy" />
      {slug ? <Link to={`/models/${slug}`}>{name}</Link> : <b>{name}</b>}
    </span>
  );
}

const pair = (row: CodingAgentRow) => (
  <>
    <b>{row.agent}</b> with <ModelLink name={row.name} slug={row.slug} makerId={row.makerId} /> (
    {percent(row.score)})
  </>
);

interface Findings {
  results: CodingAgentRow[];
  groups: AgentSpread[];
  agents: AgentSummary[];
  own?: CodingAgentRow;
  widest?: AgentSpread;
  typical?: number;
  busiest?: AgentSummary;
}

function findingsOf(results: CodingAgentRow[]): Findings {
  const groups = spreads(results);
  const agents = agentsOf(results);
  return {
    results,
    groups,
    agents,
    own: results.find((row) => row.own),
    widest: [...groups].sort((a, b) => b.spread - a.spread)[0],
    typical: groups.length ? median(groups.map((group) => group.spread)) : undefined,
    busiest: [...agents].sort((a, b) => b.models - a.models || a.agent.localeCompare(b.agent))[0],
  };
}

/** The best score on a test, and the cheapest run within five points of it. */
function valueOf(test: CodingTest | undefined) {
  const rows = (test?.rows ?? []).filter((row) => row.usage?.cost !== undefined);
  const best = rows[0];
  if (!best) return undefined;
  const cheap = rows
    .filter((row) => row !== best && best.score - row.score <= 5)
    .sort((a, b) => a.usage!.cost! - b.usage!.cost!)[0];
  return cheap && cheap.usage!.cost! < best.usage!.cost! ? { test: test!, best, cheap } : undefined;
}
const dollars = (value: number) =>
  value >= 1 ? `$${value.toFixed(2)}` : `$${Number(value.toPrecision(2))}`;

function AtAGlance({
  coding,
  test,
  findings,
}: {
  coding: Coding;
  test?: CodingAgentTest;
  findings: Findings;
}) {
  const { results, own, widest, typical, busiest, groups } = findings;
  const agentic = coding.tests.find((entry) => entry.id === 'agentic-coding');
  const value = valueOf(coding.costTests.find((entry) => entry.id === 'deepswe'));
  const horizon = coding.timeHorizons?.results[0];
  const name = test?.source.name ?? 'the leaderboard';
  const rows: [string, ReactNode][] = [];
  if (results.length >= 2)
    rows.push([
      'Best pair',
      <p key="best">
        {pair(results[0])} solves the most {name} tasks, ahead of {pair(results[1])}.
      </p>,
    ]);
  if (own)
    rows.push([
      'Maker’s own agent',
      <p key="own">Among agents built by the model’s maker, {pair(own)} scores highest.</p>,
    ]);
  if (widest && typical !== undefined)
    rows.push([
      'Agent effect',
      <p key="effect">
        Across {groups.length} models run by at least three agents, the best agent typically beats
        the weakest by {typical.toFixed(1)} points. For{' '}
        <ModelLink name={widest.name} slug={widest.slug} makerId={widest.makerId} /> the gap is{' '}
        {widest.spread.toFixed(1)} points: {widest.best.agent} {percent(widest.best.score)},{' '}
        {widest.worst.agent} {percent(widest.worst.score)}.
      </p>,
    ]);
  if (value)
    rows.push([
      'Cost per task',
      <p key="cost">
        On {value.test.label},{' '}
        <ModelLink name={value.best.name} slug={value.best.slug} makerId={value.best.makerId} />{' '}
        scores highest ({percent(value.best.score)}) at {dollars(value.best.usage!.cost!)} a task,
        while{' '}
        <ModelLink name={value.cheap.name} slug={value.cheap.slug} makerId={value.cheap.makerId} />{' '}
        comes within five points ({percent(value.cheap.score)}) for{' '}
        {dollars(value.cheap.usage!.cost!)}.
      </p>,
    ]);
  if (horizon)
    rows.push([
      'Task length',
      <p key="horizon">
        <ModelLink name={horizon.name} slug={horizon.slug} makerId={horizon.makerId} /> completes
        half of the software tasks that take a skilled person {duration(horizon.minutes)}, the
        longest in METR’s measurements.
      </p>,
    ]);
  if (busiest)
    rows.push([
      'Most tested agent',
      <p key="busiest">
        <b>{busiest.agent}</b> has {name} results with {busiest.models} models, more than any other
        agent.
      </p>,
    ]);
  if (agentic && agentic.rows.length >= 4) {
    const [a, b, c, d] = agentic.rows;
    rows.push([
      'Newest models',
      <p key="models">
        On LiveBench agentic coding, <ModelLink name={a.name} slug={a.slug} makerId={a.makerId} />{' '}
        and <ModelLink name={b.name} slug={b.slug} makerId={b.makerId} /> lead, followed by{' '}
        <ModelLink name={c.name} slug={c.slug} makerId={c.makerId} /> and{' '}
        <ModelLink name={d.name} slug={d.slug} makerId={d.makerId} />.
      </p>,
    ]);
  }
  return (
    <dl className="glance-sentences">
      {rows.map(([label, sentence]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{sentence}</dd>
        </div>
      ))}
    </dl>
  );
}

function questions(
  coding: Coding,
  test: CodingAgentTest | undefined,
  findings: Findings,
): [string, string][] {
  const { results, groups, own, widest, typical } = findings;
  const source = test?.source;
  const agentic = coding.tests.find((entry) => entry.id === 'agentic-coding');
  const value = valueOf(coding.costTests.find((entry) => entry.id === 'deepswe'));
  const horizon = coding.timeHorizons?.results[0];
  const costTests = coding.costTests;
  const list: [string, string][] = [
    [
      'What is an AI coding agent?',
      'A coding agent is the program that turns an AI model into something that can work on code: it gives the model tools to read and edit files, run commands and tests, and keep going until the task is done. Codex CLI, Claude Code, Gemini CLI and OpenHands are examples. The same model can do better or worse depending on the agent around it.',
    ],
  ];
  if (results[0] && source)
    list.push([
      'Which coding agent scores highest?',
      `On ${source.name}, ${results[0].agent} running ${results[0].name} solves ${percent(results[0].score)} of the tasks, the highest result.${own ? ` The best agent from a model maker is ${own.agent} with ${own.name}, at ${percent(own.score)}.` : ''}`,
    ]);
  if (widest && typical !== undefined)
    list.push([
      'Does the agent matter as much as the model?',
      `It can. For the ${groups.length} models that at least three agents ran, the gap between the best and weakest agent has a median of ${typical.toFixed(1)} points and reaches ${widest.spread.toFixed(1)} points for ${widest.name}, from ${percent(widest.worst.score)} with ${widest.worst.agent} to ${percent(widest.best.score)} with ${widest.best.agent}.`,
    ]);
  if (results[0]) {
    const top = results.filter((row) => row.name === results[0].name);
    const [first, second] = top;
    // Two results closer than their combined standard errors are effectively tied.
    const close =
      second &&
      first.stderr !== undefined &&
      second.stderr !== undefined &&
      first.score - second.score < first.stderr + second.stderr;
    if (second)
      list.push([
        `Which agent gets the most from ${first.name}?`,
        `${top
          .slice(0, 5)
          .map((row) => `${row.agent} ${percent(row.score)}`)
          .join(
            ', ',
          )}.${close ? ` ${first.agent} and ${second.agent} are within their standard errors of each other, so treat them as tied.` : ''}`,
      ]);
  }
  if (costTests.length)
    list.push([
      'How much does an AI coding agent cost per task?',
      `It depends on the model, its reasoning effort and the task. ${costTests.map((entry) => entry.label).join(', ')} publish the average API cost per task.${value ? ` On ${value.test.label}, ${value.best.name} scores highest at ${dollars(value.best.usage!.cost!)} a task, while ${value.cheap.name} comes within five points for ${dollars(value.cheap.usage!.cost!)}.` : ''} Costs use list prices and differ between tests, so compare them within one test.`,
    ]);
  if (horizon)
    list.push([
      'How long a task can an AI agent finish?',
      `METR measures the length of software task, in the time a skilled person needs, that a model completes half the time. ${horizon.name} leads its measurements at ${duration(horizon.minutes)}. The uncertainty is large, and the task length a model completes four times out of five is much shorter.`,
    ]);
  if (source?.latestRun)
    list.push([
      'Why are the newest models missing from the agent results?',
      `Agent and model pairs appear here only after the ${source.name} leaderboard lists them, which can take weeks after a model is released. For newer models, the model tests on this page, such as DeepSWE, CursorBench and LiveBench agentic coding, are more current.`,
    ]);
  if (agentic?.rows[0])
    list.push([
      'Which model is best at agentic coding?',
      `On LiveBench agentic coding, ${agentic.rows[0].name} scores highest at ${percent(agentic.rows[0].score)}${agentic.rows[1] ? `, ahead of ${agentic.rows[1].name} at ${percent(agentic.rows[1].score)}` : ''}. Other agentic tests on this page rank models differently, so check the test closest to your work.`,
    ]);
  list.push([
    'Where does this data come from?',
    'Agent results come from the Terminal-Bench 2.0 leaderboard (Apache-2.0, compiled by Epoch AI) and SWE-bench (CC BY-NC 4.0). Model tests come from LiveBench (Apache-2.0), Epoch AI (CC BY 4.0), SWE-bench, and DeepSWE by Datacurve and CursorBench by Cursor as compiled by Epoch AI; task lengths come from METR, also via Epoch AI. Prices are from models.dev (MIT). Artificials does not run these tests; it matches results to models and calculates the rankings, gaps and charts. Everything refreshes automatically.',
  ]);
  return list;
}

const SECTIONS: [string, string][] = [
  ['leaderboard', 'Leaderboard'],
  ['agent-effect', 'Agent effect'],
  ['agents', 'Agents'],
  ['cost', 'Cost per task'],
  ['task-length', 'Task length'],
  ['models', 'Models'],
  ['price', 'Price'],
  ['faq', 'Questions'],
];

const creditOf = (source: CodingAgentTest['source']) =>
  source.compiledBy
    ? `${source.name} (${source.license}), compiled by ${source.compiledBy.name} (${source.compiledBy.license})`
    : `${source.name} (${source.license})`;

function CodingContent({ coding }: { coding: Coding }) {
  const [testId, setTestId] = useState(coding.agentTests[0]?.source.id);
  const test =
    coding.agentTests.find((entry) => entry.source.id === testId) ?? coding.agentTests[0];
  const findings = useMemo(() => findingsOf(test?.results ?? []), [test]);
  // The summary and questions describe the first agent test, whatever is selected.
  const primary = coding.agentTests[0];
  const lead = useMemo(() => findingsOf(primary?.results ?? []), [primary]);
  const faq = useMemo(() => questions(coding, primary, lead), [coding, primary, lead]);
  const source = test?.source;
  const credit = source ? creditOf(source) : '';
  const credits = Object.fromEntries(
    coding.sources.map((entry) => [entry.id, `${entry.name} (${entry.license})`]),
  );
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }).replace(/</g, '\\u003c');
  const hasCost = coding.costTests.length > 0;
  const sections = SECTIONS.filter(
    ([id]) =>
      (source || !['leaderboard', 'agent-effect', 'agents'].includes(id)) &&
      (id !== 'cost' || hasCost) &&
      (id !== 'task-length' || coding.timeHorizons),
  );
  const switcher =
    coding.agentTests.length > 1 ? (
      <div className="dash-tabs" role="group" aria-label="Agent benchmark">
        {coding.agentTests.map((entry) => (
          <button
            key={entry.source.id}
            type="button"
            aria-pressed={entry.source.id === source?.id}
            onClick={() => setTestId(entry.source.id)}
          >
            {entry.source.name}
          </button>
        ))}
      </div>
    ) : null;
  return (
    <div className="models-hub">
      <nav className="hub-sections" aria-label="On this page">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <section className="dash-panel" aria-labelledby="glance-title">
        <div className="dash-panel-head">
          <div>
            <h2 id="glance-title">At a glance</h2>
            <p>What the published results say about agents and the models inside them.</p>
          </div>
        </div>
        <AtAGlance coding={coding} test={primary} findings={lead} />
      </section>
      {test && source && (
        <>
          <section id="leaderboard" aria-labelledby="leaderboard-title" className="hub-section">
            <header className="dash-heading">
              <h2 id="leaderboard-title">Leaderboard</h2>
              <p>
                {source.name} results for {findings.results.length} agent and model pairs.{' '}
                {source.description}
              </p>
            </header>
            {switcher}
            <AgentBoard
              key={source.id}
              results={findings.results}
              test={source.name}
              tasks={source.tasks}
              credit={credit}
            />
          </section>
          <section id="agent-effect" aria-labelledby="effect-title" className="hub-section">
            <header className="dash-heading">
              <h2 id="effect-title">How much the agent matters</h2>
              <p>The same model can solve far more tasks in one agent than in another.</p>
            </header>
            {switcher}
            {findings.groups.length > 0 ? (
              <AgentEffect
                key={source.id}
                groups={findings.groups}
                test={source.name}
                credit={credit}
              />
            ) : (
              <div className="dash-panel dash-state">
                <p>
                  No model on {source.name} was run by three or more agents. Choose another
                  benchmark to compare agents running the same model.
                </p>
              </div>
            )}
          </section>
          <section id="agents" aria-labelledby="agents-title" className="hub-section">
            <header className="dash-heading">
              <h2 id="agents-title">Agents</h2>
              <p>
                All {findings.agents.length} agents with {source.name} results, with who built them
                and their best result.
              </p>
            </header>
            {switcher}
            <AgentDirectory key={source.id} agents={findings.agents} />
          </section>
        </>
      )}
      {hasCost && (
        <section id="cost" aria-labelledby="cost-title" className="hub-section">
          <header className="dash-heading">
            <h2 id="cost-title">Cost per task</h2>
            <p>What models cost and how much work they do per task, as the tests measured it.</p>
          </header>
          <TaskCost tests={coding.costTests} credits={credits} />
        </section>
      )}
      {coding.timeHorizons && (
        <section id="task-length" aria-labelledby="length-title" className="hub-section">
          <header className="dash-heading">
            <h2 id="length-title">How long a task models can finish</h2>
            <p>METR’s time horizons: longer tasks, measured in human time, that models complete.</p>
          </header>
          <TimeHorizons horizons={coding.timeHorizons} />
        </section>
      )}
      {coding.tests.length > 0 && (
        <>
          <section id="models" aria-labelledby="models-title" className="hub-section">
            <header className="dash-heading">
              <h2 id="models-title">Models on coding tests</h2>
              <p>
                How the models themselves compare when every model runs in the same setup, including
                releases newer than the agent results.
              </p>
            </header>
            <CodingTests tests={coding.tests} credits={credits} />
          </section>
          <section id="price" aria-labelledby="price-title" className="hub-section">
            <header className="dash-heading">
              <h2 id="price-title">Coding score and price</h2>
              <p>Which models give the most coding ability for their list price.</p>
            </header>
            <CodingValue tests={coding.tests} credits={credits} />
          </section>
        </>
      )}
      <section id="faq" aria-labelledby="faq-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="faq-title">Frequently asked questions</h2>
          <p>Answered from the data on this page.</p>
        </header>
        <div className="dash-panel faq-items hub-faq">
          {faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      </section>
      <details className="profile-sources coding-sources">
        <summary>Sources and method</summary>
        <div>
          <p>
            Artificials does not run these tests. Rankings, the agent gaps, the matching of results
            to models and the charts are calculated by Artificials from published results. Some
            sources allow only non-commercial use; Artificials is a free, non-commercial site.
          </p>
          <ul>
            {coding.agentTests.map(({ source: entry }) => (
              <li key={entry.id}>
                Agent results:{' '}
                <a href={entry.url} target="_blank" rel="noopener noreferrer">
                  {entry.name}
                </a>{' '}
                (
                <a href={entry.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {entry.license}
                </a>
                )
                {entry.compiledBy && (
                  <>
                    , as compiled by{' '}
                    <a href={entry.compiledBy.url} target="_blank" rel="noopener noreferrer">
                      {entry.compiledBy.name}
                    </a>{' '}
                    (
                    <a href={entry.compiledBy.licenseUrl} target="_blank" rel="noopener noreferrer">
                      {entry.compiledBy.license}
                    </a>
                    )
                  </>
                )}
                .
              </li>
            ))}
            {coding.timeHorizons && (
              <li>
                Task lengths:{' '}
                <a href={coding.timeHorizons.source.url} target="_blank" rel="noopener noreferrer">
                  {coding.timeHorizons.source.name}
                </a>{' '}
                ({coding.timeHorizons.source.version}), as compiled by Epoch AI (
                <a
                  href={coding.timeHorizons.source.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {coding.timeHorizons.source.license}
                </a>
                ).
              </li>
            )}
            {coding.sources.map((entry) => (
              <li key={entry.id}>
                Model tests:{' '}
                <a href={entry.url} target="_blank" rel="noopener noreferrer">
                  {entry.name}
                </a>{' '}
                (
                <a href={entry.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {entry.license}
                </a>
                ).
              </li>
            ))}
            <li>
              Prices:{' '}
              <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
                models.dev
              </a>{' '}
              (MIT), the maker’s own list price or else the middle price across hosts.
            </li>
          </ul>
          <p>
            DeepSWE, CursorBench and METR publish their results without a licence of their own;
            Epoch AI republishes them under CC BY 4.0, and they are credited to both. Agent names
            are merged when a source spells one agent several ways, and an entry listed twice keeps
            its latest run. Whether an agent comes from the model’s maker is worked out from the
            builder the source names. SWE-bench agent results include only entries that tried each
            issue once with one model.
          </p>
        </div>
      </details>
    </div>
  );
}

export default function CodingAgents({ initial }: { initial?: Coding }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useCoding(attempt, initial);
  return (
    <div className="container page models-page coding-page">
      <PageHeading
        eyebrow="CODING AGENTS"
        title="Coding agents and the models inside them."
        text="Public test results for AI coding agents: which agent and model pairs solve the most tasks, how much the agent changes a model’s score, and which models lead on coding tests."
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
          Loading coding results…
        </div>
      ) : (
        <CodingContent coding={data} />
      )}
    </div>
  );
}
