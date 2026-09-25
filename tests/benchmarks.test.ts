import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseLiveBench, parseImageBench, rankRows } from '../scripts/lib/benchmark-sources';
import type { BenchmarkSnapshot } from '../shared/benchmarks';

describe('published benchmark normalization', () => {
  it('weights categories equally and excludes missing tasks instead of inflating scores', () => {
    const result = parseLiveBench(
      'model,a,b,c\ncomplete,100,0,90\npartial,100,,80\nzero,0,0,0\n',
      { Coding: ['a', 'b'], Reasoning: ['c'] },
      'https://example.test/source',
    );
    expect(result[0].rows.map((r) => [r.model, r.score])).toEqual([
      ['complete', 70],
      ['zero', 0],
    ]);
    expect(result.find((c) => c.id === 'reasoning')!.rows).toHaveLength(3);
    expect(result.find((c) => c.id === 'coding')!.rows[0].score).toBe(50);
  });
  it('fails closed when a category schema or numeric score changes', () => {
    expect(() => parseLiveBench('model,a\nx,101\n', { Coding: ['a'] }, '')).toThrow();
    expect(() => parseLiveBench('model,a\nx,50\n', { Coding: ['absent'] }, '')).toThrow();
    expect(() => parseLiveBench('model,a\nx,50\n', { Surprise: ['a'] }, '')).toThrow();
  });
  it('assigns competition ranks consistently at the displayed precision', () => {
    const rows = [90, 89.996, 89.995, 75].map((score, i) => ({
      id: String(i),
      model: String(i),
      provider: '',
      providerId: '',
      score,
      sourceUrl: '',
    }));
    expect(rankRows(rows).map((r) => r.rank)).toEqual([1, 1, 1, 4]);
    expect(() => rankRows([rows[0], rows[0]])).toThrow('Duplicate');
  });
  it('reads only the published image table, excluding comments and prompt rewriting', () => {
    const html = `<button class="evaluator-btn active" aria-pressed="true" data-evaluator="gemini-2-5-flash">Gemini 2.5 Flash</button><table id="benchmarkTable"><thead><tr><th class="overall-col">Overall</th></tr></thead><tbody>
      <!-- <tr class="data-row"><td class="model">Fake</td><td class="overall-col">99</td></tr> -->
      <tr class="data-row"><td class="model"><a>Image A</a></td><td class="overall-col">65.2</td></tr>
      <tr class="rewrite-row"><td class="model">+ Prompt Rewriting</td><td class="overall-col">88</td></tr>
      </tbody></table>`;
    expect(
      parseImageBench(html, 'https://example.test').rows.map((r) => [r.model, r.score]),
    ).toEqual([['Image A', 65.2]]);
    expect(() => parseImageBench(html.replace('65.2', '-'), '')).toThrow();
    expect(() => parseImageBench(html.replace('gemini-2-5-flash', 'different-judge'), '')).toThrow(
      'evaluator changed',
    );
    expect(() => parseImageBench('<html>Unavailable</html>', '')).toThrow();
  });
  it('ships a sourced snapshot with valid ranks, timestamps, categories, and coverage', () => {
    const snapshot = JSON.parse(
      readFileSync('public/data/benchmarks.json', 'utf8'),
    ) as BenchmarkSnapshot;
    expect(snapshot.categories.length).toBeGreaterThanOrEqual(9);
    for (const category of snapshot.categories) {
      expect(category.rows.length).toBeGreaterThan(4);
      const source = snapshot.sources.find((s) => s.id === category.sourceId)!;
      expect(Date.parse(source.checkedAt)).not.toBeNaN();
      expect(source.license).toBeTruthy();
      expect(category.rows[0].rank).toBe(1);
      // Percentages stop at 100; the capability index is an open-ended scale,
      // and Arena's ratings, like chess ratings, run into the thousands.
      const ceiling = category.sourceId === 'arena' ? 3000 : category.unit === 'index' ? 400 : 100;
      category.rows.forEach((row, i) => {
        expect(row.score).toBeGreaterThanOrEqual(0);
        expect(row.score).toBeLessThanOrEqual(ceiling);
        if (row.ciLow !== undefined) {
          expect(row.ciLow).toBeLessThanOrEqual(row.score);
          expect(row.ciHigh!).toBeGreaterThanOrEqual(row.score);
        }
        expect(new URL(row.sourceUrl).protocol).toBe('https:');
        if (i) expect(row.score).toBeLessThanOrEqual(category.rows[i - 1].score);
      });
    }
  });
});
