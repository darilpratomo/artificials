/**
 * Number formats shared by the pages and the build tools, so a figure reads
 * the same on the site and in its link previews.
 */

/** A list price with at least cents shown: $0.20, $0.175, $0.0875, $15.00. */
export function price(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value >= 1 ? 2 : value >= 0.1 ? 3 : 4,
  }).format(value);
}

export function tokens(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Not reported';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

/**
 * Open-ended scores: ratings in the hundreds and thousands, such as Arena's,
 * read as whole numbers, the way their sources show them; a small index, such
 * as the capability index, keeps one decimal.
 */
export function indexValue(value: number) {
  return Math.abs(value) >= 500 ? `${Math.round(value)}` : value.toFixed(1);
}

export function score(value: number, unit: 'percent' | 'index') {
  return unit === 'index' ? indexValue(value) : `${value.toFixed(1)}%`;
}
