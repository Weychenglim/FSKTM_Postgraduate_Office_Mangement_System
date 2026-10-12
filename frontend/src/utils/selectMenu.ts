/**
 * Keyboard movement for SelectMenu, following the WAI-ARIA select-only
 * combobox pattern: arrows move one option and stop at the ends, Home/End jump
 * to the first/last option, and typing jumps to a matching label.
 */

interface MenuItem {
  label: string;
  disabled?: boolean;
}

/** The next enabled option from `from` in direction `step`, or `from` at the end. */
export function nextEnabledIndex(items: MenuItem[], from: number, step: number): number {
  const direction = Math.sign(step) || 1;
  let found = from;
  let remaining = Math.abs(step) || 1;
  for (let i = from + direction; i >= 0 && i < items.length && remaining > 0; i += direction) {
    if (!items[i].disabled) {
      found = i;
      remaining -= 1;
    }
  }
  return found;
}

export function firstEnabledIndex(items: MenuItem[]): number {
  return items.findIndex((item) => !item.disabled);
}

export function lastEnabledIndex(items: MenuItem[]): number {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (!items[i].disabled) return i;
  }
  return -1;
}

/**
 * The option a typed `query` jumps to, searching after `from` and wrapping.
 * Repeating one letter ("ddd") cycles through the options starting with it.
 */
export function typeaheadIndex(items: MenuItem[], query: string, from: number): number {
  const typed = query.toLowerCase();
  if (!typed) return -1;
  const cycling = [...typed].every((char) => char === typed[0]);
  const needle = cycling ? typed[0] : typed;
  // A longer query may still match the option it already reached.
  const start = cycling ? from + 1 : Math.max(from, 0);
  for (let offset = 0; offset < items.length; offset += 1) {
    const index = (((start + offset) % items.length) + items.length) % items.length;
    const item = items[index];
    if (!item.disabled && item.label.toLowerCase().startsWith(needle)) return index;
  }
  return -1;
}
