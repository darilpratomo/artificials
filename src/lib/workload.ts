/** Typical requests, shared by a model's own calculator and the cost calculator page. */
export const PRESETS = [
  { id: 'chat', label: 'Chat reply', input: 1500, output: 500 },
  { id: 'report', label: 'Summarize a long report', input: 30000, output: 1000 },
  { id: 'code', label: 'Coding task', input: 8000, output: 2000 },
  { id: 'custom', label: 'Custom', input: 0, output: 0 },
] as const;
export type PresetId = (typeof PRESETS)[number]['id'];

/** The most tokens a field accepts. */
export const LIMIT = 10_000_000;

export function clampInteger(value: string, maximum = LIMIT) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, number)) : 0;
}

/** The preset a pair of numbers matches, or "custom". */
export function presetOf(input: number, output: number): PresetId {
  return (
    PRESETS.find(
      (preset) => preset.id !== 'custom' && preset.input === input && preset.output === output,
    )?.id ?? 'custom'
  );
}
