import React from 'react';
import type { StudentProgressIdentity } from '../types/studentProgress';
import { formatMalaysiaDateTime } from '../utils/malaysiaDateTime';
import { formatProgressStatus } from '../utils/studentProgress';

export const StudentLifecycleSummary: React.FC<{
  lifecycle: StudentProgressIdentity['lifecycle'];
  internal: boolean;
}> = ({ lifecycle, internal }) => (
  <section aria-label="Enrolment Status" className={internal
    ? 'rounded-lg border border-slate-200 bg-white p-4 font-sans text-xs'
    : 'mt-5 border-t border-slate-100 pt-4 font-sans text-xs'}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className={internal ? 'section-label' : 'card-label'}>Enrolment Status</h2>
      <p className="card-value">{formatProgressStatus(lifecycle.status)}</p>
    </div>
    {lifecycle.effectiveAt && (
      <p className="card-description mt-2">
        <span className="card-label">Status changed on:</span> {formatMalaysiaDateTime(lifecycle.effectiveAt)}
      </p>
    )}
    {internal && (
      <>
        {lifecycle.changedBy && <p className="card-description mt-2"><span className="card-label">Changed by:</span> {lifecycle.changedBy}</p>}
        {lifecycle.reason && <p className="card-description mt-1 whitespace-pre-wrap"><span className="card-label">Reason:</span> {lifecycle.reason}</p>}
        <h3 className="section-label mt-4">Lifecycle audit history</h3>
        {lifecycle.audits?.length ? (
          <ol className="mt-2 space-y-3">
            {lifecycle.audits.map((audit, index) => (
              <li key={`${audit.createdAt}-${index}`} className="border-l-2 border-slate-200 pl-3">
                <strong className="card-value">{formatProgressStatus(audit.previousStatus)} to {formatProgressStatus(audit.newStatus)}</strong>
                <p className="card-description mt-1 whitespace-pre-wrap">{audit.reason}</p>
                <p className="card-description mt-1">{audit.actor} · {formatMalaysiaDateTime(audit.createdAt)}</p>
              </li>
            ))}
          </ol>
        ) : <p className="card-description mt-2">No lifecycle changes recorded.</p>}
      </>
    )}
  </section>
);
