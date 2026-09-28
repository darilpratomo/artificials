import { random } from '../descent/kit';

/** GPQA Diamond's size, from its paper: 198 questions, four choices each. */
export const QUESTIONS = 198;
/** The illustrative model's correct answers, and so its score. */
export const CORRECT = 159;
export const ACCURACY = CORRECT / QUESTIONS;

/** An example question, written for this page; not from any real test. */
export const QUESTION = {
  text: 'Why does the sky look blue during the day?',
  options: [
    ['A', 'Air absorbs red light'],
    ['B', 'Air scatters blue light the most'],
    ['C', 'It reflects the ocean'],
    ['D', 'Air glows blue in sunlight'],
  ] as [letter: string, text: string][],
  answer: 1,
  /** The model's probability for each letter. Illustrative. */
  probabilities: [0.07, 0.84, 0.05, 0.04],
};

/** Which of the questions the illustrative model gets right: exactly `correct`, in a fixed shuffle. */
export function answers(seed = 11, questions = QUESTIONS, correct = CORRECT) {
  const right = Array.from({ length: questions }, (_, index) => index < correct);
  const next = random(seed);
  for (let index = questions - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [right[index], right[swap]] = [right[swap], right[index]];
  }
  return right;
}

/**
 * Scores the same model would get on other tests of the same kind: each a
 * fresh draw of `questions`, each answered right with chance `accuracy`.
 */
export function reruns(runs: number, seed = 5, accuracy = ACCURACY, questions = QUESTIONS) {
  const next = random(seed);
  return Array.from({ length: runs }, () => {
    let right = 0;
    for (let question = 0; question < questions; question++) if (next() < accuracy) right++;
    return (right / questions) * 100;
  });
}

/** The range that holds 95% of such scores: 1.96 standard errors either side. */
export const interval = (score: number, stderr: number) =>
  [score - 1.96 * stderr, score + 1.96 * stderr] as const;

/**
 * How likely a model is to answer a test's questions right, from how capable
 * the model is and how hard the test is, on one shared scale: a logistic
 * curve, as a capability index fits across many tests. Illustrative values.
 */
export const logistic = (capability: number, difficulty: number, slope = SLOPE) =>
  1 / (1 + Math.exp(-(capability - difficulty) * slope));
export const SLOPE = 0.12;
export const TESTS = [
  { name: 'Easy test', difficulty: 110 },
  { name: 'Medium test', difficulty: 140 },
  { name: 'Hard test', difficulty: 165 },
];
export const MODELS = [
  { name: 'Model A', capability: 160 },
  { name: 'Model B', capability: 148 },
  { name: 'Model C', capability: 135 },
];
