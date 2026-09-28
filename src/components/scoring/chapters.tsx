import type { Scoring } from '../../../shared/scoring';
import { standardError } from '../../../shared/scoring';
import { HUE } from '../descent/kit';
import { createInterlude } from '../descent/scenes/interlude';
import type { Chapter, Pause } from '../descent/Story';
import { ACCURACY, CORRECT, QUESTIONS, interval } from './model';
import {
  createHundreds,
  createKinds,
  createLeaks,
  createNoise,
  createQuestion,
  createScale,
  createVotes,
} from './scenes';

export const SCORING_SOURCES = {
  gpqa: 'https://arxiv.org/abs/2311.12022',
  errors: 'https://arxiv.org/abs/2411.00640',
  swebench: 'https://arxiv.org/abs/2310.06770',
  arena: 'https://arxiv.org/abs/2403.04132',
  livebench: 'https://arxiv.org/abs/2406.19314',
  eci: 'https://epoch.ai/benchmarks/eci',
};

/** Every source the page cites, for the list at its end. */
export const SCORING_REFERENCES: [href: string, text: string][] = [
  [SCORING_SOURCES.gpqa, 'Rein et al., 2023: GPQA: A Graduate-Level Google-Proof Q&A Benchmark'],
  [
    SCORING_SOURCES.errors,
    'Miller, 2024: Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations',
  ],
  [
    SCORING_SOURCES.swebench,
    'Jimenez et al., 2023: SWE-bench: Can Language Models Resolve Real-World GitHub Issues?',
  ],
  [
    SCORING_SOURCES.arena,
    'Chiang et al., 2024: Chatbot Arena: An Open Platform for Evaluating LLMs by Human Preference',
  ],
  [
    SCORING_SOURCES.livebench,
    'White et al., 2024: LiveBench: A Challenging, Contamination-Limited LLM Benchmark',
  ],
  [SCORING_SOURCES.eci, 'Epoch AI: Epoch Capabilities Index'],
];

