import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Pause, Play, RotateCcw, ScrollText } from 'lucide-react';
import data from '../../../shared/editorial-visual-data.json';
import {
  cacheGiB,
  EVIDENCE,
  evidenceAnswer,
  workloadPrice,
  type ArticleVisualKind,
} from '../../../shared/article-visuals';
import { makerColor, makerLogo } from '../../../shared/makers';
import { readableName } from '../../../shared/model-names';
import { ScatterChart } from '../charts/ScatterChart';
import { useProcessMotion } from './useProcessMotion';
import './article-visuals.css';
import { VisualLab } from './VisualLabs';

const usd = (value: number) => '$' + value.toFixed(value < 1 ? 3 : 2);

function Figure({
  title,
  eyebrow,
  children,
  credit,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  credit: ReactNode;
}) {
  const id = useId();
  return (
    <figure className="article-visual" aria-labelledby={id}>
      <figcaption>
        <span className="av-eyebrow">{eyebrow}</span>
        <h3 id={id}>{title}</h3>
      </figcaption>
      {children}
      <div className="av-credit">{credit}</div>
    </figure>
  );
}

function DataCredit({ benchmark = false }: { benchmark?: boolean }) {
  return benchmark ? (
    <>
      <a href={data.benchmark.source.url} target="_blank" rel="noopener noreferrer">
        LiveBench
      </a>
      {' · '}
      <a href={data.benchmark.source.licenseUrl} target="_blank" rel="noopener noreferrer">
        {data.benchmark.source.license}
      </a>
      . Bundled website dataset; selected configurations, not the full ranking.{' '}
      <Link to="/leaderboard">
        Explore all results <ArrowUpRight size={13} />
      </Link>
    </>
  ) : (
    <>
      <a href="https://epoch.ai/eci" target="_blank" rel="noopener noreferrer">
        Epoch AI
      </a>{' '}
      (
      <a
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noopener noreferrer"
      >
        CC BY 4.0
      </a>
      ) and{' '}
      <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
        models.dev
      </a>{' '}
      (
      <a
        href="https://github.com/anomalyco/models.dev/blob/dev/LICENSE"
        target="_blank"
        rel="noopener noreferrer"
      >
        MIT
      </a>
      ). Bundled website dataset; one selected model per maker, not a live quote.{' '}
      <Link to="/score-price-time">
        Open the full chart <ArrowUpRight size={13} />
      </Link>
    </>
  );
}

function PriceFrontier() {
  const budgetId = useId();
  const [budget, setBudget] = useState(25);
  const [makers, setMakers] = useState<string[]>([]);
  const points = data.price.rows.map((r) => ({
    key: r.slug,
    name: r.name,
    maker: r.maker,
    makerId: r.makerId,
    x: r.price.blended,
    y: r.index,
    href: '/models/' + r.slug,
  }));
  const visible = points.filter(
    (p) => p.x <= budget && (!makers.length || makers.includes(p.makerId)),
  );
  return (
    <Figure
      title="A budget changes the shortlist"
      eyebrow="01 / EXPLORE THE DATA"
      credit={<DataCredit />}
    >
      <p className="av-intro">
        Move the ceiling, then click a maker to isolate its point. Tap a point for its values. The
        line connects the price–capability frontier within the visible sample.
      </p>
      <label className="av-slider" htmlFor={budgetId}>
        <span>
          Price ceiling per 1M total tokens <output>{usd(budget)}</output>
        </span>
        <input
          id={budgetId}
          type="range"
          min="0"
          max="25"
          step="0.25"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
        />
      </label>
      <div className="av-status" role="status">
        {visible.length} of {points.length} selected models within this view
      </div>
      {visible.length ? (
        <ScatterChart
          points={visible}
          legendPoints={points}
          selectedMakers={makers}
          onMakerToggle={(id) =>
            setMakers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
          }
          x={{ kind: 'log', label: 'Blended USD / 1M tokens (log scale)', format: usd }}
          y={{ label: 'Capability index', format: (v) => v.toFixed(0) }}
          frontier={{ kind: 'cheapest', label: 'Frontier within this selection' }}
          label="Selected model capability and price"
        />
      ) : (
        <div className="av-empty">
          No selected model meets these filters. Raise the ceiling or reset the view.
        </div>
      )}
      <button
        type="button"
        className="av-button"
        onClick={() => {
          setBudget(25);
          setMakers([]);
        }}
      >
        <RotateCcw size={15} /> Reset view
      </button>
      <details className="av-table">
        <summary>Read the plotted values as a table</summary>
        <div tabIndex={0} role="region" aria-label="Price and capability values">
          <table>
            <caption>Visible models · 3 input tokens per output token</caption>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Index</th>
                <th scope="col">USD / 1M</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.key}>
                  <th scope="row">
                    <Link to={p.href}>{p.name}</Link>
                  </th>
                  <td>{p.y.toFixed(2)}</td>
                  <td>{usd(p.x)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="av-note">
        Index points are not success percentages. Prices use the maker listing or median host
        listing and a 3:1 input/output mix; they are not measured task costs.
      </p>
    </Figure>
  );
}

