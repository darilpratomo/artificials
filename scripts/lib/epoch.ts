import { unzipSync, strFromU8 } from 'fflate';
import { parse } from 'csv-parse/sync';
import type {
  AgentResult,
  BenchmarkCategory,
  BenchmarkDomain,
  BenchmarkRow,
  ModelFacts,
  TaskUsage,
  TimeHorizon,
} from '../../shared/benchmarks.ts';
import { plainText } from '../../shared/catalog.ts';
import { identity, rankRows } from './benchmark-sources.ts';

export const EPOCH_DATA_URL = 'https://epoch.ai/data/benchmark_data.zip';
export const EPOCH_URL = 'https://epoch.ai/benchmarks';
const MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const ECI_FILE = 'epoch_capabilities_index/eci_scores.csv';
const ECI_VERSIONS_FILE = 'epoch_capabilities_index/processed_data_for_eci.csv';
const MODEL_FILE = 'model_metadata.csv';

interface EpochSpec {
  file: string;
  /** Exact benchmark name in the source's benchmark_metadata.csv. */
  benchmark: string;
  id: string;
  name: string;
  domain: BenchmarkDomain;
  description: string;
}

/**
 * Only evaluations Epoch AI runs itself. Files ending in `_external` come from
 * other projects and keep their own licences, so they are never imported here.
 * The one exception, Terminal-Bench, is read separately by `parseTerminalBench`.
 */
export const EPOCH_BENCHMARKS: EpochSpec[] = [
  {
    file: 'gpqa_diamond.csv',
    benchmark: 'GPQA diamond',
    id: 'gpqa-diamond',
    name: 'GPQA Diamond',
    domain: 'reasoning',
    description:
      'Graduate-level multiple-choice questions in biology, chemistry and physics, written by experts to be hard to answer with a web search. Random guessing scores 25%.',
  },
  {
    file: 'otis_mock_aime_2024_2025.csv',
    benchmark: 'OTIS Mock AIME 2024-2025',
    id: 'mock-aime',
    name: 'Mock AIME 2024–2025',
    domain: 'math',
    description:
      'Competition mathematics in the style of the AIME exam, from the OTIS olympiad program. Every answer is a whole number from 0 to 999.',
  },
  {
    file: 'frontiermath_tiers_1_3_v2.csv',
    benchmark: 'FrontierMath-Tiers-1-3-v2-Private',
    id: 'frontiermath',
    name: 'FrontierMath Tiers 1–3',
    domain: 'math',
    description:
      'Original, unpublished mathematics problems from advanced undergraduate to research level, written by mathematicians and checked automatically.',
  },
  {
    file: 'frontiermath_tier_4_v2.csv',
    benchmark: 'FrontierMath-Tier-4-v2-Private',
    id: 'frontiermath-tier-4',
    name: 'FrontierMath Tier 4',
    domain: 'math',
    description: 'The hardest FrontierMath set: exceptionally difficult research-level problems.',
  },
  {
    file: 'math_level_5.csv',
    benchmark: 'MATH level 5',
    id: 'math-level-5',
    name: 'MATH Level 5',
    domain: 'math',
    description:
      'The hardest level of the MATH competition problem set. Leading models now score near the top, so it separates older and smaller models best.',
  },
  {
    file: 'swe_bench_verified.csv',
    benchmark: 'SWE-Bench verified',
    id: 'swe-bench-verified',
    name: 'SWE-bench Verified',
    domain: 'coding',
    description:
      'Real issues from open-source Python projects. The model must change the code so the project’s tests pass. Engineers confirmed each task is solvable.',
  },
  {
    file: 'simpleqa_verified.csv',
    benchmark: 'SimpleQA Verified',
    id: 'simpleqa-verified',
    name: 'SimpleQA Verified',
    domain: 'knowledge',
    description:
      'Short factual questions with a single correct answer, testing whether a model recalls facts accurately.',
  },
  {
    file: 'chess_puzzles.csv',
    benchmark: 'Chess Puzzles',
    id: 'chess-puzzles',
    name: 'Chess puzzles',
    domain: 'reasoning',
    description: 'Chess puzzles given to the model as text, scored on finding the correct moves.',
  },
];

