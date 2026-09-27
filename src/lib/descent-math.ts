/**
 * The arithmetic behind How AI works' pictures and controls, kept pure so it
 * can be tested: probabilities, a descent down a loss surface, and the memory,
 * time and power sums the page shows.
 */

/** Scores into probabilities; a higher temperature spreads them out. */
export function softmax(logits: number[], temperature = 1) {
  const t = Math.max(0.05, temperature);
  const scaled = logits.map((logit) => logit / t);
  const top = Math.max(...scaled);
  const exps = scaled.map((value) => Math.exp(value - top));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

/** The candidate that a random draw lands on, walking the probabilities in order. */
export function sample(probabilities: number[], draw: number) {
  let running = 0;
  for (let index = 0; index < probabilities.length; index++) {
    running += probabilities[index];
    if (draw < running) return index;
  }
  return probabilities.length - 1;
}

/**
 * The loss surface the training chapter walks down: a wide valley, a shallow
 * dip to fall into on the way, and a hill to start from.
 */
export function loss(x: number, y: number) {
  const valley = 1.6 - 1.25 * Math.exp(-((x - 0.55) ** 2 + (y + 0.35) ** 2) / 0.42);
  const dip = -0.35 * Math.exp(-((x + 0.35) ** 2 + (y - 0.2) ** 2) / 0.08);
  const hill = 0.55 * Math.exp(-((x + 0.75) ** 2 + (y - 0.7) ** 2) / 0.18);
  const bowl = 0.18 * (x * x + y * y);
  return valley + dip + hill + bowl;
}

/** Gradient descent on the loss surface, from a start, with a fixed step size. */
export function descend(start: [number, number], rate = 0.045, steps = 90) {
  const path: [number, number, number][] = [];
  let [x, y] = start;
  const e = 1e-4;
  for (let step = 0; step <= steps; step++) {
    path.push([x, y, loss(x, y)]);
    const gx = (loss(x + e, y) - loss(x - e, y)) / (2 * e);
    const gy = (loss(x, y + e) - loss(x, y - e)) / (2 * e);
    x -= rate * gx;
    y -= rate * gy;
  }
  return path;
}

/** Bytes to hold a model's weights at a given number of bits per weight. */
export const weightBytes = (parameters: number, bits: number) => (parameters * bits) / 8;

/**
 * Training with the Adam optimizer in mixed precision keeps about 16 bytes per
 * parameter: 16-bit weights and gradients, and 32-bit copies of the weights and
 * of Adam's two running averages (Rajbhandari et al., ZeRO, 2019). Activations
 * come on top of that.
 */
export const TRAINING_BYTES_PER_PARAMETER = 16;

/** How many GPUs of a given memory it takes just to hold some bytes. */
export const gpusToHold = (bytes: number, gpuBytes = 80e9) => Math.ceil(bytes / gpuBytes);

/** Llama 3.1 405B's training compute, in H100-80GB GPU hours, from Meta's model card. */
export const LLAMA_405B_GPU_HOURS = 30.84e6;
/** The largest number of H100 GPUs Meta used at once to train Llama 3 405B. */
export const LLAMA_405B_GPUS = 16384;

/** Days of training if the work split perfectly across `gpus` GPUs. */
export const trainingDays = (gpuHours: number, gpus: number) => gpuHours / Math.max(1, gpus) / 24;

/** A span of days in words: hours, days, weeks, months or years. */
export function duration(days: number) {
  if (days < 2) return `${Math.round(days * 24)} hours`;
  if (days < 21) return `${Math.round(days)} days`;
  if (days < 120) return `${Math.round(days / 7)} weeks`;
  if (days < 730) return `${Math.round(days / 30.44)} months`;
  const years = days / 365.25;
  const rounded = years >= 100 ? Math.round(years / 10) * 10 : Math.round(years);
  return `${rounded.toLocaleString('en-US')} years`;
}

/** The nearest number a float with `mantissa` bits of fraction can hold (exponent range aside). */
export function roundToFloat(value: number, mantissa: number) {
  if (value === 0) return 0;
  const exponent = Math.floor(Math.log2(Math.abs(value)));
  const step = 2 ** (exponent - mantissa);
  return Math.round(value / step) * step;
}

/** The nearest level of a signed integer with `bits` bits, scaled so that `scale` is one level. */
export function roundToInt(value: number, bits: number, scale: number) {
  const top = 2 ** (bits - 1) - 1;
  const level = Math.max(-top - 1, Math.min(top, Math.round(value / scale)));
  return level * scale;
}

/** The formats the page walks through, with how each splits its bits. */
export const FORMATS = [
  { name: '32-bit float', bits: 32, sign: 1, exponent: 8, mantissa: 23 },
  { name: '16-bit float (bfloat16)', bits: 16, sign: 1, exponent: 8, mantissa: 7 },
  { name: '8-bit float (E4M3)', bits: 8, sign: 1, exponent: 4, mantissa: 3 },
  { name: '4-bit integer', bits: 4, sign: 0, exponent: 0, mantissa: 0 },
] as const;
/** A weight, and the scale that makes 1.0 the largest 4-bit level (7 × 1/7). */
export const WEIGHT = Math.SQRT1_2;
export const INT4_SCALE = 1 / 7;
export const quantized = (format: (typeof FORMATS)[number], value = WEIGHT) =>
  format.exponent === 0
    ? roundToInt(value, format.bits, INT4_SCALE)
    : roundToFloat(value, format.mantissa);
