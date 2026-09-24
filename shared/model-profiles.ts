import type { CatalogSnapshot, LongContextPrice, ModelRecord } from './catalog.ts';
import type {
  BenchmarkDomain,
  BenchmarkSnapshot,
  BenchmarkSource,
  ModelFacts,
} from './benchmarks.ts';

/**
 * Model profiles group every serving offer of one underlying model, so a
 * visitor sees "Claude Sonnet 5" once, with each host listed underneath.
 *
 * Grouping and benchmark matching are deliberately strict. A wrong match would
 * show one model's scores on another model's page, which is worse than a
 * missing score, so ambiguous names are left unmatched.
 */

export const PROFILE_BUCKETS = 128;

export interface ProfileOffering {
  id: string;
  provider: string;
  providerId: string;
  name: string;
  inputPrice: number | null;
  outputPrice: number | null;
  cacheReadPrice?: number;
  cacheWritePrice?: number;
  contextWindow: number | null;
  maxOutput?: number;
  status?: string;
  providerUrl: string | null;
  longContextPricing?: LongContextPrice[];
}

export interface ProfileResult {
  category: string;
  /** The exact configuration the evaluator ran, such as an effort level. */
  configuration: string;
  score: number;
  rank: number;
  /** Rows in the category, so a rank can read "#3 of 120". */
  total: number;
  stderr?: number;
  ciLow?: number;
  ciHigh?: number;
  evaluatedAt?: string;
}

export interface ProfileCategory {
  id: string;
  name: string;
  /** The test's own name, such as "LiveBench coding" or "GPQA Diamond". */
  label: string;
  sourceId: string;
  domain: BenchmarkDomain;
  unit: 'percent' | 'index';
  description: string;
  methodology: string;
  best: number;
  median: number;
  total: number;
  randomBaseline?: number;
}

export interface ProfilePeer {
  slug: string;
  name: string;
  maker: string;
  index: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
}

/** A research source's record of the model, shown with its own name and source. */
export type ProfileFacts = Omit<ModelFacts, 'versions'>;

export interface ModelProfile {
  slug: string;
  name: string;
  /** Empty when no source names the maker; a host is never presented as the maker. */
  maker: string;
  makerId: string;
  description?: string;
  releaseDate: string | null;
  knowledge?: string;
  contextWindow: number | null;
  maxOutput: number | null;
  /** True when hosts report different context limits for this model. */
  contextVaries: boolean;
  inputModalities: string[];
  outputModalities: string[];
  reasoning: boolean;
  openWeights: boolean;
  toolCall?: boolean;
  structuredOutput?: boolean;
  reasoningEfforts?: string[];
  /** The maker's own listing, when the maker also sells access directly. */
  official?: string;
  offerings: ProfileOffering[];
  results: ProfileResult[];
  categories: ProfileCategory[];
  peers: ProfilePeer[];
  facts?: ProfileFacts;
}

export interface ProfileBucket {
  version: 1;
  updatedAt: string;
  sources: Pick<BenchmarkSource, 'id' | 'name' | 'url' | 'license' | 'licenseUrl' | 'checkedAt'>[];
  catalog: { source: string; sourceUrl: string; license: string; updatedAt: string };
  profiles: ModelProfile[];
}

/** Compact listing used for search, metadata and the sitemap. */
export type DirectoryEntry = [
  slug: string,
  name: string,
  maker: string,
  offerings: number,
  hasResults: 0 | 1,
  releaseDate: string,
];

export interface ProfileDirectory {
  version: 1;
  updatedAt: string;
  buckets: number;
  models: DirectoryEntry[];
}
/** Benchmark `category:row` → profile slug, plus each linked profile's name. */
export interface ProfileLinks {
  rows: Record<string, string>;
  names: Record<string, string>;
}

const REGION = /^(?:us|eu|apac|global|jp|au|ca)\./;
const VENDOR =
  /^(?:anthropic|openai|google|meta|mistral|amazon|cohere|ai21|deepseek|qwen|xai|moonshotai|minimax|zai|writer|twelvelabs|stability|luma)\./;

