import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { makerLogo } from '../../../shared/makers';
import { useExplorer, type ExplorerRow } from '../../lib/overview';
import { findModels } from '../../lib/search';

const NONE: string[] = [];

/**
 * Jump straight to any model's page, or, with `onChoose`, pick a model. The
 * list of every model loads on first focus, so visitors who never search never
 * download it.
 */
export function ModelSearch({
  total,
  label = 'Find a model',
  placeholder = `Find any of ${total.toLocaleString('en-US')} models`,
  onChoose,
  exclude = NONE,
  autoFocus = false,
}: {
  total: number;
  label?: string;
  placeholder?: string;
  onChoose?: (model: ExplorerRow) => void;
  /** Slugs to leave out, such as models already chosen. */
  exclude?: string[];
  /** Focuses the field when it appears after a click, such as "Change". */
  autoFocus?: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const { data, error } = useExplorer(enabled);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const id = useId();

  const results = useMemo(
    () => (data ? findModels(data.models, query, 8, exclude) : []),
    [query, data, exclude],
  );

  const choose = (row: ExplorerRow) => {
    setOpen(false);
    if (!onChoose) return navigate(`/models/${row[0]}`);
    setQuery('');
    onChoose(row);
  };
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (results.length)
        setActive(
          (value) =>
            (value + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length,
        );
    } else if (event.key === 'Enter' && open && results[active]) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === 'Escape') setOpen(false);
  };
  const expanded = open && query.trim().length > 0;

  return (
    <div className="model-search">
      <Search size={18} aria-hidden="true" />
      <input
        type="search"
        role="combobox"
        aria-label={label}
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={expanded && results[active] ? `${id}-${active}` : undefined}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        onFocus={() => {
          setEnabled(true);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKey}
      />
      {expanded && (
        <ul id={`${id}-list`} role="listbox" className="model-search-list" aria-label="Models">
          {results.map((row, index) => (
            <li
              key={row[0]}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(row);
              }}
            >
              <img src={makerLogo(row[2])} alt="" width="28" height="28" loading="lazy" />
              <span>
                <b>{row[1]}</b>
                <small>{row[3] || 'Maker not reported'}</small>
              </span>
              {row[8] !== null && <em>Index {row[8].toFixed(1)}</em>}
            </li>
          ))}
          {!results.length && (
            <li
              className="model-search-note"
              role="option"
              aria-selected="false"
              aria-disabled="true"
            >
              {error
                ? 'The model list could not load. Please try again.'
                : data
                  ? `No model matches “${query.trim()}”.`
                  : 'Loading models…'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
