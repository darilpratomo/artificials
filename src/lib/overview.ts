import { useEffect, useState } from 'react';
import type { Explorer, ModelOverview, OverviewTests, Timeline } from '../../shared/model-overview';
import type { Coding } from '../../shared/coding';
import type { Trends } from '../../shared/trends';
import type { Images } from '../../shared/images';
import type { Videos } from '../../shared/videos';
import type { Finder } from '../../shared/finder';
import type { Comparisons } from '../../shared/compare';
import type { Changes } from '../../shared/changes';

export type {
  Explorer,
  ExplorerRow,
  Highlight,
  IndexPoint,
  ModelOverview,
  OverviewTest,
  OverviewTests,
  Release,
  TestRow,
  Timeline,
  TimelineEntry,
} from '../../shared/model-overview';
export { FLAGS } from '../../shared/model-overview';
export type {
  Coding,
  CodingAgentRow,
  CodingAgentTest,
  CodingHorizon,
  CodingTest,
  CodingTestRow,
} from '../../shared/coding';
export type { Trends, TrendModel, TrendPoint, TrendSeries } from '../../shared/trends';
export type { Images } from '../../shared/images';
export type { Videos } from '../../shared/videos';
export type { Finder, FinderRow, FinderTest } from '../../shared/finder';
export type { Changes, ChangeEvent, ChangeModel } from '../../shared/changes';
export type { Board, BoardCategory, BoardEntry, BoardModel } from '../../shared/arena';

const requests = new Map<string, Promise<unknown>>();
/** Files already loaded, so returning to a page renders at once instead of loading again. */
const loaded = new Map<string, unknown>();

const isOverview = (value: ModelOverview) => value?.version === 1 && Array.isArray(value.index);
const isTests = (value: OverviewTests) => value?.version === 1 && Array.isArray(value.tests);
const isExplorer = (value: Explorer) => value?.version === 1 && Array.isArray(value.models);
const isTimeline = (value: Timeline) => value?.version === 1 && Array.isArray(value.entries);
const isCoding = (value: Coding) => value?.version === 2 && Array.isArray(value.tests);
const isTrends = (value: Trends) => value?.version === 1 && Array.isArray(value.frontier);
const isImages = (value: Images) => value?.version === 1 && Array.isArray(value.boards);
const isVideos = (value: Videos) => value?.version === 1 && Array.isArray(value.boards);
const isFinder = (value: Finder) => value?.version === 1 && Array.isArray(value.tasks);
const isComparisons = (value: Comparisons) => value?.version === 1 && Array.isArray(value.featured);
const isChanges = (value: Changes) => value?.version === 1 && Array.isArray(value.events);

/**
 * Prerendered pages carry their data inline, so the first view needs no extra
 * request and shows the same content the HTML already had.
 */
function embedded<T>(file: string, id: string, valid: (value: T) => boolean) {
  if (typeof document === 'undefined' || loaded.has(file)) return;
  const text = document.getElementById(id)?.textContent;
  if (!text) return;
  try {
    const value = JSON.parse(text) as T;
    if (valid(value)) {
      loaded.set(file, value);
      requests.set(file, Promise.resolve(value));
    }
  } catch {
    // A damaged inline copy is ignored; the file is fetched instead.
  }
}

/** Each generated file loads once per visit; a failure is forgotten so a retry really retries. */
function load<T>(file: string, valid: (value: T) => boolean): Promise<T> {
  let request = requests.get(file) as Promise<T> | undefined;
  if (!request) {
    request = fetch(`/data/models/${file}`).then(async (response) => {
      if (!response.ok) throw new Error('Model data could not load. Please try again.');
      const value = (await response.json()) as T;
      if (!valid(value)) throw new Error('Model data could not load. Please try again.');
      loaded.set(file, value);
      return value;
    });
    request.catch(() => requests.delete(file));
    requests.set(file, request);
  }
  return request;
}

type State<T> = { data?: T; error: string };

function useFile<T>(
  file: string,
  valid: (value: T) => boolean,
  enabled: boolean,
  attempt: number,
  initial?: T,
): State<T> {
  const [state, setState] = useState<State<T>>(() => ({
    data: (loaded.get(file) as T | undefined) ?? initial,
    error: '',
  }));
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setState((previous) => ({ data: previous.data, error: '' }));
    load<T>(file, valid)
      .then((data) => active && setState({ data, error: '' }))
      .catch((error: Error) => active && setState({ error: error.message }));
    return () => {
      active = false;
    };
    // `valid` is a module-level constant for each file, so it is not a dependency.
  }, [file, enabled, attempt]);
  return state;
}

/**
 * Leaders, the capability index, recent releases and counts (about 17 KB
 * compressed). `initial` lets the prerenderer render real content.
 */
export function useOverview(attempt = 0, initial?: ModelOverview) {
  embedded('overview.json', 'overview-data', isOverview);
  return useFile<ModelOverview>('overview.json', isOverview, true, attempt, initial);
}

/** Every published test. Loaded only when a view needs it. */
export function useTests(enabled: boolean, attempt = 0) {
  return useFile<OverviewTests>('tests.json', isTests, enabled, attempt);
}

/** One row for every model. Loaded when the list or search is about to be used. */
export function useExplorer(enabled: boolean, attempt = 0) {
  return useFile<Explorer>('explorer.json', isExplorer, enabled, attempt);
}

/** Every dated release with its details, for the release timeline page. */
export function useTimeline(attempt = 0) {
  return useFile<Timeline>('timeline.json', isTimeline, true, attempt);
}

/** Coding agent results and coding tests, for the coding agents page. */
export function useCoding(attempt = 0, initial?: Coding) {
  embedded('coding.json', 'coding-data', isCoding);
  return useFile<Coding>('coding.json', isCoding, true, attempt, initial);
}

/** How capability, price, context and scale have moved, for the AI trends page. */
export function useTrends(attempt = 0, initial?: Trends) {
  embedded('trends.json', 'trends-data', isTrends);
  return useFile<Trends>('trends.json', isTrends, true, attempt, initial);
}

/** Arena's image boards and the automated image test, for the image models page. */
export function useImages(attempt = 0, initial?: Images) {
  embedded('images.json', 'images-data', isImages);
  return useFile<Images>('images.json', isImages, true, attempt, initial);
}

/** Arena's video boards, for the video models page. */
export function useVideos(attempt = 0, initial?: Videos) {
  embedded('videos.json', 'videos-data', isVideos);
  return useFile<Videos>('videos.json', isVideos, true, attempt, initial);
}

/** Tasks, tests and models for the model finder. */
export function useFinder(attempt = 0, initial?: Finder) {
  embedded('finder.json', 'finder-data', isFinder);
  return useFile<Finder>('finder.json', isFinder, true, attempt, initial);
}

/** The featured comparisons: pairs of each leading maker's best model. */
export function useComparisons(enabled = true, attempt = 0, initial?: Comparisons) {
  embedded('comparisons.json', 'comparisons-data', isComparisons);
  return useFile<Comparisons>('comparisons.json', isComparisons, enabled, attempt, initial);
}

/** The last 30 days of releases, price changes, new leaders and index entries. */
export function useChanges(attempt = 0, initial?: Changes) {
  embedded('changes.json', 'changes-data', isChanges);
  return useFile<Changes>('changes.json', isChanges, true, attempt, initial);
}
