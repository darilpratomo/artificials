import { describe, expect, it } from 'vitest';
import { buildRace, monthsBetween } from '../shared/race';
import { buildScoring, standardError } from '../shared/scoring';
import type { IndexPoint, ModelOverview, OverviewTests } from '../shared/model-overview';
import {
  ACCURACY,
  CORRECT,
  MODELS,
  QUESTION,
  QUESTIONS,
  TESTS,
  answers,
  interval,
  logistic,
  reruns,
} from '../src/components/scoring/model';

const point = (
  name: string,
  makerId: string,
  releasedAt: string,
  index: number,
  extra: Partial<IndexPoint> = {},
): IndexPoint => ({ name, makerId, maker: makerId.toUpperCase(), releasedAt, index, ...extra });

const price = (blended: number) => ({
  input: blended,
  output: blended,
  blended,
  from: 'maker' as const,
});

const overview: Pick<ModelOverview, 'index' | 'sources' | 'catalog'> = {
  index: [
    point('A1', 'a', '2023-01-10', 100, { openWeights: false, price: price(30) }),
    point('B1', 'b', '2023-03-01', 110, { openWeights: true, price: price(10) }),
    point('A2', 'a', '2023-06-01', 120, { openWeights: false, price: price(20) }),
    point('B2', 'b', '2024-01-15', 118, { openWeights: true, price: price(1) }),
    point('C1', 'c', '2024-02-01', 125, { openWeights: false, price: price(5) }),
    point('A3', 'a', '2024-05-01', 130, { openWeights: false, price: price(2) }),
    point('B3', 'b', '2024-09-01', 126, { openWeights: true, price: price(0.5) }),
    point('C2', 'c', '2024-10-01', 128, { openWeights: false }),
    point('C3', 'c', '2025-01-01', 131, { openWeights: false, price: price(0.4) }),
    point('undated', 'a', '', 150),
  ],
  sources: [
    {
      id: 'epoch',
      name: 'Epoch AI',
      url: 'https://epoch.ai',
      license: 'CC BY 4.0',
      licenseUrl: 'x',
      checkedAt: '2026-01-01',
    },
    {
      id: 'arena',
      name: 'Arena',
      url: 'https://arena.ai',
      license: 'CC BY 4.0',
      licenseUrl: 'y',
      checkedAt: '2026-01-01',
    },
  ],
  catalog: {
    source: 'models.dev',
    sourceUrl: 'https://models.dev/api.json',
    license: 'MIT',
    updatedAt: '2026-01-01',
  },
};

describe('the AI race', () => {
  const race = buildRace(overview);

  it('keeps dated models only, oldest first', () => {
    expect(race.models.map((model) => model.name)).toEqual([
      'A1',
      'B1',
      'A2',
      'B2',
      'C1',
      'A3',
      'B3',
      'C2',
      'C3',
    ]);
  });

  it('counts records and the makers who set them', () => {
    expect(race.records.map((record) => record.name)).toEqual(['A1', 'B1', 'A2', 'C1', 'A3', 'C3']);
    expect(race.facts.records).toBe(6);
    expect(race.facts.holders).toBe(3);
    expect(race.facts.first.name).toBe('A1');
    expect(race.facts.latest.name).toBe('C3');
  });

  it('measures how far the best open model trails the first closed model to match it', () => {
    // The best open model is B3 (126); the first closed model at or above that is A3 (130).
    expect(race.facts.openLag?.open.name).toBe('B3');
    expect(race.facts.openLag?.closed.name).toBe('A3');
    expect(race.facts.openLag?.months).toBe(4);
  });

  it('follows the cheapest price at or above each level, and how far it fell', () => {
    const level120 = race.prices.find((band) => band.level === 120)!;
    expect(level120.points.map((point) => point.price)).toEqual([20, 5, 2, 0.5, 0.4]);
    expect(race.facts.cheaper?.level).toBe(120);
    expect(race.facts.cheaper?.factor).toBe(50);
  });

  it('credits the index and the catalog, without their check times', () => {
    expect(race.sources.map((source) => source.id)).toEqual(['epoch', 'catalog']);
    expect(JSON.stringify(race)).not.toContain('checkedAt');
    expect(JSON.stringify(race)).not.toContain('updatedAt');
  });

  it('counts whole months between days', () => {
    expect(monthsBetween('2024-01-15', '2024-05-14')).toBe(3);
    expect(monthsBetween('2024-01-15', '2024-05-15')).toBe(4);
    expect(monthsBetween('2023-12-31', '2024-01-01')).toBe(0);
  });
});

