import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { getSupervisorApplication, getSupervisorRequestHistory, acceptSupervisorApplication, rejectSupervisorApplication } from '../services/appointmentsApi';
import { getSupervisoryWorkspace, decideCoSupervisor } from '../services/coSupervisionApi';
import type { SupervisorRequest, SupervisorRequestHistoryRow, SupervisorApplicationRecord, SupervisorWorkloadSummary } from '../types';
import type { SupervisoryWorkspace, CoSupervisorAction } from '../types/coSupervision';
import { appointmentRequestRows, requestCalendarDay, requestGroup, requestStatusLabel, type LecturerAppointmentRow, type RequestGroup } from '../utils/lecturerRequests';
import { formatMalaysiaDate } from '../utils/malaysiaDateTime';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { RequestViewSwitch, RequestFilters, RequestGroupSection, WorkspaceSectionHeader, WorkspaceRecordTable, WorkspaceRequestReference, WorkspacePagination, workspacePageSize } from './RequestWorkspacePrimitives';
import { RecordPage } from './RecordPage';
import { SupervisorDocumentsList } from './SupervisorDocumentsList';
import { CoSupervisorAppointmentCard } from './SupervisoryTeamManagement';
import { AppointmentSummaryCard } from './AppointmentPrimitives';
import { capacityStateLabel } from '../utils/lecturerCapacity';

const groups: RequestGroup[] = ['review', 'coordinator', 'other'];
const EMPTY_WORKSPACE: SupervisoryWorkspace = { teams: [], nominations: [], appointments: [] };

export function LecturerAppointmentRequestList({ rows, history, onOpen }: { rows: LecturerAppointmentRow[]; history: boolean; onOpen: (row: LecturerAppointmentRow) => void }) {
  return <div className="space-y-6">{(history ? ['history'] as const : groups).map(group => {
    const selected = rows.filter(row => requestGroup(row.status, row.canDecide) === group);
    return selected.length ? <RequestGroupSection key={group} group={group} count={selected.length}><WorkspaceRecordTable label="Appointment request records" rows={selected.map(row => ({
      key: row.key, studentName: row.studentName, matricNo: row.matricNo,
      kind: row.kind === 'primary' ? 'Primary supervisor' : 'Supporting supervisor', submittedAt: row.submittedAt,
      status: requestStatusLabel(row.status, row.canDecide), waitingDays: row.waitingDays, waitingApplicable: group !== 'history',
      actionLabel: group === 'review' ? 'Review request' : 'View request', onOpen: () => onOpen(row),
    }))} /></RequestGroupSection> : null;
  })}</div>;
}

