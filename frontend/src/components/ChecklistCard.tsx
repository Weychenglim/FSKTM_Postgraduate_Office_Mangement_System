/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CalendarRange, ChevronRight, ClipboardList, ListChecks, SlidersHorizontal } from 'lucide-react';
import { MarksHeading, MarksIcon } from './MarksPrimitives';
import { StatusBadge } from './PortalPrimitives';

export interface ChecklistItem {
  id: string;
  taskName: string;
  status: 'COMPLETED' | 'PENDING' | 'IN_PROGRESS';
  actionLabel: string;
}

export function ChecklistCard({ items, onItemAction, unavailable = false }: { items: ChecklistItem[]; onItemAction: (item: ChecklistItem) => void; unavailable?: boolean }) {
  return <section id="checklist-card-section" aria-label="Evaluation setup" className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
    <MarksHeading icon={ListChecks}>Evaluation setup</MarksHeading>
    <p className="card-description mt-2">All non-archived periods and the active rubric.</p>
    <div id="checklist-rows" className="mt-4 divide-y divide-slate-100">
      {items.filter(item => item.id !== 'monitor').map(item => {
        const complete = item.status === 'COMPLETED';
        const icon = item.id === 'period' ? CalendarRange : item.id === 'rubric' ? SlidersHorizontal : ClipboardList;
        const title = item.id === 'period' ? 'Mark entry periods' : item.id === 'rubric' ? 'Rubric components' : 'Evaluation tasks';
        const status = unavailable ? 'Not loaded' : complete ? item.id === 'period' ? 'Configured' : item.id === 'rubric' ? 'Ready' : 'Generated' : 'Needs setup';
        return <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex min-w-0 items-center gap-3"><MarksIcon icon={icon} /><div className="min-w-0"><h3 className="text-sm font-semibold text-brand-navy">{title}</h3><div className="mt-1"><StatusBadge className="marks-state" tone={unavailable || complete ? 'neutral' : 'warning'}>{status}</StatusBadge></div></div></div>
          <button type="button" onClick={() => onItemAction(item)} aria-label={`Manage ${title.toLowerCase()}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            Manage<ChevronRight aria-hidden="true" focusable="false" className="h-4 w-4 shrink-0" />
          </button>
        </div>;
      })}
    </div>
  </section>;
}
