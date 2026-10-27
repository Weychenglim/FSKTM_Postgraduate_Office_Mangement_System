import React from 'react';
import {ChevronDown} from 'lucide-react';

/** Read-only field hierarchy, scoped to the primary appointment request. */
export function SupervisorRequestField({label, value}: {label: string; value?: string | null}) {
  return <div className="grid min-w-0 gap-1 py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
    <dt className="text-xs font-medium leading-6 text-slate-600">{label}</dt>
    <dd className="min-w-0 whitespace-pre-wrap text-sm font-normal leading-6 text-slate-900 [overflow-wrap:anywhere]">{value?.trim() || 'Not recorded'}</dd>
  </div>;
}

export function SupervisorRequestDisclosure({title, children, open, onToggle}: {
  title: string; children: React.ReactNode; open?: boolean; onToggle?: React.ToggleEventHandler<HTMLDetailsElement>;
}) {
  return <details open={open} onToggle={onToggle} className="group min-w-0 border-t border-slate-200">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded py-3 text-sm font-medium text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0 break-words">{title}</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <div className="min-w-0 space-y-4 pb-4">{children}</div>
  </details>;
}