export function LecturerAppointmentRequests({ primaryRequests, primaryLoading, primaryError, refreshVersion, historyRoute = false, onChanged, initialApplicationId, initialSupportingId, onCloseRoute, onNavigateToRequest, backLabel = 'Back to Appointment requests', workload = null, onNavigateToDossier, onBusyChange }: {
  primaryRequests: SupervisorRequest[]; primaryLoading: boolean; primaryError: string | null; refreshVersion: number; historyRoute?: boolean; onChanged: () => Promise<unknown>;
  initialApplicationId?: string; initialSupportingId?: string; onCloseRoute?: () => void;
  onNavigateToRequest?: (id: string, kind: 'primary' | 'supporting') => void; backLabel?: string;
  workload?: SupervisorWorkloadSummary | null;
  onNavigateToDossier?: (studentId: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const view = params.get('view') === 'history' || (historyRoute && !params.has('view')) ? 'history' : 'requests';
  const search = params.get('q') ?? '';
  const type = params.get('type') ?? 'all';
  const status = params.get('status') ?? '';
  const semester = params.get('semester') ?? '';
  const from = params.get('from') ?? '';
  const pageSize = workspacePageSize(params.get('size'));
  const setFilter = (key: string, value: string, replace = true) => setParams(current => {
    const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); next.delete('page'); return next;
  }, { replace });
  const [workspace, setWorkspace] = useState(EMPTY_WORKSPACE);
  const [history, setHistory] = useState<SupervisorRequestHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LecturerAppointmentRow | null>(null);
  const [detail, setDetail] = useState<SupervisorApplicationRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [action, setAction] = useState<CoSupervisorAction | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { onBusyChange?.(loading || primaryLoading || busy); }, [onBusyChange, loading, primaryLoading, busy]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  const [notice, setNotice] = useState<string | null>(null);
  const loadVersion = useRef(0);
  const detailVersion = useRef(0);
  const openedRoute = useRef('');
  const mutation = useRef(false);
  const navigationComplete = useRef(false);
  const mounted = useRef(false);
  const scope = `${location.pathname}:${location.search}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const load = useCallback(async () => {
    const token = ++loadVersion.current; setLoading(true); setError(null);
    try { const [records, teams] = await Promise.all([getSupervisorRequestHistory(), getSupervisoryWorkspace()]); if (token === loadVersion.current) { setHistory(records); setWorkspace(teams); } }
    catch (failure) { if (token === loadVersion.current) { setError(failure instanceof Error ? failure.message : 'Requests could not be loaded.'); setHistory([]); setWorkspace(EMPTY_WORKSPACE); } }
    finally { if (token === loadVersion.current) setLoading(false); }
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; detailVersion.current += 1; }; }, []);
  useEffect(() => { void load(); return () => { loadVersion.current += 1; }; }, [load, refreshVersion]);
  const close = () => { detailVersion.current += 1; setSelected(null); setDetail(null); setAction(null); setReason(''); };
  const closePanel = () => { close(); if (initialApplicationId || initialSupportingId) onCloseRoute?.(); };
  useEffect(() => { close(); }, [scope]);
  const open = useCallback(async (row: LecturerAppointmentRow) => {
    const token = ++detailVersion.current; const openedScope = scopeRef.current;
    navigationComplete.current = false;
    setSelected(row); setDetail(null); setDetailError(null); setAction(null); setReason('');
    setDetailLoading(true);
    try {
      if (row.kind === 'supporting') {
        const teams = await getSupervisoryWorkspace();
        const current = appointmentRequestRows([], [], teams).find(record => record.key === row.key);
        if (!current) throw new Error('This request is no longer available. Refresh the request list.');
        if (token === detailVersion.current && openedScope === scopeRef.current) setSelected(current);
      } else {
        const record = await getSupervisorApplication(row.id);
        if (token === detailVersion.current && openedScope === scopeRef.current) setDetail(record);
      }
    }
    catch (failure) { if (token === detailVersion.current && openedScope === scopeRef.current) setDetailError(failure instanceof Error ? failure.message : 'Request details could not be loaded.'); }
    finally { if (token === detailVersion.current) setDetailLoading(false); }
  }, []);
  const decide = async () => {
    if (!selected || !action || mutation.current || (!['accept', 'approve'].includes(action) && !reason.trim())) return;
    mutation.current = true; setBusy(true); setDetailError(null);
    const operationScope = scopeRef.current;
    const operationToken = detailVersion.current;
    try {
      if (selected.kind === 'primary') { if (action === 'accept') await acceptSupervisorApplication(selected.id); else await rejectSupervisorApplication(selected.id, reason.trim()); }
      else await decideCoSupervisor(Number(selected.id), action as CoSupervisorAction, reason.trim());
      if (mounted.current) { await Promise.all([load(), onChanged()]); if (scopeRef.current === operationScope && detailVersion.current === operationToken) { navigationComplete.current = true; closePanel(); setNotice(action === 'accept' ? 'Request accepted and forwarded to the Programme Coordinator.' : action === 'approve' ? 'Supporting appointment approved.' : action === 'cancel' ? 'Nomination cancelled.' : 'Request rejected.'); } }
    } catch (failure) { if (mounted.current && scopeRef.current === operationScope && detailVersion.current === operationToken) { setDetailError(failure instanceof Error ? failure.message : 'The decision could not be saved.'); setAction(null); await Promise.all([load(), onChanged()]); } }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  const rows = appointmentRequestRows(primaryRequests, history, workspace);
  useEffect(() => {
    const id = initialApplicationId ?? initialSupportingId;
    const kind = initialSupportingId ? 'supporting' : 'primary';
    const routeKey = `${kind}:${id}:${scope}`;
    if (!id || loading || primaryLoading || openedRoute.current === routeKey) return;
    openedRoute.current = routeKey;
    const row = appointmentRequestRows(primaryRequests, history, workspace).find(record => record.kind === kind && String(record.id) === id)
      ?? { key: `${kind}-${id}`, kind, id, studentName: 'Request details', matricNo: '', status: '', submittedAt: '', programme: '', semester: '', title: '', canDecide: false };
    void open(row);
  }, [initialApplicationId, initialSupportingId, loading, primaryLoading, primaryRequests, history, workspace, open, scope]);
  const reviewCount = rows.filter(row => requestGroup(row.status, row.canDecide) === 'review').length;
  const coordinatorCount = rows.filter(row => requestGroup(row.status, row.canDecide) === 'coordinator').length;
  const visible = rows.filter(row => (requestGroup(row.status, row.canDecide) === 'history') === (view === 'history')
    && (type === 'all' || row.kind === type) && (!status || row.status === status) && (!semester || row.semester === semester)
    && (!from || requestCalendarDay(row.submittedAt) >= from)
    && `${row.studentName} ${row.matricNo} ${row.title} ${row.id} SV-REQ-${String(row.id).padStart(5, '0')} ${row.nomination?.candidate.name ?? ''} ${row.nomination?.nominator.name ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  if (view === 'history') visible.reverse();
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const requestedPage = Number(params.get('page'));
  const page = Math.min(pageCount, Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  const appointments = [...new Map([...workspace.appointments, ...workspace.teams.flatMap(team => team.appointments)].filter(row => row.status === 'ENDED').map(row => [row.id, row])).values()];
  const panelRow = selected?.nomination;
  const canReviewPrimary = detail?.status === 'SUBMITTED_TO_SUPERVISOR' && detail.participantEligible !== false;
  const audit = detail?.workflow ?? panelRow?.history.map(event => ({ ...event, actorName: event.actor, actorRole: '' })) ?? [];
  const loadError = primaryError ?? error;
  if (initialApplicationId || initialSupportingId || selected) return <RecordPage navigationComplete={navigationComplete} title="Appointment request" backLabel={backLabel} onBack={closePanel}
    pageKey={initialApplicationId || initialSupportingId ? undefined : `supervisor-request:${selected?.key}`}
    dirty={!!action && !!reason.trim()} busy={busy}>
    {selected ? <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <WorkspaceRequestReference key={selected.key} reference={selected.kind === 'primary' ? `SV-REQ-${String(selected.id).padStart(5, '0')}` : `Supporting request #${selected.id}`} />
      <div className="space-y-1"><h3 className="section-label">{detail?.studentName ?? selected.studentName}</h3><p className="card-description">{detail?.studentId ?? selected.matricNo}</p>{detail?.status || selected.status ? <StatusBadge tone={requestGroup(detail?.status ?? selected.status, false) === 'history' ? 'neutral' : 'warning'}>{requestStatusLabel(detail?.status ?? selected.status)}</StatusBadge> : null}</div>
      <p className="card-description">Programme: {detail?.programme || selected.programme || 'Not recorded'} · Submitted {formatMalaysiaDate(selected.submittedAt)}</p>
      {detailLoading ? <LoadingState message="Loading request details…" /> : <>
        {detailError ? <ErrorState message={detailError} onRetry={() => void open(selected)} /> : null}
        {detail && onNavigateToDossier ? <PortalButton size="sm" variant="secondary" onClick={() => onNavigateToDossier(detail.studentId)}>View student record</PortalButton> : null}
        {detail || panelRow ? <>
          {detail ? <><div className="space-y-2"><h4 className="card-value">Submitted research</h4><p className="card-value">{detail.researchTitle}</p><p className="card-description">{detail.researchArea || 'Research area not recorded'}</p><p className="card-description whitespace-pre-wrap">{detail.researchAbstract}</p></div>{detail.replacementReason ? <p className="card-description">Replacement reason: {detail.replacementReason}</p> : null}<SupervisorDocumentsList applicationId={detail.id} documents={detail.documents ?? []} compact /></> : panelRow ? <div className="space-y-2"><p className="card-value">Supporting supervisor: {panelRow.candidate.name}</p><p className="card-description">Nominated by {panelRow.nominator.name}{panelRow.replacesAppointmentId ? ' · Replacement nomination' : ''}</p><p className="card-description whitespace-pre-wrap">{panelRow.justification}</p></div> : null}
          {(detail?.waitingDays ?? panelRow?.waitingDays) != null && requestGroup(detail?.status ?? panelRow!.status, false) !== 'history' ? <dl className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2"><div><dt className="card-label">Current stage</dt><dd className="card-value mt-1">{requestStatusLabel(detail?.status ?? panelRow!.status)}</dd></div><div><dt className="card-label">Waiting at this stage</dt><dd className="card-value mt-1">{detail?.waitingDays ?? panelRow?.waitingDays} calendar {(detail?.waitingDays ?? panelRow?.waitingDays) === 1 ? 'day' : 'days'}</dd></div></dl> : null}
          <div className="space-y-3"><h4 className="section-label">Recorded progress</h4><p className="card-description">Submitted {formatMalaysiaDate(detail?.submittedAt ?? panelRow!.submittedAt)}</p><ol className="space-y-3 border-l border-slate-200 pl-3">{audit.map(event => <li key={event.id}><p className="card-value">{requestStatusLabel(event.newStatus)}</p><p className="card-description">{event.actorName} · {formatMalaysiaDate(event.createdAt)}</p>{event.reason ? <p className="card-description whitespace-pre-wrap">{event.reason}</p> : null}</li>)}</ol></div>
          {detail?.participantEligible === false ? <p className="card-description">This Student is currently ineligible for a decision.</p> : null}
          {!detailError && (canReviewPrimary || panelRow?.allowedActions.length) ? <div className="flex flex-wrap gap-2">{(canReviewPrimary ? ['accept', 'reject'] as const : panelRow!.allowedActions).map(value => <PortalButton key={value} size="sm" variant={['accept', 'approve'].includes(value) ? 'primary' : 'secondary'} disabled={busy} onClick={() => { setAction(value as typeof action); setReason(''); }}>{value === 'accept' ? 'Accept request' : value === 'approve' ? 'Approve request' : value === 'cancel' ? 'Cancel nomination' : 'Reject request'}</PortalButton>)}</div> : null}
          {action ? <form className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4" onSubmit={event => { event.preventDefault(); void decide(); }}><h4 className="card-value">Confirm {action === 'cancel' ? 'cancellation' : action === 'approve' ? 'approval' : action === 'accept' ? 'acceptance' : 'rejection'}</h4>{['accept', 'approve'].includes(action) ? <p className="card-description">{action === 'accept' ? 'Acceptance forwards this request to the Programme Coordinator for final approval.' : 'Approval confirms the supporting appointment after eligibility checks.'}</p> : <label className="form-label block">Reason<textarea required className="form-control form-control-sm mt-1" value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>}<div className="flex gap-2"><PortalButton type="submit" size="sm" variant="primary" isLoading={busy}>Confirm decision</PortalButton><PortalButton size="sm" disabled={busy} onClick={() => setAction(null)}>Cancel</PortalButton></div></form> : null}
        </> : null}
      </>}
    </section> : loadError ? <ErrorState message={loadError} onRetry={() => { void load(); void onChanged(); }} /> : <LoadingState message="Loading request details…" />}
  </RecordPage>;
  return <div className="space-y-5">
    {view === 'requests' && !loading && !primaryLoading && !loadError && workload ? <div className="grid gap-4 md:grid-cols-3">
      <AppointmentSummaryCard title="Supervisory load" value="" description={`${workload.semesterCode ?? 'No active semester'}${workload.capacityPlanVersion ? ` · Plan v${workload.capacityPlanVersion}` : ' · Plan not configured'}${workload.capacityState === 'TEMPORARILY_UNAVAILABLE' && workload.unavailableUntil ? ` · Unavailable until ${formatMalaysiaDate(workload.unavailableUntil)}` : ''}`} badge={workload.capacityState ? capacityStateLabel(workload.capacityState) : 'Not configured'} tone={workload.selectable ? 'success' : 'warning'} progress={{ current: workload.currentStudents, max: workload.workloadLimit }} />
      <AppointmentSummaryCard title="Needs your review" value={String(reviewCount)} description="Primary and supporting requests needing your decision." tone={reviewCount ? 'warning' : 'success'} />
      <AppointmentSummaryCard title="Awaiting Coordinator" value={String(coordinatorCount)} description="Ongoing requests you can follow while final approval is pending." tone="info" />
    </div> : null}
    <section aria-label="Appointment requests" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <WorkspaceSectionHeader title="Appointment requests" description="Review supervision requests and follow their recorded progress and outcomes." actions={<RequestViewSwitch view={view} reviewCount={loading || primaryLoading || loadError ? 0 : reviewCount} onChange={value => setFilter('view', value, false)} />} />
    {notice ? <p role="status" className="card-description rounded-lg bg-slate-50 p-3">{notice}</p> : null}
    {loading || primaryLoading ? <LoadingState message="Loading appointment requests…" /> : loadError ? <ErrorState message={loadError} onRetry={() => { void load(); void onChanged(); }} /> : <>
      {view === 'history' ? <p className="card-description">{rows.filter(row => requestGroup(row.status, row.canDecide) === 'history').length} final request outcomes</p> : null}
      <RequestFilters search={search} onSearch={value => setFilter('q', value)} type={type} onType={value => setFilter('type', value)} status={status} statuses={[...new Set(rows.map(row => row.status))]} onStatus={value => setFilter('status', value)} semester={semester} semesters={[...new Set(rows.map(row => row.semester).filter(Boolean))]} onSemester={value => setFilter('semester', value)} from={from} onFrom={value => setFilter('from', value)} />
      {visible.length ? <LecturerAppointmentRequestList rows={visible.slice((page - 1) * pageSize, page * pageSize)} history={view === 'history'} onOpen={row => onNavigateToRequest ? onNavigateToRequest(String(row.id), row.kind) : void open(row)} /> : <p className="card-description rounded-lg bg-slate-50 p-4">{search || type !== 'all' || status || semester || from ? 'No matching requests. Adjust the filters to see more records.' : view === 'history' ? 'No final request outcomes yet.' : 'No ongoing appointment requests.'}</p>}
      <WorkspacePagination page={page} pageCount={pageCount} total={visible.length} noun="requests" pageSize={pageSize} onPageSize={value => setFilter('size', String(value))} onPage={value => setParams(current => { const next = new URLSearchParams(current); next.set('page', String(value)); return next; })} />
      {view === 'history' && appointments.length ? <details className="border-t border-slate-200 pt-4"><summary className="card-value cursor-pointer">Supporting appointment activity ({appointments.length})</summary><p className="card-description mt-2">Recorded appointment endings and replacements, separate from request decisions.</p><div className="mt-3 space-y-3">{appointments.map(row => <CoSupervisorAppointmentCard key={row.id} appointment={{ ...row, canEnd: false }} busy={false} canReplace={false} onEnd={() => {}} onReplace={() => {}} />)}</div></details> : null}
    </>}

  </section></div>;
}
