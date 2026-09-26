import { describe, expect, it } from 'vitest';
import type { Board, BoardSource } from '../shared/arena';
import type { Coding } from '../shared/coding';
import { buildExplore } from '../shared/explore';
import type { Finder } from '../shared/finder';
import type { Images } from '../shared/images';
import type { ModelOverview, OverviewTests } from '../shared/model-overview';
import type { Trends } from '../shared/trends';
import type { Videos } from '../shared/videos';

const overview = {
  index: [
    { name: 'Alpha', slug: 'alpha', makerId: 'openai', maker: 'OpenAI', index: 160 },
    { name: 'Cheap', slug: 'cheap', makerId: 'deepseek', maker: 'DeepSeek', index: 151 },
  ],
  sources: [
    { id: 'epoch', name: 'Epoch AI', url: 'https://epoch.ai', license: 'CC BY 4.0' },
    { id: 'arena', name: 'Arena', url: 'https://arena.ai/leaderboard/text', license: 'CC BY 4.0' },
    { id: 'livebench', name: 'LiveBench', url: 'https://livebench.ai', license: 'Apache-2.0' },
  ],
  catalog: { source: 'models.dev', sourceUrl: 'https://models.dev/api.json', license: 'MIT' },
} as unknown as ModelOverview;

const tests = {
  tests: [
    {
      id: 'arena-text',
      label: 'Arena text',
      sourceId: 'arena',
      unit: 'index',
      rows: [
        { name: 'Beta', makerId: 'google', maker: 'Google', score: 1480 },
        { name: 'Alpha (high)', slug: 'alpha', makerId: 'openai', maker: 'OpenAI', score: 1500 },
      ],
    },
  ],
} as unknown as OverviewTests;

const finder = {
  tasks: [{ id: 'chat', label: 'Chat and writing', description: '', tests: ['arena-text'] }],
  tests: [
    {
      id: 'arena-text',
      label: 'Arena text',
      sourceId: 'arena',
      unit: 'index',
      description: '',
      total: 3,
      rows: [
        [0, 1500, 1],
        [1, 1490, 2],
        [2, 1300, 3],
      ],
    },
  ],
  models: [
    ['alpha', 'Alpha', 'openai', 'OpenAI', 20, 1_000_000, 0],
    ['cheap', 'Cheap', 'deepseek', 'DeepSeek', 0.5, 128_000, 1],
    ['far', 'Far', 'google', 'Google', 0.1, null, 0],
  ],
  sources: [],
} as unknown as Finder;

const coding = {
  agentTests: [
    {
      source: {
        id: 'terminal-bench',
        name: 'Terminal-Bench 2.0',
        url: 'https://tbench.ai',
        license: 'Apache-2.0',
        tasks: 89,
        compiledBy: { name: 'Epoch AI' },
      },
      results: [{ agent: 'Agent X', name: 'Alpha', slug: 'alpha', makerId: 'openai', score: 80.5 }],
    },
  ],
} as unknown as Coding;

const trends = {
  asOf: '2026-09-25',
  overall: [
    { date: '2023-03-14', value: 120, name: 'Old', makerId: 'openai', maker: 'OpenAI' },
    { date: '2023-06-01', value: 125, name: 'Standing', makerId: 'anthropic', maker: 'Anthropic' },
    { date: '2025-01-01', value: 140, name: 'Middle', makerId: 'google', maker: 'Google' },
    {
      date: '2026-09-01',
      value: 160,
      name: 'Alpha',
      slug: 'alpha',
      makerId: 'openai',
      maker: 'OpenAI',
    },
  ],
  priceBands: [
    {
      id: 'index-140',
      label: 'Index 140 or higher',
      points: [{ date: '2025-01-01', value: 3, name: 'Middle' }],
    },
    {
      id: 'index-150',
      label: 'Index 150 or higher',
      points: [
        { date: '2025-08-07', value: 10, name: 'Alpha', slug: 'alpha' },
        { date: '2026-07-31', value: 0.5, name: 'Cheap', slug: 'cheap' },
      ],
    },
  ],
} as unknown as Trends;

const model = (name: string, makerId: string, maker: string) => ({
  name,
  arenaName: name.toLowerCase(),
  makerId,
  maker,
  open: false,
  license: 'Proprietary',
  firstSeen: '2026-01-01',
  isNew: false,
});
const arena: BoardSource = {
  id: 'arena',
  name: 'Arena',
  url: 'https://arena.ai/leaderboard/text-to-image',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
};
const board: Board = {
  id: 'text-to-image',
  label: 'Text to image',
  published: '2026-09-20',
  models: [model('Second', 'google', 'Google'), model('Pixel', 'openai', 'OpenAI')],
  categories: [
    {
      id: 'overall',
      label: 'Overall',
      entries: [
        { model: 0, rating: 1200, lower: 1190, upper: 1210, votes: 900, rank: 2 },
        { model: 1, rating: 1250, lower: 1240, upper: 1260, votes: 800, rank: 1 },
      ],
    },
  ],
  progress: [],
};
const images = { version: 1, boards: [board], test: [], sources: [arena] } as Images;
const videos = { version: 1, boards: [], sources: [] } as Videos;

describe('home explore data', () => {
  const explore = buildExplore({ overview, tests, finder, coding, trends, images, videos });

  it('draws the index record over three years, from the record standing when it opens', () => {
    expect(explore.since).toBe('2023-09-25');
    expect(explore.until).toBe('2026-09-25');
    expect(explore.records.map((record) => record.name)).toEqual(['Standing', 'Middle', 'Alpha']);
  });

  it('leads each card with the top result on its own test', () => {
    const { rankings, coding: agents, images: image, videos: video } = explore.results;
    expect(rankings).toMatchObject({ name: 'Alpha (high)', value: 1500, unit: 'rating' });
    expect(agents).toMatchObject({ name: 'Alpha', by: 'Run by Agent X', unit: 'percent' });
    expect(agents!.detail).toBe('Highest share of the 89 Terminal-Bench 2.0 tasks solved');
    // The highest rating leads, wherever the board lists it.
    expect(image).toMatchObject({ name: 'Pixel', by: 'OpenAI', value: 1250 });
    // A board without results leaves its card to the page.
    expect(video).toBeUndefined();
  });

  it('takes the price and value results from the same rules as their pages', () => {
    expect(explore.results.trends).toMatchObject({
      name: 'Cheap',
      makerId: 'deepseek',
      value: 0.5,
    });
    expect(explore.results.trends!.detail).toBe(
      'Cheapest model scoring 150 or more on the index, per 1M tokens. Alpha costs 20 times as much',
    );
    expect(explore.results.finder).toMatchObject({ name: 'Cheap', value: 0.5, unit: 'usd' });
    expect(explore.results.finder!.detail).toBe(
      'Best value for chat and writing: within 25 points of the top Arena text score, and 40 times cheaper',
    );
  });

  it('credits each source once, test sources before the price catalog', () => {
    expect(explore.credits.map((credit) => credit.name)).toEqual([
      'Arena',
      'Terminal-Bench 2.0',
      'Epoch AI',
      'models.dev',
    ]);
    expect(explore.credits[0].url).toBe('https://arena.ai/leaderboard/text');
    expect(explore.credits[1].via).toBe('Epoch AI');
    expect(explore.credits.at(-1)).toMatchObject({ prices: true, license: 'MIT' });
  });
});
