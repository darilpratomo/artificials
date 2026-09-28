import { describe, expect, it } from 'vitest';
import {
  FORMATS,
  INT4_SCALE,
  LLAMA_405B_GPU_HOURS,
  LLAMA_405B_GPUS,
  TRAINING_BYTES_PER_PARAMETER,
  WEIGHT,
  descend,
  duration,
  gpusToHold,
  loss,
  quantized,
  roundToFloat,
  roundToInt,
  sample,
  softmax,
  trainingDays,
  weightBytes,
} from '../src/lib/descent-math';
import { HEAD } from '../src/components/descent/scenes/attention';
import { NEURON, gelu, neuronSum } from '../src/components/descent/scenes/neuron';
import { ANSWER, CANDIDATES, DRAW } from '../src/components/descent/scenes/predict';
import { MEMORY_EXAMPLE, readMilliseconds } from '../src/components/descent/scenes/memory';
import { GPU_WATTS } from '../src/components/descent/scenes/bill';
import {
  BLUE_SCORES,
  CHOSEN,
  EXPERTS,
  EXPERT_MODELS,
  ROUTES,
  topTwo,
} from '../src/components/descent/scenes/experts';
import { PIECES } from '../src/components/descent/scenes/tokens';
import { CHOICES } from '../src/components/descent/scenes/assistant';

