import { createContext, useCallback, useContext, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export const ListState = createContext<Map<string, unknown> | null>(null);

/** UI-only list state lives in the authenticated shell, never in browser storage. */
export function useListState<T>(module: string, field: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const memory = useContext(ListState);
  const key = `${module}:${field}`;
  const [value, update] = useState<T>(() => memory?.has(key) ? memory.get(key) as T : initial);
  const current = useRef(value);
  const setValue = useCallback((next: SetStateAction<T>) => {
    const saved = typeof next === 'function' ? (next as (value: T) => T)(current.current) : next;
    current.current = saved;
    memory?.set(key, saved);
    update(saved);
  }, [memory, key]);
  return [value, setValue];
}
