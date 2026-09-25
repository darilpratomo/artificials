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
  /** The model's public release date (YYYY-MM-DD), as the source records it. */
  releasedAt?: string;
  /** Whether the source lists the model's weights as downloadable. */
  openWeights?: boolean;
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

/**
 * Facts a research source records about a model, rather than a test result:
 * who built it, when it came out, how it can be accessed and the estimated
 * compute used to train it.
 */
export interface ModelFacts {
  /** The source's own name for the model, such as "DeepSeek-V4-Pro". */
  name: string;
  /** Exact model identifiers the source recorded under this name. */
  versions: string[];
  releasedAt?: string;
  organization?: string;
  country?: string;
  /** The source's access category, such as "API access" or "Open weights (unrestricted)". */
  access?: string;
  /** Estimated total training compute, in floating-point operations. */
  trainingCompute?: number;
}
export interface ModelFactsSnapshot {
  version: 1;
  source: Pick<
    BenchmarkSource,
    'id' | 'name' | 'url' | 'dataUrl' | 'license' | 'licenseUrl' | 'checkedAt'
  >;
  facts: ModelFacts[];
}

/**
 * One coding agent running one model on an agent benchmark. The agent (the
 * program that plans, runs commands and edits files) is part of the result:
 * the same model can score very differently in different agents.
 */
export interface AgentResult {
  /** Stable id: the agent's normalised name and the model identifier. */
  id: string;
  agent: string;
  /** Who built the agent, as the source records it. */
  agentOrg?: string;
  /** The model identifier the source used, such as `gpt-5.5_unknown`. */
  model: string;
  /** The source's display name for the model. */
  modelName?: string;
  provider: string;
  providerId: string;
  /** Share of tasks solved, in percent. */
  score: number;
  /** One standard error, in percentage points. */
  stderr?: number;
  /** The run date the source lists (YYYY-MM-DD). */
  runDate?: string;
  rank: number;
}
export interface AgentSnapshot {
  version: 1;
  source: Pick<BenchmarkSource, 'id' | 'name' | 'url' | 'dataUrl' | 'license' | 'licenseUrl'> & {
    checkedAt: string;
    /** The latest run date among the results. */
    latestRun: string | null;
    /** Tasks in the benchmark. */
    tasks: number;
    /** Where the scores were read from: a compilation of the leaderboard. */
    compiledBy: Pick<BenchmarkSource, 'name' | 'url' | 'dataUrl' | 'license' | 'licenseUrl'>;
  };
  results: AgentResult[];
}
