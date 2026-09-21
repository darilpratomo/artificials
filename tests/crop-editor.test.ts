import { describe, expect, it } from 'vitest';
import { applyRatio, resizeCrop } from '../src/components/tools/CropEditor';

const full = { x: 0, y: 0, width: 100, height: 100 };

describe('crop editor geometry', () => {
  it('makes a square crop actually square on a non-square image', () => {
    // On a 2000x1000 image, a square crop covers half the width but all height.
    const square = applyRatio({ x: 0, y: 0, width: 100, height: 100 }, 1, 2000, 1000);
    const pixelWidth = (square.width / 100) * 2000;
    const pixelHeight = (square.height / 100) * 1000;
    expect(pixelWidth).toBeCloseTo(pixelHeight, 4);
  });

  it('shrinks a ratio crop to fit rather than overflowing the image', () => {
    const wide = applyRatio(full, 16 / 9, 1000, 1000);
    expect(wide.width).toBeLessThanOrEqual(100);
    expect(wide.height).toBeLessThanOrEqual(100);
    expect(wide.x + wide.width).toBeLessThanOrEqual(100.001);
    expect(wide.y + wide.height).toBeLessThanOrEqual(100.001);
    const tall = applyRatio(full, 9 / 16, 1000, 1000);
    expect(tall.x + tall.width).toBeLessThanOrEqual(100.001);
    expect(tall.y + tall.height).toBeLessThanOrEqual(100.001);
  });

  it('leaves the crop untouched when no ratio is locked', () => {
    const crop = { x: 10, y: 10, width: 40, height: 70 };
    expect(applyRatio(crop, null, 800, 600)).toEqual(crop);
    expect(applyRatio(crop, 1, 0, 0)).toEqual(crop);
  });

  it('resizes from the dragged corner and keeps the opposite edge fixed', () => {
    const start = { x: 20, y: 20, width: 40, height: 40 };
    const se = resizeCrop(start, 'se', 80, 90, null, 1000, 1000);
    expect(se.x).toBe(20);
    expect(se.y).toBe(20);
    expect(se.width).toBeCloseTo(60);
    expect(se.height).toBeCloseTo(70);
    const nw = resizeCrop(start, 'nw', 10, 5, null, 1000, 1000);
    // Dragging the top-left corner must hold the bottom-right corner in place.
    expect(nw.x + nw.width).toBeCloseTo(60);
    expect(nw.y + nw.height).toBeCloseTo(60);
  });

  it('never lets a resize leave the image or collapse to nothing', () => {
    const start = { x: 20, y: 20, width: 40, height: 40 };
    for (const [x, y] of [
      [-50, -50],
      [500, 500],
      [20, 20],
      [0, 0],
    ] as const) {
      for (const handle of ['nw', 'ne', 'sw', 'se'] as const) {
        const next = resizeCrop(start, handle, x, y, null, 1000, 1000);
        expect(next.x).toBeGreaterThanOrEqual(0);
        expect(next.y).toBeGreaterThanOrEqual(0);
        expect(next.width).toBeGreaterThanOrEqual(5);
        expect(next.height).toBeGreaterThanOrEqual(5);
        expect(next.x + next.width).toBeLessThanOrEqual(100.001);
        expect(next.y + next.height).toBeLessThanOrEqual(100.001);
      }
    }
  });

  it('holds the locked ratio while resizing', () => {
    const next = resizeCrop({ x: 0, y: 0, width: 50, height: 50 }, 'se', 90, 20, 1, 1000, 1000);
    expect(next.width).toBeCloseTo(next.height, 4);
  });
});
