import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Compass,
  CornerDownLeft,
  GraduationCap,
  Search,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { makerLogo } from '../../../shared/makers';
import { useExplorer, useSearchIndex } from '../../lib/overview';
import { findEntries, findModels, type SearchEntry, type SearchKind } from '../../lib/search';
import './site-search.css';

interface Result {
  kind: SearchKind | 'model';
  path: string;
  title: string;
  detail: string;
  makerId?: string;
  index?: number | null;
}

/** Each kind of result, in the order they show, with how many of each. */
const GROUPS: [kind: Result['kind'], label: string, limit: number][] = [
  ['model', 'Models', 5],
  ['page', 'Pages', 4],
  ['guide', 'Guides', 3],
  ['lesson', 'Lessons', 3],
  ['tool', 'Free tools', 3],
];
const ICONS: Record<SearchKind, LucideIcon> = {
  page: Compass,
  guide: BookOpen,
  lesson: GraduationCap,
  tool: Wrench,
};
/** What the search offers before anything is typed. */
const SUGGESTED = ['/leaderboard', '/compare', '/changes', '/model-finder', '/releases', '/learn'];

const fromEntry = ([kind, path, title, description]: SearchEntry): Result => ({
  kind,
  path,
  title,
  detail: description,
});

/**
 * The site search, opened from the header or with Ctrl+K, ⌘K or /: models by
 * name or maker, then pages, guides, lessons and free tools. Its code and its
 * lists load when it first opens.
 */
export default function SiteSearch({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const models = useExplorer(true, attempt);
  const index = useSearchIndex(true, attempt);
  const navigate = useNavigate();
  const id = useId();
  const typed = query.trim().length > 0;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!element.open) element.showModal();
    input.current?.focus();
    return () => {
      if (element.open) element.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);

  const results = useMemo(() => {
    const entries = index.data?.entries ?? [];
    if (!typed)
      return SUGGESTED.flatMap((path) => entries.filter((entry) => entry[1] === path)).map(
        fromEntry,
      );
    const found: Result[] = models.data
      ? findModels(models.data.models, query, GROUPS[0][2]).map((row) => ({
          kind: 'model',
          path: `/models/${row[0]}`,
          title: row[1],
          detail: row[3] || 'Maker not reported',
          makerId: row[2],
          index: row[8],
        }))
      : [];
    const matches = findEntries(entries, query);
    for (const [kind, , limit] of GROUPS.slice(1))
      found.push(
        ...matches
          .filter((entry) => entry[0] === kind)
          .slice(0, limit)
          .map(fromEntry),
      );
    return found;
  }, [typed, query, models.data, index.data]);
  const selected = active < results.length ? active : 0;
  const groups: [key: string, label: string, items: Result[]][] = typed
    ? GROUPS.map(([kind, label]): [string, string, Result[]] => [
        kind,
        label,
        results.filter((result) => result.kind === kind),
      ]).filter(([, , items]) => items.length)
    : [['suggested', 'Suggested', results]];

  useEffect(() => {
    document.getElementById(`${id}-${selected}`)?.scrollIntoView({ block: 'nearest' });
  }, [id, selected]);

  const choose = (result: Result) => {
    navigate(result.path);
    dialog.current?.close();
  };
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length)
        setActive(
          (selected + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length,
        );
    } else if (event.key === 'Enter' && results[selected]) {
      event.preventDefault();
      choose(results[selected]);
    }
  };

  const failed = models.error || index.error;
  const loading = !failed && (typed ? !models.data || !index.data : !index.data);
  let position = 0;

  return (
    <dialog
      ref={dialog}
      className="site-search"
      aria-label="Search Artificials"
      // A close left over from an earlier opening must not close this one.
      onClose={() => !dialog.current?.open && onClose()}
      // A click on the dimmed page around the panel closes it.
      onClick={(event) => event.target === event.currentTarget && event.currentTarget.close()}
    >
      <div className="site-search-field">
        <Search size={18} aria-hidden="true" />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label="Search models, pages, guides and lessons"
          aria-expanded={results.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={results.length ? `${id}-${selected}` : undefined}
          placeholder="Search models, pages, guides and lessons"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
        />
        <button
          type="button"
          className="site-search-close"
          aria-label="Close search"
          onClick={() => dialog.current?.close()}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="site-search-body">
        {results.length > 0 && (
          <div id={`${id}-list`} role="listbox" aria-label="Results" className="site-search-list">
            {groups.map(([key, label, items]) => {
              const start = position;
              position += items.length;
              return (
                <div key={key} role="group" aria-labelledby={`${id}-${key}`}>
                  <p id={`${id}-${key}`} role="presentation" className="site-search-group">
                    {label}
                  </p>
                  {items.map((result, offset) => {
                    const at = start + offset;
                    const Icon = result.kind === 'model' ? undefined : ICONS[result.kind];
                    return (
                      <div
                        key={result.path}
                        id={`${id}-${at}`}
                        role="option"
                        aria-selected={at === selected}
                        className="site-search-option"
                        onMouseMove={() => at !== selected && setActive(at)}
                        onClick={() => choose(result)}
                      >
                        {Icon ? (
                          <span className="site-search-icon" aria-hidden="true">
                            <Icon size={16} />
                          </span>
                        ) : (
                          <img
                            src={makerLogo(result.makerId!)}
                            alt=""
                            width="32"
                            height="32"
                            loading="lazy"
                          />
                        )}
                        <span className="site-search-text">
                          <b>{result.title}</b>
                          <small>{result.detail}</small>
                        </span>
                        {result.index != null && <em>Index {result.index.toFixed(1)}</em>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        {failed ? (
          <p className="site-search-note">
            Part of the search could not load.{' '}
            <button type="button" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          </p>
        ) : loading ? (
          <p className="site-search-note">Loading…</p>
        ) : (
          typed &&
          !results.length && (
            <p className="site-search-note">
              Nothing matches “{query.trim()}”. Try a model or maker name, or a topic such as
              pricing.
            </p>
          )
        )}
        <p className="sr-only" role="status">
          {typed && !loading
            ? `${results.length} ${results.length === 1 ? 'result' : 'results'}`
            : ''}
        </p>
      </div>
      <p className="site-search-keys" aria-hidden="true">
        <span>
          <kbd>
            <ArrowUp size={12} />
          </kbd>
          <kbd>
            <ArrowDown size={12} />
          </kbd>
          Move
        </span>
        <span>
          <kbd>
            <CornerDownLeft size={12} />
          </kbd>
          Open
        </span>
        <span>
          <kbd>Esc</kbd>
          Close
        </span>
      </p>
    </dialog>
  );
}
