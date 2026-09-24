/** Public, source-attributed catalog. Prices are base USD per million tokens. */
export interface ModelBenchmark {
  score: number;
  speed?: number;
  latency?: number;
  metric: string;
  methodology: string;
  sourceUrl: string;
  updatedAt: string;
}
export interface ModelRecord {
  /** Unique serving offer: provider id + '/' + model id. Not a canonical lab model id. */
  id: string;
  modelId: string;
  name: string;
  /** API host; a host may offer another company's model. */
  provider: string;
  providerId: string;
  contextWindow: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  releaseDate: string | null;
  modalities: string[];
  inputModalities: string[];
  outputModalities: string[];
  reasoning: boolean;
  openWeights: boolean;
  sourceUrl: string;
  providerUrl: string | null;
  description?: string;
  status?: string;
  /** Largest completion the host accepts, in tokens. */
  maxOutput?: number;
  /** Separate input cap, when a host reports one below the context window. */
  maxInput?: number;
  /** USD per million tokens for cached input reads and writes, when reported. */
  cacheReadPrice?: number;
  cacheWritePrice?: number;
  /** USD per million reasoning tokens, when billed separately from output. */
  reasoningPrice?: number;
  audioInputPrice?: number;
  audioOutputPrice?: number;
  /** Higher prices that apply once a request exceeds a context size. */
  longContextPricing?: LongContextPrice[];
  /** Training-data cutoff as reported: YYYY-MM or YYYY-MM-DD. */
  knowledge?: string;
  lastUpdated?: string;
  family?: string;
  toolCall?: boolean;
  structuredOutput?: boolean;
  attachment?: boolean;
  temperature?: boolean;
  /** Named reasoning-effort levels the host exposes, in source order. */
  reasoningEfforts?: string[];
  reasoningToggle?: boolean;
  reasoningBudget?: boolean;
  /** Absent unless a separately licensed, methodologically comparable result is supplied. */
  benchmark?: ModelBenchmark;
}
export interface LongContextPrice {
  /** Requests above this many input tokens use these prices. */
  threshold: number;
  input: number | null;
  output: number | null;
  cacheRead: number | null;
}
export interface CatalogProvider {
  id: string;
  name: string;
  modelCount: number;
  sourceUrl: string;
  logo: string;
}
export interface CatalogSnapshot {
  schemaVersion: 1;
  updatedAt: string;
  source: string;
  sourceUrl: string;
  license: string;
  coverage: string;
  benchmarkStatus: 'unavailable';
  models: ModelRecord[];
  providers: CatalogProvider[];
}
export interface CatalogSummary {
  updatedAt: string;
  source: string;
  sourceUrl: string;
  coverage: string;
  benchmarkStatus: 'unavailable';
  totalModels: number;
  totalProviders: number;
  modelCount: number;
  providerCount: number;
  featured: ModelRecord[];
  reasoningModels: number;
  openWeightModels: number;
  providers: CatalogProvider[];
}
export type CatalogSort = 'name' | 'newest' | 'context' | 'input-price' | 'output-price';
export interface CatalogQuery {
  query?: string;
  provider?: string;
  modality?: string;
  reasoning?: boolean;
  openWeights?: boolean;
  sort?: CatalogSort;
  page?: number;
  limit?: number;
}
export interface CatalogPage extends CatalogSummary {
  models: ModelRecord[];
  total: number;
  page: number;
  pageCount: number;
  limit: number;
  sort: CatalogSort;
}
export const CATALOG_SOURCE_URL = 'https://models.dev/api.json';
export const CATALOG_COVERAGE =
  'Provider-model offerings in the models.dev community catalog. The same model may appear at multiple hosts. Coverage and updates depend on the source; this is not a guaranteed real-time census of all AI models.';
