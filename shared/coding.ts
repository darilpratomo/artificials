import type { AgentSnapshot } from './benchmarks.ts';
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

export interface Coding {
  version: 1;
  agents?: { source: AgentSnapshot['source']; results: CodingAgentRow[] };
  /** Model tests of coding, each on its own scale. */
  tests: CodingTest[];
  sources: ProfileBucket['sources'];
}

/** The model tests shown on the coding page, in display order. */
export const CODING_TESTS = ['agentic-coding', 'coding', 'swe-bench-verified'];

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
  agents,
  linkModel,
  sources,
}: {
  profiles: ModelProfile[];
  tests: OverviewTest[];
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
  const results = agents?.results.map((result): CodingAgentRow => {
    const slug = linkModel([result.model], result.providerId);
    const profile = slug ? bySlug.get(slug) : undefined;
    const known = profile && profile.makerId !== 'unknown';
    const makerId = known ? profile.makerId : result.providerId;
    const configuration = configurationOf(result.model, slug);
    const builder = ORGANISATION_MAKERS[result.agentOrg?.trim().toLowerCase() ?? ''];
    return {
      id: result.id,
      agent: result.agent,
      ...(result.agentOrg ? { agentOrg: result.agentOrg } : {}),
      own: makerId !== 'unknown' && builder === makerId,
      model: result.model,
      name: profile
        ? `${profile.name}${configuration ? ` (${configuration})` : ''}`
        : (result.modelName ?? result.model),
      ...(slug ? { slug } : {}),
      makerId,
      maker: known ? profile.maker : result.provider,
      score: result.score,
      ...(result.stderr !== undefined ? { stderr: result.stderr } : {}),
      ...(result.runDate ? { runDate: result.runDate } : {}),
      rank: result.rank,
    };
  });
  return {
    version: 1,
    ...(agents && results ? { agents: { source: agents.source, results } } : {}),
    tests: coding,
    // Only the sources behind these tests.
    sources: sources.filter((source) => coding.some((test) => test.sourceId === source.id)),
  };
}
