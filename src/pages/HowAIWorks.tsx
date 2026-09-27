import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Check,
  CheckCheck,
  Cpu,
  Eye,
  FileText,
  GitBranch,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from 'lucide-react';
import {
  temperatureDistribution,
  TRAINING_POINTS,
  trainingLoss,
  trainingStep,
} from '../lib/ai-lab';
import './how-ai-works.css';

const CHAPTERS = [
  ['tokens', 'Tokens'],
  ['meaning', 'Meaning'],
  ['attention', 'Attention'],
  ['prediction', 'Prediction'],
  ['learning', 'Learning'],
  ['grounding', 'Grounding'],
  ['modalities', 'Beyond text'],
  ['judgment', 'Judgment'],
] as const;
const variable = (values: Record<string, string | number>) => values as CSSProperties;

function Chapter({
  id,
  number,
  eyebrow,
  title,
  children,
}: {
  id: string;
  number: string;
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="ai-chapter ai-scene" aria-labelledby={`${id}-title`}>
      <div className="ai-chapter-heading">
        <span className="ai-kicker">
          {number} / {eyebrow}
        </span>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** Runs only while scrolling/settling. Animation loops are CSS and pause out of view. */
function useStoryMotion(paused: boolean) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState('tokens');
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const scenes = [...node.querySelectorAll<HTMLElement>('.ai-scene')];
    const visible = new Set<HTMLElement>();
    let frame = 0;
    let eased = 0;
    let last = 0;
    const updatePreference = () => {
      setReduced(preference.matches);
      request();
    };
    const paint = (time: number) => {
      frame = 0;
      const dt = last ? Math.min(64, time - last) : 16;
      last = time;
      const height = window.innerHeight;
      const rect = node.getBoundingClientRect();
      const goal = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - height)));
      eased += (goal - eased) * (1 - Math.exp(-dt / 100));
      if (Math.abs(goal - eased) < 0.0001) eased = goal;
      node.style.setProperty('--reading', String(eased));
      let chapter = 'tokens';
      for (const scene of scenes) {
        const bounds = scene.getBoundingClientRect();
        if (scene.classList.contains('ai-chapter') && bounds.top < height * 0.46)
          chapter = scene.id;
        if (visible.has(scene)) {
          const progress = Math.min(
            1,
            Math.max(0, (height - bounds.top) / (height + bounds.height)),
          );
          scene.style.setProperty(
            '--travel',
            paused || preference.matches ? '0' : String((progress - 0.5) * 2),
          );
        }
      }
      setActive(chapter);
      if (eased !== goal && !document.hidden) frame = requestAnimationFrame(paint);
      else last = 0;
    };
    const request = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(paint);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          target.dataset.visible = String(entry.isIntersecting);
          if (entry.isIntersecting) {
            visible.add(target);
            target.dataset.seen = 'true';
          } else visible.delete(target);
        }
        request();
      },
      { rootMargin: '80px 0px', threshold: 0 },
    );
    scenes.forEach((scene) => observer.observe(scene));
    const visibility = () => {
      node.dataset.hidden = String(document.hidden);
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
      } else request();
    };
    preference.addEventListener('change', updatePreference);
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    document.addEventListener('visibilitychange', visibility);
    updatePreference();
    visibility();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      preference.removeEventListener('change', updatePreference);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [paused]);
  return { root, active, reduced };
}

function NeuralCore() {
  return (
    <div className="ai-core" aria-hidden="true">
      <div className="ai-core-grid" />
      <div className="ai-orbit ai-orbit-one">
        <i />
      </div>
      <div className="ai-orbit ai-orbit-two">
        <i />
      </div>
      <div className="ai-orbit ai-orbit-three">
        <i />
      </div>
      <div className="ai-core-sphere">
        <svg viewBox="0 0 360 360">
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse
              key={i}
              cx="180"
              cy="180"
              rx={24 + i * 12}
              ry="157"
              transform={`rotate(${i * 15} 180 180)`}
            />
          ))}
          {Array.from({ length: 28 }, (_, i) => {
            const angle = i * 2.39996;
            const radius = 36 + ((i * 31) % 120);
            return (
              <circle
                key={i}
                className="ai-core-node"
                cx={180 + Math.cos(angle) * radius}
                cy={180 + Math.sin(angle) * radius}
                r={i % 4 === 0 ? 3 : 1.5}
                style={variable({ '--delay': `${i * -0.19}s` })}
              />
            );
          })}
        </svg>
        <div className="ai-core-glow" />
      </div>
      <span className="ai-orbit-label ai-orbit-label-one">PATTERNS</span>
      <span className="ai-orbit-label ai-orbit-label-two">CONTEXT</span>
      <span className="ai-orbit-label ai-orbit-label-three">PROBABILITIES</span>
    </div>
  );
}