function Source({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** How many of the rows reach into the first row's range. */
function close(rows: { low?: number; high?: number; score: number }[]) {
  const [leader] = rows;
  return rows.filter(
    (row) =>
      (row.high ?? row.score) >= (leader.low ?? leader.score) &&
      (row.low ?? row.score) <= (leader.high ?? leader.score),
  ).length;
}

/** The page's chapters, their figures worked out from the results they draw. */
export function scoringSequence(scoring: Scoring): (Chapter | Pause)[] {
  const best = scoring.gpqa.rows[0];
  const se = standardError(ACCURACY, QUESTIONS);
  const [low, high] = interval(ACCURACY * 100, se);
  const gpqa = scoring.gpqa.rows.map((row) => {
    const [from, to] = row.stderr !== undefined ? interval(row.score, row.stderr) : [];
    return { score: row.score, low: from, high: to };
  });
  const index = scoring.index.rows;
  const epoch = scoring.sources.find((source) => source.id === 'epoch');
  const arena = scoring.sources.find((source) => source.id === 'arena');
  const results = (source?: { name: string; url: string; license: string; licenseUrl: string }) =>
    source ? (
      <>
        Results: <Source href={source.url}>{source.name}</Source> (
        <Source href={source.licenseUrl}>{source.license}</Source>)
      </>
    ) : undefined;

  return [
    {
      kind: 'chapter',
      id: 'question',
      short: 'One question',
      title: 'One question',
      lede: 'Every benchmark starts small: a question with a known answer.',
      label:
        'A multiple-choice question about why the sky is blue; the model’s probability for each letter appears, it answers B, and the answer is checked against the key.',
      draw: createQuestion(),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              A benchmark is a set of questions with known answers. This one is multiple choice:
              four options, one right.
            </p>
          ),
        },
        {
          heading: 'Weighed',
          body: (
            <p>
              The model’s choice comes from probabilities, like every token it writes. Here they
              fall on four letters.
            </p>
          ),
        },
        {
          heading: 'Answered',
          body: (
            <p>
              It answers B. Many tests let a model reason first, then read only its final answer.
            </p>
          ),
        },
        {
          heading: 'Graded',
          body: (
            <p>
              The answer is checked against the key: one point if it matches, none if it does not.
              No judgement is needed, which makes multiple choice cheap to grade.
            </p>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'hundreds',
      short: 'Hundreds',
      title: 'Hundreds of questions',
      lede: 'One question proves little. A test asks hundreds.',
      label: `A grid of ${QUESTIONS} questions filling in green and red; the score of ${((CORRECT / QUESTIONS) * 100).toFixed(1)}% beside guessing at ${scoring.gpqa.chance}% and the best result today, ${best.score.toFixed(1)}%.`,
      draw: createHundreds(scoring),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              GPQA Diamond has {QUESTIONS} graduate-level questions in biology, chemistry and
              physics, written by experts to be hard to look up.
            </p>
          ),
          fact: (
            <>
              GPQA: <Source href={SCORING_SOURCES.gpqa}>Rein et al., 2023</Source>
            </>
          ),
        },
        {
          heading: 'Answered',
          body: (
            <p>
              An illustrative model answers every question and gets {CORRECT} right, one question at
              a time.
            </p>
          ),
        },
        {
          heading: 'Scored',
          body: (
            <p>
              {CORRECT} of {QUESTIONS} is {((CORRECT / QUESTIONS) * 100).toFixed(1)}%. With four
              choices each, guessing alone scores about {scoring.gpqa.chance}%: the floor is not
              zero.
            </p>
          ),
        },
        {
          heading: 'Near the ceiling',
          body: (
            <p>
              The best result on GPQA Diamond today is {best.score.toFixed(1)}%, by {best.name}.
              When the best models crowd near 100%, a test can no longer tell them apart.
            </p>
          ),
          fact: results(epoch),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'error-bars',
      short: 'Error bars',
      title: 'How sure is a score?',
      lede: 'A score is a measurement, and measurements have error bars.',
      label: `Dots for the scores of other tests of the same kind, the bell curve they follow with its middle 95% shaded, then real GPQA Diamond results with their ranges.`,
      draw: createNoise(scoring),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              Think of the {QUESTIONS} questions as a sample of every question the test could have
              asked. Another sample of the same kind would give a slightly different score.
            </p>
          ),
        },
        {
          heading: 'Error bars',
          body: (
            <p>
              With {QUESTIONS} questions and a score of {Math.round(ACCURACY * 100)}%, the standard
              error is about {se.toFixed(1)} points: 95% of such tests would land between{' '}
              {low.toFixed(1)}% and {high.toFixed(1)}%.
            </p>
          ),
          fact: (
            <>
              Error bars for evaluations:{' '}
              <Source href={SCORING_SOURCES.errors}>Miller, 2024</Source>
            </>
          ),
        },
        {
          heading: 'Real results',
          body: (
            <p>
              Epoch AI publishes a standard error with each result. On GPQA Diamond, {close(gpqa)}{' '}
              of the top eight reach into the leader’s range: too close to rank with confidence.
            </p>
          ),
          fact: results(epoch),
        },
      ],
    },
    {
      kind: 'interlude',
      id: 'part-kinds',
      kicker: 'Part two: other tests',
      question: 'Not every test is a quiz.',
      label: 'Light drifting through the dark, turning from violet to green.',
      draw: createInterlude(HUE.violet, HUE.green, 12),
      from: HUE.violet,
      to: HUE.green,
    },
    {
      kind: 'chapter',
      id: 'kinds',
      short: 'Kinds of test',
      title: 'Four ways to grade',
      lede: 'What counts as right depends on the test.',
      label:
        'Four panels in turn: a letter checked against a key, a number that must match exactly, a code fix run against a project’s tests, and a person voting between two anonymous answers.',
      draw: createKinds(),
      ambient: true,
      steps: [
        {
          body: <p>Multiple choice is graded by matching one letter to the key.</p>,
        },
        {
          heading: 'An exact answer',
          body: (
            <p>
              Maths tests often want a single number and accept only that number. In the AIME exam,
              every answer is a whole number from 0 to 999, so guessing almost never works.
            </p>
          ),
        },
        {
          heading: 'Working code',
          body: (
            <p>
              SWE-bench gives a model a real issue from an open-source Python project. The model
              changes the code, and scores only if the project’s own tests pass.
            </p>
          ),
          fact: (
            <>
              SWE-bench: <Source href={SCORING_SOURCES.swebench}>Jimenez et al., 2023</Source>
            </>
          ),
        },
        {
          heading: 'People’s votes',
          body: (
            <p>
              Some qualities have no answer key. Arena shows a person two anonymous answers to their
              own question, and they pick the better one.
            </p>
          ),
          fact: (
            <>
              Chatbot Arena: <Source href={SCORING_SOURCES.arena}>Chiang et al., 2024</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'votes',
      short: 'Votes',
      title: 'Votes become ratings',
      lede: 'Millions of one-to-one comparisons, turned into one ranking.',
      label:
        'Eight anonymous models in a circle, joined by votes; they settle into a ladder of ratings; then Arena’s real text leaders with their 95% ranges.',
      draw: createVotes(scoring),
      ambient: true,
      steps: [
        {
          body: <p>Each vote says only that one model beat another, once.</p>,
        },
        {
          heading: 'Ratings',
          body: (
            <p>
              A statistical model, Bradley–Terry, finds the scores that best explain every vote. The
              further apart two scores, the more often the higher one is expected to win.
            </p>
          ),
        },
        {
          heading: 'Real results',
          body: (
            <p>
              Arena publishes a 95% range with each score. Among its text leaders,{' '}
              {close(scoring.arena.rows)} of the top eight reach into the leader’s.
            </p>
          ),
          fact: results(arena),
        },
      ],
    },
    {
      kind: 'chapter',
      id: 'leaks',
      short: 'Leaks',
      title: 'When the test leaks',
      lede: 'A model that has seen the answers is not showing skill.',
      label:
        'Training documents flowing into a model beside a locked test; one test question slips into the training data; bars show higher scores on leaked questions; then three ways tests stay fresh.',
      draw: createLeaks(),
      ambient: true,
      steps: [
        {
          body: <p>A test’s questions are meant to stay out of a model’s training data.</p>,
        },
        {
          heading: 'Leaked',
          body: (
            <p>
              But a published test lives on the web, and training data is gathered from the web. A
              copy can slip in: this is called contamination.
            </p>
          ),
        },
        {
          heading: 'Inflated',
          body: (
            <p>
              A model that has seen a question can answer it from memory. Its score on those
              questions can rise without any more skill.
            </p>
          ),
        },
        {
          heading: 'Keeping tests fresh',
          body: (
            <p>
              LiveBench adds new questions every month from recent sources. Other tests keep a set
              private, and researchers search training data for copies.
            </p>
          ),
          fact: (
            <>
              LiveBench: <Source href={SCORING_SOURCES.livebench}>White et al., 2024</Source>
            </>
          ),
        },
      ],
    },
    {
      kind: 'interlude',
      id: 'part-scale',
      kicker: 'Part three: many tests',
      question: 'So which model is best?',
      label: 'Light drifting through the dark, turning from green to amber.',
      draw: createInterlude(HUE.green, HUE.amber, 13),
      from: HUE.green,
      to: HUE.amber,
    },
    {
      kind: 'chapter',
      id: 'scale',
      short: 'One scale',
      title: 'Many tests, one scale',
      lede: 'No single test can rank every model. Together, they can.',
      label:
        'Grouped bars for three models on an easy, a medium and a hard test; the same tests as curves on one capability scale; then the leaders of the Epoch Capabilities Index with their ranges.',
      draw: createScale(scoring),
      ambient: true,
      steps: [
        {
          body: (
            <p>
              An easy test tells weaker models apart but leaves the best tied near 100%. A hard test
              does the opposite.
            </p>
          ),
        },
        {
          heading: 'One scale',
          body: (
            <p>
              Fit the tests together: each gets a difficulty, each model a capability, and a curve
              links the two. Tests at every level then place all the models on one scale.
            </p>
          ),
        },
        {
          heading: 'The capability index',
          body: (
            <p>
              The Epoch Capabilities Index combines more than fifty benchmarks this way. Its scale
              is set so that Claude 3.5 Sonnet scores 130 and GPT-5 150: compare its numbers, don’t
              read them alone. Today {index[0]?.name} leads, and {close(index)} of the top eight
              reach into its range.
            </p>
          ),
          fact: (
            <>
              <Source href={SCORING_SOURCES.eci}>Epoch AI</Source>
              {epoch ? (
                <>
                  {' '}
                  (<Source href={epoch.licenseUrl}>{epoch.license}</Source>)
                </>
              ) : null}
            </>
          ),
        },
      ],
    },
  ];
}
