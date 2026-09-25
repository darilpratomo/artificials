import { describe, expect, it } from 'vitest';
import type { BenchmarkSnapshot } from '../shared/benchmarks';
import {
  buildImages,
  licenseName,
  makerOf,
  prettyName,
  type ArenaRow,
  type ArenaSnapshot,
} from '../shared/images';

describe('image model names', () => {
  it('tidies Arena identifiers without changing what they say', () => {
    const names: [string, string][] = [
      ['gpt-image-2.5-sunburst', 'GPT Image 2.5 Sunburst'],
      ['gpt-image-2 (medium)', 'GPT Image 2 (medium)'],
      [
        'gemini-3.1-flash-image (nano-banana-2) [web-search]',
        'Gemini 3.1 Flash Image (Nano Banana 2), web search',
      ],
      ['gemini-3-pro-image-2k (nano-banana-pro)', 'Gemini 3 Pro Image 2K (Nano Banana Pro)'],
      ['qwen-image-2.0-pro-2026-06-22', 'Qwen Image 2.0 Pro (2026-06-22)'],
      ['imagen-ultra-4.0-generate-001', 'Imagen Ultra 4.0 (001)'],
      ['flux-2-klein-9b', 'FLUX.2 Klein 9B'],
      ['flux-1.1-pro', 'FLUX 1.1 Pro'],
      ['flux-1-dev-fp8', 'FLUX.1 Dev FP8'],
      ['wan2.6-t2i', 'Wan 2.6 T2I'],
      ['z-image-turbo', 'Z-Image Turbo'],
      ['p-image-edit', 'P-Image Edit'],
      ['runway-gen4', 'Runway Gen-4'],
      ['dall-e-3', 'DALL·E 3'],
      ['stable-diffusion-v35-large', 'Stable Diffusion 3.5 Large'],
      ['recraft-v4.1-utility-pro', 'Recraft V4.1 Utility Pro'],
      ['seedream-4-fal', 'Seedream 4 (fal)'],
      ['hidream-o1-image', 'HiDream O1 Image'],
      ['grok-imagine-image-quality (20260519)', 'Grok Imagine Image Quality (20260519)'],
      // Names Arena already writes with capitals are kept exactly.
      ['Cosmos3-Super-Text2Image (Agentic)', 'Cosmos3-Super-Text2Image (Agentic)'],
    ];
    for (const [arena, name] of names) expect(prettyName(arena), arena).toBe(name);
  });

  it('matches organisations to makers, and blank ones by family', () => {
    expect(makerOf('bfl', 'flux-2-pro')).toEqual({
      makerId: 'black-forest-labs',
      maker: 'Black Forest Labs',
    });
    expect(makerOf('microsoft-ai', 'mai-image-2')).toEqual({
      makerId: 'microsoft',
      maker: 'Microsoft AI',
    });
    expect(makerOf('', 'stable-diffusion-v35-large').makerId).toBe('stabilityai');
    expect(makerOf('', 'p-image').makerId).toBe('pruna');
    expect(makerOf('', 'mystery-image')).toEqual({ makerId: 'unknown', maker: 'Not reported' });
  });

  it('names licences Arena records as identifiers', () => {
    expect(licenseName('qwen-research')).toBe('Qwen Research License');
    expect(licenseName('Apache 2.0')).toBe('Apache 2.0');
    expect(licenseName('')).toBe('Not reported');
  });
});

const row = (
  model: string,
  organization: string,
  rating: number,
  category = 'overall',
  license = 'Proprietary',
): ArenaRow => ({
  model,
  organization,
  license,
  category,
  rating,
  lower: rating - 8,
  upper: rating + 8,
  votes: 1000,
  rank: 0,
});

/** A board of `count` models, highest first, repeated for each category. */
function rows(count: number, categories: string[]) {
  const models = Array.from({ length: count }, (_, index) => ({
    model: index === 0 ? 'gpt-image-9' : index === 1 ? 'flux-9-dev' : `model-${index}`,
    organization: index === 0 ? 'openai' : index === 1 ? 'bfl' : index % 2 ? 'google' : 'alibaba',
    license: index === 1 ? 'flux-non-commercial-license' : 'Proprietary',
  }));
  return categories.flatMap((category) =>
    models.map((entry, index) => ({
      ...row(entry.model, entry.organization, 1400 - index * 10, category, entry.license),
      rank: index + 1,
    })),
  );
}

