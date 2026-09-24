export interface BenchmarkRow {
  id: string;
  model: string;
  provider: string;
  providerId: string;
  score: number;
  rank: number;
  sourceUrl: string;
  /** One standard error, in the category's unit, when the source publishes it. */
  stderr?: number;
  /** Confidence interval bounds for index-style scores. */
  ciLow?: number;
  ciHigh?: number;
  /** Date the evaluation ran (YYYY-MM-DD), when the source publishes it. */
  evaluatedAt?: string;
  /** Exact model identifiers the source used for this row, when they differ from `model`. */
  versions?: string[];
}
/** Skill areas used to group and colour results. Order is the display order. */
export const BENCHMARK_DOMAINS = [
  'coding',
  'math',
  'knowledge',
  'agentic',
  'language',
  'data',
  'reasoning',
  'image',
] as const;
export type BenchmarkDomain = (typeof BENCHMARK_DOMAINS)[number] | 'overall';
export interface BenchmarkCategory {
  id: string;
  name: string;
  sourceId: string;
  description: string;
  methodology: string;
  rows: BenchmarkRow[];
  /** `percent` scores run 0–100. `index` scores are open-ended; compare them, do not read them as percentages. */
  unit?: 'percent' | 'index';
  domain?: BenchmarkDomain;
  /** Score expected from random guessing, in the category's unit. */
  randomBaseline?: number;
}
export interface BenchmarkSource {
  id: string;
  name: string;
  url: string;
  dataUrl: string;
  checkedAt: string;
  edition: string;
  sourceUpdatedAt: string | null;
  license: string;
  licenseUrl: string;
}
export interface BenchmarkSnapshot {
  version: 1;
  sources: BenchmarkSource[];
  categories: BenchmarkCategory[];
}
