export type ArticleVisualKind =
  | 'frontier'
  | 'workload'
  | 'skills'
  | 'matrix'
  | 'inference'
  | 'cache'
  | 'retrieval'
  | 'evidence'
  | 'distribution'
  | 'sample-draw'
  | 'vector-angle'
  | 'vector-rank'
  | 'queue-timeline'
  | 'queue-replay';

const placements: Record<string, Record<string, ArticleVisualKind>> = {
  'visual-lab-temperature-top-p-token-sampling': {
    'Reshape the distribution before choosing a token': 'distribution',
    'Move the draw through the probability intervals': 'sample-draw',
  },
  'visual-lab-vector-similarity-search-geometry': {
    'Rotate direction without hiding length': 'vector-angle',
    'Change the metric and inspect the ranking': 'vector-rank',
  },
  'visual-lab-ai-serving-queues-continuous-batching': {
    'Separate waiting from doing the work': 'queue-timeline',
    'Replay the queue instead of guessing from an average': 'queue-replay',
  },
  'visual-guide-model-price-capability-frontier': {
    'Move a constraint before picking a winner': 'frontier',
    'Change the workload and watch the price move': 'workload',
  },
  'visual-guide-benchmark-rankings-by-task': {
    'Change the question, then read the order': 'skills',
    'Read a profile across columns': 'matrix',
  },
  'visual-guide-prefill-decode-kv-cache': {
    'Follow one request through the system': 'inference',
    'Turn the memory assumptions into a calculation': 'cache',
  },
  'visual-guide-retrieval-evidence-answer': {
    'Follow the question, not a cloud of boxes': 'retrieval',
    'Try the evidence removal experiment': 'evidence',
  },
};

export function articleVisual(slug: string, heading: string) {
  return placements[slug]?.[heading];
}

export function workloadPrice(input: number, output: number, ratio: number) {
  return (input * ratio + output) / (ratio + 1);
}

/** Hypothetical architecture: 32 layers, 8 KV heads, head dimension 128, FP16 cache. */
export function cacheGiB(tokens: number, sequences: number) {
  return (2 * 32 * 8 * 128 * 2 * tokens * sequences) / 1024 ** 3;
}

export const EVIDENCE = [
  {
    id: 'current',
    title: 'Current standard policy',
    status: 'Eligible',
    text: 'A standard member may borrow equipment for 12 days.',
    eligible: true,
  },
  {
    id: 'archive',
    title: 'Archived standard policy',
    status: 'Archived',
    text: 'A standard member may borrow equipment for 7 days.',
    eligible: false,
  },
  {
    id: 'extended',
    title: 'Extended-plan policy',
    status: 'Different plan',
    text: 'An extended-plan member may borrow equipment for 21 days.',
    eligible: false,
  },
] as const;

export function evidenceAnswer(included: readonly string[]) {
  return included.includes('current')
    ? {
        supported: true,
        text: 'A standard member may borrow equipment for 12 days.',
        source: 'Current standard policy',
      }
    : {
        supported: false,
        text: 'The current standard loan duration cannot be established from the eligible evidence.',
        source: 'No eligible supporting passage',
      };
}
