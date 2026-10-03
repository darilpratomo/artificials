import { describe, expect, it } from 'vitest';
import { articleVisual, cacheGiB, evidenceAnswer, workloadPrice } from '../shared/article-visuals';
import { EDITORIAL_VISUAL_STORIES } from '../shared/editorial-visual-stories';
import { articleCover } from '../shared/editorial-covers';
import data from '../shared/editorial-visual-data.json';

describe('visual editorial calculations and evidence boundaries', () => {
  it('prices a million total tokens, rather than a million input plus a million output', () => {
    expect(workloadPrice(2, 8, 3)).toBe(3.5);
    expect(workloadPrice(2, 8, 1)).toBe(5);
    expect(workloadPrice(2, 8, 9)).toBe(2.6);
  });
  it('keeps the illustrative KV architecture explicit and uses binary GiB', () => {
    expect(cacheGiB(8192, 1)).toBe(1);
    expect(cacheGiB(8192, 2)).toBe(2);
    expect(cacheGiB(32768, 8)).toBe(32);
  });
  it('does not substitute obsolete or wrong-plan evidence when current evidence is absent', () => {
    for (const ids of [[], ['archive'], ['extended'], ['archive', 'extended']]) {
      const answer = evidenceAnswer(ids);
      expect(answer.supported).toBe(false);
      expect(answer.text).not.toMatch(/7|12|21/);
    }
    expect(evidenceAnswer(['current']).text).toContain('12 days');
    expect(evidenceAnswer(['current', 'archive', 'extended']).source).toBe(
      'Current standard policy',
    );
  });
  it('inserts two visuals at real section headings, only for the four new guides', () => {
    for (const article of EDITORIAL_VISUAL_STORIES) {
      const headings = article.body.split('\n').filter((p) => p.startsWith('## '));
      expect(headings.filter((p) => articleVisual(article.slug, p.slice(3)))).toHaveLength(2);
    }
    expect(articleVisual('read-an-ai-benchmark', 'Read beyond the position')).toBeUndefined();
    expect(articleVisual('untrusted-cms-slug', '<script>')).toBeUndefined();
  });
  it('provides substantial original prose and distinct covers', () => {
    for (const article of EDITORIAL_VISUAL_STORIES) {
      const prose = article.body
        .split(/\n\s*\n/)
        .filter((p) => !p.startsWith('## ') && !p.startsWith('https://'))
        .join(' ');
      expect(prose.trim().split(/\s+/).length).toBeGreaterThanOrEqual(1300);
      expect(articleCover(article).file).toMatch(/^visual-/);
    }
    expect(new Set(EDITORIAL_VISUAL_STORIES.map((a) => articleCover(a).file)).size).toBe(4);
  });
  it('keeps benchmark identities, price provenance and units available', () => {
    expect(new Set(data.benchmark.rows.map((r) => r.id)).size).toBe(data.benchmark.rows.length);
    expect(data.benchmark.source.license).toBe('Apache-2.0');
    for (const row of data.benchmark.rows)
      for (const score of Object.values(row.scores)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    for (const row of data.price.rows) {
      expect(row.price.blended).toBeCloseTo(workloadPrice(row.price.input, row.price.output, 3));
      expect(['maker', 'median']).toContain(row.price.from);
    }
  });
});
