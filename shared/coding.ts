import type {
  AgentSnapshot,
  AgentSource,
  BenchmarkSnapshot,
  ModelFacts,
  TimeHorizon,
} from './benchmarks.ts';
import type { ModelProfile, ProfileBucket } from './model-profiles.ts';
import {
  configurationOf,
  referencePrice,
  type OverviewTest,
  type TestRow,
} from './model-overview.ts';

/** One agent and model on the agent benchmark, linked to the model's profile. */
export interface CodingAgentRow {
  id: string;
  agent: string;
  agentOrg?: string;
  /** Whether the model's maker also built the agent, such as Codex CLI running GPT-5.5. */
  own: boolean;
  /** The model identifier the source used. */
  model: string;
  /** The model's name, with its configuration when the source names one. */
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
  score: number;
  stderr?: number;
  runDate?: string;
  rank: number;
}

export interface CodingTestRow extends TestRow {
  /** Blended reference price per 1M tokens, from the catalog. */
  price?: number;
  releasedAt?: string;
}

export interface CodingTest extends Omit<OverviewTest, 'rows'> {
  rows: CodingTestRow[];
}

/** One agent benchmark: its source and every agent and model result on it. */
export interface CodingAgentTest {
  source: AgentSource;
  results: CodingAgentRow[];
}

/** A model's METR time horizon, linked to its profile. */
export interface CodingHorizon extends Omit<TimeHorizon, 'provider' | 'providerId'> {
  name: string;
  slug?: string;
  makerId: string;
  maker: string;
}

export interface Coding {
  version: 2;
  /** Agent benchmarks, each with its own results; scores are never mixed. */
  agentTests: CodingAgentTest[];
  /** Model tests of coding, each on its own scale, best configuration per model. */
  tests: CodingTest[];
  /**
   * Tests that publish cost per task, with every configuration a source ran, so
   * lower reasoning efforts show what they save.
   */
  costTests: CodingTest[];
  timeHorizons?: {
    source: NonNullable<AgentSnapshot['timeHorizons']>['source'];
    results: CodingHorizon[];
  };
  sources: ProfileBucket['sources'];
}

/** The model tests shown on the coding page, in display order. */
export const CODING_TESTS = [
  'arena-webdev',
  'agentic-coding',
  'deepswe',
  'cursorbench',
  'swe-bench-bash-only',
  'swe-bench-verified',
  'coding',
  'arena-coding',
];

/** Agent builders that also make models, by the name sources give them. */
const ORGANISATION_MAKERS: Record<string, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google',
  'google deepmind': 'google',
  xai: 'xai',
  deepseek: 'deepseek',
  alibaba: 'alibaba',
  qwen: 'alibaba',
  'moonshot ai': 'moonshotai',
  moonshot: 'moonshotai',
  'z.ai': 'zai',
  'zhipu ai': 'zai',
  minimax: 'minimax',
  'mistral ai': 'mistral',
  mistral: 'mistral',
  meta: 'meta',
};

/**
 * The coding page's data: agent results matched to model profiles, and the
 * coding tests with each model's reference price for the value chart.
 */
