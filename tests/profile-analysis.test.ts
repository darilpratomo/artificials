import { describe, expect, it } from 'vitest';
import { faqOf, standingOf, summaryOf } from '../src/components/profile/analysis';
import type { ModelOverview } from '../shared/model-overview';
import type { ModelProfile } from '../shared/model-profiles';

const point = (name: string, index: number, blended: number, context: number, slug?: string) => ({
  name,
  ...(slug ? { slug } : {}),
  makerId: 'lab',
  maker: 'Lab',
  index,
  price: { input: blended, output: blended * 4, blended, from: 'maker' as const },
  contextWindow: context,
});

const overview = {
  index: [
    point('Top', 160, 30, 1_000_000, 'top'),
    point('Subject', 150, 20, 1_000_000, 'subject'),
    point('Middle', 140, 5, 200_000),
    point('Budget', 120, 1, 128_000),
  ],
} as unknown as ModelOverview;

const profile: ModelProfile = {
  slug: 'subject',
  name: 'Subject',
  maker: 'Lab',
  makerId: 'lab',
  releaseDate: '2026-09-01',
  contextWindow: 1_000_000,
  maxOutput: 64_000,
  contextVaries: false,
  inputModalities: ['image', 'text'],
  outputModalities: ['text'],
  reasoning: true,
  reasoningEfforts: ['low', 'high'],
  openWeights: false,
  toolCall: true,
  structuredOutput: false,
  official: 'lab/subject',
  offerings: [
    {
      id: 'lab/subject',
      provider: 'Lab',
      providerId: 'lab',
      name: 'Subject',
      inputPrice: 20,
      outputPrice: 80,
      cacheReadPrice: 2,
      contextWindow: 1_000_000,
      providerUrl: null,
    },
    {
      id: 'host/subject',
      provider: 'Host',
      providerId: 'host',
      name: 'Subject',
      inputPrice: 25,
      outputPrice: 90,
      contextWindow: 1_000_000,
      providerUrl: null,
    },
  ],
  results: [],
  categories: [],
  peers: [],
};

describe('model analysis', () => {
  const standing = standingOf(profile, overview);

  it('ranks against every model on the index, in quarters', () => {
    expect(standing.classSize).toBe(4);
    expect(standing.index).toMatchObject({ rank: 2, total: 4, units: 3, median: 145 });
    // Price rank 1 is the cheapest; units measure cost, so a high price has more.
    expect(standing.price).toMatchObject({ rank: 3, total: 4, units: 3, value: 20 });
    expect(standing.context).toMatchObject({ rank: 1, units: 4 });
    expect(standing.cacheDiscount).toBeCloseTo(0.9);
  });

  it('writes a summary only from the figures it has', () => {
    const [opening, index, price, reasoning] = summaryOf(profile, standing);
    expect(opening).toContain('Subject, made by Lab, is');
    expect(opening).toContain('reads images and text');
    expect(index).toContain('#2 of 4 models');
    expect(price).toContain("At Lab's own list price it costs $20.00 per 1M input tokens");
    expect(price).toContain('higher than the median');
    expect(price).toContain('Cached input is 90% cheaper');
    expect(reasoning).toContain('2 effort levels (low, high)');
    const other = { ...profile, slug: 'missing' };
    const outside = standingOf(other, overview);
    // Not on the index: ranked as one more model, never past the total.
    expect(outside.price!.total).toBe(5);
    expect(outside.price!.rank).toBeLessThanOrEqual(outside.price!.total);
    expect(summaryOf(other, outside)[0]).not.toContain('capable');
  });

  it('answers common questions honestly, including what is not measured', () => {
    const answers = Object.fromEntries(faqOf(profile, standing));
    expect(answers['Who made Subject?']).toBe('Subject was made by Lab.');
    expect(answers['Which provider is cheapest for Subject?']).toContain('Lab lists the lowest');
    expect(answers['How large is Subject?']).toContain('do not list its parameter count');
    expect(answers['How fast is Subject?']).toContain('does not measure speed');
    expect(answers['Does Subject support tool calling and JSON output?']).toContain(
      'no guaranteed JSON mode',
    );
  });
});
