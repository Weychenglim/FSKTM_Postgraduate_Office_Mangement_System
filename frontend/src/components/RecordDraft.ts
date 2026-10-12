import { createContext, useContext, useEffect, useRef } from 'react';

export const RecordHost = createContext<{ element: HTMLDivElement | null; activate: (key: symbol | null) => void } | null>(null);

export const RecordDraft = createContext<((key: symbol, state: { dirty: boolean; busy: boolean } | null) => void) | null>(null);

/** Nested forms report to one blocker on their owning page. */
export function useRecordDraft(dirty: boolean, busy = false) {
  const report = useContext(RecordDraft);
  const key = useRef(Symbol('record-draft'));
  useEffect(() => { report?.(key.current, { dirty, busy }); }, [report, dirty, busy]);
  useEffect(() => () => report?.(key.current, null), [report]);
}
