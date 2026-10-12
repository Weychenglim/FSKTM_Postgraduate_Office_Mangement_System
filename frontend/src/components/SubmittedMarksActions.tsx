import { useRecordDraft } from './RecordDraft';
import React, {useEffect, useRef, useState} from 'react';
import type {MarkRecordDetail} from '../types';
import {ApiError} from '../services/apiClient';
import {correctSubmittedMarkRecord, reopenSubmittedMarkRecord} from '../services/marksApi';
import {validateSubmittedMarksCorrection} from '../utils/submittedMarksCorrection';
import {formatMalaysiaDateTime} from '../utils/malaysiaDateTime';
import {PortalButton, PortalCard, PortalConfirmModal} from './PortalPrimitives';

interface SubmittedMarksActionsProps {
  record: MarkRecordDetail;
  onChanged: (message: string) => Promise<void>;
  onReload: () => Promise<void>;
}

export function SubmittedMarksActions({record, onChanged, onReload}: SubmittedMarksActionsProps) {
  const [mode, setMode] = useState<'correct' | 'reopen' | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [comments, setComments] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);

  const editedScores = record.rubric.components.some(component => component.marksAwarded !== null && values[component.id] !== (component.marksAwarded || '0'));
  useRecordDraft(!!mode && (!!reason.trim() || (mode === 'correct' && (editedScores || comments !== record.entry.comments))), busy);
  const actions = record.officeActions;
  if (record.entry.status !== 'SUBMITTED' || !actions?.version || (!actions.canCorrect && !actions.canReopen)) return null;
  const components = record.rubric.components.filter(component => component.marksAwarded !== null);
  const original = {comments: record.entry.comments, components};
  const correctedTotal = components.reduce((total, component) => total + Number(values[component.id] || 0), 0);
  const choose = (next: 'correct' | 'reopen') => {
    setMode(next); setError(''); setReason(''); setComments(record.entry.comments);
    setValues(Object.fromEntries(components.map(component => [component.id, component.marksAwarded || '0'])));
  };
  const review = () => {
    const validation = mode === 'correct'
      ? validateSubmittedMarksCorrection(original, values, comments, reason)
      : !reason.trim() ? 'Enter a reopening reason.' : null;
    setError(validation || '');
    if (!validation) setConfirmOpen(true);
  };
  const submit = async () => {
    if (submitting.current || blocked || !mode || !actions.version) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      if (mode === 'correct') {
        await correctSubmittedMarkRecord(record.recordId, {
          expectedVersion: actions.version, reason: reason.trim(), comments,
          scores: components.filter(component => Number(values[component.id]) !== Number(component.marksAwarded))
            .map(component => ({componentId: Number(component.id), marksAwarded: values[component.id]})),
        });
      } else {
        await reopenSubmittedMarkRecord(record.recordId, {expectedVersion: actions.version, reason: reason.trim()});
      }
      if (mounted.current) await onChanged(mode === 'correct'
        ? 'Correction saved and audited. The submission remains locked.'
        : 'Marks reopened and audited. The assigned Lecturer can review and resubmit.');
    } catch (failure) {
      if (mounted.current) {
        setConfirmOpen(false);
        setError(failure instanceof Error ? failure.message : 'Unable to update this record.');
        if (failure instanceof ApiError && (failure.status === 409 || failure.status === 403)) setBlocked(true);
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return <PortalCard padding="lg" className="rounded-lg">
    <h2 className="section-label">Office Marks actions</h2>
    <p className="card-description mt-2 text-slate-600">Changes require a reason and retain the original values in correction history.</p>
    {error ? <p role="alert" className="card-description mt-3 text-red-700">{error}</p> : null}
    {blocked ? <PortalButton className="mt-3" onClick={() => void onReload()}>Reload latest record</PortalButton> : <>
      {!mode ? <div className="mt-4 flex flex-wrap gap-2">
        {actions.canCorrect ? <PortalButton onClick={() => choose('correct')}>Correct submitted marks</PortalButton> : null}
        {actions.canReopen ? <PortalButton onClick={() => choose('reopen')}>Reopen for Lecturer</PortalButton> : null}
      </div> : <div className="mt-4 space-y-4">
        <h3 className="section-label">{mode === 'correct' ? 'Correct submitted marks' : 'Reopen for Lecturer'}</h3>
        {mode === 'correct' ? <>
          <div className="grid gap-3 sm:grid-cols-2">{components.map(component => <label key={component.id} className="form-label">
            {component.name} (maximum {component.maxMarks})
            <input type="number" min="0" max={component.maxMarks} step="0.01" disabled={busy}
              className="form-control mt-1" value={values[component.id] || ''}
              onChange={event => setValues(current => ({...current, [component.id]: event.target.value}))}/>
          </label>)}</div>
          <label className="form-label block">Corrected overall comments<textarea className="form-control mt-1" disabled={busy} value={comments} onChange={event => setComments(event.target.value)}/></label>
          <p className="card-description">Total: {record.entry.totalMark} → {Number.isFinite(correctedTotal) ? correctedTotal.toFixed(2) : '—'}</p>
        </> : <p className="card-description text-slate-600">Scores and comments are preserved. The entry returns to Draft so its assigned Lecturer can review and resubmit while the period remains open.</p>}
        <label className="form-label block">{mode === 'correct' ? 'Correction reason' : 'Reopening reason'}<textarea className="form-control mt-1" required disabled={busy} value={reason} onChange={event => setReason(event.target.value)}/></label>
        <div className="flex flex-wrap gap-2">
          <PortalButton variant="primary" disabled={busy || !reason.trim()} onClick={review}>{mode === 'correct' ? 'Review correction' : 'Review reopening'}</PortalButton>
          <PortalButton disabled={busy} onClick={() => {setMode(null); setError('');}}>Cancel</PortalButton>
        </div>
      </div>}
    </>}
    <PortalConfirmModal isOpen={confirmOpen} isLoading={busy}
      title={mode === 'correct' ? 'Save this correction?' : 'Reopen this submission?'}
      message={<div className="card-description space-y-2"><p>{mode === 'correct'
        ? `Total ${record.entry.totalMark} → ${correctedTotal.toFixed(2)}. The submission remains locked; the changes are audited.`
        : 'The submission returns to Draft with its scores and comments preserved.'}</p><p className="card-description whitespace-pre-wrap">Reason: {reason}</p></div>}
      confirmLabel={mode === 'correct' ? 'Save correction' : 'Reopen marks'} cancelLabel="Review again" tone="warning"
      onConfirm={() => void submit()} onCancel={() => {if (!submitting.current) setConfirmOpen(false);}}/>
  </PortalCard>;
}

export function MarkCorrectionHistoryView({events, components}: {
  events: MarkRecordDetail['correctionHistory']; components: MarkRecordDetail['rubric']['components'];
}) {
  if (!events.length) return <p className="card-description">No corrections or reopening events.</p>;
  return <div className="space-y-4">{events.map(event => {
    const scoreValues = (values: Record<string, unknown>) => values.scores && typeof values.scores === 'object' ? values.scores as Record<string, unknown> : {};
    const beforeScores = scoreValues(event.beforeValues); const afterScores = scoreValues(event.afterValues);
    const rows: Array<[string, unknown, unknown]> = [
      ['Status', event.beforeValues.status, event.afterValues.status],
      ['Total mark', event.beforeValues.totalMark, event.afterValues.totalMark],
      ...components.filter(component => component.id in beforeScores || component.id in afterScores)
        .map(component => [component.name, beforeScores[component.id], afterScores[component.id]] as [string, unknown, unknown]),
      ['Overall comments', event.beforeValues.comments, event.afterValues.comments],
    ];
    return <article key={event.id} className="border-l-2 border-blue-200 pl-3 text-xs">
      <p className="card-value text-slate-700">{event.action === 'CORRECT' ? 'Correction' : 'Reopened for Lecturer'}</p>
      <p className="card-description mt-1 text-slate-600">{event.reason}</p>
      <p className="card-description mt-1 text-slate-500">{event.actorName} · {formatMalaysiaDateTime(event.createdAt)}</p>
      <details className="mt-2"><summary className="card-value cursor-pointer">View before and after</summary>
        <div className="mt-2 overflow-x-auto"><table className="data-table"><thead><tr><th className="data-th p-2">Field</th><th className="data-th p-2">Before</th><th className="data-th p-2">After</th></tr></thead>
          <tbody>{rows.map(([label, before, after]) => <tr key={label} className="border-t border-slate-100"><th className="data-td-strong p-2">{label}</th><td className="data-td p-2 whitespace-pre-wrap">{before == null ? '—' : String(before)}</td><td className="data-td p-2 whitespace-pre-wrap">{after == null ? '—' : String(after)}</td></tr>)}</tbody>
        </table></div>
      </details>
    </article>;
  })}</div>;
}
