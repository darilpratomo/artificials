import { describe, expect, it } from 'vitest';
import { LOGO_MATRIX } from '../src/components/logo-matrix';
import { SYMBOL_PATH } from '../src/components/logo-symbol';

const ROWS = LOGO_MATRIX.length;
const COLUMNS = LOGO_MATRIX[0].length;

describe('pixel logo matrix', () => {
  it('is a 40 by 35 grid using only active and empty cells', () => {
    expect(COLUMNS).toBe(40);
    expect(ROWS).toBe(35);
    for (const row of LOGO_MATRIX) {
      expect(row).toHaveLength(COLUMNS);
      expect(row).toMatch(/^[01]+$/);
    }
  });

  it('draws the four-part mark, not an empty or solid block', () => {
    const active = LOGO_MATRIX.join('')
      .split('')
      .filter((cell) => cell === '1').length;
    // A recognisable mark fills part of the grid, never none and never all.
    expect(active).toBeGreaterThan(ROWS * COLUMNS * 0.35);
    expect(active).toBeLessThan(ROWS * COLUMNS * 0.65);
    // Four lobes turn around an open centre.
    expect(LOGO_MATRIX[17].slice(16, 29)).toBe('0'.repeat(13));
    // Top lobe, left lobe, right lobe and bottom lobe each reach their edge.
    expect(LOGO_MATRIX[0].indexOf('1')).toBe(15);
    expect(LOGO_MATRIX[19][0]).toBe('1');
    expect(LOGO_MATRIX[17][COLUMNS - 1]).toBe('1');
    expect(LOGO_MATRIX[ROWS - 1].indexOf('1')).toBe(18);
  });

  it('keeps the gaps between lobes open at every size', () => {
    // A stroke of empty cells separates each lobe from its neighbour.
    expect(LOGO_MATRIX[10].slice(21, 29)).toBe('0'.repeat(8));
    expect(LOGO_MATRIX[27].slice(0, 21)).toBe('0'.repeat(21));
    expect(LOGO_MATRIX[21].slice(17, 19)).toBe('00');
  });
});

describe('assembly timing', () => {
  const CENTER_X = (COLUMNS - 1) / 2;
  const CENTER_Y = (ROWS - 1) / 2;
  const MAX_DISTANCE = Math.hypot(CENTER_X, CENTER_Y);
  const TRAVEL_MS = 620;

  /** Mirrors the ordered share of the delay used by the component. */
  const orderedDelay = (column: number, row: number, duration: number) => {
    const distance = Math.hypot(column - CENTER_X, row - CENTER_Y);
    return (distance / MAX_DISTANCE) * Math.max(0, duration - TRAVEL_MS) * 0.72;
  };

  it('starts pixels near the centre before the outer edges', () => {
    const centre = orderedDelay(CENTER_X, CENTER_Y, 1800);
    const corner = orderedDelay(0, 0, 1800);
    expect(centre).toBeLessThan(corner);
    expect(centre).toBe(0);
  });

  it('lands the last pixel within the requested duration', () => {
    for (const duration of [1500, 1800, 2200]) {
      const slowest = orderedDelay(0, 0, duration) + Math.max(0, duration - TRAVEL_MS) * 0.28;
      expect(slowest + TRAVEL_MS).toBeLessThanOrEqual(duration + 1);
    }
  });

  it('never produces a negative delay for a very short duration', () => {
    expect(orderedDelay(0, 0, 300)).toBe(0);
  });
});

describe('smooth resting mark', () => {
  // Each shape as a polygon: its line ends, plus the middle of every corner arc,
  // which is close enough to test where the outline runs.
  const shapes = SYMBOL_PATH.split('M')
    .filter(Boolean)
    .map((part) => {
      const points: [number, number][] = [];
      for (const [, command, args] of part.matchAll(/([LAZ]?)([^LAZ]*)/g)) {
        const numbers = args.trim().split(/[ ,]+/).filter(Boolean).map(Number);
        if (command === 'Z' || numbers.length < 2) continue;
        const [x, y] = numbers.slice(-2);
        if (command === 'A' && points.length) {
          const [x0, y0] = points[points.length - 1];
          const [radius, , , , sweep] = numbers;
          const chord = Math.hypot(x - x0, y - y0);
          // The arc bulges by its sagitta, to the left of the chord when sweep is set.
          const sagitta = radius - Math.sqrt(Math.max(0, radius ** 2 - chord ** 2 / 4));
          const k = ((sweep ? 1 : -1) * sagitta) / chord;
          points.push([(x0 + x) / 2 + (y - y0) * k, (y0 + y) / 2 - (x - x0) * k]);
        }
        points.push([x, y]);
      }
      return points;
    });
  const inside = ([x, y]: [number, number]) =>
    shapes.some((shape) => {
      let hit = false;
      for (let index = 0, last = shape.length - 1; index < shape.length; last = index++) {
        const [x1, y1] = shape[index];
        const [x2, y2] = shape[last];
        if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) hit = !hit;
      }
      return hit;
    });

  it('is three closed shapes of straight edges and round corners', () => {
    expect(SYMBOL_PATH).toMatch(/^[MLAZ0-9. -]+$/);
    expect(SYMBOL_PATH.match(/M/g)).toHaveLength(3);
    expect(SYMBOL_PATH.match(/Z/g)).toHaveLength(3);
    expect(SYMBOL_PATH.match(/A/g)!.length).toBeGreaterThanOrEqual(20);
  });

  it('fills the same 40 by 35 grid as the matrix', () => {
    const points = shapes.flat();
    expect(Math.min(...points.map(([x]) => x))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...points.map(([x]) => x))).toBeLessThanOrEqual(COLUMNS);
    expect(Math.min(...points.map(([, y]) => y))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...points.map(([, y]) => y))).toBeLessThanOrEqual(ROWS);
  });

  it('lines up with the pixel matrix, so landing blocks match it', () => {
    let agree = 0;
    LOGO_MATRIX.forEach((row, y) =>
      [...row].forEach((cell, x) => {
        if (inside([x + 0.5, y + 0.5]) === (cell === '1')) agree += 1;
      }),
    );
    expect(agree / (ROWS * COLUMNS)).toBeGreaterThan(0.97);
  });
});