function Workload() {
  const [ratio, setRatio] = useState(3);
  const rows = data.price.rows
    .map((r) => ({ ...r, value: workloadPrice(r.price.input, r.price.output, ratio) }))
    .sort((a, b) => a.value - b.value);
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <Figure
      title="The same prices. A different workload."
      eyebrow="02 / CHANGE AN ASSUMPTION"
      credit={<DataCredit />}
    >
      <div className="av-choices" role="group" aria-label="Input to output token ratio">
        {[1, 3, 9].map((r) => (
          <button type="button" key={r} aria-pressed={ratio === r} onClick={() => setRatio(r)}>
            {r}:1 {r === 1 ? 'Balanced' : r === 3 ? 'Typical blend' : 'Input-heavy'}
          </button>
        ))}
      </div>
      <p className="av-formula">
        ({ratio} × input rate + output rate) ÷ {ratio + 1} = USD per 1M total tokens
      </p>
      <ol className="av-bars" aria-label="Calculated token prices">
        {rows.map((r) => (
          <li
            key={r.slug}
            style={
              {
                '--bar': makerColor(r.makerId),
                '--amount': `${(r.value / max) * 100}%`,
              } as CSSProperties
            }
          >
            <div className="av-row-title">
              <img src={makerLogo(r.makerId)} alt="" width="22" height="22" loading="lazy" />
              <Link to={'/models/' + r.slug}>{r.name}</Link>
              <strong>{usd(r.value)}</strong>
            </div>
            <div className="av-track" aria-hidden="true">
              <i />
            </div>
            <small>
              {r.maker} · {usd(r.price.input)} input / {usd(r.price.output)} output per 1M ·{' '}
              {r.price.from === 'maker' ? 'Maker listing' : 'Median host listing'}
            </small>
          </li>
        ))}
      </ol>
      <p className="av-note">
        Calculated comparison, not a measured bill. Excludes cache discounts, tool fees, batch
        discounts, retries, and infrastructure.
      </p>
    </Figure>
  );
}