const organizationIds: Record<string, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  'google deepmind': 'google',
  google: 'google',
  xai: 'xai',
  deepseek: 'deepseek',
  alibaba: 'alibaba',
  'mistral ai': 'mistral',
  'meta ai': 'meta',
  meta: 'meta',
  'moonshot ai': 'moonshotai',
  moonshot: 'moonshotai',
  'zhipu ai': 'zhipuai',
  'z.ai': 'zai',
  minimax: 'minimax',
  amazon: 'amazon-bedrock',
  microsoft: 'azure',
  nvidia: 'nvidia',
  cohere: 'cohere',
};

function rowsOf(csv: string) {
  return parse(csv, { columns: true, skip_empty_lines: true, bom: true }) as Record<
    string,
    string
  >[];
}

function isoDay(value: string | undefined) {
  const day = (value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) ? day : undefined;
}

export function maker(model: string, organization: string) {
  const byName = identity(model);
  if (byName.providerId !== 'unknown')
    return { provider: organization || byName.provider, providerId: byName.providerId };
  const id = organizationIds[organization.trim().toLowerCase()];
  return { provider: organization.trim() || 'See source', providerId: id ?? 'unknown' };
}

export interface EpochResult {
  categories: BenchmarkCategory[];
  /** Latest evaluation date across the imported rows. */
  latestRun: string | null;
  /** Epoch AI's own records about each model. Empty when the file is missing or changed. */
  facts: ModelFacts[];
}

/** A short text field from the source, or undefined when empty or implausible. */
function field(value: string | undefined, maximum = 120) {
  const text = plainText(value ?? '');
  return text && text.length <= maximum ? text : undefined;
}

/**
 * Model facts are extra detail, not scores, so an unexpected file never stops
 * the benchmark refresh: it only leaves the facts out until it is reviewed.
 */
