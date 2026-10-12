/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { THIN_SCROLLBAR } from '../utils/scrollbar';
import {
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
  typeaheadIndex,
} from '../utils/selectMenu';

export interface SelectMenuOption<T extends string = string> {
  value: T;
  label: string;
  /** A second, quieter line under the label, e.g. "Master · Coursework". */
  description?: string;
  /** Shown before the label, e.g. a coloured dot or icon. */
  leading?: React.ReactNode;
  /** Shorter text for the closed button, e.g. "All" for "All programmes". */
  triggerLabel?: string;
  disabled?: boolean;
}

interface SelectMenuProps<T extends string> {
  id?: string;
  value: T | '';
  options: SelectMenuOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  /** Toolbar filters read "Prefix: value", e.g. "Programme: All". */
  prefix?: string;
  variant?: 'field' | 'filter';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 288;
const VIEWPORT_MARGIN = 8;
const MENU_MIN_WIDTH = 240;
const FILTER_MAX_WIDTH = 420;

/**
 * A styled replacement for the native <select>, whose open list cannot be
 * styled. Follows the WAI-ARIA select-only combobox pattern: focus stays on the
 * button and `aria-activedescendant` points at the highlighted option. The
 * list is portalled with fixed positioning so dialogs that scroll cannot clip it.
 */
export const SelectMenu = <T extends string>({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  prefix,
  variant = 'field',
  size = 'md',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}: SelectMenuProps<T>) => {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [openUp, setOpenUp] = useState(false);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const above = rect.top - MENU_GAP - VIEWPORT_MARGIN;
    const up = below < Math.min(MENU_MAX_HEIGHT, 180) && above > below;
    const room = window.innerWidth - VIEWPORT_MARGIN * 2;
    const minWidth = Math.min(Math.max(rect.width, MENU_MIN_WIDTH), room);
    const maxWidth = variant === 'filter' ? Math.min(Math.max(minWidth, FILTER_MAX_WIDTH), room) : minWidth;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - VIEWPORT_MARGIN - maxWidth));
    setOpenUp(up);
    setMenuStyle({
      left,
      minWidth,
      maxWidth,
      maxHeight: Math.max(120, Math.min(MENU_MAX_HEIGHT, up ? above : below)),
      ...(up ? { bottom: window.innerHeight - rect.top + MENU_GAP } : { top: rect.bottom + MENU_GAP }),
    });
  }, [variant]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const update = (event: Event) => {
      if (event.target instanceof Node && listRef.current?.contains(event.target)) return;
      place();
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  const choose = (index: number, keepFocus = true) => {
    const option = options[index];
    setOpen(false);
    if (!option || option.disabled) return;
    if (option.value !== value) onChange(option.value);
    if (keepFocus) triggerRef.current?.focus();
  };

  const jumpTo = (key: string) => {
    const now = Date.now();
    const text = now - typed.current.at > 600 ? key : typed.current.text + key;
    typed.current = { text, at: now };
    return typeaheadIndex(options, text, open ? active : selectedIndex);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    const typing = Date.now() - typed.current.at <= 600 && typed.current.text !== '';

    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || (event.key === ' ' && !typing)) {
        event.preventDefault();
        openAt(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options));
      } else if (event.key === 'ArrowUp' || event.key === 'Home') {
        event.preventDefault();
        openAt(firstEnabledIndex(options));
      } else if (event.key === 'End') {
        event.preventDefault();
        openAt(lastEnabledIndex(options));
      } else if (printable) {
        event.preventDefault();
        const match = jumpTo(event.key);
        openAt(match >= 0 ? match : selectedIndex);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((current) => nextEnabledIndex(options, current, 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey) choose(active);
        else setActive((current) => nextEnabledIndex(options, current, -1));
        break;
      case 'PageDown':
        event.preventDefault();
        setActive((current) => nextEnabledIndex(options, current, 10));
        break;
      case 'PageUp':
        event.preventDefault();
        setActive((current) => nextEnabledIndex(options, current, -10));
        break;
      case 'Home':
        event.preventDefault();
        setActive(firstEnabledIndex(options));
        break;
      case 'End':
        event.preventDefault();
        setActive(lastEnabledIndex(options));
        break;
      case 'Enter':
        event.preventDefault();
        choose(active);
        break;
      case ' ':
        event.preventDefault();
        if (typing) {
          const match = jumpTo(' ');
          if (match >= 0) setActive(match);
        } else {
          choose(active);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        choose(active, false);
        break;
      default:
        if (printable) {
          event.preventDefault();
          const match = jumpTo(event.key);
          if (match >= 0) setActive(match);
        }
    }
  };

  const triggerText = selected ? selected.triggerLabel ?? selected.label : '';
  const fieldSize = size === 'sm' ? 'form-control-sm' : 'form-control-md';
  const triggerClass =
    variant === 'filter'
      ? 'inline-flex items-center gap-2 max-w-full bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide pl-4 pr-3 py-2.5 rounded-xl hover:bg-slate-50 shadow-3xs'
      : `form-control ${fieldSize} flex items-center justify-between gap-3 text-left normal-case tracking-normal`;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options)))}
        onKeyDown={onKeyDown}
        className={`${triggerClass} cursor-pointer outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
          variant === 'filter'
            ? 'focus-visible:ring-2 focus-visible:ring-indigo-500/30'
            : open
              ? 'ring-1 ring-brand-navy border-brand-navy'
              : ''
        } ${className}`}
      >
        {variant === 'filter' ? (
          <span className="truncate">
            {prefix ? `${prefix}: ` : ''}
            {triggerText || placeholder}
          </span>
        ) : selected ? (
          <span className="flex items-center gap-2.5 min-w-0">
            {selected.leading}
            <span className="truncate text-slate-800 font-bold">{triggerText}</span>
            {selected.description && size === 'md' && (
              <span className="hidden sm:inline truncate text-[11px] font-semibold text-slate-400">
                {selected.description}
              </span>
            )}
          </span>
        ) : (
          <span className="truncate text-slate-400 font-semibold">{placeholder}</span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Closes at once, like a native list, so two lists never overlap. */}
      {open &&
        createPortal(
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel ?? prefix ?? placeholder}
            tabIndex={-1}
            initial={{ opacity: 0, y: openUp ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            style={menuStyle}
            onMouseDown={(event) => event.preventDefault()}
            className={`fixed z-[10020] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)] font-sans text-left ${THIN_SCROLLBAR}`}
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              const isActive = index === active;
              return (
                <li
                  key={option.value || `option-${index}`}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseMove={() => !option.disabled && index !== active && setActive(index)}
                  onClick={() => choose(index)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 select-none transition-colors ${
                    option.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                  } ${isActive ? 'bg-slate-100' : ''}`}
                >
                  {option.leading}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-xs leading-snug ${
                        isSelected ? 'font-extrabold text-brand-navy' : 'font-semibold text-slate-700'
                      }`}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block text-[10.5px] font-semibold text-slate-400 mt-0.5">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check aria-hidden="true" className="w-4 h-4 shrink-0 text-indigo-600" />}
                </li>
              );
            })}
          </motion.ul>,
          document.body,
        )}
    </>
  );
};
