import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Pause, Play, RotateCcw, ScrollText } from 'lucide-react';
import {
  tokenDistribution,
  pickToken,
  polar,
  vectorScore,
  normalize,
  VECTOR_FIXTURE,
  queueSchedule,
  queueSnapshot,
  type Vector2,
  type SimilarityMetric,
  type QueuePolicy,
} from '../../../shared/visual-lab-math';
import { useProcessMotion } from './useProcessMotion';
import './visual-labs.css';

export type LabKind =
  | 'distribution'
  | 'sample-draw'
  | 'vector-angle'
  | 'vector-rank'
  | 'queue-timeline'
  | 'queue-replay';
function Lab({
  title,
  children,
  credit,
}: {
  title: string;
  children: ReactNode;
  credit: ReactNode;
}) {
  const id = useId();
  return (
    <figure className="article-visual visual-lab" aria-labelledby={id}>
      <figcaption>
        <span className="av-eyebrow">ARTIFICIALS / INTERACTIVE LAB</span>
        <h3 id={id}>{title}</h3>
      </figcaption>
      {children}
      <div className="av-credit">{credit}</div>
    </figure>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  display?: string;
}) {
  const id = useId();
  return (
    <label className="av-slider" htmlFor={id}>
      <span>
        {label}
        <output>{display ?? value}</output>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function MotionControls({ motion }: { motion: ReturnType<typeof useProcessMotion> }) {
  return (
    <>
      <div className="av-process-controls">
        <button
          type="button"
          className="av-button"
          disabled={motion.reduced}
          onClick={motion.mode === 'play' ? motion.pause : motion.play}
        >
          {motion.mode === 'play' ? <Pause size={15} /> : <Play size={15} />}
          {motion.mode === 'play' ? 'Pause replay' : 'Play replay'}
        </button>
        <button
          type="button"
          className="av-button"
          disabled={motion.reduced}
          aria-pressed={motion.mode === 'scroll'}
          onClick={motion.mode === 'scroll' ? motion.pause : motion.follow}
        >
          <ScrollText size={15} />
          Follow scroll
        </button>
        <button type="button" className="av-button" onClick={() => motion.seek(0)}>
          <RotateCcw size={15} />
          Restart
        </button>
      </div>
      <p className="av-note">
        {motion.reduced
          ? 'Reduced motion is on. Use the slider to explore at your own pace.'
          : 'Scroll to advance or reverse. Moving the slider takes manual control; playback pauses off screen.'}
      </p>
    </>
  );
}
const samplingCredit = (
  <>
    Original six-token fixture; no model is called. Mathematical controls follow the definitions in{' '}
    <a
      href="https://huggingface.co/docs/transformers/main/en/main_classes/text_generation"
      target="_blank"
      rel="noopener noreferrer"
    >
      Transformers documentation
    </a>
    . No external scores or figures reproduced.
  </>
);
const geometryCredit = (
  <>
    Original two-dimensional coordinates, not text embeddings. Definitions:{' '}
    <a
      href="https://scikit-learn.org/stable/modules/metrics.html#cosine-similarity"
      target="_blank"
      rel="noopener noreferrer"
    >
      scikit-learn pairwise metrics
    </a>
    . No measured semantic relevance is implied.
  </>
);
const queueCredit = (
  <>
    Original deterministic simulation: all jobs arrive at zero; one token per active job per tick;
    no prefill, memory constraints or hardware timing. Conceptual background:{' '}
    <a
      href="https://www.usenix.org/conference/osdi22/presentation/yu"
      target="_blank"
      rel="noopener noreferrer"
    >
      Orca, OSDI 2022
    </a>
    . These are not Orca benchmark results.
  </>
);
const pct = (p: number) => (p * 100).toFixed(1) + '%';

function Distribution() {
  const [temperature, setTemperature] = useState(1),
    [topP, setTopP] = useState(0.9);
  const rows = tokenDistribution(temperature, topP);
  return (
    <Lab title="One score list, two probability stages" credit={samplingCredit}>
      <p className="av-intro">
        Change concentration, then eligibility. Filled bars show the final distribution; fine lines
        show probabilities before filtering. Each row includes both values.
      </p>
      <div className="vl-controls">
        <Range
          label="Temperature"
          value={temperature}
          min={0.2}
          max={2}
          step={0.1}
          display={temperature.toFixed(1)}
          onChange={setTemperature}
        />
        <Range
          label="Top-p threshold"
          value={topP}
          min={0.1}
          max={1}
          step={0.05}
          display={topP.toFixed(2)}
          onChange={setTopP}
        />
      </div>
      <div className="av-status" role="status">
        {rows.filter((r) => r.final > 0).length} of 6 tokens retained · probabilities sum to 100%
      </div>
      <ol className="vl-probabilities">
        {rows.map((row) => (
          <li key={row.label} className={row.final === 0 ? 'is-excluded' : ''}>
            <div className="vl-row-heading">
              <strong>{row.label}</strong>
              <span>logit {row.logit.toFixed(1)}</span>
              <b>{pct(row.final)}</b>
            </div>
            <div className="vl-prob-track" aria-hidden="true">
              <i style={{ width: pct(row.final) }} />
              <span style={{ width: pct(row.probability) }} />
            </div>
            <small>
              Before filter {pct(row.probability)} · {row.final > 0 ? 'Eligible' : 'Excluded'} ·
              after filter {pct(row.final)}
            </small>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="av-button"
        onClick={() => {
          setTemperature(1);
          setTopP(0.9);
        }}
      >
        <RotateCcw size={15} />
        Reset distribution
      </button>
    </Lab>
  );
}
function SampleDraw() {
  const motion = useProcessMotion();
  const rows = tokenDistribution(1, 0.9).filter((r) => r.final > 0);
  const draw = (motion.progress / 100) * 0.999;
  const selected = pickToken(rows, draw);
  let cumulative = 0;
  const intervals = rows.map((row) => {
    const start = cumulative;
    cumulative += row.final;
    return { ...row, start, end: cumulative };
  });
  return (
    <Lab title="A draw selects an interval" credit={samplingCredit}>
      <p className="av-intro">
        Fixed temperature 1.0 and top-p 0.9. The sweep represents possible uniform draws; it is not
        a random sequence or a new generation.
      </p>
      <div ref={motion.ref} className="vl-motion" data-progress={motion.progress}>
        <MotionControls motion={motion} />
        <div className="vl-ruler" aria-hidden="true">
          {intervals.map((row, i) => (
            <div
              key={row.label}
              className={selected === row.label ? 'selected' : ''}
              style={{ width: pct(row.final), '--shade': `${31 + i * 13}%` } as CSSProperties}
            >
              <span>{i + 1}</span>
            </div>
          ))}
          <i style={{ left: pct(draw) }} />
        </div>
        <div className="vl-endpoints">
          <span>0</span>
          <span>1 (excluded)</span>
        </div>
        <Range
          label="Draw position"
          value={motion.progress}
          min={0}
          max={100}
          display={draw.toFixed(3)}
          onChange={motion.seek}
        />
        <div className="vl-result">
          <span>SELECTED TOKEN</span>
          <strong>{selected}</strong>
          <p>u = {draw.toFixed(3)} lies inside this token's interval.</p>
        </div>
        <ol className="vl-intervals">
          {intervals.map((row, i) => (
            <li key={row.label} className={selected === row.label ? 'selected' : ''}>
              <b>
                {i + 1}. {row.label}
              </b>
              <span>
                [{row.start.toFixed(3)}, {row.end.toFixed(3)})
              </span>
              <small>{pct(row.final)}</small>
            </li>
          ))}
        </ol>
        <p className="av-note">
          Square bracket includes the lower bound; round bracket excludes the upper bound. Displayed
          boundaries are rounded; selection uses full precision.
        </p>
      </div>
    </Lab>
  );
}
function Plane({ children }: { children: ReactNode }) {
  return (
    <svg className="vl-plane" viewBox="0 0 600 380" aria-hidden="true">
      <g className="vl-grid">
        {[100, 200, 300, 400, 500].map((x) => (
          <path key={x} d={`M${x} 25V310`} />
        ))}
        {[50, 150, 250].map((y) => (
          <path key={y} d={`M40 ${y}H560`} />
        ))}
      </g>
      <circle cx="300" cy="250" r="100" className="vl-unit-circle" />
      <path d="M40 250H560M300 310V25" className="vl-axis" />
      <text x="562" y="244">
        x
      </text>
      <text x="310" y="30">
        y
      </text>
      <text x="309" y="270">
        0
      </text>
      <text x="400" y="270">
        1
      </text>
      {children}
    </svg>
  );
}
function Arrow({
  angle,
  length,
  query = false,
}: {
  angle: number;
  length: number;
  query?: boolean;
}) {
  return (
    <g transform="translate(300 250)">
      <g
        className={`vl-arrow ${query ? 'query' : ''}`}
        style={{ transform: `rotate(${-angle}deg) scale(${length})` }}
      >
        <path d="M0 0H100m-10-5 10 5-10 5" />
      </g>
    </g>
  );
}
function VectorAngle() {
  const [angle, setAngle] = useState(35),
    [length, setLength] = useState(1.6);
  const candidate = polar(angle, length),
    query: Vector2 = [1, 0];
  return (
    <Lab title="Direction and length tell different stories" credit={geometryCredit}>
      <p className="av-intro">
        Dashed arrow: query (1, 0). Solid arrow: your candidate. The dotted unit circle marks length
        one. Every value below is calculated from these coordinates.
      </p>
      <Plane>
        <Arrow angle={0} length={1} query />
        <Arrow angle={angle} length={length} />
      </Plane>
      <div className="vl-controls">
        <Range
          label="Candidate angle"
          value={angle}
          min={0}
          max={180}
          onChange={setAngle}
          display={angle + '°'}
        />
        <Range
          label="Candidate length"
          value={length}
          min={0.25}
          max={2}
          step={0.05}
          onChange={setLength}
          display={length.toFixed(2)}
        />
      </div>
      <div className="vl-stats">
        {(['cosine', 'dot', 'distance'] as const).map((metric) => (
          <div key={metric}>
            <span>
              {metric === 'cosine'
                ? 'Cosine similarity'
                : metric === 'dot'
                  ? 'Dot product'
                  : 'Euclidean distance'}
            </span>
            <output aria-label={metric + ' value'}>
              {vectorScore(query, candidate, metric).toFixed(3)}
            </output>
          </div>
        ))}
      </div>
      <p className="av-note">
        Candidate coordinates: ({candidate[0].toFixed(3)}, {candidate[1].toFixed(3)}). Negative
        cosine is possible; it is not a negative relevance percentage.
      </p>
    </Lab>
  );
}
function VectorRank() {
  const [angle, setAngle] = useState(0),
    [metric, setMetric] = useState<SimilarityMetric>('cosine'),
    [unit, setUnit] = useState(false);
  const query = polar(angle);
  const rows = VECTOR_FIXTURE.map((r) => {
    const vector = unit ? normalize(r.vector) : r.vector;
    return { ...r, vector, score: vectorScore(query, vector, metric) };
  }).sort((a, b) => (metric === 'distance' ? a.score - b.score : b.score - a.score));
  const labels: Record<SimilarityMetric, string> = {
    cosine: 'Cosine',
    dot: 'Dot product',
    distance: 'Euclidean',
  };
  return (
    <Lab title="Same candidates, a different nearest neighbor" credit={geometryCredit}>
      <p className="av-intro">
        Choose a metric, rotate the query, then normalize the candidates. The query always has unit
        length. A–D are coordinate identifiers, not document topics.
      </p>
      <div className="av-choices" role="group" aria-label="Similarity metric">
        {(['cosine', 'dot', 'distance'] as const).map((m) => (
          <button type="button" key={m} aria-pressed={m === metric} onClick={() => setMetric(m)}>
            {labels[m]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="av-button"
        aria-pressed={unit}
        onClick={() => setUnit(!unit)}
      >
        Normalize candidates: {unit ? 'on' : 'off'}
      </button>
      <Plane>
        <Arrow angle={angle} length={1} query />
        {rows.map((row) => (
          <g
            key={row.id}
            className="vl-vector-point"
            style={{
              transform: `translate(${300 + row.vector[0] * 100}px, ${250 - row.vector[1] * 100}px)`,
            }}
          >
            <circle r="7" />
            <text x="10" y="-10">
              {row.id}
            </text>
          </g>
        ))}
      </Plane>
      <Range
        label="Query angle"
        value={angle}
        min={0}
        max={180}
        display={angle + '°'}
        onChange={setAngle}
      />
      <div className="av-status" role="status">
        Nearest candidate: {rows[0].id} ·{' '}
        {metric === 'distance' ? 'lower distance' : 'higher similarity'} ranks first
      </div>
      <div className="av-table">
        <div role="region" aria-label="Candidate coordinates and scores" tabIndex={0}>
          <table>
            <caption>
              {labels[metric]} · {unit ? 'normalized' : 'raw'} candidates
            </caption>
            <thead>
              <tr>
                <th scope="col">Rank / ID</th>
                <th scope="col">x, y</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <th scope="row">
                    {i + 1} / {r.id}
                  </th>
                  <td>{r.vector.map((v) => v.toFixed(2)).join(', ')}</td>
                  <td>{r.score.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="av-note">
        Scores are not interchangeable across metrics. Ties keep the fixture's A–D order. Cosine is
        undefined for zero vectors, which this experiment excludes.
      </p>
    </Lab>
  );
}
function QueueTimeline() {
  const [slots, setSlots] = useState(2),
    [long, setLong] = useState(8),
    [policy, setPolicy] = useState<QueuePolicy>('continuous');
  const jobs = queueSchedule(slots, long, policy),
    end = Math.max(...jobs.map((j) => j.end));
  const max = Math.max(...queueSchedule(slots, long, 'fixed').map((j) => j.end), end);
  return (
    <Lab title="Separate the queue from the work" credit={queueCredit}>
      <p className="av-intro">
        Six jobs arrive at tick zero. Switch the admission rule: dashed segments are waiting; filled
        segments are service. Both policies share the same time axis at each capacity.
      </p>
      <div className="av-choices" role="group" aria-label="Admission policy">
        {(['continuous', 'fixed'] as const).map((p) => (
          <button type="button" key={p} aria-pressed={p === policy} onClick={() => setPolicy(p)}>
            {p === 'continuous' ? 'Continuous admission' : 'Fixed batches'}
          </button>
        ))}
      </div>
      <div className="vl-controls">
        <Range label="Concurrent slots" min={1} max={4} value={slots} onChange={setSlots} />
        <Range label="Job B tokens" min={8} max={12} value={long} onChange={setLong} />
      </div>
      <div className="vl-timeline" aria-hidden="true">
        {jobs.map((job) => (
          <div className="vl-job-row" key={job.id}>
            <b>{job.id}</b>
            <div>
              <span className="vl-wait" style={{ width: pct(job.start / max) }} />
              <span
                className="vl-service"
                style={{ left: pct(job.start / max), width: pct(job.length / max) }}
              />
            </div>
            <small>{job.end}</small>
          </div>
        ))}
      </div>
      <div className="vl-endpoints">
        <span>0 ticks</span>
        <span>{max} ticks</span>
      </div>
      <div className="vl-stats">
        <div>
          <span>All jobs complete</span>
          <output aria-label="Completion ticks">{end} ticks</output>
        </div>
        <div>
          <span>Mean queue wait</span>
          <output>{(jobs.reduce((a, j) => a + j.start, 0) / jobs.length).toFixed(2)} ticks</output>
        </div>
      </div>
      <div className="av-table">
        <div role="region" aria-label="Exact queue timings" tabIndex={0}>
          <table>
            <caption>Each job's timing · arrival at tick 0</caption>
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">Wait</th>
                <th scope="col">Service</th>
                <th scope="col">Complete</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <th scope="row">{j.id}</th>
                  <td>{j.start}</td>
                  <td>{j.length}</td>
                  <td>{j.end}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="av-note">
        Abstract ticks only. First output occurs one tick after service starts. Increasing slots
        here does not increase per-tick compute cost; real hardware does not have that guarantee.
      </p>
    </Lab>
  );
}
function QueueReplay() {
  const motion = useProcessMotion(),
    jobs = queueSchedule(2),
    end = Math.max(...jobs.map((j) => j.end));
  const tick = Math.round((motion.progress / 100) * end),
    snapshot = queueSnapshot(jobs, tick);
  return (
    <Lab title="Watch a finished job give up its slot" credit={queueCredit}>
      <p className="av-intro">
        Fixed replay: two slots, continuous admission, lengths 2 / 8 / 3 / 6 / 2 / 4. This figure is
        independent of the settings above.
      </p>
      <div ref={motion.ref} className="vl-motion" data-progress={motion.progress}>
        <MotionControls motion={motion} />
        <Range
          label="Queue tick"
          min={0}
          max={end}
          value={tick}
          onChange={(n) => motion.seek((n / end) * 100)}
          display={tick + ' / ' + end}
        />
        <div className="vl-stats vl-queue-counts">
          {['Waiting', 'Active', 'Completed'].map((s) => (
            <div key={s}>
              <span>{s}</span>
              <output>{snapshot.filter((j) => j.state === s).length}</output>
            </div>
          ))}
        </div>
        <div className="vl-job-cards">
          {snapshot.map((j) => (
            <div className={'vl-job-card ' + j.state.toLowerCase()} key={j.id}>
              <div>
                <strong>Job {j.id}</strong>
                <span>{j.state}</span>
              </div>
              <div className="vl-tokens" aria-hidden="true">
                {Array.from({ length: j.length }, (_, i) => (
                  <i className={i < j.produced ? 'done' : ''} key={i} />
                ))}
              </div>
              <p>
                {j.produced} / {j.length} tokens · starts {j.start}, finishes {j.end}
              </p>
            </div>
          ))}
        </div>
        <p className="av-note">
          Snapshot is taken after admission at each tick boundary. At tick 2, A is completed and C
          is active with zero tokens. The table in the first figure supplies a static alternative to
          replay.
        </p>
      </div>
    </Lab>
  );
}
export function VisualLab({ kind }: { kind: LabKind }) {
  switch (kind) {
    case 'distribution':
      return <Distribution />;
    case 'sample-draw':
      return <SampleDraw />;
    case 'vector-angle':
      return <VectorAngle />;
    case 'vector-rank':
      return <VectorRank />;
    case 'queue-timeline':
      return <QueueTimeline />;
    case 'queue-replay':
      return <QueueReplay />;
  }
}
