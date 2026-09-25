import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { makerLogo } from '../../shared/makers';
import { PageHeading } from '../components/Layout';
import { AgentBoard } from '../components/coding/AgentBoard';
import { AgentDirectory } from '../components/coding/AgentDirectory';
import { AgentEffect } from '../components/coding/AgentEffect';
import { CodingTests } from '../components/coding/CodingTests';
import { CodingValue } from '../components/coding/CodingValue';
import {
  agentsOf,
  checkedAt,
  median,
  percent,
  spreads,
  type AgentSpread,
  type AgentSummary,
} from '../components/coding/analysis';
import { day } from '../components/profile/format';
import { useCoding, type Coding, type CodingAgentRow } from '../lib/overview';
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

function findingsOf(coding: Coding): Findings {
  const results = coding.agents?.results ?? [];
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

function AtAGlance({ coding, findings }: { coding: Coding; findings: Findings }) {
  const { results, own, widest, typical, busiest, groups } = findings;
  const agentic = coding.tests.find((test) => test.id === 'agentic-coding');
  const rows: [string, ReactNode][] = [];
  if (results.length >= 2)
    rows.push([
      'Best pair',
      <p key="best">
        {pair(results[0])} solves the most Terminal-Bench 2.0 tasks, ahead of {pair(results[1])}.
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
  if (busiest)
    rows.push([
      'Most tested agent',
      <p key="busiest">
        <b>{busiest.agent}</b> has results with {busiest.models} models, more than any other agent.
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

function questions(coding: Coding, findings: Findings): [string, string][] {
  const { results, groups, own, widest, typical } = findings;
  const source = coding.agents?.source;
  const agentic = coding.tests.find((test) => test.id === 'agentic-coding');
  const list: [string, string][] = [
    [
      'What is an AI coding agent?',
      'A coding agent is the program that turns an AI model into something that can work on code: it gives the model tools to read and edit files, run commands and tests, and keep going until the task is done. Codex CLI, Claude Code, Gemini CLI and OpenHands are examples. The same model can do better or worse depending on the agent around it.',
    ],
  ];
  if (results[0])
    list.push([
      'Which coding agent scores highest?',
      `On Terminal-Bench 2.0, ${results[0].agent} running ${results[0].name} solves ${percent(results[0].score)} of the tasks, the highest result on the leaderboard.${own ? ` The best agent from a model maker is ${own.agent} with ${own.name}, at ${percent(own.score)}.` : ''}`,
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
  if (source)
    list.push([
      'What is Terminal-Bench?',
      `Terminal-Bench 2.0 is a set of ${source.tasks} hard tasks carried out in a computer terminal, from building and debugging software to data and system work. Each task is checked automatically, and leaderboard entries run every task at least five times. The score is the share of tasks solved.`,
    ]);
  if (source?.latestRun)
    list.push([
      'Why are the newest models missing from the agent results?',
      `The newest result on the Terminal-Bench 2.0 leaderboard is from ${day(source.latestRun)}. Agent and model pairs appear here after the leaderboard lists them. For newer models, the model tests on this page, such as LiveBench agentic coding, are more current.`,
    ]);
  if (agentic?.rows[0])
    list.push([
      'Which model is best at agentic coding?',
      `On LiveBench agentic coding, ${agentic.rows[0].name} scores highest at ${percent(agentic.rows[0].score)}${agentic.rows[1] ? `, ahead of ${agentic.rows[1].name} at ${percent(agentic.rows[1].score)}` : ''}.`,
    ]);
  list.push([
    'Do you measure the cost or time of each task?',
    'Not yet. The results published under open licences do not include the cost or duration of each task, and Artificials does not run these tests itself. The price chart uses each model’s list price per 1M tokens, which is not the cost of a task.',
  ]);
  list.push([
    'Where does this data come from?',
    'Agent results come from the Terminal-Bench 2.0 leaderboard (Apache-2.0), as compiled by Epoch AI (CC BY 4.0). Model tests come from LiveBench (Apache-2.0) and Epoch AI, and prices from models.dev (MIT). Artificials matches results to models and calculates the rankings, the agent gaps and the charts. Everything refreshes automatically.',
  ]);
  return list;
}

const SECTIONS: [string, string][] = [
  ['leaderboard', 'Leaderboard'],
  ['agent-effect', 'Agent effect'],
  ['agents', 'Agents'],
  ['models', 'Models'],
  ['price', 'Price'],
  ['faq', 'Questions'],
];

function CodingContent({ coding }: { coding: Coding }) {
  const findings = useMemo(() => findingsOf(coding), [coding]);
  const faq = useMemo(() => questions(coding, findings), [coding, findings]);
  const source = coding.agents?.source;
  const credit = source
    ? `${source.name} leaderboard (${source.license}), compiled by ${source.compiledBy.name} (${source.compiledBy.license})`
    : '';
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
  const sections = SECTIONS.filter(
    ([id]) => source || !['leaderboard', 'agent-effect', 'agents'].includes(id),
  );
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
        <AtAGlance coding={coding} findings={findings} />
      </section>
      {source && (
        <>
          <section id="leaderboard" aria-labelledby="leaderboard-title" className="hub-section">
            <header className="dash-heading">
              <h2 id="leaderboard-title">Leaderboard</h2>
              <p>
                Terminal-Bench 2.0 results for {findings.results.length} agent and model pairs, up
                to {source.latestRun ? day(source.latestRun) : 'the latest listing'}.
              </p>
            </header>
            <AgentBoard results={findings.results} tasks={source.tasks} credit={credit} />
          </section>
          {findings.groups.length > 0 && (
            <section id="agent-effect" aria-labelledby="effect-title" className="hub-section">
              <header className="dash-heading">
                <h2 id="effect-title">How much the agent matters</h2>
                <p>The same model can solve far more tasks in one agent than in another.</p>
              </header>
              <AgentEffect groups={findings.groups} credit={credit} />
            </section>
          )}
          <section id="agents" aria-labelledby="agents-title" className="hub-section">
            <header className="dash-heading">
              <h2 id="agents-title">Agents</h2>
              <p>
                All {findings.agents.length} agents on the leaderboard, with who built them and
                their best result.
              </p>
            </header>
            <AgentDirectory agents={findings.agents} />
          </section>
        </>
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
            to models and the charts are calculated by Artificials from published results.
          </p>
          <ul>
            {source && (
              <li>
                Agent results:{' '}
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.name} leaderboard
                </a>{' '}
                (
                <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {source.license}
                </a>
                ), as compiled by{' '}
                <a href={source.compiledBy.url} target="_blank" rel="noopener noreferrer">
                  {source.compiledBy.name}
                </a>{' '}
                (
                <a href={source.compiledBy.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {source.compiledBy.license}
                </a>
                ). Retrieved {checkedAt(source.checkedAt)}.
              </li>
            )}
            {coding.sources.map((entry) => (
              <li key={entry.id}>
                {entry.id === 'epoch-models' ? 'Model records' : 'Model tests'}:{' '}
                <a href={entry.url} target="_blank" rel="noopener noreferrer">
                  {entry.name}
                </a>{' '}
                (
                <a href={entry.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {entry.license}
                </a>
                ). Retrieved {checkedAt(entry.checkedAt)}.
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
            Agent names are merged when the source spells one agent several ways, and an entry
            listed twice keeps its latest run. Whether an agent comes from the model’s maker is
            worked out from the builder the source names.
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
