/** Original numerical fixtures. None are measurements of a real model or serving system. */
export const TOKEN_FIXTURE = [
  { label: 'door', logit: 3 },
  { label: 'window', logit: 2.4 },
  { label: 'studio', logit: 1.8 },
  { label: 'book', logit: 1 },
  { label: 'path', logit: 0.2 },
  { label: 'signal', logit: -0.7 },
] as const;

export function tokenDistribution(temperature: number, topP: number) {
  if (
    !Number.isFinite(temperature) ||
    temperature <= 0 ||
    topP <= 0 ||
    topP > 1 ||
    !Number.isFinite(topP)
  )
    throw new RangeError('Invalid sampling controls');
  const max = Math.max(...TOKEN_FIXTURE.map((t) => t.logit / temperature));
  const weights = TOKEN_FIXTURE.map((t) => Math.exp(t.logit / temperature - max));
  const total = weights.reduce((a, b) => a + b, 0);
  const rows = TOKEN_FIXTURE.map((t, i) => ({ ...t, probability: weights[i] / total, final: 0 }));
  let retained = 0;
  for (const row of [...rows].sort((a, b) => b.probability - a.probability)) {
    if (retained < topP) {
      row.final = row.probability;
      retained += row.probability;
    }
  }
  return rows.map((row) => ({ ...row, final: row.final / retained }));
}
export function pickToken(rows: ReturnType<typeof tokenDistribution>, draw: number) {
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1)
    throw new RangeError('Draw must be in [0, 1)');
  let cumulative = 0;
  for (const row of rows) {
    cumulative += row.final;
    if (draw < cumulative) return row.label;
  }
  return rows.filter((row) => row.final > 0).at(-1)!.label;
}

export type Vector2 = readonly [number, number];
export type SimilarityMetric = 'cosine' | 'dot' | 'distance';
export const VECTOR_FIXTURE = [
  { id: 'A', vector: [2, 0.2] as Vector2 },
  { id: 'B', vector: [1, 0] as Vector2 },
  { id: 'C', vector: [0.2, 0.98] as Vector2 },
  { id: 'D', vector: [-0.5, 0.8] as Vector2 },
];
export function polar(angle: number, length = 1): Vector2 {
  return [Math.cos((angle * Math.PI) / 180) * length, Math.sin((angle * Math.PI) / 180) * length];
}
export function normalize(vector: Vector2): Vector2 {
  const length = Math.hypot(...vector);
  if (!length) throw new RangeError('A zero vector has no direction');
  return [vector[0] / length, vector[1] / length];
}
export function vectorScore(a: Vector2, b: Vector2, metric: SimilarityMetric) {
  if (metric === 'distance') return Math.hypot(a[0] - b[0], a[1] - b[1]);
  const dot = a[0] * b[0] + a[1] * b[1];
  if (metric === 'dot') return dot;
  const denominator = Math.hypot(...a) * Math.hypot(...b);
  if (!denominator) throw new RangeError('Cosine needs nonzero vectors');
  return Math.max(-1, Math.min(1, dot / denominator));
}

export type QueuePolicy = 'fixed' | 'continuous';
export function queueSchedule(slots: number, longJob = 8, policy: QueuePolicy = 'continuous') {
  if (
    !Number.isInteger(slots) ||
    slots < 1 ||
    slots > 4 ||
    !Number.isInteger(longJob) ||
    longJob < 1 ||
    longJob > 20
  )
    throw new RangeError('Invalid queue controls');
  const jobs = [2, longJob, 3, 6, 2, 4].map((length, i) => ({
    id: String.fromCharCode(65 + i),
    length,
    start: -1,
    end: -1,
  }));
  let active: number[] = [],
    next = 0,
    tick = 0;
  while (jobs.some((job) => job.end < 0)) {
    if (policy === 'continuous' || active.every((i) => jobs[i].end >= 0))
      active = active.filter((i) => jobs[i].end < 0);
    while (active.length < slots && next < jobs.length) {
      jobs[next].start = tick;
      active.push(next++);
    }
    tick++;
    for (const i of active)
      if (jobs[i].end < 0 && tick - jobs[i].start === jobs[i].length) jobs[i].end = tick;
  }
  return jobs;
}
export function queueSnapshot(jobs: ReturnType<typeof queueSchedule>, tick: number) {
  return jobs.map((job) => ({
    ...job,
    state: tick >= job.end ? 'Completed' : tick >= job.start ? 'Active' : 'Waiting',
    produced: Math.max(0, Math.min(job.length, Math.floor(tick) - job.start)),
  }));
}