export const LOGO_PROVIDERS = new Set([
  'openai',
  'anthropic',
  'google',
  'xai',
  'deepseek',
  'mistral',
  'meta',
  'nvidia',
  'alibaba',
  'cohere',
  'amazon-bedrock',
  'groq',
  'moonshotai',
  'zhipuai',
  'minimax',
  'perplexity',
  'huggingface',
  'openrouter',
  'azure',
  'cerebras',
  'togetherai',
  'ai21',
  'cloudflare-workers-ai',
  'deepinfra',
  'fireworks-ai',
  'inception',
]);
export function providerLogo(id: string): string {
  return LOGO_PROVIDERS.has(id) ? `/providers/${id}.svg` : '/providers/generic.svg';
}
function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function shortText(value: unknown, maximum = 200): string | null {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum
    ? value.trim()
    : null;
}
function finite(value: unknown, maximum = 1e12): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum
    ? value
    : null;
}
function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
function date(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) return null;
  const normalized = value.length === 7 ? `${value}-01` : value;
  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(normalized)
    ? value
    : null;
}
function modalities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (item): item is string => typeof item === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(item),
      ),
    ),
  ]
    .slice(0, 20)
    .sort();
}
/** Optional detail fields. Each is included only when the source reports a valid value. */
function details(
  model: Record<string, unknown>,
  cost: Record<string, unknown> | null,
  limits: Record<string, unknown> | null,
): Partial<ModelRecord> {
  const out: Partial<ModelRecord> = {};
  const set = <K extends keyof ModelRecord>(key: K, value: ModelRecord[K] | null | undefined) => {
    if (value !== null && value !== undefined) out[key] = value;
  };
  set('maxOutput', finite(limits?.output) || null);
  const maxInput = finite(limits?.input);
  if (maxInput) set('maxInput', maxInput);
  set('cacheReadPrice', finite(cost?.cache_read, 1e7));
  set('cacheWritePrice', finite(cost?.cache_write, 1e7));
  set('reasoningPrice', finite(cost?.reasoning, 1e7));
  set('audioInputPrice', finite(cost?.input_audio, 1e7));
  set('audioOutputPrice', finite(cost?.output_audio, 1e7));
  const tiers: LongContextPrice[] = [];
  if (Array.isArray(cost?.tiers))
    for (const raw of cost.tiers.slice(0, 8)) {
      const tier = record(raw);
      const bound = record(tier?.tier);
      const threshold = bound?.type === 'context' ? finite(bound.size, 1e9) : null;
      if (!tier || !threshold) continue;
      tiers.push({
        threshold,
        input: finite(tier.input, 1e7),
        output: finite(tier.output, 1e7),
        cacheRead: finite(tier.cache_read, 1e7),
      });
    }
  const over = record(cost?.context_over_200k);
  if (!tiers.length && over)
    tiers.push({
      threshold: 200000,
      input: finite(over.input, 1e7),
      output: finite(over.output, 1e7),
      cacheRead: finite(over.cache_read, 1e7),
    });
  const priced = tiers.filter((tier) => tier.input !== null || tier.output !== null);
  if (priced.length)
    set(
      'longContextPricing',
      priced.sort((a, b) => a.threshold - b.threshold),
    );
  set('knowledge', date(model.knowledge));
  set('lastUpdated', date(model.last_updated));
  const family = shortText(model.family, 80);
  if (family && /^[a-z0-9][a-z0-9._-]*$/i.test(family)) set('family', family.toLowerCase());
  for (const [key, field] of [
    ['toolCall', 'tool_call'],
    ['structuredOutput', 'structured_output'],
    ['attachment', 'attachment'],
    ['temperature', 'temperature'],
  ] as const)
    if (typeof model[field] === 'boolean') set(key, model[field] as boolean);
  if (Array.isArray(model.reasoning_options)) {
    for (const raw of model.reasoning_options.slice(0, 10)) {
      const option = record(raw);
      if (option?.type === 'toggle') set('reasoningToggle', true);
      if (option?.type === 'budget_tokens') set('reasoningBudget', true);
      if (option?.type === 'effort' && Array.isArray(option.values)) {
        const efforts = [
          ...new Set(
            option.values.filter(
              (value): value is string =>
                typeof value === 'string' && /^[a-z][a-z0-9-]{0,15}$/.test(value),
            ),
          ),
        ].slice(0, 8);
        if (efforts.length) set('reasoningEfforts', efforts);
      }
    }
  }
  return out;
}
/** Reject malformed upstream records; unknown prices are null, never zero. */
export function normalizeCatalog(
  input: unknown,
  retrievedAt = new Date().toISOString(),
): CatalogSnapshot {
  const upstream = record(input);
  if (!upstream || !Number.isFinite(Date.parse(retrievedAt)))
    throw new Error('Invalid catalog envelope.');
  const models = new Map<string, ModelRecord>();
  const providers: CatalogProvider[] = [];
  const entries = Object.entries(upstream);
  if (entries.length > 2000) throw new Error('Catalog provider limit exceeded.');
  for (const [providerId, rawProvider] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(providerId)) continue;
    const provider = record(rawProvider);
    const offerings = record(provider?.models);
    const providerName = shortText(provider?.name);
    if (!provider || !offerings || !providerName) continue;
    const providerUrl = safeUrl(provider.doc);
    let modelCount = 0;
    for (const [modelId, rawModel] of Object.entries(offerings).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const model = record(rawModel);
      const name = shortText(model?.name, 400);
      if (!model || !name || !shortText(modelId, 300) || /[\x00-\x1f\x7f]/.test(modelId)) continue;
      const cost = record(model.cost);
      const limits = record(model.limit);
      const modes = record(model.modalities);
      const inputModalities = modalities(modes?.input);
      const outputModalities = modalities(modes?.output);
      const id = `${providerId}/${modelId}`;
      models.set(id, {
        id,
        modelId,
        name,
        provider: providerName,
        providerId,
        contextWindow: finite(limits?.context),
        inputPrice: finite(cost?.input, 1e7),
        outputPrice: finite(cost?.output, 1e7),
        releaseDate: date(model.release_date),
        modalities: [...new Set([...inputModalities, ...outputModalities])].sort(),
        inputModalities,
        outputModalities,
        reasoning: model.reasoning === true,
        openWeights: model.open_weights === true,
        sourceUrl: `https://github.com/anomalyco/models.dev/blob/dev/providers/${encodeURIComponent(providerId)}/models/${modelId.split('/').map(encodeURIComponent).join('/')}.toml`,
        providerUrl,
        ...(shortText(model.description, 2000)
          ? { description: shortText(model.description, 2000)! }
          : {}),
        ...(['alpha', 'beta', 'deprecated'].includes(String(model.status))
          ? { status: String(model.status) }
          : {}),
        ...details(model, cost, limits),
      });
      modelCount++;
      if (models.size > 50000) throw new Error('Catalog model limit exceeded.');
    }
    if (modelCount)
      providers.push({
        id: providerId,
        name: providerName,
        modelCount,
        sourceUrl: providerUrl ?? `https://models.dev`,
        logo: providerLogo(providerId),
      });
  }
  if (!models.size) throw new Error('Catalog contains no valid models.');
  return {
    schemaVersion: 1,
    updatedAt: new Date(retrievedAt).toISOString(),
    source: 'models.dev',
    sourceUrl: CATALOG_SOURCE_URL,
    license: 'MIT',
    coverage: CATALOG_COVERAGE,
    benchmarkStatus: 'unavailable',
    models: [...models.values()],
    providers,
  };
}
export function catalogSummary(snapshot: CatalogSnapshot): CatalogSummary {
  return {
    updatedAt: snapshot.updatedAt,
    source: snapshot.source,
    sourceUrl: snapshot.sourceUrl,
    coverage: snapshot.coverage,
    benchmarkStatus: snapshot.benchmarkStatus,
    totalModels: snapshot.models.length,
    totalProviders: snapshot.providers.length,
    modelCount: snapshot.models.length,
    providerCount: snapshot.providers.length,
    featured: [
      'openai',
      'anthropic',
      'google',
      'xai',
      'deepseek',
      'mistral',
      'moonshotai',
      'alibaba',
    ].flatMap((provider) =>
      snapshot.models
        .filter(
          (model) =>
            model.providerId === provider &&
            model.status !== 'deprecated' &&
            model.outputModalities.includes('text'),
        )
        .sort(
          (a, b) =>
            (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') || a.id.localeCompare(b.id),
        )
        .slice(0, 1),
    ),
    reasoningModels: snapshot.models.filter((model) => model.reasoning).length,
    openWeightModels: snapshot.models.filter((model) => model.openWeights).length,
    providers: snapshot.providers,
  };
}
/** Nulls always sort last; ties are deterministic across machines. */
export function queryCatalog(snapshot: CatalogSnapshot, query: CatalogQuery = {}): CatalogPage {
  const search = (query.query ?? '').trim().slice(0, 200).toLocaleLowerCase('en');
  const limit = Math.min(100, Math.max(1, Math.floor(query.limit || 24)));
  const sort = (['name', 'newest', 'context', 'input-price', 'output-price'] as const).includes(
    query.sort!,
  )
    ? query.sort!
    : 'newest';
  const rows = snapshot.models.filter(
    (model) =>
      (!search ||
        `${model.name} ${model.modelId} ${model.provider}`
          .toLocaleLowerCase('en')
          .includes(search)) &&
      (!query.provider || model.providerId === query.provider) &&
      (!query.modality || model.modalities.includes(query.modality)) &&
      (query.reasoning === undefined || model.reasoning === query.reasoning) &&
      (query.openWeights === undefined || model.openWeights === query.openWeights),
  );
  const compareNumber = (a: number | null, b: number | null, descending = false) =>
    a === null ? (b === null ? 0 : 1) : b === null ? -1 : descending ? b - a : a - b;
  rows.sort((a, b) => {
    let order = 0;
    if (sort === 'name') order = a.name.localeCompare(b.name, 'en');
    if (sort === 'newest')
      order =
        a.releaseDate === null
          ? b.releaseDate === null
            ? 0
            : 1
          : b.releaseDate === null
            ? -1
            : b.releaseDate.localeCompare(a.releaseDate);
    if (sort === 'context') order = compareNumber(a.contextWindow, b.contextWindow, true);
    if (sort === 'input-price') order = compareNumber(a.inputPrice, b.inputPrice);
    if (sort === 'output-price') order = compareNumber(a.outputPrice, b.outputPrice);
    return order || a.id.localeCompare(b.id, 'en');
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / limit));
  const page = Math.min(pageCount, Math.max(1, Math.floor(query.page || 1)));
  return {
    ...catalogSummary(snapshot),
    models: rows.slice((page - 1) * limit, page * limit),
    total: rows.length,
    page,
    pageCount,
    limit,
    sort,
  };
}
/** Optional licensed imports must identify the exact metric and test methodology. */
export function validateBenchmark(input: unknown): ModelBenchmark | null {
  const value = record(input);
  if (
    !value ||
    finite(value.score) === null ||
    !shortText(value.metric, 100) ||
    !shortText(value.methodology, 4000) ||
    !safeUrl(value.sourceUrl) ||
    typeof value.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.updatedAt))
  )
    return null;
  if (
    (value.speed !== undefined && finite(value.speed) === null) ||
    (value.latency !== undefined && finite(value.latency) === null)
  )
    return null;
  return {
    score: value.score as number,
    metric: value.metric as string,
    methodology: value.methodology as string,
    sourceUrl: safeUrl(value.sourceUrl)!,
    updatedAt: new Date(value.updatedAt).toISOString(),
    ...(value.speed !== undefined ? { speed: value.speed as number } : {}),
    ...(value.latency !== undefined ? { latency: value.latency as number } : {}),
  };
}

