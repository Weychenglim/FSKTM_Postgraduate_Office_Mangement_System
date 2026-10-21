import React, { useCallback, useEffect, useState } from 'react';
import type { SupervisorResearchIntent } from '../types/supervisorResearchIntent';
import { RESEARCH_INTENT_FIELDS, type ResearchIntentField } from '../utils/supervisorResearchIntent';
import { getSupervisorApplicationResearchIntent } from '../services/supervisorResearchIntentApi';
import { PortalCard } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { appointmentDetailTypography as typography } from './AppointmentPrimitives';

export function SupervisorResearchIntentEditor({ value, onChange, disabled = false, error }: {
  value: SupervisorResearchIntent; onChange: (value: SupervisorResearchIntent) => void; disabled?: boolean;
  error?: { field?: ResearchIntentField; message: string } | null;
}) {
  return <>{['Background and purpose', 'Questions and objectives', 'Research plan'].map((group, index) => <section key={group} id={index === 0 ? 'research-intent-fields' : undefined} tabIndex={-1} aria-labelledby={`intent-group-${index}`} className="application-section min-w-0 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 space-y-5">
      <h3 id={`intent-group-${index}`} className={typography.heading}>{group}</h3>
      {index === 0 ? <p className="card-description">Complete each section of your research plan. All Research Intent fields are required.</p> : null}
      {index === 0 && error && !error.field ? <p role="alert" className="text-xs text-rose-700">{error.message}</p> : null}
      <fieldset disabled={disabled} className="min-w-0 space-y-5">
      <legend className="sr-only">{group}</legend>
      {RESEARCH_INTENT_FIELDS.filter(field => field.group === group).map(({ key, label, help }) => <div key={key} className="min-w-0 space-y-2">
        <label htmlFor={`research-intent-${key}`} className="card-label block">{label} <span className="font-normal text-slate-500">(required)</span></label>
        <p id={`research-intent-${key}-help`} className="card-description">{help}</p>
        <textarea id={`research-intent-${key}`} rows={5} maxLength={10000} value={value[key]} aria-required="true"
          aria-invalid={error?.field === key} aria-describedby={`research-intent-${key}-help${error?.field === key ? ` research-intent-${key}-error` : ''}`}
          className="form-control form-control-md" onChange={event => onChange({ ...value, [key]: event.target.value })} />
        {error?.field === key ? <p id={`research-intent-${key}-error`} role="alert" className="text-xs text-rose-700">{error.message}</p> : null}
        <p className="text-right text-xs text-slate-500">{value[key].length.toLocaleString()} / 10,000 characters</p>
      </div>)}
    </fieldset></section>)}</>;
}

export function SupervisorResearchIntentText({ record }: { record: SupervisorResearchIntent }) {
  return <dl className="space-y-6">{RESEARCH_INTENT_FIELDS.map(({ key, label }) => <div key={key} className="min-w-0">
    <dt className={typography.label}>{label}</dt>
    <dd className={`${typography.body} mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}>{record[key] || 'Not recorded'}</dd>
  </div>)}</dl>;
}

export function SupervisorResearchIntentSection({ record, loading, error, onRetry }: {
  record: SupervisorResearchIntent | null; loading: boolean; error: string | null; onRetry: () => void;
}) {
  return <PortalCard padding="lg"><section aria-labelledby="submitted-research-intent-title" className="space-y-5">
    <h3 id="submitted-research-intent-title" className={typography.heading}>Research Intent</h3>
    {loading ? <LoadingState message="Loading submitted Research Intent…" /> : error ? <ErrorState message={error} onRetry={onRetry} /> : record ? <SupervisorResearchIntentText record={record} /> : <p className="card-description">No Research Intent was recorded for this application. This information is unavailable for historical applications and Office-initiated replacements.</p>}
  </section></PortalCard>;
}

/** Sensitive text is requested only for the exact authorised detail, never list DTOs. */
export function SubmittedSupervisorResearchIntent({ applicationId }: { applicationId: number | string }) {
  const key = String(applicationId);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; record: SupervisorResearchIntent | null; loading: boolean; error: string | null }>({ key, record: null, loading: true, error: null });
  const onRetry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let current = true;
    setState({ key, record: null, loading: true, error: null });
    getSupervisorApplicationResearchIntent(key).then(response => {
      if (current) setState({ key, record: response.researchIntent, loading: false, error: null });
    }).catch(reason => {
      if (current) setState({ key, record: null, loading: false, error: reason instanceof Error ? reason.message : 'Submitted Research Intent could not be loaded.' });
    });
    return () => { current = false; };
  }, [key, attempt]);
  const visible = state.key === key ? state : { record: null, loading: true, error: null };
  return <SupervisorResearchIntentSection record={visible.record} loading={visible.loading} error={visible.error} onRetry={onRetry} />;
}
