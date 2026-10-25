import React, { useEffect, useState } from 'react';
import type { ReconciliationAudit, ReconciliationIssue } from '../types';
import { getReconciliationAudits } from '../services/workflowReconciliationApi';
import { reconciliationErrorMessage } from '../utils/workflowReconciliation';
import { CoordinatorDataTable } from './CoordinatorBrowsePrimitives';
import { ErrorState, LoadingState } from './StateViews';

export const humanizeReconciliationLabel = (value: string) => value
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
  .toLowerCase().replaceAll('_', ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase())
  .replace(/\bIds\b/g, 'IDs').replace(/\bId\b/g, 'ID');

const stateValue = (value: unknown): string => {
  if (value == null || value === '') return 'Not recorded';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map(stateValue).join('; ') : 'None';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
const contextKeys = new Set(['lecturerName', 'staffNo', 'semesterLabel', 'semesterCode', 'planVersion', 'planStatus']);
const technicalKey = (key: string) => /Ids?$/.test(key) || key === 'missingAssignments';

export function ReconciliationEvidence({ issue }: { issue: ReconciliationIssue }) {
  const legacy = issue.issueType === 'CAPACITY_LEGACY_LIMIT_DIVERGENCE';
  const values = Object.entries(issue.currentState).filter(([key]) => !contextKeys.has(key));
  const facts = values.filter(([key]) => !technicalKey(key));
  const identifiers = values.filter(([key]) => technicalKey(key));
  const roles = [['Supervisor', 'supervisorLimit', 'legacySupervisorLimit'], ['Panel', 'panelLimit', 'legacyPanelLimit']];
  return <section aria-label="Evidence" className="space-y-5">
    <h3 className="section-heading">{legacy ? 'Compare the saved limits' : 'Recorded evidence'}</h3>
    {legacy ? <CoordinatorDataTable label="Capacity limit comparison"
      columns={['Role', 'Published semester limit', 'Old profile limit', 'Comparison']}
      rows={roles.filter(([, current, old]) => issue.currentState[current] != null || issue.currentState[old] != null).map(([role, current, old]) => ({
        key: role, cells: [role, <strong>{stateValue(issue.currentState[current])}</strong>, stateValue(issue.currentState[old]),
          issue.currentState[current] === issue.currentState[old] ? 'Matches' : <span className="font-semibold text-amber-800">Different</span>],
      }))} />
      : facts.length > 0 ? <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{facts.map(([key, value]) => <div key={key} className="min-w-0">
        <dt className="card-description">{key === 'matchingSemesterCount' ? 'Semesters matching all available evidence' : humanizeReconciliationLabel(key)}</dt>
        <dd className="card-value mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{stateValue(value)}</dd>
      </div>)}</dl> : <p className="card-description">{issue.summary}</p>}
    <details className="border-t border-slate-200 pt-4">
      <summary className="card-value cursor-pointer">Record references</summary>
      <dl className="mt-4 space-y-3">
        {[['Record', `${humanizeReconciliationLabel(issue.recordType)} #${issue.recordId}`], ...identifiers].map(([key, value]) => <div key={key} className="grid gap-1 sm:grid-cols-[180px_minmax(0,1fr)]">
          <dt className="card-description">{humanizeReconciliationLabel(String(key))}</dt>
          <dd className="card-value [overflow-wrap:anywhere]">{stateValue(value)}</dd>
        </div>)}
      </dl>
    </details>
  </section>;
}

export function ReconciliationAuditHistory({ issue }: { issue: ReconciliationIssue }) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<{ results: ReconciliationAudit[]; count?: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let active = true;
    setError(''); setData(null);
    getReconciliationAudits({ entityType: issue.recordType, entityId: issue.recordId })
      .then(response => { if (active) setData(response); })
      .catch(failure => { if (active) setError(reconciliationErrorMessage(failure)); });
    return () => { active = false; };
  }, [open, issue.recordType, issue.recordId, revision]);
  return <details className="rounded-xl border border-slate-200 bg-white p-5" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="section-heading cursor-pointer">Review and repair history for this record</summary>
    {open && <div className="mt-5 space-y-4">
      {error ? <ErrorState compact message={error} onRetry={() => setRevision(value => value + 1)} />
        : !data ? <LoadingState message="Loading review history…" />
        : !data.results.length ? <p className="card-description">No reviews or repairs have been recorded for this record.</p>
        : <>
          {(data.count ?? data.results.length) > data.results.length && <p className="card-description">Showing the latest {data.results.length} of {data.count} decisions.</p>}
          <CoordinatorDataTable label="Record review history" columns={['When', 'Action', 'Person and reason']}
            rows={data.results.map(audit => ({ key: audit.id, cells: [
              new Date(audit.createdAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
              audit.action === 'ACCEPT_INTENTIONAL' ? 'Accepted as intentional' : humanizeReconciliationLabel(audit.action),
              <><p className="card-value">{audit.actor.name}</p><p className="card-description mt-1">{audit.reason}</p></>,
            ] }))} />
        </>}
    </div>}
  </details>;
}
