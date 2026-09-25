import type { BenchmarkSnapshot } from './benchmarks.ts';

/** One row of Arena's published leaderboard, as scripts/sync-arena.mjs keeps it. */
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

export interface ImageModel {
  /** Arena's name, tidied for reading: "gpt-image-2 (medium)" reads "GPT Image 2 (medium)". */
  name: string;
  /** Arena's own identifier, exactly as published. */
  arenaName: string;
  makerId: string;
  maker: string;
  /** Downloadable weights: any licence other than Arena's "Proprietary". */
  open: boolean;
  /** The licence as Arena records it, such as "Apache 2.0". */
  license: string;
  firstSeen: string;
  /** First seen within 31 days of the publication. */
  isNew: boolean;
}

export interface ImageEntry {
  /** Index into the board's models. */
  model: number;
  rating: number;
  lower: number;
  upper: number;
  votes: number;
  rank: number;
}

export interface ImageCategory {
  id: string;
  label: string;
  entries: ImageEntry[];
}

export interface ImagePoint {
  date: string;
  value: number;
  name: string;
}

export interface ImageBoard {
  id: string;
  label: string;
  published: string;
  models: ImageModel[];
  categories: ImageCategory[];
  /** The best score of each leading maker at the end of each month. */
  progress: { makerId: string; maker: string; points: ImagePoint[] }[];
}

/** The image models page: Arena's boards and an automated test. */
export interface Images {
  version: 1;
  boards: ImageBoard[];
  /** T2I-CoReBench composition and reasoning scores, highest first. */
  test: { name: string; maker: string; makerId: string; score: number }[];
  sources: {
    id: string;
    name: string;
    url: string;
    dataUrl?: string;
    license: string;
    licenseUrl: string;
  }[];
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
};

/**
 * The maker of a model. Arena leaves the organisation blank for a few models;
 * those are named after their family, so the family names the maker.
 */
export function makerOf(organization: string, model: string) {
  const known = ORGANIZATIONS[organization];
  if (known) return known;
  if (/^stable-diffusion/i.test(model)) return { makerId: 'stabilityai', maker: 'Stability AI' };
  if (/^p-image/i.test(model)) return { makerId: 'pruna', maker: 'Pruna AI' };
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
  t2i: 'T2I',
  i2i: 'I2I',
  fp8: 'FP8',
  uni: 'UNI',
  fal: '(fal)',
};

function word(value: string) {
  const lower = value.toLowerCase();
  if (WORDS[lower]) return WORDS[lower];
  // Sizes and resolutions: 9b → 9B, 2k → 2K.
  if (/^\d+(\.\d+)?[bk]$/.test(lower)) return lower.toUpperCase();
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
  // qwen-image-2.0-pro-2026-06-22 → … (2026-06-22), imagen-4.0-generate-001 → … (001).
  const dated = /-(\d{4}-\d{2}-\d{2}|generate-\d{3})$/.exec(base);
  const stem = dated ? base.slice(0, dated.index) : base;
  // A non-breaking hyphen (‑) keeps a hyphenated name together through the split.
  let name = stem
    .replace(/^dall-e-/, 'DALL·E-')
    .replace(/^stable-diffusion-v(\d)(\d)/, 'stable-diffusion-$1.$2')
    .replace(/^flux-(\d+\.\d+)(?=-|$)/, 'FLUX-$1')
    .replace(/^flux-(\d)(?=-|$)/, 'FLUX.$1')
    .replace(/^wan(\d)/, 'wan-$1')
    .replace(/^([zp])-image/, (_, letter: string) => `${letter.toUpperCase()}‑Image`)
    .replace(/\bgen(\d)/, 'Gen‑$1')
    .split('-')
    .map((part) => (/^[A-Z]/.test(part) ? part : word(part)))
    .join(' ')
    .replace(/‑/g, '-');
  if (dated) name += ` (${dated[1].replace('generate-', '')})`;
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
/** Categories covering fewer models than this are left out. */
const MIN_CATEGORY = 20;
const BOARDS: Record<string, string> = {
  'text-to-image': 'Text to image',
  'image-edit': 'Image editing',
};

function board(id: string, arena: ArenaBoard): ImageBoard {
  const models: ImageModel[] = [];
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
    .filter((category) => (byCategory.get(category)?.length ?? 0) >= MIN_CATEGORY)
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
    const points: ImagePoint[] = [];
    for (const month of arena.history) {
      const best = month.best.find(
        (entry) => makerOf(entry.organization, entry.model).makerId === makerId,
      );
      if (best) points.push({ date: month.date, value: best.rating, name: prettyName(best.model) });
    }
    return { makerId, maker: models.find((model) => model.makerId === makerId)!.maker, points };
  });

  return { id, label: BOARDS[id] ?? id, published: arena.published, models, categories, progress };
}

export function buildImages({
  arena,
  benchmarks,
}: {
  arena?: ArenaSnapshot;
  benchmarks: BenchmarkSnapshot;
}): Images {
  const boards = arena
    ? Object.keys(BOARDS)
        .filter((id) => arena.arenas[id])
        .map((id) => board(id, arena.arenas[id]))
    : [];
  const image = benchmarks.categories.find((category) => category.id === 'image');
  const test = (image?.rows ?? []).map((row) => ({
    name: row.model,
    maker: row.provider === 'See source' ? 'Not reported' : row.provider,
    makerId: row.provider === 'See source' ? 'unknown' : row.providerId,
    score: row.score,
  }));
  const corebench = benchmarks.sources.find((source) => source.id === image?.sourceId);
  return {
    version: 1,
    boards,
    test,
    sources: [
      ...(arena
        ? [
            {
              id: arena.source.id,
              name: arena.source.name,
              url: arena.source.url,
              dataUrl: arena.source.dataUrl,
              license: arena.source.license,
              licenseUrl: arena.source.licenseUrl,
            },
          ]
        : []),
      ...(corebench
        ? [
            {
              id: corebench.id,
              name: corebench.name,
              url: corebench.url,
              license: corebench.license,
              licenseUrl: corebench.licenseUrl,
            },
          ]
        : []),
    ],
  };
}