describe('probabilities', () => {
  const scores = CANDIDATES.map(([, score]) => score);

  it('turns scores into probabilities that add up to one, in the same order', () => {
    const probabilities = softmax(scores);
    expect(probabilities.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
    for (let i = 1; i < probabilities.length; i++)
      expect(probabilities[i]).toBeLessThanOrEqual(probabilities[i - 1]);
    expect(probabilities[0]).toBeCloseTo(0.326, 3);
  });

  it('sharpens at low temperature and evens out at high', () => {
    expect(softmax(scores, 0.2)[0]).toBeCloseTo(0.89, 2);
    expect(softmax(scores, 2)[0]).toBeLessThan(0.25);
    // Very large scores do not overflow.
    expect(softmax([1000, 999]).every(Number.isFinite)).toBe(true);
  });

  it('draws by walking the probabilities in order', () => {
    expect(sample([0.5, 0.3, 0.2], 0.1)).toBe(0);
    expect(sample([0.5, 0.3, 0.2], 0.6)).toBe(1);
    expect(sample([0.5, 0.3, 0.2], 0.95)).toBe(2);
    expect(sample([0.5, 0.3, 0.2], 1)).toBe(2);
  });

  it('keeps the page’s answer coherent at every temperature the slider allows', () => {
    // The fixed draw lands on the answer's first word however the slider is set.
    for (let temperature = 0.2; temperature <= 2.0001; temperature += 0.1)
      expect(CANDIDATES[sample(softmax(scores, temperature), DRAW)][0]).toBe(ANSWER[0]);
  });
});

describe('training', () => {
  it('walks down to the valley floor, never uphill', () => {
    const path = descend([-0.6, 1.0]);
    for (let i = 1; i < path.length; i++)
      expect(path[i][2]).toBeLessThanOrEqual(path[i - 1][2] + 1e-9);
    const [x, y, value] = path[path.length - 1];
    // The lowest point on a fine grid of the same surface.
    let best = Infinity;
    for (let gx = -1.2; gx <= 1.2; gx += 0.01)
      for (let gy = -1.2; gy <= 1.2; gy += 0.01) best = Math.min(best, loss(gx, gy));
    expect(value).toBeCloseTo(best, 2);
    expect(x).toBeCloseTo(0.52, 1);
    expect(y).toBeCloseTo(-0.33, 1);
  });

  it('shows a second walker settling in a shallow dip instead', () => {
    const path = descend([-1.0, 0.3]);
    expect(path[path.length - 1][2]).toBeGreaterThan(descend([-0.6, 1.0]).at(-1)![2] + 0.5);
  });
});

describe('the neuron and attention', () => {
  it('adds up the neuron the way the page writes it', () => {
    expect(neuronSum()).toBeCloseTo(1.12, 10);
    expect(neuronSum() - NEURON.bias).toBeCloseTo(1.32, 10);
    expect(gelu(neuronSum())).toBeCloseTo(0.97, 2);
    expect(gelu(0)).toBe(0);
  });

  it('gives every position an attention row that adds up to one, looking back only', () => {
    HEAD.forEach((row, position) => {
      expect(row).toHaveLength(position + 1);
      expect(row.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
    });
  });
});

describe('memory, time and power', () => {
  it('sizes a model in bytes and in GPUs', () => {
    expect(weightBytes(70e9, 16)).toBe(140e9);
    expect(weightBytes(70e9, 4)).toBe(35e9);
    expect(gpusToHold(140e9)).toBe(2);
    expect(gpusToHold(80e9)).toBe(1);
    expect(gpusToHold(70e9 * TRAINING_BYTES_PER_PARAMETER)).toBe(14);
    expect(gpusToHold(405e9 * TRAINING_BYTES_PER_PARAMETER)).toBe(81);
  });

  it('reads the weights once in about 42 milliseconds', () => {
    expect(MEMORY_EXAMPLE).toEqual({ gigabytes: 140, terabytesPerSecond: 3.35 });
    expect(readMilliseconds()).toBeCloseTo(41.79, 2);
    expect(Math.round(1000 / readMilliseconds())).toBe(24);
  });

  it('turns published GPU hours into years on one GPU and weeks on many', () => {
    expect(LLAMA_405B_GPU_HOURS).toBe(30.84e6);
    expect(LLAMA_405B_GPUS).toBe(16384);
    expect(duration(trainingDays(LLAMA_405B_GPU_HOURS, 1))).toBe('3,520 years');
    expect(duration(trainingDays(LLAMA_405B_GPU_HOURS, LLAMA_405B_GPUS))).toBe('11 weeks');
    expect(duration(1.5)).toBe('36 hours');
    expect(duration(10)).toBe('10 days');
    expect(duration(200)).toBe('7 months');
    expect(((LLAMA_405B_GPUS * GPU_WATTS) / 1e6).toFixed(1)).toBe('11.5');
  });
});

describe('smaller numbers', () => {
  it('rounds to the nearest value each format can hold', () => {
    expect(roundToFloat(WEIGHT, 7)).toBe(0.70703125);
    expect(roundToFloat(WEIGHT, 3)).toBe(0.6875);
    expect(roundToFloat(0, 3)).toBe(0);
    expect(roundToFloat(-WEIGHT, 3)).toBe(-0.6875);
    expect(roundToInt(WEIGHT, 4, INT4_SCALE)).toBeCloseTo(5 / 7, 12);
    // Levels stop at the format's range.
    expect(roundToInt(5, 4, INT4_SCALE)).toBeCloseTo(1, 12);
    expect(roundToInt(-5, 4, INT4_SCALE)).toBeCloseTo(-8 / 7, 12);
  });

  it('loses more of the weight at each step down', () => {
    const errors = FORMATS.map((format) => Math.abs(quantized(format) - WEIGHT));
    expect(errors[0]).toBeLessThan(1e-7);
    expect(errors[1]).toBeLessThan(1e-4);
    expect(errors[2]).toBeCloseTo(0.0196, 3);
    expect(FORMATS.map((format) => format.bits)).toEqual([32, 16, 8, 4]);
    expect(FORMATS.map((format) => format.sign + format.exponent + format.mantissa)).toEqual([
      32, 16, 8, 0,
    ]);
  });
});

describe('experts', () => {
  it('sends " blue" to the two experts its route names, blended by a softmax over their scores', () => {
    expect(BLUE_SCORES).toHaveLength(EXPERTS);
    const [[first, share], [second, rest]] = topTwo(BLUE_SCORES);
    expect([first, second]).toEqual(ROUTES[4]);
    expect(share + rest).toBeCloseTo(1, 12);
    expect(Math.round(share * 100)).toBe(60);
  });

  it('gives every token of the question its own pair of different experts', () => {
    expect(ROUTES).toHaveLength(PIECES.length);
    for (const route of ROUTES) {
      expect(route).toHaveLength(CHOSEN);
      expect(new Set(route).size).toBe(CHOSEN);
      for (const expert of route) expect(expert).toBeGreaterThanOrEqual(0);
      for (const expert of route) expect(expert).toBeLessThan(EXPERTS);
    }
  });

  it('keeps the published parameter counts', () => {
    expect(EXPERT_MODELS).toEqual([
      { name: 'Mixtral 8x7B', total: 47, active: 13 },
      { name: 'DeepSeek-V3', total: 671, active: 37 },
    ]);
  });

  it('lets the reward model prefer the answer people picked', () => {
    expect(CHOICES[0][1]).toBeGreaterThan(CHOICES[1][1]);
  });
});
