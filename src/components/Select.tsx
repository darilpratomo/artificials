import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import './select.css';

/** A select-only combobox. Option children are configuration, never native popup UI. */
export function Select({
  children,
  value,
  onValueChange,
  id,
  'aria-label': label,
}: {
  children: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  'aria-label'?: string;
}) {
  const generated = useId();
  const listId = `${generated}-list`;
  const options = Children.toArray(children)
    .filter(isValidElement<{ value?: string; children: ReactNode }>)
    .map((child) => ({
      value: child.props.value ?? String(child.props.children),
      label: Children.toArray(child.props.children).join(''),
    }));
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selected);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 300 });
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const reveal = () => {
    setActive(selected);
    setOpen(true);
  };
  const choose = (index: number) => {
    if (options[index]) onValueChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const viewport = window.visualViewport;
      const height = viewport?.height ?? innerHeight;
      const width = viewport?.width ?? innerWidth;
      const offset = viewport?.offsetTop ?? 0;
      const below = height + offset - rect.bottom - 12;
      const above = rect.top - offset - 12;
      const maxHeight = Math.min(
        300,
        Math.max(100, below >= 160 || below >= above ? below : above),
      );
      const popupHeight = Math.min(maxHeight, options.length * 42 + 12);
      setPosition({
        left: Math.max(8, Math.min(rect.left, width - Math.max(rect.width, 240) - 8)),
        top: below >= 160 || below >= above ? rect.bottom + 6 : rect.top - popupHeight - 6,
        width: Math.min(Math.max(rect.width, 240), width - 16),
        maxHeight,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, options.length]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !popup.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    if (open)
      popup.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      event.preventDefault();
      return;
    }
    if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      open ? choose(active) : reveal();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        reveal();
        return;
      }
      setActive((index) =>
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length,
      );
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      typed.current = {
        text: (now - typed.current.at < 700 ? typed.current.text : '') + event.key.toLowerCase(),
        at: now,
      };
      const match = options.findIndex((option) =>
        option.label.toLowerCase().startsWith(typed.current.text),
      );
      if (match >= 0) {
        setActive(match);
        if (!open) onValueChange(options[match].value);
      }
    }
  }
  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        className="custom-select"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : reveal())}
        onKeyDown={keyboard}
        onBlur={(event) => {
          if (!popup.current?.contains(event.relatedTarget as Node)) setOpen(false);
        }}
      >
        <span>{options[selected]?.label || value}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={popup}
            id={listId}
            className="select-popover"
            role="listbox"
            aria-label={label || 'Options'}
            style={position}
            onPointerDown={(event) => event.preventDefault()}
          >
            {options.map((option, index) => (
              <div
                id={`${listId}-${index}`}
                key={option.value}
                data-index={index}
                role="option"
                aria-selected={option.value === value}
                className={`select-option ${index === active ? 'is-active' : ''}`}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={15} aria-hidden="true" />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
