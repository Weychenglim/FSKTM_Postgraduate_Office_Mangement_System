import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
  X,
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

interface WorkflowReconciliationCentreProps {
  onBack: () => void;
  onNavigateToRoute: (route: string) => void;
}

const humanize = (value: string) => value
  .toLowerCase()
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const stateValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const WorkflowReconciliationCentre: React.FC<WorkflowReconciliationCentreProps> = ({
  onBack,
  onNavigateToRoute,
}) => {
  const [data, setData] = useState<ReconciliationListResponse | null>(null);
  const [filters, setFilters] = useState<ReconciliationFilters>({ page: 1, pageSize: 25 });
  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [audits, setAudits] = useState<ReconciliationAudit[]>([]);
  const [selectedResolution, setSelectedResolution] = useState<ReconciliationAllowedResolution | null>(null);
  const [programme, setProgramme] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
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
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openIssue = async (issue: ReconciliationIssue) => {
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
    if (!preview || !selectedResolution || !reason.trim() || !confirmed) return;
    setSaving(true);
    setDrawerError(null);
    try {
      await applyReconciliationIssue(preview.issue.issueId, {
        expectedFingerprint: preview.issue.fingerprint,
        reason: reason.trim(),
        resolution: resolutionPayload(selectedResolution, programme),
      });
      setToast('Repair completed and recorded in the immutable audit history.');
      closePreview();
      await load();
      window.setTimeout(() => setToast(null), 3500);
    } catch (applyError) {
      setDrawerError(reconciliationErrorMessage(applyError));
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="space-y-6 pb-16 text-left text-xs">
      <PortalToast message={toast} />
      <PageHeader
        title="Workflow Reconciliation Centre"
        subtitle="Detect and repair cross-module data inconsistencies with preview, confirmation, and immutable audit history."
        backLabel="Back to Office Dashboard"
        onBack={onBack}
        actions={<PortalButton icon={RefreshCw} onClick={() => void load()}>Refresh Scan</PortalButton>}
      />

      {data && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Reconciliation summary">
          {([
            ['Total issues', data.summary.total, 'neutral'],
            ['Blocking', data.summary.blocking, 'danger'],
            ['Warnings', data.summary.warnings, 'warning'],
            ['Repairable', data.summary.repairable, 'success'],
            ['Review required', data.summary.reviewRequired, 'info'],
          ] as const).map(([label, value, tone]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-3xs">
              <StatusBadge tone={tone}>{label}</StatusBadge>
              <p className="mt-3 text-2xl font-black text-brand-navy">{value}</p>
            </div>
          ))}
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-3xs">
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-3 xl:grid-cols-6">
          <label className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              className="form-input w-full pl-9"
              placeholder="Search record, student, or programme"
              value={filters.search ?? ''}
              onChange={(event) => setFilter('search', event.target.value)}
            />
          </label>
          <select className="form-input" value={filters.module ?? ''} onChange={(event) => setFilter('module', event.target.value)}>
            <option value="">All modules</option>
            <option value="DASHBOARD">Dashboard / Timeline</option>
            <option value="SUPERVISOR_APPOINTMENTS">Supervisor</option>
            <option value="PANEL_APPOINTMENTS">Panel</option>
            <option value="MARKS">Marks</option>
            <option value="WORKFLOW_TRACKING">Workflow Tracking</option>
          </select>
          <select className="form-input" value={filters.severity ?? ''} onChange={(event) => setFilter('severity', event.target.value)}>
            <option value="">All severities</option>
            <option value="BLOCKING">Blocking</option>
            <option value="WARNING">Warning</option>
          </select>
          <select className="form-input" value={filters.repairability ?? ''} onChange={(event) => setFilter('repairability', event.target.value)}>
            <option value="">All repair states</option>
            <option value="REPAIRABLE">Repairable</option>
            <option value="REVIEW_REQUIRED">Review required</option>
          </select>
          <select className="form-input" value={filters.programme ?? ''} onChange={(event) => setFilter('programme', event.target.value)}>
            <option value="">All programmes</option>
            {data?.availableProgrammes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        {loading ? (
          <LoadingState message="Scanning persisted workflow records..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : !data?.results.length ? (
          <EmptyState title="No matching inconsistencies" description="The current persisted records are consistent for these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
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
                    <p className="font-black text-brand-navy">{issue.title}</p>
                    <p className="mt-1 text-[10.5px] font-semibold text-slate-500">{issue.summary}</p>
                  </td>
                  <td className="data-td font-bold text-slate-600">{humanize(issue.module)}</td>
                  <td className="data-td">
                    <p className="font-bold text-slate-700">{humanize(issue.recordType)} #{issue.recordId}</p>
                    <p className="text-[10px] text-slate-400">{issue.studentId ?? issue.programme ?? 'Faculty-wide'}</p>
                  </td>
                  <td className="data-td space-x-2">
                    <StatusBadge tone={issue.severity === 'BLOCKING' ? 'danger' : 'warning'}>{issue.severity}</StatusBadge>
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
            <p className="font-bold text-slate-500">Page {data.page} of {pageCount}</p>
            <div className="flex gap-2">
              <PortalButton size="icon" icon={ChevronLeft} title="Previous page" disabled={data.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, data.page - 1) }))} />
              <PortalButton size="icon" icon={ChevronRight} title="Next page" disabled={data.page >= pageCount} onClick={() => setFilters((current) => ({ ...current, page: data.page + 1 }))} />
            </div>
          </div>
        )}
      </section>

      {(previewing || preview) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25" role="dialog" aria-modal="true">
          <button type="button" className="min-w-0 flex-1 cursor-default" aria-label="Close preview" onClick={closePreview} />
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl md:p-7">
            {previewing && !preview ? <LoadingState message="Validating current issue state..." /> : preview && (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Preview current state</p>
                    <h2 className="mt-1 text-lg font-black text-brand-navy">{preview.issue.title}</h2>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{preview.issue.summary}</p>
                  </div>
                  <PortalButton size="icon" variant="ghost" icon={X} title="Close preview" onClick={closePreview} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={preview.issue.severity === 'BLOCKING' ? 'danger' : 'warning'} icon={AlertTriangle}>{preview.issue.severity}</StatusBadge>
                  <StatusBadge tone={preview.issue.repairability === 'REPAIRABLE' ? 'success' : 'info'} icon={preview.issue.repairability === 'REPAIRABLE' ? Wrench : ShieldCheck}>{humanize(preview.issue.repairability)}</StatusBadge>
                </div>

                <section className="rounded-lg border border-slate-200">
                  <h3 className="border-b border-slate-200 px-4 py-3 text-[10px] font-black uppercase text-slate-500">Affected record</h3>
                  <dl className="divide-y divide-slate-100">
                    {Object.entries(preview.issue.currentState).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 px-4 py-3">
                        <dt className="font-bold text-slate-500">{humanize(key)}</dt>
                        <dd className="break-words font-semibold text-slate-700">{stateValue(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {reconciliationRecordRoute(preview.issue.navigation.targetModule, preview.issue.navigation.recordType, preview.issue.navigation.recordId) && (
                  <PortalButton
                    icon={ArrowUpRight}
                    onClick={() => onNavigateToRoute(reconciliationRecordRoute(preview.issue.navigation.targetModule, preview.issue.navigation.recordType, preview.issue.navigation.recordId) as string)}
                  >Open Source Record</PortalButton>
                )}

                {drawerError && <ErrorState message={drawerError} onRetry={() => void openIssue(preview.issue)} />}

                {preview.issue.repairability === 'REPAIRABLE' && preview.allowedResolutions.length > 0 ? (
                  <section className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="h-4 w-4" /><h3 className="font-black">Verified repair available</h3></div>
                    <select className="form-input w-full bg-white" value={selectedResolution?.action ?? ''} onChange={(event) => setSelectedResolution(preview.allowedResolutions.find((item) => item.action === event.target.value) ?? null)}>
                      {preview.allowedResolutions.map((item) => <option key={item.action} value={item.action}>{item.label}</option>)}
                    </select>
                    {selectedResolution?.requiresProgramme && (
                      <select className="form-input w-full bg-white" value={programme} onChange={(event) => setProgramme(event.target.value)}>
                        <option value="">Select managed programme</option>
                        {data?.availableProgrammes.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    )}
                    <textarea className="form-input min-h-24 w-full bg-white" placeholder="Mandatory reason for this repair" value={reason} onChange={(event) => setReason(event.target.value)} />
                    <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-white p-3 font-bold text-slate-700">
                      <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                      <span>I confirm this individual repair after reviewing the current state and affected identifiers.</span>
                    </label>
                    <PortalButton variant="success" icon={Wrench} fullWidth isLoading={saving} disabled={!canApply} onClick={() => void applyRepair()}>Apply Audited Repair</PortalButton>
                  </section>
                ) : (
                  <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 text-blue-800"><ShieldCheck className="h-4 w-4" /><h3 className="font-black">Review required</h3></div>
                    <p className="mt-2 font-semibold leading-5 text-blue-700">Portal repair is unsafe because it could rewrite or merge authoritative history.</p>
                    {preview.issue.dependencies.map((item) => <p key={item} className="mt-2 text-[11px] font-bold text-blue-800">{item}</p>)}
                  </section>
                )}

                <section className="rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3"><History className="h-4 w-4 text-slate-500" /><h3 className="font-black text-brand-navy">Repair audit history</h3></div>
                  {selectedAudits.length === 0 ? <p className="p-4 font-semibold text-slate-400">No prior repair audit for this record.</p> : selectedAudits.map((audit) => (
                    <div key={audit.id} className="border-b border-slate-100 p-4 last:border-0">
                      <div className="flex justify-between gap-3"><p className="font-black text-slate-700">{humanize(audit.action)}</p><time className="text-[10px] font-bold text-slate-400">{new Date(audit.createdAt).toLocaleString('en-MY')}</time></div>
                      <p className="mt-1 font-semibold text-slate-500">{audit.actor.name}: {audit.reason}</p>
                    </div>
                  ))}
                </section>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
