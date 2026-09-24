import { unzipSync, strFromU8 } from 'fflate';
import { parse } from 'csv-parse/sync';
import type { BenchmarkCategory, BenchmarkDomain, BenchmarkRow } from '../../shared/benchmarks.ts';
import { identity, rankRows } from './benchmark-sources.ts';

export const EPOCH_DATA_URL = 'https://epoch.ai/data/benchmark_data.zip';
export const EPOCH_URL = 'https://epoch.ai/benchmarks';
const MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const ECI_FILE = 'epoch_capabilities_index/eci_scores.csv';
const ECI_VERSIONS_FILE = 'epoch_capabilities_index/processed_data_for_eci.csv';

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

function maker(model: string, organization: string) {
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
  return { categories, latestRun };
}
