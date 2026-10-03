import { describe, it, expect } from 'vitest';
import {
  tokenDistribution,
  pickToken,
  normalize,
  polar,
  vectorScore,
  queueSchedule,
  queueSnapshot,
  VECTOR_FIXTURE,
} from '../shared/visual-lab-math';
import { EDITORIAL_VISUAL_LABS } from '../shared/editorial-visual-labs';
import { articleVisual } from '../shared/article-visuals';
import { articleCover } from '../shared/editorial-covers';

describe('visual laboratory math', () => {
  it('normalizes probabilities and keeps the boundary-crossing nucleus token', () => {
    for (const temp of [0.2, 1, 2])
      for (const p of [0.1, 0.5, 0.9, 1]) {
        const rows = tokenDistribution(temp, p);
        expect(rows.reduce((s, r) => s + r.probability, 0)).toBeCloseTo(1, 12);
        expect(rows.reduce((s, r) => s + r.final, 0)).toBeCloseTo(1, 12);
        const kept = rows.filter((r) => r.final > 0),
          sum = kept.reduce((s, r) => s + r.probability, 0);
        expect(sum + 1e-12).toBeGreaterThanOrEqual(p);
        if (kept.length > 1) expect(sum - kept.at(-1)!.probability).toBeLessThan(p);
      }
    expect(tokenDistribution(1, 1).filter((r) => r.final > 0)).toHaveLength(6);
    expect(tokenDistribution(0.2, 0.1).filter((r) => r.final > 0)).toHaveLength(1);
  });
  it('concentration changes without changing logit order and filtering renormalizes', () => {
    expect(tokenDistribution(0.2, 1)[0].probability).toBeGreaterThan(
      tokenDistribution(2, 1)[0].probability,
    );
    expect(tokenDistribution(1, 0.1)[0].final).toBe(1);
    expect(() => tokenDistribution(0, 0.9)).toThrow();
    expect(() => tokenDistribution(1, NaN)).toThrow();
  });
  it('assigns interval boundaries to the next eligible token without selecting excluded tokens', () => {
    const rows = tokenDistribution(1, 0.9),
      kept = rows.filter((r) => r.final > 0);
    expect(pickToken(rows, 0)).toBe(kept[0].label);
    expect(pickToken(rows, kept[0].final)).toBe(kept[1].label);
    expect(pickToken(rows, 0.999999)).toBe(kept.at(-1)!.label);
    expect(() => pickToken(rows, 1)).toThrow();
  });
  it('separates direction, magnitude and endpoint distance', () => {
    expect(vectorScore([1, 0], [2, 0], 'cosine')).toBe(1);
    expect(vectorScore([1, 0], [2, 0], 'dot')).toBe(2);
    expect(vectorScore([1, 0], [2, 0], 'distance')).toBe(1);
    expect(vectorScore([1, 0], polar(90), 'cosine')).toBeCloseTo(0);
    expect(vectorScore([1, 0], polar(180), 'cosine')).toBe(-1);
    expect(() => normalize([0, 0])).toThrow();
  });
  it('unit vectors satisfy the cosine/dot/distance identity', () => {
    for (const { vector } of VECTOR_FIXTURE)
      for (const angle of [0, 35, 90, 180]) {
        const a = polar(angle),
          b = normalize(vector),
          cos = vectorScore(a, b, 'cosine');
        expect(vectorScore(a, b, 'dot')).toBeCloseTo(cos, 12);
        expect(vectorScore(a, b, 'distance') ** 2).toBeCloseTo(2 - 2 * cos, 12);
      }
  });
  it('matches a manually worked six-job schedule', () => {
    expect(queueSchedule(2).map((j) => [j.start, j.end])).toEqual([
      [0, 2],
      [0, 8],
      [2, 5],
      [5, 11],
      [8, 10],
      [10, 14],
    ]);
    expect(queueSchedule(2, 8, 'fixed').map((j) => [j.start, j.end])).toEqual([
      [0, 2],
      [0, 8],
      [8, 11],
      [8, 14],
      [14, 16],
      [14, 18],
    ]);
    expect(queueSchedule(1, 8, 'fixed')).toEqual(queueSchedule(1, 8, 'continuous'));
  });
  it('keeps every job once, respects capacity and admits at boundaries', () => {
    for (const slots of [1, 2, 3, 4])
      for (const policy of ['fixed', 'continuous'] as const)
        for (const length of [8, 12]) {
          const jobs = queueSchedule(slots, length, policy);
          expect(new Set(jobs.map((j) => j.id)).size).toBe(6);
          for (const j of jobs) expect(j.end - j.start).toBe(j.length);
          const end = Math.max(...jobs.map((j) => j.end));
          for (let t = 0; t <= end; t++)
            expect(
              queueSnapshot(jobs, t).filter((j) => j.state === 'Active').length,
            ).toBeLessThanOrEqual(slots);
          expect(
            queueSnapshot(jobs, end).every(
              (j) => j.state === 'Completed' && j.produced === j.length,
            ),
          ).toBe(true);
        }
    const snapshot = queueSnapshot(queueSchedule(2), 2);
    expect(snapshot[0].state).toBe('Completed');
    expect(snapshot[2]).toMatchObject({ state: 'Active', produced: 0 });
  });
  it('registers two visuals and a unique cover for each substantial article', () => {
    expect(new Set(EDITORIAL_VISUAL_LABS.map((a) => articleCover(a).file)).size).toBe(3);
    for (const a of EDITORIAL_VISUAL_LABS) {
      const parts = a.body.split(/\n\s*\n/);
      expect(
        parts.filter((p) => p.startsWith('## ') && articleVisual(a.slug, p.slice(3))),
      ).toHaveLength(2);
      expect(
        parts
          .filter((p) => !p.startsWith('## ') && !p.startsWith('https://'))
          .join(' ')
          .split(/\s+/).length,
      ).toBeGreaterThanOrEqual(1300);
      expect(articleCover(a).file).toMatch(/^lab-/);
    }
  });
});
