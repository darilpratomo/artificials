/**
 * Arena's published leaderboards: the image and video boards, as
 * scripts/sync-arena.mjs keeps them for their pages, and the language model
 * boards, which join the benchmark snapshot as tests.
 */
import type { BenchmarkCategory, BenchmarkDomain, BenchmarkRow } from './benchmarks.ts';

/** One row of Arena's published leaderboard. */
export interface ArenaRow {
  model: string;
  organization: string;
  license: string;
  category: string;
  rating: number;
  lower: number;
  upper: number;
  votes: number;
  rank: number;
}

export interface ArenaBoard {
  /** The publication the rows come from, YYYY-MM-DD. */
  published: string;
  rows: ArenaRow[];
  /** The first publication each current model appears in. */
  firstSeen: Record<string, string>;
  /** Each organisation's best overall score at the last publication of each month. */
  history: { date: string; best: { organization: string; model: string; rating: number }[] }[];
}

export interface ArenaSnapshot {
  version: 1;
  source: {
    id: string;
    name: string;
    url: string;
    dataUrl: string;
    license: string;
    licenseUrl: string;
    checkedAt: string;
    revision: string;
  };
  arenas: Record<string, ArenaBoard>;
}

export interface BoardModel {
  /** Arena's name, tidied for reading: "gpt-image-2 (medium)" reads "GPT Image 2 (medium)". */
  name: string;
  /** Arena's own identifier, exactly as published. */
  arenaName: string;
  makerId: string;
  maker: string;
  /** Downloadable weights: any licence other than Arena's "Proprietary". */
  open: boolean;
  /** The licence by its owner's name, such as "Apache 2.0". */
  license: string;
  firstSeen: string;
  /** First seen within 31 days of the publication. */
  isNew: boolean;
}

export interface BoardEntry {
  /** Index into the board's models. */
  model: number;
  rating: number;
  lower: number;
  upper: number;
  votes: number;
  rank: number;
}

export interface BoardCategory {
  id: string;
  label: string;
  entries: BoardEntry[];
}

export interface BoardPoint {
  date: string;
  value: number;
  name: string;
}

export interface Board {
  id: string;
  label: string;
  published: string;
  models: BoardModel[];
  categories: BoardCategory[];
  /** The best score of each leading maker at the end of each month. */
  progress: { makerId: string; maker: string; points: BoardPoint[] }[];
}

/** A data source as the pages credit it. */
export interface BoardSource {
  id: string;
  name: string;
  url: string;
  dataUrl?: string;
  license: string;
  licenseUrl: string;
}

/** Arena's organisations, mapped to the site's makers. */
const ORGANIZATIONS: Record<string, { makerId: string; maker: string }> = {
  openai: { makerId: 'openai', maker: 'OpenAI' },
  google: { makerId: 'google', maker: 'Google' },
  xai: { makerId: 'xai', maker: 'xAI' },
  meta: { makerId: 'meta', maker: 'Meta' },
  'microsoft-ai': { makerId: 'microsoft', maker: 'Microsoft AI' },
  bytedance: { makerId: 'bytedance', maker: 'ByteDance' },
  alibaba: { makerId: 'alibaba', maker: 'Alibaba' },
  // Arena files some Wan models under the team's own name; Wan is Alibaba's.
  wan: { makerId: 'alibaba', maker: 'Alibaba' },
  tencent: { makerId: 'tencent', maker: 'Tencent' },
  nvidia: { makerId: 'nvidia', maker: 'NVIDIA' },
  bfl: { makerId: 'black-forest-labs', maker: 'Black Forest Labs' },
  recraft: { makerId: 'recraft', maker: 'Recraft' },
  ideogram: { makerId: 'ideogram', maker: 'Ideogram' },
  reve: { makerId: 'reve', maker: 'Reve' },
  'luma-ai': { makerId: 'luma', maker: 'Luma AI' },
  krea: { makerId: 'krea', maker: 'Krea' },
  runway: { makerId: 'runway', maker: 'Runway' },
  kling: { makerId: 'kuaishou', maker: 'Kling AI' },
  stepfun: { makerId: 'stepfun', maker: 'StepFun' },
  zai: { makerId: 'zai', maker: 'Z.ai' },
  hidream: { makerId: 'hidream', maker: 'HiDream' },
  'leonardo-ai': { makerId: 'leonardo', maker: 'Leonardo.Ai' },
  minimax: { makerId: 'minimax', maker: 'MiniMax' },
  shengshu: { makerId: 'shengshu', maker: 'ShengShu' },
  pika: { makerId: 'pika', maker: 'Pika' },
  genmo: { makerId: 'genmo', maker: 'Genmo' },
  // Kandinsky is Sber AI's model family.
  kandinsky: { makerId: 'kandinsky', maker: 'Sber AI' },
  aorizon: { makerId: 'aorizon', maker: 'Aorizon' },
};