function Skills({ matrix = false }: { matrix?: boolean }) {
  const [skill, setSkill] = useState('coding');
  const metric = data.benchmark.metrics.find((m) => m.id === skill)!;
  const score = (row: (typeof data.benchmark.rows)[number], id = skill) =>
    (row.scores as Record<string, number | null>)[id];
  const rows = [...data.benchmark.rows].sort(
    (a, b) => (score(b) ?? -Infinity) - (score(a) ?? -Infinity),
  );
  return (
    <Figure
      title={matrix ? 'One configuration, several abilities' : 'Change the skill. Watch the order.'}
      eyebrow={matrix ? '02 / READ ACROSS THE PROFILE' : '01 / EXPLORE THE DATA'}
      credit={<DataCredit benchmark />}
    >
      <p className="av-intro">
        Eight configurations selected by overall rank, matched by exact ID across skills. Values are
        reported scores, not estimates.
      </p>
      <div
        className="av-choices"
        role="group"
        aria-label={matrix ? 'Sort score matrix by' : 'Benchmark skill'}
      >
        {data.benchmark.metrics.map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => setSkill(m.id)}
            aria-pressed={skill === m.id}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="av-status" role="status">
        Sorted by {metric.label} · score / 100 · higher is better
      </p>
      {matrix ? (
        <div
          className="av-matrix"
          tabIndex={0}
          role="region"
          aria-label="Scores across four skills"
        >
          <table>
            <caption>Exact configurations · scroll table horizontally on small screens</caption>
            <thead>
              <tr>
                <th scope="col">Configuration</th>
                {data.benchmark.metrics.map((m) => (
                  <th key={m.id} scope="col" aria-sort={m.id === skill ? 'descending' : undefined}>
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row">
                    {readableName(r.name)}
                    <small>{r.maker}</small>
                  </th>
                  {data.benchmark.metrics.map((m) => (
                    <td
                      key={m.id}
                      style={{ background: `rgb(255 255 255 / ${(score(r, m.id) ?? 0) / 800})` }}
                    >
                      {score(r, m.id)?.toFixed(2) ?? 'Not reported'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ol className="av-bars" aria-label={`${metric.label} scores`}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={
                { '--bar': makerColor(r.makerId), '--amount': `${score(r) ?? 0}%` } as CSSProperties
              }
            >
              <div className="av-row-title">
                <img src={makerLogo(r.makerId)} alt="" width="22" height="22" loading="lazy" />
                <span>{readableName(r.name)}</span>
                <strong>{score(r)?.toFixed(2) ?? '—'}</strong>
              </div>
              <div className="av-track" aria-hidden="true">
                <i />
              </div>
              <small>
                {r.maker} · {r.id}
              </small>
            </li>
          ))}
        </ol>
      )}
      <p className="av-note">
        No uncertainty bounds are reported for these rows in the bundled data. A narrow lead is not
        a claim of statistical significance.{' '}
        <Link to={'/leaderboard?category=' + skill}>
          Open the full {metric.label.toLowerCase()} ranking
        </Link>
        .
      </p>
    </Figure>
  );
}

const processes = {
  inference: [
    [
      'Prepare',
      'Assemble the request',
      'Instructions, the conversation and the question become the available prompt. Blocks are schematic, not actual tokenizer output.',
    ],
    [
      'Prefill',
      'Process the available context',
      'The model processes prompt positions under its attention mask. This is different from selecting future output tokens.',
    ],
    [
      'Cache',
      'Retain reusable attention state',
      'Keys and values for earlier positions can be reused. The cache is neither verified knowledge nor permanent user memory.',
    ],
    [
      'Decode',
      'Choose the next continuation',
      'A selected token becomes context for the next iteration. Each new position can add cache state.',
    ],
    [
      'Deliver',
      'Stream, validate, finish',
      'The interface receives output. Completion, cancellation and validation remain application responsibilities.',
    ],
  ],
  retrieval: [
    [
      'Retrieve',
      'Find candidate passages',
      'Question: how long is a current standard equipment loan? Search can return all three fictional policies, including unsuitable ones.',
    ],
    [
      'Filter',
      'Check which policy applies',
      'Exclude the archived seven-day rule and the twenty-one-day extended plan. Similar wording does not make either authoritative here.',
    ],
    [
      'Context',
      'Preserve the evidence boundary',
      'Pass the current standard policy with its identifier and scope. Keep source text separate from application instructions.',
    ],
    [
      'Draft',
      'Express the supported conclusion',
      'The twelve-day answer comes from the fictional current policy. Do not add an unsupported renewal promise or late fee.',
    ],
    [
      'Verify',
      'Check the claim against its source',
      'The duration and plan must match the passage. Missing eligible evidence should produce an explicit knowledge boundary.',
    ],
  ],
} as const;

function Process({ kind }: { kind: 'inference' | 'retrieval' }) {
  const motion = useProcessMotion();
  const stages = processes[kind];
  const step = Math.min(4, Math.floor(motion.progress / 25));
  const id = useId().replace(/:/g, '');
  return (
    <Figure
      title={
        kind === 'inference'
          ? 'One request, from prompt to answer'
          : 'One question, an inspectable evidence trail'
      }
      eyebrow="01 / FOLLOW THE ARCHITECTURE"
      credit="Original conceptual diagram. Animation speed is illustrative; no model is running and no measured latency is implied."
    >
      <div
        ref={motion.ref}
        className={`av-process ${motion.active ? 'is-moving' : ''}`}
        data-progress={motion.progress}
      >
        <div className="av-process-controls">
          <button
            type="button"
            className="av-button"
            disabled={motion.reduced}
            onClick={motion.mode === 'play' ? motion.pause : motion.play}
          >
            {motion.mode === 'play' ? <Pause size={15} /> : <Play size={15} />}
            {motion.mode === 'play' ? 'Pause' : 'Play sequence'}
          </button>
          <button
            type="button"
            className="av-button"
            disabled={motion.reduced}
            aria-pressed={motion.mode === 'scroll'}
            onClick={motion.mode === 'scroll' ? motion.pause : motion.follow}
          >
            <ScrollText size={15} /> Follow scroll
          </button>
          <button type="button" className="av-button" onClick={() => motion.seek(0)}>
            <RotateCcw size={15} /> Restart
          </button>
        </div>
        <p className="av-note">
          {motion.reduced
            ? 'Reduced motion is on. Choose a stage or move the slider to explore.'
            : 'Scroll down to advance; scroll up to reverse. Selecting a stage takes manual control.'}
        </p>
        <svg className="av-architecture" viewBox="0 0 760 300" aria-hidden="true">
          <defs>
            <radialGradient id={'glow-' + id}>
              <stop stopColor="#d8e4ff" stopOpacity=".24" />
              <stop offset="1" stopColor="#d8e4ff" stopOpacity="0" />
            </radialGradient>
            <pattern id={'grid-' + id} width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#515966" opacity=".3" />
            </pattern>
          </defs>
          <rect width="760" height="300" fill={`url(#grid-${id})`} />
          <ellipse
            cx={80 + motion.progress * 6}
            cy="135"
            rx="115"
            ry="135"
            fill={`url(#glow-${id})`}
          />
          <path
            d={
              kind === 'inference'
                ? 'M80 135H680 M530 185V225H380V185'
                : 'M80 135H680 M230 185V235H310'
            }
            className="av-wire"
          />
          <path
            d="M80 135H680"
            className="av-signal"
            style={{ strokeDasharray: `${motion.progress * 6} 600` }}
          />
          {stages.map((s, i) => (
            <g
              key={s[0]}
              transform={`translate(${80 + i * 150} 135)`}
              className={i <= step ? 'av-node reached' : 'av-node'}
            >
              <rect x="-46" y="-48" width="92" height="96" rx="18" />
              {kind === 'inference' && i === 2 ? (
                [0, 1, 2].map((n) => <path key={n} d={`M-23 ${-21 + n * 19}h46v12h-46z`} />)
              ) : kind === 'retrieval' && i === 1 ? (
                <path d="M-25-22h50L7 1v24H-7V1z" />
              ) : i === 4 ? (
                <path d="m-23 0 15 15 31-32" />
              ) : (
                <>
                  <path d="M-24-22h48v44h-48z" />
                  <path d="M-15-10h30m-30 10h23m-23 10h17" />
                </>
              )}
            </g>
          ))}
          <circle cx={80 + motion.progress * 6} cy="135" r="6" className="av-packet" />
          {kind === 'inference' &&
            Array.from({ length: 12 }, (_, i) => (
              <rect
                key={i}
                x={190 + i * 32}
                y="265"
                width="22"
                height="8"
                rx="3"
                fill={i < 3 + Math.floor(motion.progress / 12) ? '#cbd5e1' : '#252b35'}
              />
            ))}
        </svg>
        <div className="av-stage-buttons" role="group" aria-label="Process stage">
          {stages.map((s, i) => (
            <button
              type="button"
              key={s[0]}
              aria-pressed={step === i}
              onClick={() => motion.seek(i * 25)}
            >
              <span>0{i + 1}</span>
              {s[0]}
            </button>
          ))}
        </div>
        <label className="av-slider" htmlFor={id + '-progress'}>
          <span>
            Process position <output>{step + 1} / 5</output>
          </span>
          <input
            id={id + '-progress'}
            type="range"
            min="0"
            max="100"
            value={motion.progress}
            onChange={(e) => motion.seek(Number(e.target.value))}
          />
        </label>
        <div className="av-explanation">
          <span className="av-eyebrow">STAGE 0{step + 1}</span>
          <h4>{stages[step][1]}</h4>
          <p>{stages[step][2]}</p>
        </div>
        <details className="av-transcript">
          <summary>Read every stage without animation</summary>
          <ol>
            {stages.map(([name, title, text]) => (
              <li key={name}>
                <strong>{title}</strong>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </Figure>
  );
}

function Cache() {
  const tokensId = useId();
  const sequencesId = useId();
  const [tokens, setTokens] = useState(8192);
  const [sequences, setSequences] = useState(1);
  const total = cacheGiB(tokens, sequences);
  return (
    <Figure
      title="What makes the cache grow?"
      eyebrow="02 / A TRANSPARENT CALCULATION"
      credit="Illustrative architecture, not a named model or measured GPU allocation. Excludes weights, activations, reserved blocks, metadata, and temporary workspaces."
    >
      <div className="av-cache-number">
        <output aria-live="polite">
          {total.toFixed(2)} <small>GiB</small>
        </output>
        <span>raw key-value storage</span>
      </div>
      <label className="av-slider" htmlFor={tokensId}>
        <span>
          Cached tokens per sequence <output>{tokens.toLocaleString('en-US')}</output>
        </span>
        <input
          id={tokensId}
          type="range"
          min="1024"
          max="32768"
          step="1024"
          value={tokens}
          onChange={(e) => setTokens(Number(e.target.value))}
        />
      </label>
      <label className="av-slider" htmlFor={sequencesId}>
        <span>
          Simultaneous sequences <output>{sequences}</output>
        </span>
        <input
          type="range"
          id={sequencesId}
          min="1"
          max="8"
          value={sequences}
          onChange={(e) => setSequences(Number(e.target.value))}
        />
      </label>
      <div className="av-cache-grid" aria-hidden="true">
        {Array.from({ length: 64 }, (_, i) => (
          <i key={i} className={i < Math.ceil(total * 2) ? 'filled' : ''} />
        ))}
      </div>
      <p className="av-note">
        Each tile represents 0.5 GiB, rounded up for display; the numeric result is exact for these
        assumptions.
      </p>
      <div className="av-assumptions">
        <span>32 layers</span>
        <span>8 KV heads</span>
        <span>128 head dimension</span>
        <span>2 bytes per element</span>
        <span>Keys + values</span>
      </div>
      <p className="av-formula">2 × 32 × 8 × 128 × 2 × cached tokens × sequences ÷ 1,073,741,824</p>
    </Figure>
  );
}

function Evidence() {
  const [included, setIncluded] = useState<string[]>(EVIDENCE.map((d) => d.id));
  const answer = evidenceAnswer(included);
  return (
    <Figure
      title="What happens when the evidence disappears?"
      eyebrow="02 / TRY THE FAILURE CASE"
      credit="Fictional rental policies. This deterministic browser demonstration makes no AI request and is not a model evaluation."
    >
      <p className="av-question">
        How long may a standard member borrow equipment under the current policy?
      </p>
      <div className="av-documents">
        {EVIDENCE.map((doc) => (
          <label
            className={`av-document ${included.includes(doc.id) ? 'is-included' : ''}`}
            key={doc.id}
          >
            <input
              type="checkbox"
              checked={included.includes(doc.id)}
              onChange={() =>
                setIncluded((v) =>
                  v.includes(doc.id) ? v.filter((id) => id !== doc.id) : [...v, doc.id],
                )
              }
            />
            <span>
              <strong>{doc.title}</strong>
              <small>{doc.status}</small>
              <span>{doc.text}</span>
            </span>
          </label>
        ))}
      </div>
      <div className={`av-answer ${answer.supported ? 'supported' : ''}`} role="status">
        <span className="av-eyebrow">
          {answer.supported ? <Check size={15} /> : null}
          {answer.supported ? 'SUPPORTED CLAIM' : 'EVIDENCE MISSING'}
        </span>
        <p>{answer.text}</p>
        <small>Support: {answer.source}</small>
      </div>
    </Figure>
  );
}

export function ArticleVisual({ kind }: { kind: ArticleVisualKind }) {
  switch (kind) {
    case 'distribution':
    case 'sample-draw':
    case 'vector-angle':
    case 'vector-rank':
    case 'queue-timeline':
    case 'queue-replay':
      return <VisualLab kind={kind} />;
    case 'frontier':
      return <PriceFrontier />;
    case 'workload':
      return <Workload />;
    case 'skills':
      return <Skills />;
    case 'matrix':
      return <Skills matrix />;
    case 'inference':
    case 'retrieval':
      return <Process kind={kind} />;
    case 'cache':
      return <Cache />;
    case 'evidence':
      return <Evidence />;
  }
}