describe('how benchmarks work', () => {
  const tests: OverviewTests = {
    version: 1,
    checkedAt: '2026-01-01',
    tests: [
      {
        id: 'gpqa-diamond',
        name: 'GPQA Diamond',
        label: 'GPQA Diamond',
        sourceId: 'epoch',
        domain: 'reasoning',
        unit: 'percent',
        description: '',
        randomBaseline: 25,
        rows: [
          {
            name: 'X ( high )',
            configuration: 'x',
            makerId: 'a',
            maker: 'A',
            score: 90,
            stderr: 2,
          },
          { name: 'Y', configuration: 'y', makerId: 'b', maker: 'B', score: 85 },
        ],
      },
      {
        id: 'arena-text',
        name: 'Arena text',
        label: 'Arena text',
        sourceId: 'arena',
        domain: 'overall',
        unit: 'index',
        description: '',
        rows: [
          {
            name: 'Z',
            configuration: 'z',
            makerId: 'c',
            maker: 'C',
            score: 1500,
            ciLow: 1490,
            ciHigh: 1510,
          },
        ],
      },
    ],
  };
  const scoring = buildScoring({ tests, overview });

  it('keeps results with their published uncertainty, and tidies names', () => {
    expect(scoring.gpqa.rows).toEqual([
      { name: 'X (high)', makerId: 'a', maker: 'A', score: 90, stderr: 2 },
    ]);
    expect(scoring.gpqa.chance).toBe(25);
    expect(scoring.arena.rows[0]).toMatchObject({ name: 'Z', low: 1490, high: 1510 });
    expect(scoring.tests).toBe(2);
    expect(scoring.sources.map((source) => source.id)).toEqual(['epoch', 'arena']);
    expect(JSON.stringify(scoring)).not.toContain('checkedAt');
  });

  it('works out a standard error from accuracy and questions', () => {
    expect(standardError(0.5, 100)).toBeCloseTo(5, 10);
    expect(standardError(ACCURACY, QUESTIONS)).toBeCloseTo(2.83, 2);
    const [low, high] = interval(80.3, 2.83);
    expect(low).toBeCloseTo(74.75, 2);
    expect(high).toBeCloseTo(85.85, 2);
  });

  it('gives the illustrative model exactly its right answers, the same every time', () => {
    expect(answers().filter(Boolean)).toHaveLength(CORRECT);
    expect(answers()).toEqual(answers());
    const scores = reruns(400);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    expect(mean).toBeCloseTo(ACCURACY * 100, 0);
    expect(reruns(5)).toEqual(reruns(5));
  });

  it('keeps the example question consistent', () => {
    expect(QUESTION.probabilities.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
    const likeliest = QUESTION.probabilities.indexOf(Math.max(...QUESTION.probabilities));
    expect(likeliest).toBe(QUESTION.answer);
  });

  it('places easy, medium and hard tests on one logistic scale', () => {
    for (const model of MODELS) {
      const [easy, medium, hard] = TESTS.map((test) => logistic(model.capability, test.difficulty));
      expect(easy).toBeGreaterThan(medium);
      expect(medium).toBeGreaterThan(hard);
    }
    // At its own difficulty, a test is a coin toss.
    expect(logistic(140, 140)).toBe(0.5);
  });
});