/**
 * The maker of a model. Arena leaves the organisation blank for a few models;
 * those are named after their family, so the family names the maker.
 */
export function makerOf(organization: string, model: string) {
  const known = ORGANIZATIONS[organization];
  if (known) return known;
  if (/^stable-diffusion/i.test(model)) return { makerId: 'stabilityai', maker: 'Stability AI' };
  if (/^p-(image|video)/i.test(model)) return { makerId: 'pruna', maker: 'Pruna AI' };
  if (/^ltx/i.test(model)) return { makerId: 'lightricks', maker: 'Lightricks' };
  if (/^pixverse/i.test(model)) return { makerId: 'pixverse', maker: 'PixVerse' };
  if (!organization) return { makerId: 'unknown', maker: 'Not reported' };
  return { makerId: organization, maker: organization.replace(/-/g, ' ') };
}

/** Words whose casing a plain capital does not get right. */
const WORDS: Record<string, string> = {
  gpt: 'GPT',
  mai: 'MAI',
  glm: 'GLM',
  bagel: 'BAGEL',
  chatgpt: 'ChatGPT',
  hidream: 'HiDream',
  seededit: 'SeedEdit',
  step1x: 'Step1X',
  minimax: 'MiniMax',
  pixverse: 'PixVerse',
  ltx: 'LTX',
  happyhorse: 'HappyHorse',
  t2i: 'T2I',
  i2i: 'I2I',
  t2v: 'T2V',
  i2v: 'I2V',
  fp8: 'FP8',
  uni: 'UNI',
  fal: '(fal)',
};

