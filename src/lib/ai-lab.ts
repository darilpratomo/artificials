/** Small, explicit teaching models. These are not measurements of a production LLM. */
export function temperatureDistribution(logits: number[], temperature: number) {
  const scale = Math.max(0.05, temperature);
  const max = Math.max(...logits);
  const values = logits.map((value) => Math.exp((value - max) / scale));
  const sum = values.reduce((a, b) => a + b, 0);
  return values.map((value) => value / sum);
}

export const TRAINING_POINTS = [0.5, 1, 1.5, 2, 2.5, 3];
export function trainingLoss(weight: number) {
  return (
    TRAINING_POINTS.reduce((sum, x) => sum + (weight * x - 2 * x) ** 2, 0) / TRAINING_POINTS.length
  );
}
export function trainingStep(weight: number) {
  const gradient =
    TRAINING_POINTS.reduce((sum, x) => sum + 2 * x * (weight * x - 2 * x), 0) /
    TRAINING_POINTS.length;
  return weight - 0.045 * gradient;
}
