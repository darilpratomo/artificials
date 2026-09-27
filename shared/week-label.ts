/** How a week is named and summed up: shared by the recap page, its metadata, cards and feed. */

export interface WeekCounts {
  releases: number;
  leaders: number;
  /** New leaders whose lead is inside the range their publisher gives. */
  withinMargin: number;
  prices: number;
  indexed: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** A week's days as people write them: "Sep 21–27, 2026", "Sep 28 – Oct 4, 2026". */
export function weekRange(week: string, end: string) {
  const [y1, m1, d1] = week.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  if (y1 !== y2) return `${MONTHS[m1 - 1]} ${d1}, ${y1} – ${MONTHS[m2 - 1]} ${d2}, ${y2}`;
  if (m1 !== m2) return `${MONTHS[m1 - 1]} ${d1} – ${MONTHS[m2 - 1]} ${d2}, ${y2}`;
  return `${MONTHS[m1 - 1]} ${d1}–${d2}, ${y2}`;
}

/** The week's figures in a sentence, only the ones that happened: "15 new releases and 7 new leaders". */
export function weekSentence(counts: WeekCounts) {
  const parts = [
    [counts.releases, 'new release', 'new releases'],
    [counts.leaders, 'new leader on a test', 'new leaders on tests'],
    [counts.prices, 'listed price change', 'listed price changes'],
    [counts.indexed, 'model joining the capability index', 'models joining the capability index'],
  ]
    .filter(([count]) => count)
    .map(([count, one, many]) => `${count} ${count === 1 ? one : many}`);
  if (!parts.length) return 'No new releases, leaders or price changes';
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}
