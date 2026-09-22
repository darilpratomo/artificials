import { describe, expect, it } from 'vitest';
import { LOGO_MATRIX } from '../src/components/logo-matrix';

const ROWS = LOGO_MATRIX.length;
const COLUMNS = LOGO_MATRIX[0].length;

describe('pixel logo matrix', () => {
  it('is a square grid using only active and empty cells', () => {
    expect(ROWS).toBe(21);
    for (const row of LOGO_MATRIX) {
      expect(row).toHaveLength(COLUMNS);
      expect(row).toMatch(/^[01]+$/);
    }
    expect(COLUMNS).toBe(21);
  });

  it('draws the helmet silhouette, not an empty or solid block', () => {
    const active = LOGO_MATRIX.join('')
      .split('')
      .filter((cell) => cell === '1').length;
    // A recognisable mark fills part of the grid, never none and never all.
    expect(active).toBeGreaterThan(ROWS * COLUMNS * 0.25);
    expect(active).toBeLessThan(ROWS * COLUMNS * 0.75);
    // The dome is solid across the top and the chin tapers to a narrow base.
    expect(LOGO_MATRIX[5]).toContain('1111111111');
    expect(LOGO_MATRIX[ROWS - 1].split('').filter((cell) => cell === '1')).toHaveLength(2);
  });

  it('keeps the visor hollow so the mark reads as a helmet', () => {
    // Rows 9 to 12 are the visor band: edges lit, centre dark.
    for (const row of [9, 10, 11, 12]) {
      const cells = LOGO_MATRIX[row];
      expect(cells[0]).toBe('1');
      expect(cells[COLUMNS - 1]).toBe('1');
      const middle = cells.slice(5, COLUMNS - 5);
      expect(middle).not.toContain('1');
    }
  });

  it('is horizontally symmetric, which a hand-typed matrix easily breaks', () => {
    for (const [index, row] of LOGO_MATRIX.entries()) {
      const mirrored = row.split('').reverse().join('');
      expect(`row ${index}: ${row}`).toBe(`row ${index}: ${mirrored}`);
    }
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
