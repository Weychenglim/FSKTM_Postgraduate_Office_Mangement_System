import React from 'react';
import type { StudentProgressIdentity } from '../types/studentProgress';
import { formatMalaysiaDateTime } from '../utils/malaysiaDateTime';
import { formatProgressStatus } from '../utils/studentProgress';

export const StudentLifecycleSummary: React.FC<{
  lifecycle: StudentProgressIdentity['lifecycle'];
  internal: boolean;
}> = ({ lifecycle, internal }) => (
  <section aria-label="Academic lifecycle" className="rounded-lg border border-slate-200 bg-white p-4 text-xs">
    <h2 className="text-sm font-black text-brand-navy">Academic lifecycle</h2>
    <p className="mt-2">Status: <strong>{formatProgressStatus(lifecycle.status)}</strong></p>
    <p className="mt-1 text-slate-600">Effective: {lifecycle.effectiveAt ? formatMalaysiaDateTime(lifecycle.effectiveAt) : 'No lifecycle change recorded'}</p>
    {internal && (
      <>
        {lifecycle.changedBy && <p className="mt-2">Changed by: {lifecycle.changedBy}</p>}
        {lifecycle.reason && <p className="mt-1 whitespace-pre-wrap">Reason: {lifecycle.reason}</p>}
        <h3 className="mt-4 font-bold text-brand-navy">Lifecycle audit history</h3>
        {lifecycle.audits?.length ? (
          <ol className="mt-2 space-y-3">
            {lifecycle.audits.map((audit, index) => (
              <li key={`${audit.createdAt}-${index}`} className="border-l-2 border-slate-200 pl-3">
                <strong>{formatProgressStatus(audit.previousStatus)} to {formatProgressStatus(audit.newStatus)}</strong>
                <p className="mt-1 whitespace-pre-wrap">{audit.reason}</p>
                <p className="mt-1 text-slate-500">{audit.actor} · {formatMalaysiaDateTime(audit.createdAt)}</p>
              </li>
            ))}
          </ol>
        ) : <p className="mt-2 text-slate-500">No lifecycle changes recorded.</p>}
      </>
    )}
  </section>
);
