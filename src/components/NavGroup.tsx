import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { NavGroupItem } from './navigation';

/**
 * A header menu of related pages: a button that shows or hides a list of
 * links. Opens on click, keyboard or mouse hover; Escape, a click elsewhere or
 * leaving the menu closes it.
 */
export function NavGroup({ group }: { group: NavGroupItem }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);
  // When the mouse has just opened the menu, the click that follows keeps it open.
  const hovered = useRef(0);
  const id = useId();
  const current = group.items.some(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: globalThis.PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Hover only for a mouse; touch and keyboard use the button.
  const enter = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(timer.current);
    if (!open) hovered.current = performance.now();
    setOpen(true);
  };
  const leave = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    timer.current = window.setTimeout(() => setOpen(false), 180);
  };
  return (
    <div
      ref={root}
      className={`nav-group${open ? ' is-open' : ''}`}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className={`nav-group-button${current ? ' active' : ''}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          const justHovered = performance.now() - hovered.current < 600;
          hovered.current = 0;
          setOpen((value) => (justHovered ? true : !value));
        }}
      >
        {group.label}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <div id={id} className="nav-group-panel" hidden={!open}>
        <ul>
          {group.items.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} onClick={() => setOpen(false)}>
                <span>{item.label}</span>
                <small>{item.description}</small>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
