import { describe, it, expect } from 'vitest';
import { temperatureDistribution, trainingLoss, trainingStep } from '../src/lib/ai-lab';
import { pageMetadata, publicPages } from '../shared/seo';

describe('How AI works teaching experiments', () => {
  it('produces normalized probabilities without overflowing for large logits', () => {
    const probabilities = temperatureDistribution([10002.6, 10001.7, 10000.8, 9999.8], 0.8);
    expect(probabilities.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(
      true,
    );
    expect(probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    const shifted = temperatureDistribution([2.6, 1.7, 0.8, -0.2], 0.8);
    probabilities.forEach((value, i) => expect(value).toBeCloseTo(shifted[i], 10));
  });

  it('higher temperature spreads probability while preserving candidate order', () => {
    const cold = temperatureDistribution([2.6, 1.7, 0.8, -0.2], 0.2);
    const warm = temperatureDistribution([2.6, 1.7, 0.8, -0.2], 2);
    expect(cold[0]).toBeGreaterThan(warm[0]);
    expect(warm[3]).toBeGreaterThan(cold[3]);
    expect(warm).toEqual([...warm].sort((a, b) => b - a));
    const entropy = (p: number[]) => -p.reduce((sum, value) => sum + value * Math.log(value), 0);
    expect(entropy(warm)).toBeGreaterThan(entropy(cold));
  });

  it('each actual gradient step reduces training error and converges to the target weight', () => {
    let weight = 0.35;
    for (let i = 0; i < 18; i++) {
      const next = trainingStep(weight);
      expect(trainingLoss(next)).toBeLessThan(trainingLoss(weight));
      weight = next;
    }
    expect(weight).toBeCloseTo(2, 2);
    expect(trainingLoss(weight)).toBeLessThan(0.00001);
    expect(trainingLoss(2)).toBe(0);
  });

  it('publishes the interactive guide as an indexable sitemap route', () => {
    expect(publicPages().some((page) => page.path === '/how-ai-works')).toBe(true);
    const metadata = pageMetadata('/how-ai-works');
    expect(metadata.title).toContain('How AI works');
    expect(metadata.canonical).toBe('https://artificials.net/how-ai-works');
    expect(metadata.robots).not.toContain('noindex');
  });
});