/** Compact runtime index: ranking order is computed at build time, not per request. */
export type CatalogIndexRow = [
  provider: number,
  modelId: number,
  name: number,
  context: number | null,
  inputPrice: number | null,
  outputPrice: number | null,
  releaseDate: number | null,
  modalities: number,
  reasoning: number,
  openWeights: number,
];
export interface CatalogIndex {
  schemaVersion: 2;
  /** Shared string table avoids repeated allocations on cold Worker requests. */
  strings: string[];
  updatedAt: string;
  shardSize: number;
  providers: string[];
  providerNames: string[];
  rows: CatalogIndexRow[];
  orders: Record<CatalogSort, number[]>;
}
export function buildCatalogIndex(snapshot: CatalogSnapshot): CatalogIndex {
  const strings: string[] = [];
  const stringNumbers = new Map<string, number>();
  const intern = (value: string): number => {
    const previous = stringNumbers.get(value);
    if (previous !== undefined) return previous;
    const position = strings.length;
    stringNumbers.set(value, position);
    strings.push(value);
    return position;
  };
  const providers = snapshot.providers.map((provider) => provider.id);
  const providerNumbers = new Map(providers.map((id, index) => [id, index]));
  const rowNumbers = new Map(snapshot.models.map((model, index) => [model.id, index]));
  const orders = {} as Record<CatalogSort, number[]>;
  for (const sort of ['name', 'newest', 'context', 'input-price', 'output-price'] as const) {
    // Offline only: preserve the same stable, null-last order as queryCatalog.
    const sorted = [...snapshot.models].sort((a, b) => {
      let difference = 0;
      if (sort === 'name') difference = a.name.localeCompare(b.name, 'en');
      else {
        const left =
          sort === 'newest'
            ? a.releaseDate
            : sort === 'context'
              ? a.contextWindow
              : sort === 'input-price'
                ? a.inputPrice
                : a.outputPrice;
        const right =
          sort === 'newest'
            ? b.releaseDate
            : sort === 'context'
              ? b.contextWindow
              : sort === 'input-price'
                ? b.inputPrice
                : b.outputPrice;
        difference =
          left === null
            ? right === null
              ? 0
              : 1
            : right === null
              ? -1
              : typeof left === 'string' && typeof right === 'string'
                ? right.localeCompare(left)
                : sort === 'context'
                  ? Number(right) - Number(left)
                  : Number(left) - Number(right);
      }
      return difference || a.id.localeCompare(b.id, 'en');
    });
    orders[sort] = sorted.map((model) => rowNumbers.get(model.id)!);
  }
  return {
    schemaVersion: 2,
    strings,
    updatedAt: snapshot.updatedAt,
    shardSize: 32,
    providers,
    providerNames: snapshot.providers.map((provider) => provider.name),
    rows: snapshot.models.map((model) => [
      providerNumbers.get(model.providerId)!,
      intern(model.modelId),
      intern(model.name),
      model.contextWindow,
      model.inputPrice,
      model.outputPrice,
      model.releaseDate === null ? null : intern(model.releaseDate),
      intern(model.modalities.join(',')),
      Number(model.reasoning),
      Number(model.openWeights),
    ]),
    orders,
  };
}
export function queryCatalogIndex(
  index: CatalogIndex,
  query: CatalogQuery & { ids?: string[] } = {},
) {
  const search = (query.query ?? '').trim().slice(0, 200).toLowerCase();
  const limit = Math.min(
    40,
    Math.max(1, Number.isFinite(query.limit) ? Math.floor(query.limit!) : 24),
  );
  const sort: CatalogSort =
    query.sort && Object.hasOwn(index.orders, query.sort) ? query.sort : 'newest';
  const ids = query.ids?.length ? new Set(query.ids.slice(0, 3)) : null;
  const provider = query.provider ? index.providers.indexOf(query.provider) : null;
  const matched = index.orders[sort].filter((rowNumber) => {
    const row = index.rows[rowNumber];
    return (
      (provider === null || row[0] === provider) &&
      (!ids || ids.has(`${index.providers[row[0]]}/${index.strings[row[1]]}`)) &&
      (!search ||
        `${index.strings[row[2]]} ${index.strings[row[1]]} ${index.providerNames[row[0]]}`
          .toLowerCase()
          .includes(search)) &&
      (!query.modality || index.strings[row[7]].split(',').includes(query.modality)) &&
      (query.reasoning === undefined || row[8] === Number(query.reasoning)) &&
      (query.openWeights === undefined || row[9] === Number(query.openWeights))
    );
  });
  const pageCount = Math.max(1, Math.ceil(matched.length / limit));
  const page = Math.min(
    pageCount,
    Math.max(1, Number.isFinite(query.page) ? Math.floor(query.page!) : 1),
  );
  return {
    positions: matched.slice((page - 1) * limit, page * limit),
    total: matched.length,
    page,
    pageCount,
    limit,
    sort,
  };
}
