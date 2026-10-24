import React, { useId } from 'react';
import { AppointmentIcon, appointmentDetailTypography as text } from './AppointmentPrimitives';
import { Check, Circle, CircleHelp, Minus, X, type LucideIcon } from 'lucide-react';
import type { ApprovalStep } from '../utils/approvalProcess';
import { formatMalaysiaDate, formatMalaysiaDateTime } from '../utils/malaysiaDateTime';

/** Date-only legacy records must not acquire a fictional submission time. */
export function formatRequestRecordedAt(value?: string | null): string {
  if (!value) return 'Not recorded';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return 'Not recorded';
  }
  const formatted = /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatMalaysiaDate(value) : formatMalaysiaDateTime(value);
  return formatted === 'Invalid date' || formatted === 'Not configured' ? 'Not recorded' : formatted;
}

export function formatRequestDisplayDate(value?: string | null): string {
  return formatRequestRecordedAt(value).replace(' (Malaysia, UTC+08:00)',' (Malaysia)');
}

const states = {
  completed: { label: 'Completed', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: Check },
  current: { label: 'Current stage', tone: 'border-brand-navy bg-brand-navy text-white', icon: Circle },
  upcoming: { label: 'Upcoming', tone: 'border-slate-200 bg-white text-slate-500', icon: Circle },
  rejected: { label: 'Rejected', tone: 'border-rose-200 bg-rose-50 text-rose-800', icon: X },
  cancelled: { label: 'Cancelled', tone: 'border-slate-300 bg-slate-100 text-slate-700', icon: X },
  not_reached: { label: 'Not reached', tone: 'border-slate-200 bg-slate-50 text-slate-400', icon: Minus },
  unknown: { label: 'Not recorded', tone: 'border-slate-200 bg-slate-50 text-slate-500', icon: CircleHelp },
} as const;

export function ApprovalProcess({ steps, title = 'Approval progress', icon }: { steps: ApprovalStep[]; title?: string; icon?: LucideIcon }) {
  const titleId = useId();
  const heading = icon ? <div className="flex min-w-0 items-center gap-3"><AppointmentIcon icon={icon} tone="info" /><h2 id={titleId} className={text.heading}>{title}</h2></div> : <h2 id={titleId} className={text.heading}>{title}</h2>;
  const reviews = steps.filter(step=>!['submitted','outcome'].includes(step.id));
  const outcome = steps.find(step=>step.id==='outcome');
  const terminal = outcome && ['completed','rejected','cancelled'].includes(outcome.state);
  const hasReviewDetails = reviews.some(step=>step.actorName||step.occurredAt);
  if (terminal && !hasReviewDetails) return <section aria-labelledby={titleId} className="space-y-2">{heading}<p className="card-value">{states[outcome.state].label}</p><p className="card-description">{outcome.description?.replace(/ (Cancellation|Deciding) stage: Not recorded\./,'')}</p>{outcome.actorName?<p className="card-description">{[outcome.actorName,outcome.actorRole].filter(Boolean).join(' · ')}</p>:null}{formatRequestRecordedAt(outcome.occurredAt)!=='Not recorded'?<p className="card-caption">{formatRequestDisplayDate(outcome.occurredAt)}</p>:null}<p className="card-description text-slate-500">Detailed approval history is unavailable for this record.</p>{outcome.reason?<p className="card-description whitespace-pre-wrap">Reason: {outcome.reason}</p>:null}</section>;
  if (outcome?.state==='unknown' && !hasReviewDetails && !steps.some(step=>step.state==='current')) return <section aria-labelledby={titleId}>{heading}<p className="card-description mt-2">Approval history is unavailable.</p></section>;
  const missingDetails = steps.some(step=>step.showRecordedDetails!==false && ['completed','rejected','cancelled'].includes(step.state) && (!step.actorName||formatRequestRecordedAt(step.occurredAt)==='Not recorded'));
  const placeholder = (description?:string) => !description || /^(Submission actor:|Decision details:|Stage history:)/.test(description);
  return <section aria-labelledby={titleId} className="space-y-4">
    {heading}
    {steps.length ? <ol className="space-y-0">{steps.map((step, index) => {
      const { label, tone, icon: Icon } = states[step.state];
      return <li key={step.id} aria-current={step.state === 'current' ? 'step' : undefined} className="relative flex gap-3 pb-5 last:pb-0">
        {index < steps.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-4 top-8 w-px bg-slate-200" /> : null}
        <span aria-hidden="true" className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${tone}`}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1 pt-1 [overflow-wrap:anywhere]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="card-value text-slate-800">{step.label}</h3><span className={`card-caption ${step.state === 'current' ? 'font-semibold text-brand-navy' : 'text-slate-500'}`}>{label}</span></div>
          {!placeholder(step.description) ? <p className="card-description mt-1">{step.description}</p> : null}
          {step.showRecordedDetails !== false && (step.actorName || step.actorRole) ? <p className="card-description mt-1 text-slate-700">{[step.actorName,step.actorRole].filter(Boolean).join(' · ')}</p> : null}
          {step.showRecordedDetails !== false && formatRequestRecordedAt(step.occurredAt)!=='Not recorded' ? <p className="card-caption mt-1">{formatRequestDisplayDate(step.occurredAt)}</p> : null}
          {step.reason ? <p className={`card-description mt-2 whitespace-pre-wrap ${step.state === 'rejected' ? 'text-rose-800' : 'text-slate-700'}`}><span className="font-semibold">Reason: </span>{step.reason}</p> : null}
        </div>
      </li>;
    })}</ol> : <p className="card-description">Approval history is unavailable.</p>}
    {missingDetails?<p className="card-caption text-slate-500">Some historical review details are unavailable.</p>:null}
  </section>;
}
