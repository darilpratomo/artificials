import { useEffect, useState } from 'react';
import type {
  Explorer,
  ModelOverview,
  OverviewTests,
  Timeline,
} from '../../shared/model-overview';

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

const requests = new Map<string, Promise<unknown>>();
/** Files already loaded, so returning to a page renders at once instead of loading again. */
const loaded = new Map<string, unknown>();

const isOverview = (value: ModelOverview) => value?.version === 1 && Array.isArray(value.index);
const isTests = (value: OverviewTests) => value?.version === 1 && Array.isArray(value.tests);
const isExplorer = (value: Explorer) => value?.version === 1 && Array.isArray(value.models);
const isTimeline = (value: Timeline) => value?.version === 1 && Array.isArray(value.entries);

/**
 * The prerendered home page carries its overview inline, so the first view
 * needs no extra request and shows the same content the HTML already had.
 */
function embeddedOverview() {
  if (typeof document === 'undefined' || loaded.has('overview.json')) return;
  const text = document.getElementById('overview-data')?.textContent;
  if (!text) return;
  try {
    const value = JSON.parse(text) as ModelOverview;
    if (isOverview(value)) {
      loaded.set('overview.json', value);
      requests.set('overview.json', Promise.resolve(value));
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
  embeddedOverview();
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

