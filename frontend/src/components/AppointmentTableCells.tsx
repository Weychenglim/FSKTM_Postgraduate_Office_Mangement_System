import React from 'react';
import { requestStatusLabel } from '../utils/lecturerRequests';
import { appointmentRequestStatusTone } from '../utils/appointmentRequestStatus';

/** People are identities, rather than colour-coded workflow states. */
export function AppointmentReviewerCell({ name, role }: { name?: string | null; role: string }) {
  const reviewerName = name?.trim();
  return <div data-appointment-reviewer className="min-w-0 space-y-1 break-words text-xs leading-relaxed">
    <p className="font-semibold text-slate-800">{reviewerName || role}</p>
    {reviewerName ? <p className="font-medium text-slate-500">{role}</p> : null}
  </div>;
}

/** Use the same geometry for pending requests and an absence of ongoing requests. */
export function AppointmentStatusCell({ status, emptyLabel }: { status: string | null; emptyLabel: string }) {
  const value = status?.trim().toUpperCase().replaceAll(' ', '_');
  const tone = value ? appointmentRequestStatusTone(value) : 'neutral';
  const dots = { neutral: 'bg-slate-400', warning: 'bg-amber-500', success: 'bg-emerald-500', danger: 'bg-rose-500' };
  return <span data-appointment-status className={`inline-grid max-w-full grid-cols-[6px_minmax(0,1fr)] items-start gap-x-2 text-left text-xs font-medium normal-case leading-relaxed tracking-normal ${tone === 'neutral' ? 'text-slate-500' : 'text-slate-700'}`}>
    <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
    <span className="min-w-0 break-words">{value ? requestStatusLabel(value) : emptyLabel}</span>
  </span>;
}