function word(value: string) {
  const lower = value.toLowerCase();
  if (WORDS[lower]) return WORDS[lower];
  // Sizes and resolutions: 9b → 9B, 2k → 2K, a14b → A14B.
  if (/^(\d+(\.\d+)?[bk]|a\d+b)$/.test(lower)) return lower.toUpperCase();
  // Versions such as v4.1 and o1 keep their number with a capital letter.
  if (/^[vo]\d/.test(lower)) return lower.toUpperCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Arena's identifiers, tidied for reading without changing what they say:
 * "gemini-3.1-flash-image (nano-banana-2) [web-search]" reads
 * "Gemini 3.1 Flash Image (Nano Banana 2), web search". Names Arena already
 * writes with capitals are kept as they are.
 */
export function prettyName(model: string): string {
  if (/[A-Z]/.test(model)) return model;
  const [, base = model, note = '', mode = ''] =
    /^([^([]+?)\s*(?:\(([^)]*)\))?\s*(?:\[([^\]]*)\])?$/.exec(model) ?? [];
  // A dated release or Google's API revision reads as a note after the name:
  // qwen-image-2.0-pro-2026-06-22 → … (2026-06-22), flux-3-video-20260811 →
  // … (2026-08-11), imagen-4.0-generate-001 → … (001).
  const dated = /-(\d{4}-\d{2}-\d{2}|\d{8}|generate-\d{3})$/.exec(base);
  const stem = dated ? base.slice(0, dated.index) : base;
  // A non-breaking hyphen (‑) keeps a hyphenated name together through the split.
  let name = stem
    .replace(/^dall-e-/, 'DALL·E-')
    .replace(/^stable-diffusion-v(\d)(\d)/, 'stable-diffusion-$1.$2')
    .replace(/^flux-(\d+\.\d+)(?=-|$)/, 'FLUX-$1')
    .replace(/^flux-(\d)(?=-|$)/, 'FLUX.$1')
    .replace(/^wan(\d)/, 'wan-$1')
    .replace(
      /^([zp])-(image|video)/,
      (_, letter: string, kind: string) => `${letter.toUpperCase()}‑${word(kind)}`,
    )
    .replace(/\bgen-?(\d)/, 'Gen‑$1')
    .replace(/^ltx-(\d)/, 'LTX‑$1')
    .split('-')
    .map((part) => (/^[A-Z]/.test(part) ? part : word(part)))
    .join(' ')
    .replace(/‑/g, '-');
  if (dated) {
    const note = dated[1].replace('generate-', '');
    name += ` (${/^\d{8}$/.test(note) ? `${note.slice(0, 4)}-${note.slice(4, 6)}-${note.slice(6)}` : note})`;
  }
  if (note)
    name += ` (${/^\d+$|^(low|medium|high)$/.test(note) ? note : note.split('-').map(word).join(' ')})`;
  if (mode) name += `, ${mode.replace(/-/g, ' ')}`;
  return name;
}

/** Licences Arena records as identifiers, by the name their owners give them. */
const LICENSES: Record<string, string> = {
  'flux-non-commercial-license': 'FLUX Non-Commercial License',
  'flux-1-dev-non-commercial-license': 'FLUX.1 [dev] Non-Commercial License',
  'qwen-research': 'Qwen Research License',
  'tencent-hunyuan-community': 'Tencent Hunyuan Community License',
  'krea-2-community-license': 'Krea 2 Community License',
  'minimax-h3-community-license-agreement': 'MiniMax H3 Community License',
  'ltx-2-community-license-agreement': 'LTX-2 Community License',
  Open: 'Open weights',
};

export function licenseName(license: string) {
  if (!license) return 'Not reported';
  return LICENSES[license] ?? license;
}

const CATEGORIES: Record<string, string> = {
  overall: 'Overall',
  photorealistic: 'Photorealistic',
  portraits: 'Portraits',
  art: 'Art',
  cartoon: 'Cartoon',
  '3d_modeling': '3D modeling',
  commercial_design: 'Commercial design',
  text_rendering: 'Text in images',
  multi_image_edit: 'Several images',
};
/** Categories other than the overall board need at least this many models. */
const MIN_CATEGORY = 20;

export function buildBoard(id: string, label: string, arena: ArenaBoard): Board {
  const models: BoardModel[] = [];
  const index = new Map<string, number>();
  const published = new Date(`${arena.published}T00:00:00Z`).getTime();
  for (const row of arena.rows) {
    if (index.has(row.model)) continue;
    const firstSeen = arena.firstSeen[row.model] ?? arena.published;
    index.set(row.model, models.length);
    models.push({
      name: prettyName(row.model),
      arenaName: row.model,
      ...makerOf(row.organization, row.model),
      open: row.license !== '' && row.license !== 'Proprietary',
      license: licenseName(row.license),
      firstSeen,
      isNew: published - new Date(`${firstSeen}T00:00:00Z`).getTime() <= 31 * 86_400_000,
    });
  }
  const byCategory = new Map<string, ArenaRow[]>();
  for (const row of arena.rows)
    byCategory.set(row.category, [...(byCategory.get(row.category) ?? []), row]);
  const categories = Object.keys(CATEGORIES)
    .filter((category) =>
      category === 'overall'
        ? byCategory.has(category)
        : (byCategory.get(category)?.length ?? 0) >= MIN_CATEGORY,
    )
    .map((category) => ({
      id: category,
      label: CATEGORIES[category],
      entries: byCategory
        .get(category)!
        .sort((a, b) => a.rank - b.rank || b.rating - a.rating)
        .map((row) => ({
          model: index.get(row.model)!,
          rating: row.rating,
          lower: row.lower,
          upper: row.upper,
          votes: row.votes,
          rank: row.rank,
        })),
    }));

  // The makers leading the board today, with their best score month by month.
  const overall = categories.find((category) => category.id === 'overall')?.entries ?? [];
  const leading: string[] = [];
  for (const entry of overall) {
    const { makerId } = models[entry.model];
    if (makerId !== 'unknown' && !leading.includes(makerId)) leading.push(makerId);
    if (leading.length === 6) break;
  }
  const progress = leading.map((makerId) => {
    const points: BoardPoint[] = [];
    for (const month of arena.history) {
      const best = month.best.find(
        (entry) => makerOf(entry.organization, entry.model).makerId === makerId,
      );
      if (best) points.push({ date: month.date, value: best.rating, name: prettyName(best.model) });
    }
    return { makerId, maker: models.find((model) => model.makerId === makerId)!.maker, points };
  });

  return { id, label, published: arena.published, models, categories, progress };
}

/** The boards of a snapshot in the given order, skipping any it lacks. */
export function buildBoards(arena: ArenaSnapshot | undefined, labels: Record<string, string>) {
  return arena
    ? Object.keys(labels)
        .filter((id) => arena.arenas[id])
        .map((id) => buildBoard(id, labels[id], arena.arenas[id]))
    : [];
}

/** Arena as a page credits it. */
export function arenaSource(arena: ArenaSnapshot): BoardSource {
  return {
    id: arena.source.id,
    name: arena.source.name,
    url: arena.source.url,
    dataUrl: arena.source.dataUrl,
    license: arena.source.license,
    licenseUrl: arena.source.licenseUrl,
  };
}

/** A row as Arena's dataset publishes it. */
export interface ArenaTableRow {
  model_name: string;
  organization?: string | null;
  license?: string | null;
  category: string;
  rating: number;
  rating_lower: number;
  rating_upper: number;
  rank: number | bigint;
  leaderboard_publish_date: string;
}

/** Arena's organisations for language models: the site's maker id and name. */
const LLM_MAKERS: Record<string, [id: string, name: string]> = {
  openai: ['openai', 'OpenAI'],
  anthropic: ['anthropic', 'Anthropic'],
  google: ['google', 'Google'],
  alibaba: ['alibaba', 'Alibaba'],
  deepseek: ['deepseek', 'DeepSeek'],
  meta: ['meta', 'Meta'],
  xai: ['xai', 'xAI'],
  zai: ['zai', 'Z.ai'],
  mistral: ['mistral', 'Mistral AI'],
  tencent: ['tencent', 'Tencent'],
  moonshot: ['moonshotai', 'Moonshot AI'],
  xiaomi: ['xiaomi', 'Xiaomi'],
  minimax: ['minimax', 'MiniMax'],
  nvidia: ['nvidia', 'NVIDIA'],
  amazon: ['amazon-bedrock', 'Amazon'],
  ibm: ['ibm', 'IBM'],
  microsoft: ['azure', 'Microsoft'],
  cohere: ['cohere', 'Cohere'],
  baidu: ['baidu', 'Baidu'],
  stepfun: ['stepfun', 'StepFun'],
  'inception-ai': ['inception', 'Inception'],
  bytedance: ['bytedance', 'ByteDance'],
  meituan: ['meituan', 'Meituan'],
  upstage: ['upstage', 'Upstage'],
  // Makers without a catalog id: named, but never used to rule out a match.
  allenai: ['unknown', 'Ai2'],
  'ant-group': ['unknown', 'Ant Group'],
  poolside: ['unknown', 'Poolside'],
  // Arena's name for the maker of Inkling, which the catalog calls Thinking Machines.
  thinky: ['unknown', 'Thinking Machines'],
};

/** Arena's language model tests the site shows, in the order it lists them. */
export const ARENA_TESTS: {
  id: string;
  board: 'text' | 'webdev';
  category: string;
  name: string;
  domain: BenchmarkDomain;
  description: string;
}[] = [
  {
    id: 'arena-text',
    board: 'text',
    category: 'overall',
    name: 'Arena text',
    domain: 'overall',
    description:
      'People ask two anonymous models their own question and vote for the better answer. The ranking comes from millions of these blind votes.',
  },
  {
    id: 'arena-webdev',
    board: 'webdev',
    category: 'overall',
    name: 'Arena WebDev',
    domain: 'coding',
    description:
      'People describe a web page or app; two anonymous models each build it, and people vote for the better working result.',
  },
  {
    id: 'arena-coding',
    board: 'text',
    category: 'coding',
    name: 'Arena coding',
    domain: 'coding',
    description:
      'Blind votes on conversations about code: people compare two anonymous answers to their own programming question.',
  },
  {
    id: 'arena-math',
    board: 'text',
    category: 'math',
    name: 'Arena math',
    domain: 'math',
    description: 'Blind votes on the math questions people asked two anonymous models.',
  },
  {
    id: 'arena-hard-prompts',
    board: 'text',
    category: 'hard_prompts',
    name: 'Arena hard prompts',
    domain: 'reasoning',
    description:
      'Blind votes on the hardest prompts: complex, specific questions that need real problem solving.',
  },
  {
    id: 'arena-creative-writing',
    board: 'text',
    category: 'creative_writing',
    name: 'Arena creative writing',
    domain: 'language',
    description: 'Blind votes on the stories, poems and other writing people asked for.',
  },
  {
    id: 'arena-instruction-following',
    board: 'text',
    category: 'instruction_following',
    name: 'Arena instruction following',
    domain: 'language',
    description:
      'Blind votes on prompts with specific instructions, judged on how well each answer follows them.',
  },
];

const ARENA_URLS = {
  text: 'https://arena.ai/leaderboard/text',
  webdev: 'https://arena.ai/leaderboard/webdev',
};
const METHODOLOGY = {
  text: 'Arena’s published scores with style control, which separates what an answer says from its length and formatting, as Arena’s leaderboard shows by default. Higher is better on an open-ended scale, like chess ratings; the range is Arena’s 95% confidence interval.',
  webdev:
    'Arena’s published WebDev scores. Higher is better on an open-ended scale, like chess ratings; the range is Arena’s 95% confidence interval.',
};

/**
 * Identifiers a row may match in the catalog, most specific first. Settings
 * are stripped so a result reaches its model: an effort in brackets, a
 * snapshot date, and "-max", which Anthropic and OpenAI use for their top
 * effort. Elsewhere "Max" names a model tier, such as Qwen3.8 Max, so it stays.
 */
export function arenaVersions(model: string, organization = ''): string[] {
  const out = [model];
  let value = model.trim().replace(/\s*\((?:minimal|none|low|medium|high|xhigh|max)\)$/i, '');
  out.push(value);
  if (/^(anthropic|openai)$/.test(organization)) {
    value = value.replace(/-max$/, '');
    out.push(value);
  }
  out.push(value.replace(/-(?:\d{8}|\d{4}-\d{2}-\d{2})$/, ''));
  return [...new Set(out)];
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Arena's language model boards as benchmark categories. Each board uses its
 * latest publication; the result also says when that was.
 */
export function arenaCategories(boards: Record<'text' | 'webdev', ArenaTableRow[]>): {
  categories: BenchmarkCategory[];
  published: string;
} {
  const latest = (rows: ArenaTableRow[]) =>
    rows.reduce(
      (last, row) => (row.leaderboard_publish_date > last ? row.leaderboard_publish_date : last),
      '',
    );
  const published = { text: latest(boards.text), webdev: latest(boards.webdev) };
  const categories = ARENA_TESTS.map((test) => {
    const rows: BenchmarkRow[] = boards[test.board]
      .filter(
        (row) =>
          row.category === test.category && row.leaderboard_publish_date === published[test.board],
      )
      .sort((a, b) => b.rating - a.rating)
      .map((row) => {
        const organization = (row.organization ?? '').trim();
        const [providerId, provider] = LLM_MAKERS[organization] ?? [
          'unknown',
          organization
            ? organization.charAt(0).toUpperCase() + organization.slice(1)
            : 'See source',
        ];
        const license = (row.license ?? '').trim();
        return {
          id: row.model_name,
          model: row.model_name,
          provider,
          providerId,
          score: round(row.rating),
          rank: Number(row.rank),
          sourceUrl: ARENA_URLS[test.board],
          ciLow: round(row.rating_lower),
          ciHigh: round(row.rating_upper),
          evaluatedAt: published[test.board],
          openWeights: license !== '' && license !== 'Proprietary',
          versions: arenaVersions(row.model_name, organization),
        };
      });
    return {
      id: test.id,
      name: test.name,
      sourceId: 'arena',
      unit: 'index' as const,
      domain: test.domain,
      description: test.description,
      methodology: METHODOLOGY[test.board],
      rows,
    };
  });
  return {
    categories,
    published: [published.text, published.webdev].sort().at(-1) ?? '',
  };
}