function tidy(value: string) {
  return value
    .toLowerCase()
    .replace(/[._\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * The URL-safe identity of the underlying model. Host prefixes and routing
 * suffixes are removed; version numbers and dated snapshots are kept, because
 * two snapshots of one model can behave differently.
 */
export function modelSlug(modelId: string): string {
  let value = modelId.toLowerCase().split('/').pop() ?? '';
  value = value.replace(REGION, '').replace(VENDOR, '');
  value = value.replace(/-v\d+:\d+$/, ''); // Bedrock "-v1:0"
  value = value.replace(/[:@].*$/, ''); // ":free", ":beta", "@20250514"
  return tidy(value).slice(0, 100) || 'model';
}

const EXPLICIT_EFFORT = /-(?:minimal|none|low|medium|high|xhigh|max|default)-effort$/;
const PLAIN_EFFORT = /-(?:minimal|low|medium|high|xhigh)$/;
const THINKING = /-(?:thinking|nothinking|non-thinking)(?:-(?:\d+k|auto))?$/;
const DATE = /-(?:\d{4}-\d{2}-\d{2}|\d{8})$/;

/**
 * Catalog slugs a benchmark row may refer to, most specific first. Only
 * configuration markers are removed: an `_effort` suffix (Epoch's convention),
 * an explicit `-high-effort`, a thinking mode, or a date. A bare `-max` is kept,
 * because "Qwen3 Max" is a different model from "Qwen3", unless `maxEffort`
 * shows that another source ran the same model at a "max" effort setting.
 */
export function benchmarkCandidates(name: string, maxEffort?: Set<string>): string[] {
  const out: string[] = [];
  const add = (value: string) => {
    if (value && !out.includes(value)) out.push(value);
  };
  const underscore = name.lastIndexOf('_');
  let value = tidy(underscore > 0 ? name.slice(0, underscore) : name);
  add(tidy(name));
  add(value);
  for (let step = 0; step < 4; step += 1) {
    const next = value
      .replace(EXPLICIT_EFFORT, '')
      .replace(THINKING, '')
      .replace(PLAIN_EFFORT, '')
      .replace(/-thinking$/, '');
    if (next === value) break;
    value = next;
    add(value);
  }
  const undated = value.replace(DATE, '');
  if (undated !== value) add(undated);
  const bare = tidy(name).replace(/-max$/, '');
  if (maxEffort?.has(bare) && bare !== tidy(name)) add(bare);
  return out;
}

const MAKERS: [RegExp, string, string][] = [
  [/^(?:gpt|o[1-9](?:-|$)|chatgpt|dall-e|sora|codex)/, 'OpenAI', 'openai'],
  [/^claude/, 'Anthropic', 'anthropic'],
  [/^(?:gemini|gemma|nano-banana|imagen|veo|learnlm)/, 'Google', 'google'],
  [/^deepseek/, 'DeepSeek', 'deepseek'],
  [/^(?:qwen|qwq|qvq|wan)/, 'Alibaba', 'alibaba'],
  [/^grok/, 'xAI', 'xai'],
  [/^(?:kimi|moonshot)/, 'Moonshot AI', 'moonshotai'],
  [/^(?:glm|chatglm|cogview)/, 'Z.ai', 'zai'],
  [/^minimax/, 'MiniMax', 'minimax'],
  [/^(?:mistral|magistral|codestral|devstral|pixtral|ministral|voxtral)/, 'Mistral AI', 'mistral'],
  [/^(?:llama|meta-llama)/, 'Meta', 'meta'],
  [/^(?:phi-|phi\d)/, 'Microsoft', 'azure'],
  [/^(?:command|aya|c4ai)/, 'Cohere', 'cohere'],
  [/^jamba/, 'AI21 Labs', 'ai21'],
  [/^nova-/, 'Amazon', 'amazon-bedrock'],
  [/^(?:nemotron|llama-3-1-nemotron)/, 'NVIDIA', 'nvidia'],
  [/^sonar/, 'Perplexity', 'perplexity'],
  [/^mercury/, 'Inception', 'inception'],
  [/^(?:seed|seedream|seedance|doubao)/, 'ByteDance', 'bytedance'],
  [/^(?:ernie)/, 'Baidu', 'baidu'],
  [/^hunyuan/, 'Tencent', 'tencent'],
  [/^flux/, 'Black Forest Labs', 'black-forest-labs'],
  [/^granite/, 'IBM', 'ibm'],
  [/^mimo(?:-|\d|$)/, 'Xiaomi', 'xiaomi'],
  [/^step-?\d/, 'StepFun', 'stepfun'],
  [/^solar/, 'Upstage', 'upstage'],
  [/^longcat/, 'Meituan', 'meituan'],
  [/^(?:hermes|nous-hermes)/, 'Nous Research', 'nousresearch'],
  [/^(?:stable-diffusion|sd3|sdxl)/, 'Stability AI', 'stabilityai'],
  [/^recraft/, 'Recraft', 'recraft'],
  [/^ideogram/, 'Ideogram', 'ideogram'],
  [/^kling/, 'Kuaishou', 'kuaishou'],
  [/^lfm-?\d/, 'Liquid AI', 'liquid'],
  [/^baichuan/, 'Baichuan', 'baichuan'],
  [/^(?:internlm|intern-s1|internvl)/, 'Shanghai AI Laboratory', 'internlm'],
  [/^falcon/, 'TII', 'tii'],
  [/^exaone/, 'LG AI Research', 'lg'],
  [/^reka/, 'Reka', 'reka'],
];

/**
 * Hosts that serve only their own models. When no name pattern identifies a
 * model's maker, one of these listing it is taken as the maker; any other host
 * is never presented as the maker.
 */
const LAB_HOSTS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  deepseek: 'DeepSeek',
  xai: 'xAI',
  mistral: 'Mistral AI',
  cohere: 'Cohere',
  ai21: 'AI21 Labs',
  moonshotai: 'Moonshot AI',
  zai: 'Z.ai',
  minimax: 'MiniMax',
  upstage: 'Upstage',
  stepfun: 'StepFun',
  xiaomi: 'Xiaomi',
  inception: 'Inception',
  perplexity: 'Perplexity',
};

export function makerOf(slug: string): { maker: string; makerId: string } {
  const found = MAKERS.find(([pattern]) => pattern.test(slug));
  return found ? { maker: found[1], makerId: found[2] } : { maker: '', makerId: 'unknown' };
}

/** FNV-1a: small, fast and identical in Node, Workers and browsers. */
export function profileBucket(slug: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % PROFILE_BUCKETS;
}

/**
 * A per-token list price. A price of zero usually means a free tier with
 * limits or access bundled into a subscription, so it is shown separately and
 * never presented as the lowest price.
 */
export function isPaidOffer(offer: { inputPrice: number | null; outputPrice: number | null }) {
  return (
    offer.inputPrice !== null &&
    offer.outputPrice !== null &&
    (offer.inputPrice > 0 || offer.outputPrice > 0)
  );
}
export function isNoChargeOffer(offer: { inputPrice: number | null; outputPrice: number | null }) {
  return offer.inputPrice === 0 && offer.outputPrice === 0;
}

export function testLabel(category: { sourceId: string; name: string }) {
  if (category.sourceId === 'livebench') return `LiveBench ${category.name.toLowerCase()}`;
  if (category.sourceId === 'corebench') return 'T2I-CoReBench';
  return category.name;
}

/** Blended price for comparison: three input tokens for every output token. */
export function blendedPrice(input: number | null, output: number | null): number | null {
  return input === null || output === null ? null : (input * 3 + output) / 4;
}

function mode<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestCount = 0;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/** The most frequent value; ties go to the larger one. */
function commonest(values: (number | null)[]): number | null {
  const counts = new Map<number, number>();
  for (const value of values) if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: number | null = null;
  for (const [value, count] of counts)
    if (best === null || count > counts.get(best)! || (count === counts.get(best)! && value > best))
      best = value;
  return best;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Names hosts decorate with their own labels, such as "(free)" or "(Bedrock)". */
function cleanName(name: string) {
  return (
    name
      .replace(/\s*\([^)]*\)\s*$/, '')
      .replace(/^[^:]{1,40}:\s+/, '')
      .trim() || name
  );
}

/** Preferred benchmark per skill area, independent of how well a model scored. */
const PRIMARY: Record<BenchmarkDomain, string[]> = {
  overall: ['capability-index', 'overall'],
  coding: ['coding', 'swe-bench-verified'],
  math: ['mock-aime', 'math', 'frontiermath', 'math-level-5'],
  knowledge: ['simpleqa-verified'],
  agentic: ['agentic-coding'],
  language: ['language', 'instruction-following'],
  data: ['data-analysis'],
  reasoning: ['gpqa-diamond', 'reasoning', 'chess-puzzles'],
  image: ['image'],
};
export function primaryResult(profile: ModelProfile, domain: BenchmarkDomain) {
  for (const id of PRIMARY[domain]) {
    const result = profile.results.find((entry) => entry.category === id);
    if (result) return result;
  }
  return undefined;
}

/**
 * Builds every profile from the two published snapshots. Pure and
 * deterministic: the same inputs always produce identical output.
 */
export function buildProfiles(
  catalog: CatalogSnapshot,
  benchmarks: BenchmarkSnapshot,
  facts: ModelFacts[] = [],
) {
  const groups = new Map<string, ModelRecord[]>();
  for (const model of catalog.models) {
    const slug = modelSlug(model.modelId);
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug)!.push(model);
  }

  const profiles = new Map<string, ModelProfile>();
  for (const [slug, offers] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    let { maker, makerId } = makerOf(slug);
    if (makerId === 'unknown') {
      const lab = offers.find((offer) => Object.hasOwn(LAB_HOSTS, offer.providerId));
      if (lab) {
        maker = LAB_HOSTS[lab.providerId];
        makerId = lab.providerId;
      }
    }
    const official = offers.find((offer) => offer.providerId === makerId);
    const lead = official ?? offers[0];
    const pick = <T>(read: (offer: ModelRecord) => T | null | undefined): T | undefined => {
      const own = official ? read(official) : undefined;
      if (own !== null && own !== undefined) return own;
      return mode(
        offers.map(read).filter((value): value is T => value !== null && value !== undefined),
      );
    };
    const contexts = [
      ...new Set(offers.map((offer) => offer.contextWindow).filter((value) => value !== null)),
    ];
    // A placeholder such as 1970-01-01 from one host must not become the release date.
    const releases = offers
      .map((offer) => offer.releaseDate)
      .filter((value): value is string => !!value && value >= '2000')
      .sort();
    const offerings: ProfileOffering[] = offers
      .map((offer) => ({
        id: offer.id,
        provider: offer.provider,
        providerId: offer.providerId,
        name: offer.name,
        inputPrice: offer.inputPrice,
        outputPrice: offer.outputPrice,
        ...(offer.cacheReadPrice !== undefined ? { cacheReadPrice: offer.cacheReadPrice } : {}),
        ...(offer.cacheWritePrice !== undefined ? { cacheWritePrice: offer.cacheWritePrice } : {}),
        contextWindow: offer.contextWindow,
        ...(offer.maxOutput !== undefined ? { maxOutput: offer.maxOutput } : {}),
        ...(offer.status ? { status: offer.status } : {}),
        providerUrl: offer.providerUrl,
        ...(offer.longContextPricing ? { longContextPricing: offer.longContextPricing } : {}),
      }))
      .sort((a, b) => {
        const group = (offer: ProfileOffering) =>
          isPaidOffer(offer) ? 0 : isNoChargeOffer(offer) ? 1 : 2;
        const byGroup = group(a) - group(b);
        if (byGroup) return byGroup;
        if (group(a) === 0) {
          const byPrice =
            blendedPrice(a.inputPrice, a.outputPrice)! - blendedPrice(b.inputPrice, b.outputPrice)!;
          if (byPrice) return byPrice;
          const officialFirst = Number(b.id === official?.id) - Number(a.id === official?.id);
          if (officialFirst) return officialFirst;
        }
        return a.provider.localeCompare(b.provider);
      });
    profiles.set(slug, {
      slug,
      name: cleanName(
        official?.name ?? mode(offers.map((offer) => cleanName(offer.name))) ?? lead.name,
      ),
      maker,
      makerId,
      ...(pick((offer) => offer.description)
        ? { description: pick((offer) => offer.description)! }
        : {}),
      releaseDate:
        official?.releaseDate && official.releaseDate >= '2000'
          ? official.releaseDate
          : (releases[0] ?? null),
      ...(pick((offer) => offer.knowledge) ? { knowledge: pick((offer) => offer.knowledge)! } : {}),
      // The most common listing, not the largest: one host's typo must not
      // become the model's context window.
      contextWindow:
        official?.contextWindow ?? commonest(offers.map((offer) => offer.contextWindow)),
      maxOutput: pick((offer) => offer.maxOutput) ?? null,
      contextVaries: contexts.length > 1,
      inputModalities:
        pick((offer) =>
          offer.inputModalities.length ? offer.inputModalities.join(',') : null,
        )?.split(',') ?? [],
      outputModalities:
        pick((offer) =>
          offer.outputModalities.length ? offer.outputModalities.join(',') : null,
        )?.split(',') ?? [],
      reasoning: official ? official.reasoning : offers.some((offer) => offer.reasoning),
      openWeights: offers.some((offer) => offer.openWeights),
      ...(pick((offer) => offer.toolCall) !== undefined
        ? { toolCall: pick((offer) => offer.toolCall)! }
        : {}),
      ...(pick((offer) => offer.structuredOutput) !== undefined
        ? { structuredOutput: pick((offer) => offer.structuredOutput)! }
        : {}),
      ...(pick((offer) => offer.reasoningEfforts?.join(','))
        ? { reasoningEfforts: pick((offer) => offer.reasoningEfforts?.join(','))!.split(',') }
        : {}),
      ...(official ? { official: official.id } : {}),
      offerings,
      results: [],
      categories: [],
      peers: [],
    });
  }

  // Variants that share a display name, such as a "-fast" mode or a dated
  // snapshot, get the part of their id that tells them apart.
  const named = new Map<string, ModelProfile[]>();
  for (const profile of profiles.values()) {
    const key = profile.name.toLowerCase();
    named.set(key, [...(named.get(key) ?? []), profile]);
  }
  for (const group of named.values()) {
    const canonical =
      group.length > 1 && group.find((profile) => profile.slug === tidy(profile.name));
    if (!canonical) continue;
    for (const profile of group) {
      if (profile === canonical || !profile.slug.startsWith(`${canonical.slug}-`)) continue;
      const rest = profile.slug.slice(canonical.slug.length + 1);
      profile.name = `${profile.name} (${/^\d{4}-\d{2}-\d{2}$/.test(rest) ? rest : rest.replace(/-/g, ' ')})`;
    }
  }

  // Models some source ran at an explicit "max" effort (Epoch's `name_max`).
  // Only for these does another source's bare "-max" suffix mean effort.
  const maxEffort = new Set<string>();
  const identifiers = [
    ...benchmarks.categories.flatMap((category) => category.rows.map((row) => row.model)),
    ...facts.flatMap((record) => record.versions),
  ];
  for (const identifier of identifiers) {
    const at = identifier.lastIndexOf('_');
    if (at > 0 && identifier.slice(at + 1).toLowerCase() === 'max')
      maxEffort.add(tidy(identifier.slice(0, at).split('/').pop() ?? ''));
  }

  // Attach benchmark rows. A row attaches to at most one profile, and never to
  // a profile whose maker contradicts the evaluator's attribution.
  const links: Record<string, string> = {};
  const resolve = (names: string[], providerId: string) => {
    for (const name of names)
      for (const candidate of benchmarkCandidates(name, maxEffort)) {
        const profile = profiles.get(candidate);
        if (!profile) continue;
        const known = makerOf(candidate).makerId;
        if (providerId !== 'unknown' && known !== 'unknown' && known !== providerId)
          return undefined;
        return profile;
      }
    return undefined;
  };
  for (const category of benchmarks.categories) {
    const scores = category.rows.map((row) => row.score);
    const summary: ProfileCategory = {
      id: category.id,
      name: category.name,
      label: testLabel(category),
      sourceId: category.sourceId,
      domain: category.domain ?? 'overall',
      unit: category.unit ?? 'percent',
      description: category.description,
      methodology: category.methodology,
      best: Math.max(...scores),
      median: Math.round(median(scores) * 100) / 100,
      total: category.rows.length,
      ...(category.randomBaseline !== undefined ? { randomBaseline: category.randomBaseline } : {}),
    };
    for (const row of category.rows) {
      const profile = resolve(row.versions?.length ? row.versions : [row.model], row.providerId);
      if (!profile) continue;
      links[`${category.id}:${row.id}`] = profile.slug;
      profile.results.push({
        category: category.id,
        configuration: row.model,
        score: row.score,
        rank: row.rank,
        total: category.rows.length,
        ...(row.stderr !== undefined ? { stderr: row.stderr } : {}),
        ...(row.ciLow !== undefined ? { ciLow: row.ciLow, ciHigh: row.ciHigh } : {}),
        ...(row.evaluatedAt ? { evaluatedAt: row.evaluatedAt } : {}),
      });
      if (!profile.categories.some((entry) => entry.id === category.id))
        profile.categories.push(summary);
    }
  }
  // Research records attach the same way as scores: by the exact identifiers
  // the source used, never by a loose name match.
  for (const record of facts) {
    const profile = resolve(
      record.versions.map((version) => version.split('/').pop() ?? version),
      'unknown',
    );
    if (!profile || profile.facts) continue;
    const { versions, ...rest } = record;
    void versions;
    profile.facts = rest;
    if (!profile.maker && rest.organization) profile.maker = rest.organization;
  }

  const order = benchmarks.categories.map((category) => category.id);
  for (const profile of profiles.values()) {
    profile.results.sort(
      (a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.rank - b.rank,
    );
    profile.categories.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }

  // Peers: the models nearest on the capability index, for quick comparison.
  const indexScore = (profile: ModelProfile) =>
    profile.results.find((result) => result.category === 'capability-index')?.score ?? null;
  const indexed = [...profiles.values()].filter((profile) => indexScore(profile) !== null);
  const cheapest = (profile: ModelProfile) => profile.offerings.find(isPaidOffer);
  for (const profile of indexed) {
    const own = indexScore(profile)!;
    profile.peers = indexed
      .filter((other) => other !== profile && other.makerId !== 'unknown')
      .sort(
        (a, b) =>
          Math.abs(indexScore(a)! - own) - Math.abs(indexScore(b)! - own) ||
          a.slug.localeCompare(b.slug),
      )
      .slice(0, 4)
      .map((other) => ({
        slug: other.slug,
        name: other.name,
        maker: other.maker,
        index: indexScore(other),
        inputPrice: cheapest(other)?.inputPrice ?? null,
        outputPrice: cheapest(other)?.outputPrice ?? null,
      }));
  }

  return { profiles: [...profiles.values()], links };
}
