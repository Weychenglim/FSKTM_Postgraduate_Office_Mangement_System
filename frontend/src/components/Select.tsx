/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A drop-in for the native <select>: the same props and <option> children,
// shown with the portal's own SelectMenu, because the browser's open list
// cannot be styled. onChange still receives an event-like object, so
// `event.target.value` handlers keep working unchanged.

import React, { useState } from 'react';
import { SelectMenu, SelectMenuOption } from './SelectMenu';

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'defaultValue'> & {
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
};

const textOf = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return '';
};

const optionsFrom = (children: React.ReactNode, group?: string): SelectMenuOption[] =>
  React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<{ children?: React.ReactNode; value?: unknown; label?: string; disabled?: boolean }>(child)) return [];
    if (child.type === React.Fragment) return optionsFrom(child.props.children, group);
    if (child.type === 'optgroup') return optionsFrom(child.props.children, child.props.label);
    if (child.type !== 'option') return [];
    const label = textOf(child.props.children).trim();
    const value = child.props.value === undefined ? label : String(child.props.value);
    return [{ value, label, description: group, disabled: Boolean(child.props.disabled) }];
  });

const OWN_CLASSES = new Set(['form-control', 'form-control-sm', 'form-control-md', 'appearance-none', 'cursor-pointer']);
// Room the old select kept for a drawn arrow; SelectMenu draws its own.
const ARROW_ROOM = /^(sm:|md:)?pr-\d+(\.\d+)?$/;

export const Select: React.FC<SelectProps> = ({
  id,
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  className = '',
  children,
  'aria-label': ariaLabel,
}) => {
  const [own, setOwn] = useState(String(defaultValue ?? ''));
  const current = value === undefined ? own : String(value);
  const options = optionsFrom(children);
  const matched = options.some((option) => option.value === current);
  const classes = className.split(/\s+/).filter(Boolean);
  const size = classes.includes('form-control-sm') ? 'sm' : 'md';

  const choose = (next: string) => {
    if (value === undefined) setOwn(next);
    const target = { value: next, name: name ?? '' };
    onChange?.({ target, currentTarget: target } as unknown as React.ChangeEvent<HTMLSelectElement>);
  };

  return (
    <>
      <SelectMenu
        id={id}
        value={matched ? current : ''}
        options={options}
        onChange={choose}
        placeholder={options[0]?.label ?? 'Select an option'}
        size={size}
        disabled={disabled}
        aria-label={ariaLabel}
        className={classes.filter((name) => !OWN_CLASSES.has(name) && !ARROW_ROOM.test(name)).join(' ')}
      />
      {/* The choices, as the native select listed them, for tools that read the page. */}
      <datalist>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </datalist>
      {(name || required) && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          name={name}
          required={required}
          value={current}
          onChange={() => {}}
        />
      )}
    </>
  );
};
