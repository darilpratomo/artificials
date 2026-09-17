import { parse } from 'csv-parse/sync';
import { load } from 'cheerio';
import type { BenchmarkCategory, BenchmarkRow } from '../../shared/benchmarks.ts';

export function identity(model: string) {
  const providers: [RegExp, string, string][] = [
    [/^(gpt|o[1-9]|chatgpt|dall)/i, 'OpenAI', 'openai'],
    [/^claude/i, 'Anthropic', 'anthropic'],
    [/^(gemini|nano.?banana|imagen)/i, 'Google', 'google'],
    [/^deepseek/i, 'DeepSeek', 'deepseek'],
    [/^(qwen|wan)/i, 'Alibaba', 'alibaba'],
    [/^grok/i, 'xAI', 'xai'],
    [/^(kimi|moonshot)/i, 'Moonshot AI', 'moonshotai'],
    [/^glm/i, 'Z.ai', 'zai'],
    [/^minimax/i, 'MiniMax', 'minimax'],
    [/^(flux)/i, 'Black Forest Labs', 'black-forest-labs'],
    [/^(sd-|stable.diffusion)/i, 'Stability AI', 'stabilityai'],
    [/^seedream/i, 'ByteDance', 'bytedance'],
    [/^hunyuan/i, 'Tencent', 'tencent'],
    [/^mistral|^magistral/i, 'Mistral AI', 'mistral'],
    [/^llama/i, 'Meta', 'meta'],
  ];
  const found = providers.find(([pattern]) => pattern.test(model));
  return { provider: found?.[1] || 'See source', providerId: found?.[2] || 'unknown' };
}

export function rankRows(rows: Omit<BenchmarkRow, 'rank'>[]): BenchmarkRow[] {
  if (new Set(rows.map((r) => r.id)).size !== rows.length) throw Error('Duplicate benchmark row');
  const sorted = rows
    .map((r) => {
      if (!Number.isFinite(r.score) || r.score < 0 || r.score > 100) throw Error('Invalid score');
      return { ...r, score: Math.round(r.score * 100) / 100, rank: 0 };
    })
    .sort((a, b) => b.score - a.score || a.model.localeCompare(b.model));
  let rank = 0;
  return sorted.map((r, i) => {
    if (!i || sorted[i - 1].score !== r.score) rank = i + 1;
    return { ...r, rank };
  });
}

const categoryInfo: Record<string, [string, string, string]> = {
  Reasoning: ['reasoning', 'Reasoning', 'Logical, spatial and multi-step reasoning tasks.'],
  Coding: ['coding', 'Coding', 'Code generation and completion on the published LiveBench tasks.'],
  'Agentic Coding': [
    'agentic-coding',
    'Agentic coding',
    'JavaScript, TypeScript and Python agentic coding tasks.',
  ],
  Mathematics: [
    'math',
    'Mathematics',
    'Competition mathematics, symbolic work and problem solving.',
  ],
  'Data Analysis': [
    'data-analysis',
    'Data analysis',
    'Working with tables and structured information.',
  ],
  Language: ['language', 'Language', 'Language puzzles, connections and text understanding.'],
  IF: [
    'instruction-following',
    'Instructions',
    'Following constraints in rewriting, summaries and generation.',
  ],
};

export function parseLiveBench(
  csv: string,
  groups: Record<string, string[]>,
  sourceUrl: string,
): BenchmarkCategory[] {
  const records = parse(csv, { columns: true, skip_empty_lines: true, bom: true }) as Record<
    string,
    string
  >[];
  if (!records.length || !records[0].model || !Object.keys(groups).length)
    throw Error('Invalid LiveBench schema');
  for (const [group, tasks] of Object.entries(groups)) {
    if (
      !categoryInfo[group] ||
      !Array.isArray(tasks) ||
      !tasks.length ||
      tasks.some((k) => !(k in records[0]))
    )
      throw Error(`Unrecognized LiveBench category or columns: ${group}`);
  }
  const average = (record: Record<string, string>, tasks: string[]) => {
    const values = tasks.map((k) => (record[k]?.trim() ? Number(record[k]) : NaN));
    // Missing tasks exclude a model from this category, never inflate an average or become zero.
    if (values.some((n) => !Number.isFinite(n))) return null;
    if (values.some((n) => n < 0 || n > 100)) throw Error('LiveBench score outside 0–100');
    return values.reduce((a, b) => a + b, 0) / values.length;
  };
  const categories: BenchmarkCategory[] = Object.entries(groups).map(([group, tasks]) => {
    const [id, name, description] = categoryInfo[group];
    return {
      id,
      name,
      description,
      sourceId: 'livebench',
      methodology: `Arithmetic mean of the ${tasks.length} published task scores in this category. Only complete results are ranked. Exact model and effort configurations are preserved.`,
      rows: rankRows(
        records.flatMap((record) => {
          const score = average(record, tasks);
          return score === null
            ? []
            : [
                {
                  id: record.model,
                  model: record.model,
                  ...identity(record.model),
                  score,
                  sourceUrl,
                },
              ];
        }),
      ),
    };
  });
  const overall: BenchmarkCategory = {
    id: 'overall',
    name: 'Overall',
    sourceId: 'livebench',
    description: 'Broad language-model performance across the current LiveBench release.',
    methodology: `Equal-weight mean of all ${categories.length} category means, matching the published aggregation method for complete results. This is LiveBench performance, not a universal best-model score.`,
    rows: rankRows(
      records.flatMap((record) => {
        const scores = Object.values(groups).map((tasks) => average(record, tasks));
        return scores.some((s) => s === null)
          ? []
          : [
              {
                id: record.model,
                model: record.model,
                ...identity(record.model),
                score: (scores as number[]).reduce((a, b) => a + b, 0) / scores.length,
                sourceUrl,
              },
            ];
      }),
    ),
  };
  return [overall, ...categories];
}

export function parseImageBench(html: string, sourceUrl: string): BenchmarkCategory {
  const $ = load(html);
  const evaluator = $('.evaluator-btn.active[aria-pressed="true"]');
  if (
    !evaluator.length ||
    evaluator.toArray().some((el) => $(el).attr('data-evaluator') !== 'gemini-2-5-flash')
  )
    throw Error('Image benchmark evaluator changed');
  const table = $('#benchmarkTable');
  if (table.length !== 1 || !table.find('th.overall-col').text().includes('Overall'))
    throw Error('Image benchmark schema changed');
  const rows: Omit<BenchmarkRow, 'rank'>[] = [];
  table.find('tbody tr.data-row').each((_, element) => {
    const row = $(element);
    const model =
      row.find('td.model a').first().text().trim() || row.find('td.model').text().trim();
    const text = row.find('td.overall-col').text().trim();
    if (!model || !/^\d+(\.\d+)?$/.test(text)) throw Error('Invalid image benchmark row');
    rows.push({ id: model, model, ...identity(model), score: Number(text), sourceUrl });
  });
  return {
    id: 'image',
    name: 'Image generation',
    sourceId: 'corebench',
    description: 'Text-to-image composition and visual reasoning, evaluated by T2I-CoReBench.',
    methodology:
      'Published overall scores with the Gemini 2.5 Flash evaluator. These measure composition and reasoning across 12 dimensions, not human aesthetic preference. Prompt-rewriting variants and other evaluators are excluded. Coverage is limited to models evaluated by the source.',
    rows: rankRows(rows),
  };
}
