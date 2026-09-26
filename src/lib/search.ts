import { FLAGS, type ExplorerRow } from '../../shared/model-overview';
import type { SearchEntry } from '../../shared/search';

export type { SearchEntry, SearchIndex, SearchKind } from '../../shared/search';

/** Lower case without accents, so "Métis" finds "metis". */
export const fold = (text: string) => text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '');

const words = (query: string) => fold(query.trim()).split(/\s+/).filter(Boolean);

/**
 * Models whose name, maker or address holds every word of the search: names
 * that start with it first, then tested models offered by ten or more hosts,
 * newest first, so a new flagship comes before older ones.
 */
export function findModels(
  rows: ExplorerRow[],
  query: string,
  limit: number,
  exclude: string[] = [],
): ExplorerRow[] {
  const text = fold(query.trim());
  const terms = words(query);
  if (!terms.length) return [];
  return rows
    .filter(
      (row) =>
        !exclude.includes(row[0]) &&
        terms.every((term) => fold(`${row[1]} ${row[3]} ${row[0]}`).includes(term)),
    )
    .map((row) => ({
      row,
      weight:
        (fold(row[1]).startsWith(text) ? 0 : 4) +
        (row[9] & FLAGS.tested ? 0 : 2) -
        Math.min(row[7], 10) / 10,
    }))
    .sort((a, b) => a.weight - b.weight || b.row[4].localeCompare(a.row[4]))
    .slice(0, limit)
    .map((entry) => entry.row);
}

/**
 * Pages, guides, lessons or tools holding every word of the search: titles
 * that start with it first, then titles with a word that does, then titles
 * holding every word, then the rest.
 */
export function findEntries(entries: SearchEntry[], query: string): SearchEntry[] {
  const text = fold(query.trim());
  const terms = words(query);
  if (!terms.length) return [];
  return entries
    .map((entry) => {
      const title = fold(entry[2]);
      const all = `${title} ${fold(entry[3])} ${fold(entry[4])}`;
      if (!terms.every((term) => all.includes(term))) return undefined;
      const weight = title.startsWith(text)
        ? 0
        : title.split(/[^a-z0-9]+/).some((word) => word.startsWith(terms[0]))
          ? 1
          : terms.every((term) => title.includes(term))
            ? 2
            : 3;
      return { entry, weight };
    })
    .filter((match) => match !== undefined)
    .sort((a, b) => a.weight - b.weight || a.entry[2].localeCompare(b.entry[2]))
    .map((match) => match.entry);
}