const TOKEN_EXAMPLES = [
  {
    label: 'Language',
    text: 'Curiosity changes everything.',
    pieces: ['Cur', 'iosity', ' changes', ' everything', '.'],
  },
  {
    label: 'Code',
    text: 'print("Hello, world!")',
    pieces: ['print', '("', 'Hello', ',', ' world', '!', '")'],
  },
  {
    label: 'Multilingual',
    text: 'Hello · こんにちは · مرحبا',
    pieces: ['Hello', ' ·', ' こん', 'にちは', ' ·', ' مر', 'حبا'],
  },
];
function TokenLab() {
  const [example, setExample] = useState(0);
  const [selected, setSelected] = useState(0);
  const data = TOKEN_EXAMPLES[example];
  return (
    <div className="ai-lab ai-token-lab">
      <div className="ai-lab-top">
        <span>
          <ScanLine size={15} /> TOKEN WORKBENCH
        </span>
        <span>01 → 02</span>
      </div>
      <div className="ai-switches" aria-label="Token examples">
        {TOKEN_EXAMPLES.map((item, i) => (
          <button
            key={item.label}
            aria-pressed={example === i}
            onClick={() => {
              setExample(i);
              setSelected(0);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="ai-input-sentence" dir="auto">
        {data.text}
      </div>
      <div className="ai-transfer-line" aria-hidden="true">
        <span />
        <ArrowDown size={20} />
        <span />
      </div>
      <div className="ai-token-pieces" aria-label="Illustrative token pieces">
        {data.pieces.map((piece, i) => (
          <button
            key={`${example}-${i}`}
            aria-pressed={selected === i}
            aria-label={`Inspect token ${i + 1}: ${piece.trim()}`}
            onClick={() => setSelected(i)}
            style={variable({ '--order': i })}
          >
            <span dir="auto">{piece.replace(/^ /, '␣')}</span>
            <small>{String(i + 1).padStart(2, '0')}</small>
          </button>
        ))}
      </div>
      <div className="ai-token-inspect" aria-live="polite">
        <span>
          SELECTED PIECE <strong dir="auto">{data.pieces[selected].replace(/^ /, '␣')}</strong>
        </span>
        <p>
          A lookup maps this piece to a vocabulary ID, then to a learned vector. The space marker ␣
          makes a leading space visible.
        </p>
      </div>
      <p className="ai-caption">
        Hand-made splits for teaching, not the output of a real tokenizer. Actual boundaries and IDs
        depend on the tokenizer.
      </p>
    </div>
  );
}

function MeaningLab() {
  const [context, setContext] = useState<'river' | 'money'>('river');
  const river = context === 'river';
  const words = [
    { x: 110, y: 108, name: 'river', group: true },
    { x: 180, y: 80, name: 'shore', group: true },
    { x: 138, y: 163, name: 'water', group: true },
    { x: 360, y: 210, name: 'deposit', group: false },
    { x: 432, y: 178, name: 'money', group: false },
    { x: 402, y: 268, name: 'account', group: false },
  ];
  return (
    <div className="ai-lab ai-meaning-lab">
      <div className="ai-lab-top">
        <span>
          <Waypoints size={15} /> A MAP OF RELATIONSHIPS
        </span>
        <span>ILLUSTRATION</span>
      </div>
      <div className="ai-switches" aria-label="Meaning of bank">
        <button aria-pressed={river} onClick={() => setContext('river')}>
          A river bank
        </button>
        <button aria-pressed={!river} onClick={() => setContext('money')}>
          A savings bank
        </button>
      </div>
      <svg
        className="ai-semantic-map"
        viewBox="0 0 560 350"
        role="img"
        aria-label={`Illustrative bank representation moves near ${river ? 'river, shore, and water' : 'deposit, money, and account'}`}
      >
        {[60, 120, 180, 240, 300].map((y) => (
          <path className="ai-map-grid" key={y} d={`M30 ${y}H530`} />
        ))}
        {[70, 140, 210, 280, 350, 420, 490].map((x) => (
          <path className="ai-map-grid" key={x} d={`M${x} 30V320`} />
        ))}
        {words.map((word) => (
          <g
            key={word.name}
            className={word.group === river ? 'ai-map-word is-near' : 'ai-map-word'}
          >
            <line x1={river ? 218 : 325} y1={river ? 140 : 242} x2={word.x} y2={word.y} />
            <circle cx={word.x} cy={word.y} r="4" />
            <text x={word.x + 10} y={word.y - 10}>
              {word.name}
            </text>
          </g>
        ))}
        <g
          className="ai-map-focus"
          style={{ transform: `translate(${river ? 218 : 325}px, ${river ? 140 : 242}px)` }}
        >
          <circle r="29" />
          <circle r="38" className="ai-map-halo" />
          <text textAnchor="middle" y="5">
            bank
          </text>
        </g>
      </svg>
      <p className="ai-caption">
        Positions are hand-placed. Real representations have many dimensions; this map illustrates a
        contextual change, not measured distances.
      </p>
    </div>
  );
}

const ATTENTION_WORDS = ['The', 'robot', 'lifted', 'the', 'box', 'because', 'it', 'was', 'heavy'];
const attentionScores = (row: number) =>
  ATTENTION_WORDS.map((_, column) =>
    column > row
      ? 0
      : column === row
        ? 0.22
        : row >= 6 && column === 4
          ? 0.92
          : column === 1
            ? 0.52
            : 0.1 + ((row + column * 3) % 4) * 0.07,
  );
function AttentionLab() {
  const [selected, setSelected] = useState(6);
  const scores = attentionScores(selected);
  const total = scores.reduce((sum, value) => sum + value, 0);
  return (
    <div className="ai-lab ai-attention-lab">
      <div className="ai-lab-top">
        <span>
          <GitBranch size={15} /> RELATIONSHIP LENS
        </span>
        <span>CAUSAL ATTENTION</span>
      </div>
      <p className="ai-lab-instruction">Select a word to inspect its available context.</p>
      <div className="ai-word-line">
        {ATTENTION_WORDS.map((word, i) => (
          <button key={i} aria-pressed={selected === i} onClick={() => setSelected(i)}>
            {word}
          </button>
        ))}
      </div>
      <div className="ai-attention-display">
        <div
          className="ai-attention-matrix"
          role="img"
          aria-label={`Nine by nine toy causal attention matrix. Selected row: ${ATTENTION_WORDS[selected]}. Future positions are masked.`}
        >
          {ATTENTION_WORDS.flatMap((_, row) =>
            attentionScores(row).map((score, column) => (
              <i
                key={`${row}-${column}`}
                className={row === selected ? 'is-selected' : ''}
                style={variable({
                  '--strength': column > row ? 0.035 : score,
                  '--cell-delay': `${(row + column) * 0.06}s`,
                })}
              />
            )),
          )}
        </div>
        <div className="ai-attention-readout">
          <span className="ai-kicker">QUERY POSITION {selected + 1}</span>
          <strong>“{ATTENTION_WORDS[selected]}”</strong>
          <p>Earlier positions and itself are visible. Future positions are masked.</p>
          <span className="ai-attention-key">
            <i /> Available <i /> Future
          </span>
        </div>
      </div>
      <div className="ai-attention-weights" aria-label="Illustrative normalized attention weights">
        {ATTENTION_WORDS.map((word, i) => (
          <div key={i}>
            <span>{word}</span>
            <div>
              <i style={{ width: `${(scores[i] / total) * 100}%` }} />
            </div>
            <small>{Math.round((scores[i] / total) * 100)}%</small>
          </div>
        ))}
      </div>
      <p className="ai-caption">
        Invented weights for one teaching example. Attention patterns are not a complete explanation
        of a model’s reasoning or a grammatical proof.
      </p>
    </div>
  );
}

const CANDIDATES = ['sunlight', 'light', 'energy', 'sound'];
function PredictionLab() {
  const [temperature, setTemperature] = useState(0.8);
  const [draw, setDraw] = useState<{ index: number; count: number } | null>(null);
  const probabilities = temperatureDistribution([2.6, 1.7, 0.8, -0.2], temperature);
  const sample = () => {
    let random = Math.random();
    let index = probabilities.length - 1;
    for (let i = 0; i < probabilities.length; i++) {
      random -= probabilities[i];
      if (random <= 0) {
        index = i;
        break;
      }
    }
    setDraw((previous) => ({ index, count: (previous?.count ?? 0) + 1 }));
  };
  return (
    <div className="ai-lab ai-prediction-lab">
      <div className="ai-lab-top">
        <span>
          <Sparkles size={15} /> NEXT-TOKEN STUDIO
        </span>
        <span>TOY DISTRIBUTION</span>
      </div>
      <p className="ai-prompt">
        The moon reflects <span className="ai-cursor" aria-hidden="true" />
      </p>
      <div className="ai-probabilities">
        {CANDIDATES.map((word, i) => (
          <div key={word} className={draw?.index === i ? 'is-drawn' : ''}>
            <span>{word}</span>
            <div>
              <i style={{ transform: `scaleX(${probabilities[i]})` }} />
            </div>
            <strong>
              {(probabilities[i] * 100).toFixed(1)}
              <small>%</small>
            </strong>
          </div>
        ))}
      </div>
      <label className="ai-slider" htmlFor="ai-temperature">
        <span>
          Temperature <output>{temperature.toFixed(1)}</output>
        </span>
        <input
          id="ai-temperature"
          type="range"
          min="0.2"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (next !== temperature) {
              setTemperature(next);
              setDraw(null);
            }
          }}
        />
        <span className="ai-slider-scale">
          <small>More concentrated</small>
          <small>More spread out</small>
        </span>
      </label>
      <div className="ai-lab-actions">
        <button className="ai-button" onClick={sample}>
          <Play size={14} /> Draw a token
        </button>
        <span className="ai-draw-result" aria-live="polite">
          {draw
            ? `Draw ${draw.count}: “${CANDIDATES[draw.index]}”`
            : 'Try a draw. Then change the temperature.'}
        </span>
      </div>
      <p className="ai-caption">
        Real softmax arithmetic on invented scores, with four candidates only. A sampled token can
        be factually wrong. This demo makes no AI API calls.
      </p>
    </div>
  );
}

function TrainingLab() {
  const [weights, setWeights] = useState([0.35]);
  const weight = weights[weights.length - 1];
  const steps = weights.length - 1;
  return (
    <div className="ai-lab ai-training-lab">
      <div className="ai-lab-top">
        <span>
          <Cpu size={15} /> TRAIN A TINY MODEL
        </span>
        <span>y = w × x</span>
      </div>
      <div className="ai-training-stats">
        <span>
          Step<strong>{String(steps).padStart(2, '0')}</strong>
        </span>
        <span>
          Weight<strong>{weight.toFixed(3)}</strong>
        </span>
        <span>
          Mean squared error
          <strong data-testid="training-loss">{trainingLoss(weight).toFixed(4)}</strong>
        </span>
      </div>
      <svg
        className="ai-training-plot"
        viewBox="0 0 520 300"
        role="img"
        aria-label={`Training examples follow y equals two x. Current model weight ${weight.toFixed(3)}; error ${trainingLoss(weight).toFixed(4)}.`}
      >
        {[0, 2, 4, 6].map((y) => (
          <g key={y}>
            <path d={`M48 ${260 - y * 35}H480`} className="ai-map-grid" />
            <text x="24" y={264 - y * 35}>
              {y}
            </text>
          </g>
        ))}
        <path d="M48 25V260H480" className="ai-plot-axis" />
        {[0, 1, 2, 3].map((x) => (
          <text key={x} x={48 + x * 135} y="284" textAnchor="middle">
            {x}
          </text>
        ))}
        <path d="M48 260L453 50" className="ai-target-line" />
        {TRAINING_POINTS.map((x) => (
          <g key={x}>
            <line
              className="ai-error-line"
              x1={48 + x * 135}
              x2={48 + x * 135}
              y1={260 - x * 2 * 35}
              y2={260 - x * weight * 35}
            />
            <circle cx={48 + x * 135} cy={260 - x * 2 * 35} r="5" className="ai-data-point" />
          </g>
        ))}
        <line className="ai-model-line" x1="48" y1="260" x2="453" y2={260 - 3 * weight * 35} />
        <text x="467" y="283">
          x
        </text>
        <text x="24" y="22">
          y
        </text>
      </svg>
      <div className="ai-plot-key">
        <span>
          <i /> Training examples
        </span>
        <span>
          <i /> Model prediction
        </span>
      </div>
      <div className="ai-lab-actions">
        <button
          className="ai-button"
          disabled={steps >= 18}
          onClick={() =>
            setWeights((previous) => [...previous, trainingStep(previous[previous.length - 1])])
          }
        >
          <ArrowRight size={16} /> {steps >= 18 ? 'Training complete' : 'Take a learning step'}
        </button>
        <button
          className="ai-icon-button"
          onClick={() => setWeights([0.35])}
          aria-label="Reset training"
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <p className="ai-caption">
        A real one-parameter gradient-descent experiment on six invented points. Target: y = 2x.
        Learning rate: 0.045. Large language models train many more parameters on far more varied
        objectives and data.
      </p>
    </div>
  );
}

function GroundingLab() {
  const [grounded, setGrounded] = useState(false);
  return (
    <div className={`ai-lab ai-grounding-lab ${grounded ? 'is-grounded' : ''}`}>
      <div className="ai-lab-top">
        <span>
          <BookOpen size={15} /> EVIDENCE CHANGES THE ANSWER
        </span>
        <span>FICTIONAL MUSEUM</span>
      </div>
      <div className="ai-switches" aria-label="Evidence mode">
        <button aria-pressed={!grounded} onClick={() => setGrounded(false)}>
          Without a source
        </button>
        <button aria-pressed={grounded} onClick={() => setGrounded(true)}>
          Add a source
        </button>
      </div>
      <p className="ai-ground-question">“When does the museum’s quiet hour begin?”</p>
      <div className="ai-retrieval-flow" aria-hidden="true">
        <ScanLine />
        <i />
        <FileText />
        <i />
        <Sparkles />
      </div>
      <div className="ai-source-card">
        <FileText size={22} />
        <div>
          <span className="ai-kicker">
            {grounded ? 'RETRIEVED / VISITOR GUIDE' : 'NO RELEVANT DOCUMENT'}
          </span>
          <p>
            {grounded
              ? '“Quiet hour runs from 09:00 to 10:00 every Wednesday.”'
              : 'The request contains no schedule. A plausible time would still be a guess.'}
          </p>
        </div>
      </div>
      <div className="ai-answer-card" aria-live="polite">
        <span className="ai-kicker">{grounded ? 'SUPPORTED ANSWER' : 'APPROPRIATE RESPONSE'}</span>
        <p>
          {grounded
            ? 'Quiet hour begins at 09:00 on Wednesdays, according to the visitor guide.'
            : 'I do not have the museum’s schedule. Share the visitor guide so I can check.'}
        </p>
        {grounded && (
          <span className="ai-evidence-tag">
            <CheckCheck size={14} /> Supported by the supplied passage
          </span>
        )}
      </div>
      <p className="ai-caption">
        Both responses are authored demonstrations. Retrieval can supply evidence; it does not
        guarantee that a document is current, trustworthy, or interpreted correctly.
      </p>
    </div>
  );
}

const CHECKS = [
  {
    question: 'You send another message. Did you retrain the model?',
    options: [
      'Yes, every message rewrites the weights.',
      'Usually no. The message changes the context used for inference.',
    ],
    answer: 1,
    explanation:
      'Ordinary inference uses existing weights. Training, stored memory, and conversation context are separate mechanisms. A provider may have a separate data-use policy.',
  },
  {
    question: 'A token has the highest probability. Is its claim true?',
    options: [
      'Not necessarily. Likelihood is not factual verification.',
      'Yes, probability is a fact-checking score.',
    ],
    answer: 0,
    explanation:
      'The distribution predicts a continuation under the model and context. Evidence, tools, and independent checking are still needed to establish factual support.',
  },
  {
    question: 'An agent can see a tool. May it use it for any action?',
    options: [
      'Yes, a tool description grants permission.',
      'No. The application must enforce the user’s actual permissions.',
    ],
    answer: 1,
    explanation:
      'Tool access and authorization are different. A model proposes an action; trusted application code validates identity, arguments, scope, and any required approval.',
  },
];
function KnowledgeCheck() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  return (
    <div className="ai-checks">
      {CHECKS.map((item, i) => (
        <fieldset key={item.question}>
          <legend>
            <span>0{i + 1}</span>
            {item.question}
          </legend>
          <div className="ai-check-options">
            {item.options.map((option, j) => (
              <button
                key={option}
                aria-pressed={answers[i] === j}
                className={
                  answers[i] === j ? (answers[i] === item.answer ? 'is-correct' : 'is-revisit') : ''
                }
                onClick={() => setAnswers((previous) => ({ ...previous, [i]: j }))}
              >
                {option}
                {answers[i] === j && <Check size={16} />}
              </button>
            ))}
          </div>
          {answers[i] !== undefined && (
            <p className="ai-check-feedback" role="status">
              <strong>{answers[i] === item.answer ? 'Exactly. ' : 'Take another look. '}</strong>
              {item.explanation}
            </p>
          )}
        </fieldset>
      ))}
    </div>
  );
}

export default function HowAIWorks() {
  const [paused, setPaused] = useState(false);
  const { root, active, reduced } = useStoryMotion(paused);
  const still = paused || reduced;
  return (
    <div ref={root} className="ai-story" data-paused={still}>
      <div className="ai-reading-progress" aria-hidden="true">
        <i />
      </div>
      <section className="ai-intro ai-scene" aria-labelledby="ai-story-title">
        <div className="ai-intro-noise" aria-hidden="true" />
        <div className="ai-intro-copy">
          <span className="ai-kicker">
            <span className="ai-signal" /> ARTIFICIALS / AN INTERACTIVE FIELD GUIDE
          </span>
          <h1 id="ai-story-title">
            Inside the
            <br />
            <span>intelligence.</span>
          </h1>
          <p>
            From a few words to a world of possibilities.
            <br className="ai-desktop-break" /> Follow the signal. See how AI works.
          </p>
          <a className="ai-button ai-start" href="#tokens">
            Enter the model <ArrowDown size={17} />
          </a>
          <div className="ai-intro-facts">
            <span>08 chapters</span>
            <span>07 hands-on experiments</span>
            <span>No account. Just curiosity.</span>
          </div>
        </div>
        <NeuralCore />
        <div className="ai-intro-bottom">
          <span>
            INPUT <i /> REPRESENTATION <i /> OUTPUT
          </span>
          <span>
            SCROLL TO EXPLORE <ArrowDown size={13} />
          </span>
        </div>
      </section>

      <div className="ai-story-controls">
        <nav aria-label="AI journey chapters">
          {CHAPTERS.map(([id, title], index) => (
            <a key={id} href={`#${id}`} aria-current={active === id ? 'step' : undefined}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {title}
            </a>
          ))}
        </nav>
        <button
          className="ai-motion-control"
          aria-label={
            reduced ? 'Reduced motion enabled' : still ? 'Resume animation' : 'Pause animation'
          }
          aria-pressed={still}
          disabled={reduced}
          onClick={() => setPaused((value) => !value)}
          title={
            reduced
              ? 'Reduced motion follows your device preference'
              : still
                ? 'Resume ambient animation'
                : 'Pause ambient animation'
          }
        >
          {still ? <Play size={14} /> : <Pause size={14} />}
          <span>{reduced ? 'Reduced motion' : still ? 'Motion paused' : 'Pause motion'}</span>
        </button>
      </div>

      <div className="ai-story-body">
        <div className="ai-orientation">
          <span className="ai-kicker">BEFORE WE GO IN</span>
          <p>
            AI is a family of methods, not one machine. This journey follows a{' '}
            <strong>transformer-based language model</strong>, then steps out to the systems around
            it. The visuals are simplified teaching models, not a live view into a commercial AI.
          </p>
        </div>

        <Chapter
          id="tokens"
          number="01"
          eyebrow="TURN LANGUAGE INTO SIGNAL"
          title={
            <>
              First, the words
              <br />
              <em>become pieces.</em>
            </>
          }
        >
          <div className="ai-split">
            <div className="ai-explain">
              <p className="ai-lead">
                A model does not receive a sentence in the same way you read one. A tokenizer
                converts text into units called tokens.
              </p>
              <p>
                A token might be a word, part of a word, punctuation, or bytes. Different tokenizers
                split the same text differently. The vocabulary gives each piece an identifier that
                the network can use.
              </p>
              <p>
                That is why character counts and token counts are different. A short phrase in one
                language may occupy more tokens than an equally meaningful phrase in another.
              </p>
              <div className="ai-margin-note">
                <ScanLine size={20} />
                <p>
                  <strong>Try it.</strong> Switch between language and code, then select a piece.
                  Notice how spaces and punctuation become part of the representation.
                </p>
              </div>
            </div>
            <TokenLab />
          </div>
          <div className="ai-pipeline" aria-label="Text processing sequence">
            {['Your text', 'Token pieces', 'Vocabulary IDs', 'Learned vectors'].map((label, i) => (
              <div key={label}>
                <span>0{i + 1}</span>
                <strong>{label}</strong>
                {i < 3 && <ArrowRight size={18} aria-hidden="true" />}
              </div>
            ))}
          </div>
        </Chapter>

        <Chapter
          id="meaning"
          number="02"
          eyebrow="A SPACE OF RELATIONSHIPS"
          title={
            <>
              Meaning takes
              <br />
              <em>a numerical shape.</em>
            </>
          }
        >
          <div className="ai-split ai-split-reverse">
            <MeaningLab />
            <div className="ai-explain">
              <p className="ai-lead">
                Each token starts as a learned vector: a list of numbers the network can transform.
              </p>
              <p>
                These numbers are not a dictionary definition. They provide a representation learned
                from patterns in data. Position information helps the model distinguish different
                orders of the same pieces.
              </p>
              <p>
                As a token passes through layers, its representation can incorporate surrounding
                context. The word “bank” beside “river” can be processed differently from “bank”
                beside “deposit.”
              </p>
              <div className="ai-margin-note">
                <Waypoints size={20} />
                <p>
                  <strong>Change the context.</strong> Watch “bank” move between two illustrative
                  neighborhoods. Real hidden states cannot be reduced to this neat two-dimensional
                  map.
                </p>
              </div>
            </div>
          </div>
        </Chapter>

        <section
          className="ai-interlude ai-scene"
          aria-label="From representation to transformation"
        >
          <div className="ai-interlude-track" aria-hidden="true">
            PATTERN <span>→</span> CONTEXT <span>→</span> CONNECTION <span>→</span> PATTERN
          </div>
          <p>
            A token starts alone.
            <br />
            <strong>Context changes what it can express.</strong>
          </p>
          <div className="ai-layer-stack" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={variable({ '--layer': i })} />
            ))}
          </div>
        </section>

        <Chapter
          id="attention"
          number="03"
          eyebrow="CONNECT THE RELEVANT PIECES"
          title={
            <>
              A conversation
              <br />
              <em>between positions.</em>
            </>
          }
        >
          <div className="ai-split">
            <div className="ai-explain">
              <p className="ai-lead">
                Attention lets a position combine information from other available positions.
              </p>
              <p>
                A transformer computes query, key, and value vectors. Query–key comparisons become
                normalized weights; those weights mix values into a new representation. Multiple
                heads can form different combinations.
              </p>
              <p>
                In a causal language model, a position cannot attend to future positions. That mask
                is what the dark half of this example shows. Feed-forward transformations, residual
                connections, and normalization also shape what comes next.
              </p>
              <details className="ai-detail">
                <summary>
                  Look under the hood <Layers3 size={16} />
                </summary>
                <p>
                  The standard scaled dot-product form is softmax(QKᵀ / √dₖ + mask)V. This page
                  visualizes the mixing idea; its numbers are invented. A bright cell is not proof
                  of a human-like thought or the sole cause of an answer.
                </p>
                <a
                  href="https://arxiv.org/abs/1706.03762"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read Attention Is All You Need <ArrowUpRight size={14} />
                </a>
              </details>
            </div>
            <AttentionLab />
          </div>
        </Chapter>

        <Chapter
          id="prediction"
          number="04"
          eyebrow="ONE CONTINUATION AT A TIME"
          title={
            <>
              The next token
              <br />
              <em>is a distribution.</em>
            </>
          }
        >
          <div className="ai-split ai-split-reverse">
            <PredictionLab />
            <div className="ai-explain">
              <p className="ai-lead">
                The output layer assigns scores across a vocabulary. A decoding policy turns those
                scores into the next token.
              </p>
              <p>
                The selected token joins the context, and generation repeats. A model can build a
                long answer through many such steps, ending at a stop condition or output limit.
              </p>
              <p>
                Temperature changes how concentrated the distribution is. A higher setting spreads
                probability more widely in this demo; it does not insert knowledge or make a wrong
                answer true.
              </p>
              <div className="ai-margin-note">
                <Sparkles size={20} />
                <p>
                  <strong>Move the slider, then draw.</strong> You may get a less likely
                  continuation. A model’s probability describes its prediction, not a fact-checking
                  verdict.
                </p>
              </div>
            </div>
          </div>
          <div className="ai-cycle" aria-label="Autoregressive generation cycle">
            <span>Read context</span>
            <ArrowRight />
            <span>Score candidates</span>
            <ArrowRight />
            <span>Select a token</span>
            <ArrowRight />
            <span>Append & repeat</span>
          </div>
        </Chapter>

        <Chapter
          id="learning"
          number="05"
          eyebrow="WHERE THE PATTERNS COME FROM"
          title={
            <>
              Prediction is the act.
              <br />
              <em>Learning is the adjustment.</em>
            </>
          }
        >
          <div className="ai-split">
            <div className="ai-explain">
              <p className="ai-lead">
                Training changes parameters to reduce a chosen loss. Inference uses the learned
                parameters to process a new input.
              </p>
              <p>
                In this tiny model, the prediction is y = w × x. The examples follow y = 2x. Each
                button press computes the error gradient and nudges w in a direction that reduces
                the mean squared error.
              </p>
              <p>
                This experiment has one parameter and one simple relationship. Language models have
                many interacting parameters. Pretraining, instruction tuning, and preference-based
                methods can shape different aspects of their behavior.
              </p>
              <div className="ai-margin-note">
                <Cpu size={20} />
                <p>
                  <strong>Train it yourself.</strong> Compare the solid prediction line with the
                  target points. Error on these six points is training error; it does not prove
                  generalization to a different task.
                </p>
              </div>
            </div>
            <TrainingLab />
          </div>
          <div className="ai-contrast">
            <div>
              <span className="ai-kicker">TRAINING</span>
              <h3>Change the weights.</h3>
              <p>
                Examples, an objective, gradients, and an optimizer shape the model. Data quality
                and held-out evaluation matter.
              </p>
            </div>
            <div>
              <span className="ai-kicker">INFERENCE</span>
              <h3>Use the weights.</h3>
              <p>
                A new prompt changes the context. It usually does not retrain the model. Stored
                memories and later provider training are separate processes.
              </p>
            </div>
          </div>
        </Chapter>

        <Chapter
          id="grounding"
          number="06"
          eyebrow="GIVE THE ANSWER SOMETHING TO STAND ON"
          title={
            <>
              A fluent answer
              <br />
              <em>still needs evidence.</em>
            </>
          }
        >
          <div className="ai-split ai-split-reverse">
            <GroundingLab />
            <div className="ai-explain">
              <p className="ai-lead">
                A trained model is not automatically connected to current documents, databases, or
                the web.
              </p>
              <p>
                Retrieval-augmented generation adds relevant source material to the context. The
                application retrieves evidence; the model uses that evidence to compose an answer.
                Useful citations should point to passages that actually support the claim.
              </p>
              <p>
                A tool extends the system in another way: a calculator can compute, a database can
                return records, and a search service can find material. The model can propose a tool
                call, but trusted code must validate it and enforce permissions.
              </p>
              <div className="ai-margin-note">
                <ShieldCheck size={20} />
                <p>
                  <strong>Evidence has boundaries.</strong> A retrieved page can be outdated or
                  malicious. Source text is information to evaluate, not authority to change the
                  application’s rules.
                </p>
              </div>
            </div>
          </div>
        </Chapter>

        <Chapter
          id="modalities"
          number="07"
          eyebrow="THE WORLD IS BIGGER THAN TEXT"
          title={
            <>
              Different signals.
              <br />
              <em>Related ideas.</em>
            </>
          }
        >
          <p className="ai-section-lead">
            AI is not limited to next-token text generation. The inputs, representations, and
            training objectives determine what a system can learn to do.
          </p>
          <div className="ai-modalities">
            <div className="ai-modality">
              <div className="ai-modality-visual ai-vision-art" aria-hidden="true">
                {Array.from({ length: 36 }, (_, i) => (
                  <i
                    key={i}
                    style={variable({ '--order': i, '--opacity': 0.15 + ((i * 7) % 10) / 14 })}
                  />
                ))}
                <div className="ai-scan-beam" />
              </div>
              <Eye size={23} />
              <h3>Images become representations.</h3>
              <p>
                Vision systems can encode patches or other visual features. Resolution, cropping,
                and training affect what they preserve. A model cannot reliably read detail that the
                input does not contain.
              </p>
              <Link to="/news/vision-models-resolution-crops-evidence">
                Explore vision <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="ai-modality">
              <div className="ai-modality-visual ai-audio-art" aria-hidden="true">
                {Array.from({ length: 29 }, (_, i) => (
                  <i
                    key={i}
                    style={variable({
                      '--height': `${16 + Math.sin(i * 1.4) ** 2 * 65}%`,
                      '--delay': `${-i * 0.14}s`,
                    })}
                  />
                ))}
              </div>
              <AudioLines size={23} />
              <h3>Audio unfolds through time.</h3>
              <p>
                Speech systems process acoustic information and may predict text or generate sound.
                Background noise, overlapping speakers, and timing all matter. Transcription and
                speaker attribution are different tasks.
              </p>
              <Link to="/news/speech-recognition-wer-critical-errors">
                Explore speech <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="ai-modality">
              <div className="ai-modality-visual ai-diffusion-art" aria-hidden="true">
                <div className="ai-diffusion-noise" />
                <div className="ai-diffusion-shape" />
                <span>NOISE → STRUCTURE</span>
              </div>
              <Layers3 size={23} />
              <h3>Generation can refine a signal.</h3>
              <p>
                Many image generators learn to move from noise toward structured samples, through
                denoising or related flow-based processes. This is a different generation path from
                the text loop above.
              </p>
              <Link to="/news/image-generation-seeds-consistency-workflow">
                Explore image generation <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </Chapter>

        <Chapter
          id="judgment"
          number="08"
          eyebrow="KEEP YOUR CRITICAL INSTINCT"
          title={
            <>
              Impressive output.
              <br />
              <em>Human judgment.</em>
            </>
          }
        >
          <div className="ai-judgment-intro">
            <p className="ai-lead">
              An explanation of the mechanism is a starting point. Trust comes from testing behavior
              against a real purpose.
            </p>
            <p>
              Check sources, look for missing information, and evaluate failures as well as
              successes. A polished response, a long answer, or a high benchmark score cannot
              establish reliability for every task. Try these three checkpoints before you leave.
            </p>
          </div>
          <KnowledgeCheck />
          <div className="ai-takeaway">
            <ShieldCheck size={32} />
            <p>
              Use AI to extend what you can do.
              <br />
              <strong>Keep evidence in the loop.</strong>
            </p>
          </div>
        </Chapter>

        <section className="ai-further ai-scene" aria-labelledby="ai-further-title">
          <div>
            <span className="ai-kicker">CURIOSITY, CONTINUED</span>
            <h2 id="ai-further-title">
              You’ve seen the signal.
              <br />
              <em>Now build something.</em>
            </h2>
            <p>
              Turn the ideas into working Python, or explore the models and evidence behind today’s
              systems.
            </p>
            <div className="ai-end-actions">
              <Link className="ai-button" to="/learn">
                Start learning AI <ArrowRight size={17} />
              </Link>
              <Link className="ai-secondary-link" to="/models">
                Explore the models <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          <div className="ai-reference-list">
            <span className="ai-kicker">GO TO THE SOURCE</span>
            <a
              href="https://huggingface.co/learn/llm-course/chapter2/4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tokenization{' '}
              <span>
                Hugging Face <ArrowUpRight size={14} />
              </span>
            </a>
            <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener noreferrer">
              Attention Is All You Need{' '}
              <span>
                Vaswani et al. <ArrowUpRight size={14} />
              </span>
            </a>
            <a
              href="https://developers.google.com/machine-learning/crash-course/linear-regression/gradient-descent"
              target="_blank"
              rel="noopener noreferrer"
            >
              Gradient descent{' '}
              <span>
                Google ML Crash Course <ArrowUpRight size={14} />
              </span>
            </a>
            <a href="https://arxiv.org/abs/2005.11401" target="_blank" rel="noopener noreferrer">
              Retrieval-augmented generation{' '}
              <span>
                Lewis et al. <ArrowUpRight size={14} />
              </span>
            </a>
            <a
              href="https://huggingface.co/docs/diffusers/using-diffusers/conditional_image_generation"
              target="_blank"
              rel="noopener noreferrer"
            >
              Diffusion models{' '}
              <span>
                Hugging Face <ArrowUpRight size={14} />
              </span>
            </a>
            <p>
              Original illustrations and teaching experiments by Artificials. Sources explain the
              underlying concepts; no external figures or datasets are reproduced.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
