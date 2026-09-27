import { describe, expect, it } from 'vitest';
import { signalFrame, scrollProgress, SIGNAL_STEPS } from '../src/lib/signal-journey';

describe('reversible signal timeline', () => {
  it('reconstructs exactly the same frame in either scroll direction', () => {
    const positions = Array.from({ length: 101 }, (_, i) => i / 100);
    const forward = positions.map(signalFrame);
    const backward = [...positions].reverse().map(signalFrame).reverse();
    expect(backward).toEqual(forward);
    expect(new Set(forward.map((frame) => frame.step)).size).toBe(SIGNAL_STEPS.length);
  });
  it('clamps overscroll and reaches every scene without extrapolating', () => {
    expect(signalFrame(-1)).toEqual(signalFrame(0));
    expect(signalFrame(2)).toEqual(signalFrame(1));
    SIGNAL_STEPS.forEach((_, index) => expect(signalFrame(index / 7).step).toBe(index));
    for (let i = 0; i < 100; i++) {
      const state = signalFrame(i / 99);
      expect(state.blend).toBeGreaterThanOrEqual(0);
      expect(state.blend).toBeLessThanOrEqual(1);
      expect(state.to).toBeLessThan(SIGNAL_STEPS.length);
    }
  });
  it('maps actual sticky travel to the complete timeline including its endpoint', () => {
    expect(scrollProgress(84, 7000, 700, 84)).toBe(0);
    expect(scrollProgress(84 - 3150, 7000, 700, 84)).toBe(0.5);
    expect(scrollProgress(84 - 6300, 7000, 700, 84)).toBe(1);
    expect(scrollProgress(1200, 7000, 700, 84)).toBe(0);
  });
});