function parseFacts(csv: string | undefined): ModelFacts[] {
  if (!csv) return [];
  const records = rowsOf(csv);
  const columns = ['model_version', 'model_group', 'date', 'organization', 'accessibility'];
  if (!records.length || columns.some((column) => !(column in records[0]))) return [];
  const groups = new Map<string, ModelFacts>();
  for (const record of records) {
    const version = record.model_version?.trim();
    const name = field(record.model_group) ?? field(record.display_name);
    if (!version || !name || version.length > 120 || !/^[\w.:/@+-]+$/.test(version)) continue;
    let facts = groups.get(name);
    if (!facts) {
      facts = { name, versions: [] };
      groups.set(name, facts);
    }
    if (facts.versions.length < 40 && !facts.versions.includes(version))
      facts.versions.push(version);
    const released = isoDay(record.date);
    if (released && (!facts.releasedAt || released < facts.releasedAt)) facts.releasedAt = released;
    facts.organization ??= field(record.organization)?.replace(/,(?=\S)/g, ', ');
    facts.country ??= field(record.country);
    facts.access ??= field(record.accessibility, 60);
    const compute = Number(record.training_compute_flop);
    if (facts.trainingCompute === undefined && compute > 1e15 && compute < 1e30)
      facts.trainingCompute = Number(compute.toPrecision(3));
  }
  return [...groups.values()]
    .map((facts) => ({ ...facts, versions: facts.versions.sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reads Epoch AI's published benchmark archive. Fails closed: a changed licence,
 * a missing or superseded benchmark, an unexpected column or an out-of-range
 * score stops the refresh so the last valid snapshot stays published.
 */
export function parseEpoch(zip: Uint8Array): EpochResult {
  const wanted = new Set([
    'README.md',
    'benchmark_metadata.csv',
    ECI_FILE,
    ECI_VERSIONS_FILE,
    MODEL_FILE,
    ...EPOCH_BENCHMARKS.map((spec) => spec.file),
  ]);
  const files = unzipSync(zip, {
    filter: (entry) => {
      if (!wanted.has(entry.name)) return false;
      if (entry.originalSize > MAX_ENTRY_BYTES) throw Error(`Epoch entry too large: ${entry.name}`);
      return true;
    },
  });
  const text = (name: string) => {
    const bytes = files[name];
    if (!bytes) throw Error(`Epoch archive is missing ${name}`);
    return strFromU8(bytes);
  };

  // Republishing is only allowed while the data keeps its attribution licence.
  const readme = text('README.md');
  if (
    !readme.includes('free to use, distribute, and reproduce') ||
    !readme.includes('creativecommons.org/licenses/by/4.0')
  )
    throw Error('Epoch AI licence text changed; review before republishing');

  const metadata = new Map(
    rowsOf(text('benchmark_metadata.csv')).map((row) => [row.benchmark, row]),
  );
  let latestRun: string | null = null;
  const categories: BenchmarkCategory[] = [];

  for (const spec of EPOCH_BENCHMARKS) {
    const meta = metadata.get(spec.benchmark);
    if (!meta || meta.source_file !== spec.file)
      throw Error(`Epoch benchmark moved: ${spec.benchmark}`);
    if (meta.superseded_by?.trim()) throw Error(`Epoch benchmark superseded: ${spec.benchmark}`);
    const scale = Number(meta.scale);
    if (scale !== 1) throw Error(`Unexpected Epoch scale for ${spec.benchmark}`);
    const column = meta.score_column;
    const records = rowsOf(text(spec.file));
    if (!records.length || !(column in records[0]) || !('Model version' in records[0]))
      throw Error(`Epoch schema changed: ${spec.file}`);

    // One row per exact configuration; a re-run replaces an older run.
    const latest = new Map<string, Record<string, string>>();
    for (const record of records) {
      const model = record['Model version']?.trim();
      if (!model || !record[column]?.trim()) continue;
      const previous = latest.get(model);
      if (!previous || (record['Started at'] ?? '') > (previous['Started at'] ?? ''))
        latest.set(model, record);
    }
    const rows: Omit<BenchmarkRow, 'rank'>[] = [];
    for (const [model, record] of latest) {
      const value = Number(record[column]);
      if (!Number.isFinite(value) || value < 0 || value > 1)
        throw Error(`Epoch score outside 0–1 in ${spec.file}`);
      const stderr = Number(record.stderr);
      const evaluatedAt = isoDay(record['Started at']);
      if (evaluatedAt && (!latestRun || evaluatedAt > latestRun)) latestRun = evaluatedAt;
      rows.push({
        id: model,
        model,
        ...maker(model, record.Organization ?? ''),
        score: value * 100,
        sourceUrl: EPOCH_URL,
        ...(Number.isFinite(stderr) && stderr > 0 && stderr < 1
          ? { stderr: Math.round(stderr * 10000) / 100 }
          : {}),
        ...(evaluatedAt ? { evaluatedAt } : {}),
      });
    }
    const baseline = Number(meta.random_baseline);
    categories.push({
      id: spec.id,
      name: spec.name,
      sourceId: 'epoch',
      unit: 'percent',
      domain: spec.domain,
      description: spec.description,
      methodology:
        'Best published score for each exact model configuration, as evaluated by Epoch AI. A suffix such as _high names the reasoning effort used. Standard errors are shown where the source reports them.',
      ...(Number.isFinite(baseline) && baseline > 0 ? { randomBaseline: baseline * 100 } : {}),
      rows: rankRows(rows),
    });
  }

  // The index maps each display name to the model identifiers it was built from.
  const versions = new Map<string, Set<string>>();
  for (const row of rowsOf(text(ECI_VERSIONS_FILE))) {
    const name = row.Model?.trim();
    const version = row.model_version?.trim();
    if (!name || !version) continue;
    if (!versions.has(name)) versions.set(name, new Set());
    versions.get(name)!.add(version);
  }
  const eciRows: Omit<BenchmarkRow, 'rank'>[] = [];
  const eci = rowsOf(text(ECI_FILE));
  if (!eci.length || !('eci' in eci[0]) || !('Model' in eci[0]))
    throw Error('Epoch Capabilities Index schema changed');
  for (const record of eci) {
    const name = record.Model?.trim();
    const score = Number(record.eci);
    if (!name || !record.eci?.trim()) continue;
    if (!Number.isFinite(score) || score < 0 || score > 400)
      throw Error('Epoch Capabilities Index score out of range');
    const low = Number(record.eci_ci_low);
    const high = Number(record.eci_ci_high);
    const modelVersions = [...(versions.get(name) ?? [])].sort().slice(0, 20);
    const releasedAt = isoDay(record.date);
    const group = record['Accessibility group']?.trim();
    eciRows.push({
      id: name,
      model: record['Display name']?.trim() || name,
      ...maker(modelVersions[0] ?? name, record.Organization ?? ''),
      score,
      sourceUrl: EPOCH_URL,
      ...(Number.isFinite(low) && Number.isFinite(high) && low <= score && score <= high
        ? { ciLow: low, ciHigh: high }
        : {}),
      ...(modelVersions.length ? { versions: modelVersions } : {}),
      ...(releasedAt ? { releasedAt } : {}),
      ...(group === 'Open weights' || group === 'Closed weights'
        ? { openWeights: group === 'Open weights' }
        : {}),
    });
  }
  categories.unshift({
    id: 'capability-index',
    name: 'Capability index',
    sourceId: 'epoch',
    unit: 'index',
    domain: 'overall',
    description:
      'One general-capability score that combines results from many benchmarks. Higher is better. The scale has no fixed maximum, so compare models rather than reading it as a percentage.',
    methodology:
      'Epoch Capabilities Index (ECI) as published by Epoch AI, with its published confidence interval. It is a statistical combination of many benchmarks, not a single test.',
    rows: rankRows(eciRows, 400),
  });

  for (const category of categories)
    if (category.rows.length < 5) throw Error(`Too few Epoch results: ${category.id}`);
  const modelFile = files[MODEL_FILE];
  return { categories, latestRun, facts: parseFacts(modelFile && strFromU8(modelFile)) };
}

/** Terminal-Bench 2.0, whose leaderboard submissions are published under Apache-2.0. */
export const TERMINAL_BENCH = {
  file: 'terminalbench_external.csv',
  benchmark: 'Terminal Bench',
  name: 'Terminal-Bench 2.0',
  url: 'https://www.tbench.ai/leaderboard/terminal-bench/2.0',
  dataUrl: 'https://huggingface.co/datasets/harborframework/terminal-bench-2-leaderboard',
  /** The leaderboard dataset's card data, which states its licence (a few hundred bytes). */
  licenseApi:
    'https://huggingface.co/api/datasets/harborframework/terminal-bench-2-leaderboard?expand%5B%5D=cardData',
  license: 'Apache-2.0',
  licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
  tasks: 89,
};
/** Rows citing the Terminal-Bench 2.0 leaderboard. Anything else is left out. */
const TERMINAL_BENCH_SOURCES = new Set([TERMINAL_BENCH.url, 'Terminal-Bench v2 Leaderboard']);

/** "Terminus 2", " Terminus 2 " and "Terminus-2" are one agent. */
export const agentKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Terminal-Bench 2.0 leaderboard results, one per agent and model, from Epoch
 * AI's compilation in the same archive. The refresh confirms the leaderboard's
 * licence before publishing them. Fails closed, like `parseEpoch`.
 */
export function parseTerminalBench(zip: Uint8Array): {
  results: AgentResult[];
  latestRun: string | null;
} {
  const files = unzipSync(zip, {
    filter: (entry) => {
      if (entry.name !== 'benchmark_metadata.csv' && entry.name !== TERMINAL_BENCH.file)
        return false;
      if (entry.originalSize > MAX_ENTRY_BYTES) throw Error(`Epoch entry too large: ${entry.name}`);
      return true;
    },
  });
  const text = (name: string) => {
    const bytes = files[name];
    if (!bytes) throw Error(`Epoch archive is missing ${name}`);
    return strFromU8(bytes);
  };
  const meta = rowsOf(text('benchmark_metadata.csv')).find(
    (row) => row.source_file === TERMINAL_BENCH.file,
  );
  if (
    !meta ||
    meta.benchmark !== TERMINAL_BENCH.benchmark ||
    meta.score_column !== 'Accuracy mean' ||
    Number(meta.scale) !== 1
  )
    throw Error('Terminal-Bench entry changed in the Epoch archive');
  if (meta.superseded_by?.trim())
    throw Error('Terminal-Bench superseded; review before publishing');
  const records = rowsOf(text(TERMINAL_BENCH.file));
  const columns = ['Model version', 'Agent', 'Accuracy mean', 'Source'];
  if (!records.length || columns.some((column) => !(column in records[0])))
    throw Error('Terminal-Bench schema changed');

  // Each agent keeps the spelling of its name and organisation used most often.
  const spellings = new Map<string, Map<string, number>>();
  const organisations = new Map<string, Map<string, number>>();
  const tally = (map: Map<string, Map<string, number>>, key: string, value?: string) => {
    if (!value) return;
    const counts = map.get(key) ?? new Map<string, number>();
    counts.set(value, (counts.get(value) ?? 0) + 1);
    map.set(key, counts);
  };
  const common = (counts?: Map<string, number>) =>
    counts && [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  // Newest run first; on the same day, the entry citing the leaderboard page.
  const order = (record: Record<string, string>) =>
    `${isoDay(record['Run date']) ?? ''}|${record.Source.trim().startsWith('https://') ? 1 : 0}|${record.Created ?? ''}`;
  const kept = new Map<string, Record<string, string>>();
  for (const record of records) {
    if (!TERMINAL_BENCH_SOURCES.has(record.Source?.trim() ?? '')) continue;
    const agent = field(record.Agent?.replace(/\s+/g, ' '), 60);
    // "_unknown" marks an unrecorded reasoning effort; some entries appear with and without it.
    const model = record['Model version']?.trim().replace(/_unknown$/, '');
    if (!agent || !model || model.length > 120 || !/^[\w.:/@+-]+$/.test(model)) continue;
    if (!record['Accuracy mean']?.trim()) continue;
    const key = agentKey(agent);
    if (!key) continue;
    tally(spellings, key, agent);
    tally(organisations, key, field(record['Agent Org'], 60));
    const id = `${key}:${model}`;
    const previous = kept.get(id);
    if (!previous || order(record) > order(previous)) kept.set(id, record);
  }
  // One leaderboard entry is sometimes listed twice, once with an assumed
  // effort ("_medium") and once without, at the same score. Keep one.
  const entries = new Map<string, [string, Record<string, string>]>();
  for (const [id, record] of kept) {
    const [key, model] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
    const base = model.replace(/_[a-z]+$/i, '');
    const entry = `${key}:${base}:${Number(record['Accuracy mean']).toFixed(3)}`;
    const previous = entries.get(entry);
    if (!previous || order(record) > order(previous[1])) entries.set(entry, [id, record]);
  }

  let latestRun: string | null = null;
  const results: Omit<AgentResult, 'rank'>[] = [...entries.values()].map(([id, record]) => {
    const key = id.slice(0, id.indexOf(':'));
    const model = id.slice(id.indexOf(':') + 1);
    const value = Number(record['Accuracy mean']);
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw Error('Terminal-Bench score outside 0–1');
    const stderr = Number(record['Accuracy SE']);
    const runDate = isoDay(record['Run date']);
    if (runDate && (!latestRun || runDate > latestRun)) latestRun = runDate;
    const organisation = common(organisations.get(key));
    const modelName = field(record.Name, 80);
    return {
      id,
      agent: common(spellings.get(key))!,
      ...(organisation ? { agentOrg: organisation } : {}),
      model,
      ...(modelName ? { modelName } : {}),
      ...maker(model, record['Model Org']?.trim() || record.Organization || ''),
      score: Math.round(value * 10000) / 100,
      ...(Number.isFinite(stderr) && stderr > 0 && stderr < 1
        ? { stderr: Math.round(stderr * 10000) / 100 }
        : {}),
      ...(runDate ? { runDate } : {}),
    };
  });
  if (results.length < 40 || new Set(results.map((row) => agentKey(row.agent))).size < 10)
    throw Error('Unexpectedly few Terminal-Bench results');
  results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  let rank = 0;
  return {
    latestRun,
    results: results.map((row, index) => {
      if (!index || results[index - 1].score !== row.score) rank = index + 1;
      return { ...row, rank };
    }),
  };
}

/** Reads only the named entries of the archive. */
function entries(zip: Uint8Array, names: string[]) {
  const files = unzipSync(zip, {
    filter: (entry) => {
      if (!names.includes(entry.name)) return false;
      if (entry.originalSize > MAX_ENTRY_BYTES) throw Error(`Epoch entry too large: ${entry.name}`);
      return true;
    },
  });
  return (name: string) => {
    const bytes = files[name];
    if (!bytes) throw Error(`Epoch archive is missing ${name}`);
    return strFromU8(bytes);
  };
}

const positive = (value: string | undefined, maximum: number) => {
  const number = Number(value);
  return value?.trim() && Number.isFinite(number) && number > 0 && number <= maximum
    ? number
    : undefined;
};
const round = (value: number | undefined, digits: number) =>
  value === undefined ? undefined : Number(value.toFixed(digits));
function usageOf(usage: TaskUsage): TaskUsage | undefined {
  const entries = Object.entries(usage).filter(([, value]) => value !== undefined);
  return entries.length ? (Object.fromEntries(entries) as TaskUsage) : undefined;
}

/**
 * Agent tests whose results Epoch AI compiles from other projects. Their
 * publishers state no licence of their own; Epoch AI republishes them under
 * CC BY 4.0, and they are credited to both. Used on this non-commercial site.
 */
export const DEEPSWE = {
  file: 'deepswe_external.csv',
  name: 'DeepSWE',
  url: 'https://deepswe.datacurve.ai/',
  publisher: 'Datacurve',
  tasks: 113,
};
export const CURSORBENCH = {
  file: 'cursorbench_external.csv',
  name: 'CursorBench',
  url: 'https://cursor.com/cursorbench',
  publisher: 'Cursor',
};
export const TIME_HORIZONS = {
  file: 'metr_time_horizons_external.csv',
  name: 'METR time horizons',
  url: 'https://metr.org/',
  publisher: 'METR',
};

function agentTest(
  spec: { name: string; url: string },
  id: string,
  records: Record<string, string>[],
  row: (record: Record<string, string>) => Omit<BenchmarkRow, 'rank' | 'sourceUrl'> | undefined,
  info: Pick<BenchmarkCategory, 'description' | 'methodology'>,
): BenchmarkCategory {
  const latest = new Map<string, Omit<BenchmarkRow, 'rank'>>();
  for (const record of records) {
    const parsed = row(record);
    if (!parsed) continue;
    // One row per exact configuration; the first listed is kept.
    if (!latest.has(parsed.id)) latest.set(parsed.id, { ...parsed, sourceUrl: spec.url });
  }
  const rows = rankRows([...latest.values()]);
  if (rows.length < 10) throw Error(`Too few ${spec.name} results`);
  return {
    id,
    name: spec.name,
    sourceId: id,
    unit: 'percent',
    domain: 'agentic',
    ...info,
    rows,
  };
}

function configuration(record: Record<string, string>) {
  const model = record['Model version']?.trim();
  return model && model.length <= 120 && /^[\w.:/@+-]+$/.test(model) ? model : undefined;
}

/** DeepSWE: Datacurve's long software tasks, every model in mini-swe-agent. */
export function parseDeepSwe(zip: Uint8Array): BenchmarkCategory {
  const records = rowsOf(entries(zip, [DEEPSWE.file])(DEEPSWE.file));
  const columns = ['Model version', 'Pass@1', 'Harness', 'Mean cost (USD)', 'Mean agent steps'];
  if (!records.length || columns.some((column) => !(column in records[0])))
    throw Error('DeepSWE schema changed');
  return agentTest(
    DEEPSWE,
    'deepswe',
    records,
    (record) => {
      const model = configuration(record);
      if (!model || record.Source?.trim() !== DEEPSWE.url) return undefined;
      if (record.Harness?.trim() !== 'mini-swe-agent') return undefined;
      const value = Number(record['Pass@1']);
      if (!record['Pass@1']?.trim()) return undefined;
      if (!Number.isFinite(value) || value < 0 || value > 1)
        throw Error('DeepSWE score outside 0–1');
      // A 95% interval's half-width is 1.96 standard errors.
      const half = positive(record['95% CI half-width'], 1);
      const usage = usageOf({
        cost: round(positive(record['Mean cost (USD)'], 1000), 4),
        outputTokens: round(positive(record['Mean output tokens'], 1e8), 0),
        steps: round(positive(record['Mean agent steps'], 100000), 1),
      });
      return {
        id: model,
        model,
        ...maker(model, record.Organization ?? ''),
        score: value * 100,
        ...(half ? { stderr: Math.round((half / 1.96) * 10000) / 100 } : {}),
        ...(usage ? { usage } : {}),
      };
    },
    {
      description:
        'Original, long software engineering tasks from active open-source projects in TypeScript, Go, Python, JavaScript and Rust. Every model runs in the same minimal agent, mini-swe-agent.',
      methodology:
        'Pass@1 averaged over repeated runs, with average API cost, output tokens and agent steps per task, as published by Datacurve and compiled by Epoch AI. A suffix such as _high names the reasoning effort. Standard errors are derived from the published 95% intervals.',
    },
  );
}

/** CursorBench: Cursor's tasks from real editor sessions, scored by Cursor. */
export function parseCursorBench(zip: Uint8Array): BenchmarkCategory {
  const records = rowsOf(entries(zip, [CURSORBENCH.file])(CURSORBENCH.file));
  const columns = ['Model version', 'Score', 'Cost per task', 'Tokens per task', 'Steps per task'];
  if (!records.length || columns.some((column) => !(column in records[0])))
    throw Error('CursorBench schema changed');
  return agentTest(
    CURSORBENCH,
    'cursorbench',
    records,
    (record) => {
      const model = configuration(record);
      if (!model || record.Source?.trim() !== CURSORBENCH.url || !record.Score?.trim())
        return undefined;
      const value = Number(record.Score);
      if (!Number.isFinite(value) || value < 0 || value > 1)
        throw Error('CursorBench score outside 0–1');
      const usage = usageOf({
        cost: round(positive(record['Cost per task'], 1000), 2),
        tokens: round(positive(record['Tokens per task'], 1e9), 0),
        steps: round(positive(record['Steps per task'], 100000), 0),
      });
      return {
        id: model,
        model,
        ...maker(model, record.Organization ?? ''),
        score: value * 100,
        ...(usage ? { usage } : {}),
      };
    },
    {
      description:
        'Ambiguous, multi-file coding tasks drawn from real sessions in the Cursor editor, run and scored by Cursor.',
      methodology:
        'Scores, average cost, tokens and steps per task as published by Cursor and compiled by Epoch AI. Cost applies list prices per million tokens to each model’s token use. A suffix such as _high names the reasoning effort.',
    },
  );
}

/**
 * METR's time horizons: the length of software tasks, in the time a skilled
 * person needs, that a model completes half the time. Only the latest method
 * version is kept, since versions use different task suites.
 */
export function parseTimeHorizons(zip: Uint8Array): {
  version: string;
  results: TimeHorizon[];
  latestRelease: string | null;
} {
  const records = rowsOf(entries(zip, [TIME_HORIZONS.file])(TIME_HORIZONS.file));
  const columns = ['Model version', 'Time horizon', 'CI_low', 'CI_high', 'METR version'];
  if (!records.length || columns.some((column) => !(column in records[0])))
    throw Error('METR time horizon schema changed');
  const versions = [
    ...new Set(records.map((record) => record['METR version']?.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const version = versions.at(-1);
  if (!version || !/^METR-Horizon-v\d+(\.\d+)?$/.test(version))
    throw Error('METR time horizon version changed');
  const kept = new Map<string, Omit<TimeHorizon, 'rank'>>();
  let latestRelease: string | null = null;
  for (const record of records) {
    if (record['METR version']?.trim() !== version) continue;
    const identifier = configuration(record)?.replace(/_unknown$/, '');
    const minutes = positive(record['Time horizon'], 1e6);
    if (!identifier || minutes === undefined) continue;
    const low = positive(record.CI_low, 1e6);
    const high = positive(record.CI_high, 1e6);
    const minutes80 = positive(record['Time Horizon (80%)'], 1e6);
    const releasedAt = isoDay(record['Release date']);
    if (releasedAt && (!latestRelease || releasedAt > latestRelease)) latestRelease = releasedAt;
    // The same measurement listed with and without an effort label is one result.
    const base = identifier.replace(/_[a-z]+$/i, '');
    const key = `${base}:${minutes.toFixed(3)}`;
    if (kept.has(key)) continue;
    const modelName = field(record.Name, 80);
    kept.set(key, {
      id: identifier,
      model: identifier,
      ...(modelName ? { modelName } : {}),
      ...maker(identifier, record.Organization ?? ''),
      minutes: Math.round(minutes * 10) / 10,
      ...(low !== undefined && high !== undefined && low <= minutes && minutes <= high
        ? { low: Math.round(low * 10) / 10, high: Math.round(high * 10) / 10 }
        : {}),
      ...(minutes80 !== undefined ? { minutes80: Math.round(minutes80 * 10) / 10 } : {}),
      ...(releasedAt ? { releasedAt } : {}),
    });
  }
  const sorted = [...kept.values()].sort(
    (a, b) => b.minutes - a.minutes || a.id.localeCompare(b.id),
  );
  if (sorted.length < 8) throw Error('Too few METR time horizons');
  let rank = 0;
  return {
    version,
    latestRelease,
    results: sorted.map((row, index) => {
      if (!index || sorted[index - 1].minutes !== row.minutes) rank = index + 1;
      return { ...row, rank };
    }),
  };
}