const arena: ArenaSnapshot = {
  version: 1,
  source: {
    id: 'arena',
    name: 'Arena',
    url: 'https://arena.ai/leaderboard/text-to-image',
    dataUrl: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    checkedAt: '2026-09-25T00:00:00.000Z',
    revision: 'a'.repeat(40),
  },
  arenas: {
    'text-to-image': {
      published: '2026-09-24',
      rows: [
        ...rows(25, ['overall', 'photorealistic']),
        // Too few models to stand as a category.
        ...rows(8, ['english']),
      ],
      firstSeen: { 'gpt-image-9': '2026-09-10', 'flux-9-dev': '2025-11-01' },
      history: [
        {
          date: '2026-07-31',
          best: [
            { organization: 'openai', model: 'gpt-image-8', rating: 1350 },
            { organization: 'bfl', model: 'flux-8-pro', rating: 1300 },
          ],
        },
        {
          date: '2026-08-31',
          best: [{ organization: 'openai', model: 'gpt-image-9', rating: 1390 }],
        },
      ],
    },
    'image-edit': {
      published: '2026-09-22',
      rows: rows(20, ['overall']),
      firstSeen: {},
      history: [],
    },
  },
};

const benchmarks: BenchmarkSnapshot = {
  version: 1,
  sources: [
    {
      id: 'corebench',
      name: 'T2I-CoReBench',
      url: 'https://t2i-corebench.github.io/',
      dataUrl: 'https://t2i-corebench.github.io/#leaderboard',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      checkedAt: '2026-09-25T00:00:00.000Z',
    },
  ] as BenchmarkSnapshot['sources'],
  categories: [
    {
      id: 'image',
      name: 'Image generation',
      sourceId: 'corebench',
      unit: 'percent',
      domain: 'image',
      description: '',
      methodology: '',
      rows: [
        {
          id: 'nano',
          model: 'Nano Banana 2',
          provider: 'Google',
          providerId: 'google',
          score: 85.3,
          rank: 1,
          sourceUrl: 'https://t2i-corebench.github.io/',
        },
        {
          id: 'bagel',
          model: 'BAGEL',
          provider: 'See source',
          providerId: 'unknown',
          score: 38.2,
          rank: 2,
          sourceUrl: 'https://t2i-corebench.github.io/',
        },
      ],
    },
  ],
};

describe('image models page data', () => {
  const images = buildImages({ arena, benchmarks });
  const [text, edit] = images.boards;

  it('builds both boards, keeping categories with at least twenty models', () => {
    expect(images.boards.map((board) => board.id)).toEqual(['text-to-image', 'image-edit']);
    expect(text.label).toBe('Text to image');
    expect(text.categories.map((category) => category.id)).toEqual(['overall', 'photorealistic']);
    expect(text.categories[0].entries).toHaveLength(25);
    expect(edit.categories.map((category) => category.label)).toEqual(['Overall']);
  });

  it('describes every model once, with its maker, weights and first appearance', () => {
    expect(text.models).toHaveLength(25);
    const [first, second] = text.models;
    expect(first).toMatchObject({
      name: 'GPT Image 9',
      arenaName: 'gpt-image-9',
      makerId: 'openai',
      open: false,
      isNew: true,
      firstSeen: '2026-09-10',
    });
    expect(second).toMatchObject({
      name: 'FLUX.9 Dev',
      makerId: 'black-forest-labs',
      open: true,
      license: 'FLUX Non-Commercial License',
      isNew: false,
    });
    // A model with no recorded first appearance counts from the publication.
    expect(text.models[2].firstSeen).toBe('2026-09-24');
  });

  it('follows the leading makers month by month', () => {
    // In board order: the third model is Alibaba's, the fourth Google's.
    expect(text.progress.map((entry) => entry.makerId)).toEqual([
      'openai',
      'black-forest-labs',
      'alibaba',
      'google',
    ]);
    expect(text.progress[0].points).toEqual([
      { date: '2026-07-31', value: 1350, name: 'GPT Image 8' },
      { date: '2026-08-31', value: 1390, name: 'GPT Image 9' },
    ]);
    expect(text.progress[1].points).toHaveLength(1);
  });

  it('adds the automated test and credits both sources', () => {
    expect(images.test.map((entry) => [entry.name, entry.maker])).toEqual([
      ['Nano Banana 2', 'Google'],
      ['BAGEL', 'Not reported'],
    ]);
    expect(images.sources.map((source) => source.name)).toEqual(['Arena', 'T2I-CoReBench']);
  });

  it('still builds without an Arena snapshot', () => {
    const alone = buildImages({ benchmarks });
    expect(alone.boards).toEqual([]);
    expect(alone.test).toHaveLength(2);
    expect(alone.sources.map((source) => source.id)).toEqual(['corebench']);
  });
});
