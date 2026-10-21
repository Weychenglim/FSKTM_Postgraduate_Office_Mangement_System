import { PortalSelect } from './PortalSelect';
import { DecisionDialog } from './DecisionDialog';
import { completeDecision } from '../utils/decisionSubmission';
import { useReturnToFocusReload } from '../utils/returnToFocus';
import { RecordPage } from './RecordPage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

import type {
  ReconciliationAllowedResolution,
  ReconciliationAudit,
  ReconciliationFilters,
  ReconciliationIssue,
  ReconciliationListResponse,
  ReconciliationPreview,
} from '../types';
import {
  applyReconciliationIssue,
  getReconciliationAudits,
  getReconciliationIssues,
  previewReconciliationIssue,
} from '../services';
import {
  reconciliationErrorMessage,
  reconciliationRecordRoute,
  resolutionPayload,
} from '../utils/workflowReconciliation';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { APP_ROUTES } from '../constants/routes';
import {OfficeToolSection} from './OfficeToolPrimitives';

interface WorkflowReconciliationCentreProps {
  onBack: () => void;
  backLabel?: string;
  onNavigateToRoute: (route: string) => void;
  onOpenCapacity?: () => void;
}

export const humanizeReconciliationLabel = (value: string) => value
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
  .toLowerCase()
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())
  .replace(/\bIds\b/g, 'IDs').replace(/\bId\b/g, 'ID');
const humanize = humanizeReconciliationLabel;

const capacityIssueTypes = new Set(['CAPACITY_PLAN_MISSING', 'CAPACITY_MULTIPLE_PUBLISHED', 'CAPACITY_PLAN_INCOMPLETE', 'CAPACITY_ENTRY_ROLE_MISMATCH', 'CAPACITY_LEGACY_LIMIT_DIVERGENCE', 'CAPACITY_AVAILABILITY_OVERLAP']);
export function reconciliationOwningRoute(issue: ReconciliationIssue) {
  if (capacityIssueTypes.has(issue.issueType)) {
    const semesterId = issue.currentState?.semesterId;
    return `${APP_ROUTES.dashboardLecturerCapacity}${typeof semesterId === 'number' && Number.isSafeInteger(semesterId) && semesterId > 0 ? `?semester=${semesterId}` : ''}`;
  }
  return reconciliationRecordRoute(issue.navigation.targetModule, issue.navigation.recordType, issue.navigation.recordId);
}

const stateValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const WorkflowReconciliationCentre: React.FC<WorkflowReconciliationCentreProps> = ({
  onBack,
  backLabel = 'Back to Office Dashboard',
  onNavigateToRoute,
  onOpenCapacity,
}) => {
  const [data, setData] = useState<ReconciliationListResponse | null>(null);
  const [filters, setFilters] = useState<ReconciliationFilters>({ page: 1, pageSize: 25 });
  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [audits, setAudits] = useState<ReconciliationAudit[]>([]);
  const [selectedResolution, setSelectedResolution] = useState<ReconciliationAllowedResolution | null>(null);
  const [programme, setProgramme] = useState('');
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async (propagateError = false) => {
    setLoading(true);
    setError(null);
    try {
      const [issues, auditResponse] = await Promise.all([
        getReconciliationIssues(filters),
        getReconciliationAudits(),
      ]);
      setData(issues);
      setAudits(auditResponse.results);
    } catch (loadError) {
      setError(reconciliationErrorMessage(loadError));
      if (propagateError) throw loadError;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  useReturnToFocusReload(() => void load(), !loading && !saving && !previewing && !preview && !reason.trim());
  const openIssue = async (issue: ReconciliationIssue, propagateError = false) => {
    setPreviewing(true);
    setDrawerError(null);
    setReason('');
    setConfirmed(false);
    setProgramme(issue.programme ?? '');
    try {
      const response = await previewReconciliationIssue(issue.issueId);
      setPreview(response);
      setSelectedResolution(response.allowedResolutions[0] ?? null);
    } catch (previewError) {
      setDrawerError(reconciliationErrorMessage(previewError));
      if (propagateError) throw previewError;
    } finally {
      setPreviewing(false);
    }
  };

  const closePreview = () => {
    setPreview(null);
    setSelectedResolution(null);
    setReason('');
    setConfirmed(false);
    setDrawerError(null);
  };

  const applyRepair = async () => {
    if (!preview || !selectedResolution || !reason.trim() || !confirmed) return false;
    setSaving(true);
    try {
      return await completeDecision(() => applyReconciliationIssue(preview.issue.issueId, {
        expectedFingerprint: preview.issue.fingerprint, reason: reason.trim(),
        resolution: resolutionPayload(selectedResolution, programme),
      }), async () => { await load(true); await openIssue(preview.issue, true); });
    } finally { setSaving(false); }
  };

  const setFilter = (key: keyof ReconciliationFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || undefined, page: 1 }));
  };

  const selectedAudits = useMemo(() => (
    preview
      ? audits.filter((audit) => (
        audit.entityType === preview.issue.recordType
        && audit.entityId === preview.issue.recordId
      ))
      : []
  ), [audits, preview]);

  const pageCount = data ? Math.max(1, Math.ceil(data.count / data.pageSize)) : 1;
  const canApply = Boolean(
    preview?.issue.repairability === 'REPAIRABLE'
    && selectedResolution
    && reason.trim()
    && confirmed
    && (!selectedResolution?.requiresProgramme || programme),
  );
  const owningRoute = preview ? reconciliationOwningRoute(preview.issue) : null;
  const capacityIssue = preview ? capacityIssueTypes.has(preview.issue.issueType) : false;

  return (
    <div className="space-y-6 pb-16 text-left text-xs">
      <PortalToast message={toast} />
      <DecisionDialog isOpen={confirmOpen} kind="confirmation" decisionKey={preview?.issue.issueId}
        title="Apply this audited repair?" context={<p>{preview?.issue.title}</p>}
        message={<><p>{selectedResolution?.label} will change this record and create permanent repair audit history.</p><p>Reason: {reason}</p></>}
        confirmLabel="Apply audited repair" successMessage="Repair completed and recorded in audit history."
        canConfirm={canApply} busy={saving} onConfirm={applyRepair} onClose={() => setConfirmOpen(false)}
        onReload={async () => { if (preview) await openIssue(preview.issue, true); }} />
      <PageHeader
        className="office-tool-heading"
        title="Workflow Reconciliation Centre"
        subtitle="Check inconsistent records. Review each issue and use verified, individually audited repairs where available."
        backLabel={backLabel}
        onBack={onBack}
        actions={(
          <>
            {onOpenCapacity && <PortalButton size="sm" icon={Gauge} onClick={onOpenCapacity}>Lecturer Capacity</PortalButton>}

          </>
        )}
      />

      {data && (
        <section className="office-tool-summary grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Reconciliation summary">
          {([
            ['Total issues', data.summary.total, 'neutral'],
            ['Blocking', data.summary.blocking, 'danger'],
            ['Warnings', data.summary.warnings, 'warning'],
            ['Repairable', data.summary.repairable, 'success'],
            ['Review required', data.summary.reviewRequired, 'info'],
          ] as const).map(([label, value, tone]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-3xs">
              <StatusBadge tone={tone}>{label}</StatusBadge>
              <p className="card-metric mt-3">{value}</p>
            </div>
          ))}
        </section>
      )}

      <OfficeToolSection title="Issue records" description="Filter the issues, then preview a record before reviewing any repair.">
        <div className="office-tool-filters grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="form-label sm:col-span-2 lg:col-span-4">Find an issue
            <span className="relative mt-1 block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              className="form-control form-control-md w-full pl-9 font-sans not-italic normal-case tracking-normal text-xs font-bold"
              placeholder="Search record, student, or programme"
              aria-label="Search record, student, or programme"
              value={filters.search ?? ''}
              onChange={(event) => setFilter('search', event.target.value)}
            />
          </span></label>
          <label className="form-label">Module
          <PortalSelect className="form-control form-control-md font-sans not-italic normal-case tracking-normal text-xs font-bold" aria-label="Module" value={filters.module ?? ''} onChange={(event) => setFilter('module', event.target.value)}>
            <option value="">All modules</option>
            <option value="DASHBOARD">Dashboard / Timeline</option>
            <option value="SUPERVISOR_APPOINTMENTS">Supervisor</option>
            <option value="PANEL_APPOINTMENTS">Panel</option>
            <option value="MARKS">Marks</option>
            <option value="WORKFLOW_TRACKING">Workflow Tracking</option>
          </PortalSelect></label>
          <label className="form-label">Severity
          <PortalSelect className="form-control form-control-md font-sans not-italic normal-case tracking-normal text-xs font-bold" aria-label="Severity" value={filters.severity ?? ''} onChange={(event) => setFilter('severity', event.target.value)}>
            <option value="">All severities</option>
            <option value="BLOCKING">Blocking</option>
            <option value="WARNING">Warning</option>
          </PortalSelect></label>
          <label className="form-label">Repair state
          <PortalSelect className="form-control form-control-md font-sans not-italic normal-case tracking-normal text-xs font-bold" aria-label="Repair state" value={filters.repairability ?? ''} onChange={(event) => setFilter('repairability', event.target.value)}>
            <option value="">All repair states</option>
            <option value="REPAIRABLE">Repairable</option>
            <option value="REVIEW_REQUIRED">Review required</option>
          </PortalSelect></label>
          <label className="form-label">Programme
          <PortalSelect className="form-control form-control-md font-sans not-italic normal-case tracking-normal text-xs font-bold" aria-label="Programme" value={filters.programme ?? ''} onChange={(event) => setFilter('programme', event.target.value)}>
            <option value="">All programmes</option>
            {data?.availableProgrammes.map((item) => <option key={item} value={item}>{item}</option>)}
          </PortalSelect></label>
        </div>

        {loading ? (
          <LoadingState message="Scanning persisted workflow records..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : !data?.results.length ? (
          <EmptyState title="No matching inconsistencies" description="The current persisted records are consistent for these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[800px]">
              <thead><tr className="data-thead">
                <th className="data-th text-left">Issue</th>
                <th className="data-th text-left">Module</th>
                <th className="data-th text-left">Affected record</th>
                <th className="data-th text-left">Classification</th>
                <th className="data-th text-right">Review</th>
              </tr></thead>
              <tbody>{data.results.map((issue) => (
                <tr key={issue.issueId} className="data-row">
                  <td className="data-td max-w-[360px]">
                    <p className="card-value">{issue.title}</p>
                  </td>
                  <td className="data-td-strong text-slate-600">{humanize(issue.module)}</td>
                  <td className="data-td">
                    <p className="card-value">{humanize(issue.recordType)} #{issue.recordId}</p>
                    <p className="card-description">{issue.studentId ?? issue.programme ?? 'Faculty-wide'}</p>
                  </td>
                  <td className="data-td space-x-2">
                    <StatusBadge tone={issue.severity === 'BLOCKING' ? 'danger' : 'warning'}>{humanize(issue.severity)}</StatusBadge>
                    <StatusBadge tone={issue.repairability === 'REPAIRABLE' ? 'success' : 'info'}>{humanize(issue.repairability)}</StatusBadge>
                  </td>
                  <td className="data-td text-right">
                    <PortalButton size="sm" icon={ChevronRight} iconPosition="right" onClick={() => void openIssue(issue)}>Preview</PortalButton>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {data && data.count > data.pageSize && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="card-value">Page {data.page} of {pageCount}</p>
            <div className="flex gap-2">
              <PortalButton size="icon" icon={ChevronLeft} title="Previous page" disabled={data.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, data.page - 1) }))} />
              <PortalButton size="icon" icon={ChevronRight} title="Next page" disabled={data.page >= pageCount} onClick={() => setFilters((current) => ({ ...current, page: data.page + 1 }))} />
            </div>
          </div>
        )}
      </OfficeToolSection>

      {(previewing || preview) && (
        <RecordPage title={preview?.issue.title ?? 'Workflow issue'} backLabel="Back to Workflow Reconciliation" onBack={closePreview} pageKey="reconciliation-review" dirty={!!reason.trim() || confirmed} busy={saving}>
            {previewing && !preview ? <LoadingState message="Validating current issue state..." /> : preview && (
              <div className="space-y-6">
                <p className="card-description">{preview.issue.summary}</p>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={preview.issue.severity === 'BLOCKING' ? 'danger' : 'warning'} icon={AlertTriangle}>{preview.issue.severity}</StatusBadge>
                  <StatusBadge tone={preview.issue.repairability === 'REPAIRABLE' ? 'success' : 'info'} icon={preview.issue.repairability === 'REPAIRABLE' ? Wrench : ShieldCheck}>{humanize(preview.issue.repairability)}</StatusBadge>
                </div>

                <section className="space-y-2">
                  <h3 className="section-label">Affected record</h3>
                  <p className="card-value">{humanize(preview.issue.recordType)} #{preview.issue.recordId}</p>
                  <p className="card-description">{preview.issue.studentId ?? preview.issue.programme ?? 'Faculty-wide'}</p>
                </section>
                <details className="rounded-lg border border-slate-200">
                  <summary className="section-label cursor-pointer rounded px-4 py-3 focus-visible:outline-2 focus-visible:outline-blue-600">Technical facts and identifiers</summary>
                  <dl className="divide-y divide-slate-100">
                    {Object.entries(preview.issue.currentState).map(([key, value]) => (
                      <div key={key} className="grid gap-2 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-3">
                        <dt className="font-bold text-slate-500">{humanize(key)}</dt>
                        <dd className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] font-semibold text-slate-700">{stateValue(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </details>

                {owningRoute && (
                  <PortalButton
                    icon={ArrowUpRight}
                    onClick={() => onNavigateToRoute(owningRoute)}
                  >{capacityIssue ? 'Review lecturer capacity' : 'Open source record'}</PortalButton>
                )}

                {drawerError && <ErrorState message={drawerError} onRetry={() => void openIssue(preview.issue)} />}

                {preview.issue.repairability === 'REPAIRABLE' && preview.allowedResolutions.length > 0 ? (
                  <section className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="h-4 w-4" /><h3 className="section-label text-emerald-800">Verified repair available</h3></div>
                    <PortalSelect className="form-control form-control-md w-full bg-white font-sans not-italic normal-case tracking-normal text-xs font-bold" value={selectedResolution?.action ?? ''} onChange={(event) => setSelectedResolution(preview.allowedResolutions.find((item) => item.action === event.target.value) ?? null)}>
                      {preview.allowedResolutions.map((item) => <option key={item.action} value={item.action}>{item.label}</option>)}
                    </PortalSelect>
                    {selectedResolution?.requiresProgramme && (
                      <PortalSelect className="form-control form-control-md w-full bg-white font-sans not-italic normal-case tracking-normal text-xs font-bold" value={programme} onChange={(event) => setProgramme(event.target.value)}>
                        <option value="">Select managed programme</option>
                        {data?.availableProgrammes.map((item) => <option key={item} value={item}>{item}</option>)}
                      </PortalSelect>
                    )}
                    <textarea className="form-control form-control-md min-h-24 w-full bg-white font-sans not-italic normal-case tracking-normal text-xs font-bold" placeholder="Mandatory reason for this repair" value={reason} onChange={(event) => setReason(event.target.value)} />
                    <label className="card-description flex items-start gap-3 rounded-lg border border-emerald-200 bg-white p-3">
                      <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                      <span>I confirm this individual repair after reviewing the current state and affected identifiers.</span>
                    </label>
                    <PortalButton variant="success" icon={Wrench} fullWidth isLoading={saving} disabled={!canApply} onClick={() => setConfirmOpen(true)}>Apply Audited Repair</PortalButton>
                  </section>
                ) : (
                  <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 text-blue-800"><ShieldCheck className="h-4 w-4" /><h3 className="section-label text-blue-800">Review required</h3></div>
                    <p className="card-description mt-2 text-blue-700">Portal repair is unsafe because it could rewrite or merge authoritative history.</p>
                    {preview.issue.dependencies.map((item) => <p key={item} className="card-value mt-2 text-blue-800">{item}</p>)}
                  </section>
                )}

                <details className="rounded-lg border border-slate-200">
                  <summary className="section-label cursor-pointer rounded px-4 py-3 focus-visible:outline-2 focus-visible:outline-blue-600">Repair audit history · {selectedAudits.length} records in the current audit response</summary>
                  {selectedAudits.length === 0 ? <p className="card-description p-4">No prior repair audit for this record.</p> : selectedAudits.map((audit) => (
                    <div key={audit.id} className="border-b border-slate-100 p-4 last:border-0">
                      <div className="flex justify-between gap-3"><p className="card-value">{humanize(audit.action)}</p><time className="card-caption text-slate-400">{new Date(audit.createdAt).toLocaleString('en-MY')}</time></div>
                      <p className="card-description mt-1">{audit.actor.name}: {audit.reason}</p>
                    </div>
                  ))}
                </details>
              </div>
            )}
          </RecordPage>
      )}
    </div>
  );
};
