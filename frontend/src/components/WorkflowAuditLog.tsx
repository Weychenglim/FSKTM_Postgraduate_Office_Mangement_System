import React, { useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { SupervisorWorkflowEvent } from '../types';

interface WorkflowAuditLogProps {
  events?: SupervisorWorkflowEvent[];
}

const humanize = (value: string) =>
  value ? value.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : 'None';

export const WorkflowAuditLog: React.FC<WorkflowAuditLogProps> = ({ events = [] }) => {
  const [expanded, setExpanded] = useState(false);
  if (events.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-brand-navy">
          <History className="h-4 w-4 text-slate-500" />
          Audit History ({events.length})
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-slate-100 p-4">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-black text-brand-navy">
                  {humanize(event.action)}
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  {new Date(event.createdAt).toLocaleString('en-MY')}
                </span>
              </div>
              <p className="mt-1 text-[10px] font-semibold text-slate-600">
                {event.actorName} · {event.actorRole}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {humanize(event.previousStatus)} → {humanize(event.newStatus)}
              </p>
              {event.reason && (
                <p className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-[10px] font-semibold text-slate-600">
                  {event.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
