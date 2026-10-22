import React from 'react';

/** Read-only research text. Keep saved line breaks and allow long terms to wrap. */
export function ResearchAbstract({ value, inset = true }: { value?: string | null; inset?: boolean }) {
  return <div data-research-abstract className={`min-w-0 w-full ${inset ? 'rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 sm:p-5' : ''}`}>
    <p className="m-0 text-sm font-normal leading-7 text-slate-700 whitespace-pre-wrap [overflow-wrap:anywhere]">{value?.trim() || 'Not recorded'}</p>
  </div>;
}