export function buildCoding({
  profiles,
  tests,
  benchmarks,
  links,
  agents,
  linkModel,
  sources,
  facts = [],
}: {
  profiles: ModelProfile[];
  tests: OverviewTest[];
  benchmarks: BenchmarkSnapshot;
  /** Epoch AI's model records, for the names of models without a profile. */
  facts?: ModelFacts[];
  /** Benchmark rows matched to profiles, as `category:row` → slug. */
  links: Record<string, string>;
  agents?: AgentSnapshot;
  linkModel: (names: string[], providerId: string) => string | undefined;
  sources: ProfileBucket['sources'];
}): Coding {
  const bySlug = new Map(profiles.map((profile) => [profile.slug, profile]));
  const coding: CodingTest[] = CODING_TESTS.flatMap((id) => {
    const test = tests.find((entry) => entry.id === id);
    if (!test) return [];
    return [
      {
        ...test,
        rows: test.rows.map((row) => {
          const profile = row.slug ? bySlug.get(row.slug) : undefined;
          const price = profile ? referencePrice(profile) : undefined;
          return {
            ...row,
            ...(price ? { price: price.blended } : {}),
            ...(profile?.releaseDate ? { releasedAt: profile.releaseDate } : {}),
          };
        }),
      },
    ];
  });
  // Epoch AI's display names for the identifiers it evaluated, for models
  // that have no profile, such as unreleased previews.
  const displayNames = new Map<string, string>();
  for (const record of facts)
    for (const version of record.versions) displayNames.set(version, record.name);
  for (const row of benchmarks.categories.find((entry) => entry.id === 'capability-index')?.rows ??
    [])
    for (const version of row.versions ?? []) displayNames.set(version, row.model);
  const displayName = (model: string) =>
    displayNames.get(model) ?? displayNames.get(model.replace(/_[a-z]+$/i, ''));
  // A model named by a source, matched to its profile like benchmark rows.
  const modelOf = (model: string, providerId: string, provider: string, sourceName?: string) => {
    const slug = linkModel([model], providerId);
    const profile = slug ? bySlug.get(slug) : undefined;
    const known = profile && profile.makerId !== 'unknown';
    const configuration = configurationOf(model, slug);
    return {
      name: profile
        ? `${profile.name}${configuration ? ` (${configuration})` : ''}`
        : (sourceName ?? displayName(model) ?? model),
      ...(slug ? { slug } : {}),
      makerId: known ? profile.makerId : providerId,
      maker: known ? profile.maker : provider,
    };
  };
  const agentTests = (agents?.benchmarks ?? []).map((benchmark) => ({
    source: benchmark.source,
    results: benchmark.results.map((result): CodingAgentRow => {
      const model = modelOf(result.model, result.providerId, result.provider, result.modelName);
      const builder = ORGANISATION_MAKERS[result.agentOrg?.trim().toLowerCase() ?? ''];
      return {
        id: result.id,
        agent: result.agent,
        ...(result.agentOrg ? { agentOrg: result.agentOrg } : {}),
        own: model.makerId !== 'unknown' && builder === model.makerId,
        model: result.model,
        ...model,
        score: result.score,
        ...(result.stderr !== undefined ? { stderr: result.stderr } : {}),
        ...(result.runDate ? { runDate: result.runDate } : {}),
        rank: result.rank,
      };
    }),
  }));
  const costTests: CodingTest[] = coding.flatMap((test) => {
    const category = benchmarks.categories.find((entry) => entry.id === test.id);
    const rows = (category?.rows ?? []).filter((row) => row.usage?.cost !== undefined);
    if (!category || rows.length < 5) return [];
    return [
      {
        ...test,
        rows: rows.map((row) => {
          const slug = links[`${category.id}:${row.id}`];
          const profile = slug ? bySlug.get(slug) : undefined;
          const known = profile && profile.makerId !== 'unknown';
          const configuration = configurationOf(row.model, slug);
          return {
            name: profile
              ? `${profile.name}${configuration ? ` (${configuration})` : ''}`
              : row.model,
            configuration: row.model,
            ...(slug ? { slug } : {}),
            makerId: known ? profile.makerId : row.providerId,
            maker: known ? profile.maker : row.provider,
            score: row.score,
            ...(row.stderr !== undefined ? { stderr: row.stderr } : {}),
            usage: row.usage,
          };
        }),
      },
    ];
  });
  const horizons = agents?.timeHorizons;
  return {
    version: 2,
    agentTests,
    costTests,
    ...(horizons
      ? {
          timeHorizons: {
            source: horizons.source,
            results: horizons.results.map(({ provider, providerId, ...row }) => ({
              ...row,
              ...modelOf(row.model, providerId, provider, row.modelName),
            })),
          },
        }
      : {}),
    tests: coding,
    // Only the sources behind these tests.
    sources: sources.filter((source) => coding.some((test) => test.sourceId === source.id)),
  };
}
