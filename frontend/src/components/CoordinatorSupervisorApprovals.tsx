import { RecordPage } from './RecordPage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, RefreshCw, Send, XCircle } from 'lucide-react';
import {
  ApiError,
  approveSupervisorApplicationByCoordinator,
  formatSupervisorWaiting,
  getCoordinatorSupervisorRecords,
  getCoordinatorSupervisorHistory,
  getSupervisorApplication,
  getCoordinatorSupervisorQueue,
  orderSupervisorQueueOldestFirst,
  rejectSupervisorApplicationByCoordinator,
  endSupervisorAppointment,
} from '../services';
import { type AppointmentEndOutcome, type SupervisorApplicationRecord } from '../types';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import { WorkflowAuditLog } from './WorkflowAuditLog';
import { SupervisorDocumentsList } from './SupervisorDocumentsList';
import { AppointmentEndControl } from './AppointmentEndControl';
import { CoSupervisorNominationCard, SupervisoryTeamManagement } from './SupervisoryTeamManagement';
import { decideCoSupervisor, getSupervisoryWorkspace } from '../services/coSupervisionApi';
import type { CoSupervisorAction, CoSupervisorNomination } from '../types/coSupervision';
import { requestGroup, requestStatusLabel, requestWaitingDays } from '../utils/lecturerRequests';
import { RequestViewSwitch, RequestFilters, WorkspaceSectionHeader, WorkspaceRecordTable, WorkspacePagination, workspacePageSize, type RequestListView } from './RequestWorkspacePrimitives';
import { SupervisorWorkspaceNavigation } from './SupervisorWorkspaceNavigation';
import { useListState } from './ListState';
import { CapacityReassessments } from './CapacityReassessments';

type CoordinatorRequestRow = { key: string; id: number; kind: 'primary' | 'supporting'; studentName: string; matricNo: string; status: string; submittedAt: string; waitingDays: number | null; canDecide: boolean; searchText: string };
function coordinatorRequestRows(queue: SupervisorApplicationRecord[], history: SupervisorApplicationRecord[], nominations: CoSupervisorNomination[]): CoordinatorRequestRow[] {
  return [...new Map<string, CoordinatorRequestRow>([
    ...[...queue, ...history].map(record => [`primary-${record.id}`, {
      key: `primary-${record.id}`, id: record.id, kind: 'primary' as const, studentName: record.studentName, matricNo: record.studentId,
      status: record.status, submittedAt: record.submittedAt, waitingDays: record.waitingDays ?? requestWaitingDays(record.waitingSince || record.supervisorDecisionAt || record.submittedAt),
      canDecide: record.status === 'PENDING_COORDINATOR' && record.participantEligible !== false,
      searchText: `${record.studentName} ${record.studentId} ${record.proposedSupervisor} ${record.researchTitle} ${record.id} SV-REQ-${String(record.id).padStart(5, '0')}`,
    }] as const),
    ...nominations.map(record => [`supporting-${record.id}`, {
      key: `supporting-${record.id}`, id: record.id, kind: 'supporting' as const, studentName: record.studentName, matricNo: record.matricNo,
      status: record.status, submittedAt: record.submittedAt, waitingDays: record.waitingDays ?? requestWaitingDays(record.waitingSince || record.submittedAt),
      canDecide: record.allowedActions.some(action => action !== 'cancel'),
      searchText: `${record.studentName} ${record.matricNo} ${record.candidate.name} ${record.nominator.name} ${record.justification} ${record.id}`,
    }] as const),
  ]).values()].sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt));
}

export function CoordinatorAppointmentRequestList({ queue, history, nominations, view, search = '', type = 'all', status = '', page = 1, pageSize: requestedSize = 10, onOpen,
  onView = () => {}, onSearch = () => {}, onType = () => {}, onStatus = () => {}, onPage = () => {}, onPageSize = () => {}, disabled = false,
}: {
  queue: SupervisorApplicationRecord[]; history: SupervisorApplicationRecord[]; nominations: CoSupervisorNomination[];
  view: RequestListView; search?: string; type?: string; status?: string; page?: number; pageSize?: number; disabled?: boolean;
  onOpen: (id: number, kind: 'primary' | 'supporting') => void; onView?: (view: RequestListView) => void; onSearch?: (value: string) => void;
  onType?: (value: string) => void; onStatus?: (value: string) => void; onPage?: (value: number) => void; onPageSize?: (value: number) => void;
}) {
  const all = coordinatorRequestRows(queue, history, nominations);
  const partition = all.filter(row => (requestGroup(row.status, row.canDecide) === 'history') === (view === 'history'));
  const visible = partition.filter(row => (type === 'all' || row.kind === type) && (!status || row.status === status) && row.searchText.toLowerCase().includes(search.trim().toLowerCase()));
  if (view === 'history') visible.reverse();
  const size = workspacePageSize(requestedSize), pageCount = Math.max(1, Math.ceil(visible.length / size));
  const currentPage = Math.max(1, Math.min(page, pageCount));
  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
    <WorkspaceSectionHeader title="Appointment requests" description="Review primary and supporting requests in your managed programmes, or view their final outcomes."
      actions={<RequestViewSwitch view={view} reviewCount={all.filter(row => row.canDecide).length} onChange={onView} />} />
    <RequestFilters search={search} onSearch={onSearch} type={type} onType={onType} status={status} onStatus={onStatus} statuses={[...new Set(partition.map(row => row.status))]} />
    {visible.length ? <WorkspaceRecordTable label="Coordinator appointment request records" rows={visible.slice((currentPage - 1) * size, currentPage * size).map(row => ({
      key: row.key, studentName: row.studentName, matricNo: row.matricNo, kind: row.kind === 'primary' ? 'Primary supervisor' : 'Supporting supervisor',
      submittedAt: row.submittedAt, status: requestStatusLabel(row.status, row.canDecide), waitingDays: row.waitingDays, waitingApplicable: view !== 'history',
      actionLabel: row.canDecide ? 'Review request' : 'View request', onOpen: () => onOpen(row.id, row.kind), disabled,
      actionAriaLabel: `${row.canDecide ? 'Review' : 'View'} ${row.kind} request for ${row.studentName}`,
    }))} /> : <p className="card-description py-6 text-center">{search || status || type !== 'all' ? 'No matching requests.' : view === 'history' ? 'No final request outcomes are recorded.' : 'No ongoing appointment requests.'}</p>}
    <WorkspacePagination page={currentPage} pageCount={pageCount} total={visible.length} noun="requests" pageSize={size} onPage={onPage} onPageSize={onPageSize} />
  </section>;
}

export function CoordinatorAppointmentLifecycleRecords({ records, detail = false, onOpen, onNavigateToDossier, onEnd }: {
  records: SupervisorApplicationRecord[]; detail?: boolean; onOpen: (id: number) => void;
  onNavigateToDossier?: (matricNo: string) => void;
  onEnd: (record: SupervisorApplicationRecord, outcome: Exclude<AppointmentEndOutcome, 'REPLACED'>, reason: string) => Promise<void>;
}) {
  return <section className="space-y-4">
    <WorkspaceSectionHeader title="Programme Appointment Records" description="Active and ended Supervisor appointments in your managed programme." />
    {records.length ? <div className="space-y-3">{records.map(record => <div key={record.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div><div className="flex items-center gap-2 flex-wrap"><p className="card-value text-brand-navy">{record.studentName}</p>
        <StatusBadge tone={record.appointmentLifecycle?.status === 'ACTIVE' ? 'success' : 'neutral'}>{record.appointmentLifecycle?.status === 'ACTIVE' ? 'Active' : record.appointmentLifecycle?.endOutcome || 'Ended'}</StatusBadge></div>
        <p className="card-description mt-1">{record.studentId} · {record.proposedSupervisor}</p>
        {record.appointmentLifecycle?.endReason ? <p className="card-description mt-2">{record.appointmentLifecycle.endReason}</p> : null}</div>
      <div className="flex flex-wrap gap-2">{detail ? <><PortalButton variant="ghost" onClick={() => onNavigateToDossier?.(record.studentId)}>View student record</PortalButton>
        {record.appointmentLifecycle?.status === 'ACTIVE' ? <AppointmentEndControl label="Supervisor appointment" onSubmit={(outcome, reason) => onEnd(record, outcome, reason)} /> : null}</>
        : <PortalButton onClick={() => onOpen(record.id)}>View appointment</PortalButton>}</div>
    </div>)}</div> : <p className="card-description rounded-xl border border-slate-200 bg-white p-6">No approved Supervisor appointments are recorded for this programme.</p>}
  </section>;
}

export function CoordinatorApplicationLifecycle({ record, onNavigateToDossier, onEnd }: {
  record: SupervisorApplicationRecord; onNavigateToDossier?: (matricNo: string) => void;
  onEnd: React.ComponentProps<typeof CoordinatorAppointmentLifecycleRecords>['onEnd'];
}) {
  return record.status === 'APPROVED' && record.appointmentLifecycle ? <CoordinatorAppointmentLifecycleRecords
    records={[record]} detail onOpen={() => {}} onNavigateToDossier={onNavigateToDossier} onEnd={onEnd} /> : null;
}

interface CoordinatorSupervisorApprovalsProps {
  initialApplicationId?: string;
  initialSupportingId?: string;
  workspaceView?: 'requests' | 'teams';
  refreshVersion?: number;
  showHeader?: boolean;
  onBusyChange?: (busy: boolean) => void;
  routeTeamStudentId?: string;
  onNavigateToTeam?: (matricNo: string) => void;
  onNavigateToSupportingRequest?: (id: string) => void;
  onNavigateToList?: () => void;
  onNavigateToApplication?: (id: string) => void;
  onNavigateToDossier?: (studentId: string) => void;
  backLabel?: string;
}

export const CoordinatorSupervisorApprovals: React.FC<CoordinatorSupervisorApprovalsProps> = ({
  initialApplicationId,
  initialSupportingId,
  workspaceView = 'requests',
  refreshVersion = 0,
  showHeader = true,
  onBusyChange,
  routeTeamStudentId,
  onNavigateToTeam,
  onNavigateToSupportingRequest,
  onNavigateToList = () => {},
  onNavigateToApplication,
  onNavigateToDossier,
  backLabel = 'Back to Appointment requests',
}) => {
  const [records, setRecords] = useState<SupervisorApplicationRecord[]>([]);
  const [appointmentRecords, setAppointmentRecords] = useState<SupervisorApplicationRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<SupervisorApplicationRecord[]>([]);
  const [nominations, setNominations] = useState<CoSupervisorNomination[]>([]);
  const [localApplicationId, setLocalApplicationId] = useState<string>();
  const [localSupportingId, setLocalSupportingId] = useState<string>();
  const [localAppointmentId, setLocalAppointmentId] = useState<number>();
  const applicationId = initialApplicationId ?? localApplicationId;
  const supportingId = initialSupportingId ?? localSupportingId;
  const [supportingAction, setSupportingAction] = useState<CoSupervisorAction | null>(null);
  const [supportingReason, setSupportingReason] = useState('');
  const [teamBusy, setTeamBusy] = useState(false);
  const [capacityBusy, setCapacityBusy] = useState(false);
  const [view, setView] = useListState<RequestListView>('coordinator-supervisor', 'view', 'requests');
  const [search, setSearch] = useListState('coordinator-supervisor', 'search', '');
  const [type, setType] = useListState('coordinator-supervisor', 'type', 'all');
  const [status, setStatus] = useListState('coordinator-supervisor', 'status', '');
  const [page, setPage] = useListState('coordinator-supervisor', 'page', 1);
  const [pageSize, setPageSize] = useListState('coordinator-supervisor', 'size', 10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectingRecordId, setRejectingRecordId] = useState<number | string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selected, setSelected] = useState<SupervisorApplicationRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [teamRefreshVersion, setTeamRefreshVersion] = useState(0);
  const recordsVersion = useRef(0);

  const loadRecords = useCallback(async () => {
    const version = ++recordsVersion.current;
    setLoading(true);
    setError(null);
    try {
      const [queue, appointments, history, workspace, detail] = await Promise.all([
        getCoordinatorSupervisorQueue(),
        getCoordinatorSupervisorRecords(),
        getCoordinatorSupervisorHistory(),
        getSupervisoryWorkspace(),
        applicationId ? getSupervisorApplication(applicationId) : Promise.resolve(null),
      ]);
      if (version === recordsVersion.current) {
        setRecords(orderSupervisorQueueOldestFirst(queue));
        setAppointmentRecords(appointments);
        setHistoryRecords(history);
        setNominations([...new Map([...workspace.nominations, ...workspace.teams.flatMap(team => team.nominations)].map(row => [row.id, row])).values()]);
        setSelected(detail);
      }
    } catch (reason) {
      if (version === recordsVersion.current) setError(
        reason instanceof Error ? reason.message : 'Failed to load supervisor approvals.',
      );
    } finally {
      if (version === recordsVersion.current) setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadRecords();
    return () => { recordsVersion.current += 1; };
  }, [loadRecords, refreshVersion, supportingId, workspaceView, routeTeamStudentId]);

  useEffect(() => { setRejectingRecordId(null); setRejectionReason(''); setSupportingAction(null); setSupportingReason(''); }, [applicationId, supportingId]);
  const workspaceBusy = loading || busy || teamBusy || capacityBusy || !!rejectionReason.trim() || !!supportingReason.trim();
  useEffect(() => { onBusyChange?.(workspaceBusy); }, [onBusyChange, workspaceBusy]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const approve = async (record: SupervisorApplicationRecord) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const approved = await approveSupervisorApplicationByCoordinator(record.id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      void loadRecords();
      setTeamRefreshVersion((current) => current + 1);
      if (String(rejectingRecordId) === String(record.id)) {
        setRejectingRecordId(null);
        setRejectionReason('');
      }
      notify(
        approved.researchProfileReady
          ? `Supervisor appointment approved for ${record.studentName}. The research profile is ready for Panel recommendation.`
          : `Supervisor appointment approved for ${record.studentName}.`,
      );
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Approval failed.');
      if (reason instanceof ApiError && reason.status === 409) void loadRecords();
    } finally { busyRef.current = false; setBusy(false); }
  };

  const reject = async (record: SupervisorApplicationRecord) => {
    if (!rejectionReason.trim()) {
      notify('A rejection reason is required.');
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      await rejectSupervisorApplicationByCoordinator(record.id, rejectionReason.trim());
      setRecords((current) => current.filter((item) => item.id !== record.id));
      void loadRecords();
      setRejectingRecordId(null);
      setRejectionReason('');
      notify(`Supervisor appointment returned for ${record.studentName}.`);
    } catch (failure) {
      notify(failure instanceof Error ? failure.message : 'Rejection failed.');
    } finally { busyRef.current = false; setBusy(false); }
  };

  const supporting = nominations.find(row => String(row.id) === supportingId);
  const decideSupporting = async () => {
    if (!supporting || !supportingAction || !supporting.allowedActions.includes(supportingAction) || busyRef.current
      || (!['approve', 'accept'].includes(supportingAction) && !supportingReason.trim())) return;
    busyRef.current = true; setBusy(true);
    try {
      await decideCoSupervisor(supporting.id, supportingAction, supportingReason.trim());
      setSupportingAction(null); setSupportingReason('');
      await loadRecords(); setTeamRefreshVersion(current => current + 1);
      notify('Supporting supervisor request updated.');
    } catch (failure) {
      notify(failure instanceof Error ? failure.message : 'The decision could not be saved.');
      if (failure instanceof ApiError && failure.status === 409) { setSupportingAction(null); await loadRecords(); }
    } finally { busyRef.current = false; setBusy(false); }
  };
  const closeRecord = () => { setRejectingRecordId(null); setRejectionReason(''); setSupportingAction(null); setSupportingReason(''); setLocalApplicationId(undefined); setLocalSupportingId(undefined); onNavigateToList(); };
  const visibleRecords = selected ? [selected] : [];
  const requestContent = <>      {loading ? (
        <LoadingState message="Loading supervisor approvals…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadRecords} />
      ) : visibleRecords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-3" />
          <h2 className="section-label">No pending supervisor approvals</h2>
          <p className="card-description mt-2">
            Accepted lecturer requests will appear here for final confirmation.
          </p>
        </div>
      ) : (
        <fieldset disabled={busy} className="space-y-4">
          {visibleRecords.map((record) => {
            const pending = records.some(item => String(item.id) === String(record.id));
            const isRejecting = String(rejectingRecordId) === String(record.id);

            return (
              <div
                key={record.id}
                className={`bg-white border rounded-2xl p-6 shadow-3xs ${
                  String(record.id) === String(initialApplicationId)
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : 'border-slate-200'
                }`}
              >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="section-label">{record.studentName}</h2>
                    <StatusBadge tone={pending ? 'warning' : 'neutral'}>{pending ? 'Awaiting Coordinator approval' : record.status.replaceAll('_', ' ')}</StatusBadge>
                  </div>
                  <p className="card-description">
                    {record.studentId} · {record.programme}
                  </p>
                  <p className="card-value text-slate-700">{record.researchTitle}</p>
                  <p className="card-description">
                    Research area: <strong className="card-value">{record.researchArea || 'Not recorded'}</strong>
                  </p>
                  <p className="card-description">
                    Proposed supervisor: <strong className="card-value">{record.proposedSupervisor}</strong>
                  </p>
                  {record.unavailableUntil && (
                    <p className="card-description text-amber-700">
                      Unavailable for new appointments until {record.unavailableUntil}. This pending approval remains recorded.
                    </p>
                  )}
                  <p className="card-description text-amber-700">
                    {formatSupervisorWaiting(record)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <PortalButton
                    variant="ghost"
                    onClick={() => onNavigateToDossier?.(record.studentId)}
                  >
                    View student record
                  </PortalButton>
                  {pending && <>
                  <PortalButton
                    variant="secondary"
                    icon={XCircle}
                    disabled={busy || record.participantEligible === false}
                    onClick={() => {
                      setRejectingRecordId(isRejecting ? null : record.id);
                      setRejectionReason('');
                    }}
                  >
                    {isRejecting ? 'Cancel' : 'Reject'}
                  </PortalButton>
                  <PortalButton
                    variant="primary"
                    icon={Clock3}
                    disabled={busy || isRejecting || record.participantEligible === false}
                    onClick={() => approve(record)}
                  >
                    Approve
                  </PortalButton>
                  </>}
                </div>
              </div>
              {record.participantEligible === false && (
                <p className="card-description mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  This Student is {record.participantLifecycleStatus?.toLowerCase()}; the approval remains visible but is non-actionable until eligible.
                </p>
              )}
              {record.rejectionReason ? <p className="card-description mt-3 whitespace-pre-wrap">Decision reason: {record.rejectionReason}</p> : null}
              {record.cancellationReason ? <p className="card-description mt-3 whitespace-pre-wrap">Cancellation reason: {record.cancellationReason}</p> : null}
              {pending && isRejecting && (
                <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/70 p-4">
                  <label
                    htmlFor={`coordinator-supervisor-rejection-${record.id}`}
                    className="form-label text-rose-700"
                  >
                    Rejection reason
                  </label>
                  <textarea
                    id={`coordinator-supervisor-rejection-${record.id}`}
                    disabled={busy} value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    placeholder="Explain why this supervisor appointment is being returned."
                  />
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <PortalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRejectingRecordId(null);
                        setRejectionReason('');
                      }}
                    >
                      Cancel
                    </PortalButton>
                    <PortalButton
                      variant="dangerSolid"
                      size="sm"
                      icon={Send}
                      disabled={busy}
                      onClick={() => reject(record)}
                    >
                      Submit Rejection
                    </PortalButton>
                  </div>
                </div>
              )}
              <div className="mt-4">
                <SupervisorDocumentsList
                  applicationId={record.id}
                  documents={record.documents}
                  compact
                />
              </div>
              <div className="mt-4">
                <WorkflowAuditLog events={record.workflow} />
              </div>
            </div>
            );
          })}
        </fieldset>
      )}
</>;
  const endPrimaryAppointment: React.ComponentProps<typeof CoordinatorAppointmentLifecycleRecords>['onEnd'] = async (record, outcome, reason) => {
    await endSupervisorAppointment(record.appointmentLifecycle!.appointmentId, outcome, reason);
    await loadRecords(); setTeamRefreshVersion(current => current + 1);
    notify(`Supervisor appointment ended for ${record.studentName}.`);
  };
  const lifecycleContent = loading ? <LoadingState message="Loading primary appointment records…" /> : error ? <ErrorState message={error} onRetry={loadRecords} /> : <CoordinatorAppointmentLifecycleRecords
    records={appointmentRecords.filter(record => localAppointmentId ? record.id === localAppointmentId : !routeTeamStudentId || record.studentId === routeTeamStudentId)}
    detail={!!localAppointmentId || !!routeTeamStudentId} onOpen={id => { if (onNavigateToApplication) onNavigateToApplication(String(id)); else setLocalAppointmentId(id); }} onNavigateToDossier={onNavigateToDossier}
    onEnd={endPrimaryAppointment} />;
  if (applicationId) return <RecordPage pageKey={!initialApplicationId ? `coordinator-primary-${applicationId}` : undefined} title="Appointment request" backLabel={backLabel} onBack={closeRecord} dirty={!!rejectionReason.trim()} busy={busy}>
    <PortalToast message={toast} />
    {!loading && !error && !selected ? <p className="card-description">This request is unavailable or outside your authorised scope.</p> : requestContent}
    {!loading && !error && selected ? <CoordinatorApplicationLifecycle record={selected} onNavigateToDossier={onNavigateToDossier} onEnd={endPrimaryAppointment} /> : null}
  </RecordPage>;
  if (supportingId) return <RecordPage pageKey={!initialSupportingId ? `coordinator-supporting-${supportingId}` : undefined} title="Supporting supervisor request" backLabel={backLabel} onBack={closeRecord} dirty={!!supportingReason.trim()} busy={busy}>
    <PortalToast message={toast} />
    {loading ? <LoadingState message="Loading supporting supervisor request…" /> : error ? <ErrorState message={error} onRetry={loadRecords} /> : supporting ? <>
      <CoSupervisorNominationCard nomination={supporting} busy={busy} onAction={(_, action) => { setSupportingAction(action); setSupportingReason(''); }} />
      <PortalButton variant="ghost" onClick={() => onNavigateToDossier?.(supporting.matricNo)}>View student record</PortalButton>
      {supportingAction ? <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" onSubmit={event => { event.preventDefault(); void decideSupporting(); }}>
        <h2 className="section-label">{supportingAction === 'approve' ? 'Approve supporting appointment' : supportingAction === 'accept' ? 'Accept supporting request' : supportingAction === 'cancel' ? 'Cancel supporting nomination' : 'Reject supporting request'}</h2>
        {!['approve', 'accept'].includes(supportingAction) ? <label className="form-label block">Decision reason<textarea className="form-control mt-2" required rows={3} disabled={busy} value={supportingReason} onChange={event => setSupportingReason(event.target.value)} /></label> : <p className="card-description">Confirm the supporting appointment. Current eligibility and capacity will be checked again.</p>}
        <div className="flex gap-2"><PortalButton type="submit" variant="primary" disabled={busy || !supporting.allowedActions.includes(supportingAction)}>Confirm decision</PortalButton><PortalButton type="button" disabled={busy} onClick={() => { setSupportingAction(null); setSupportingReason(''); }}>Cancel</PortalButton></div>
      </form> : null}
    </> : <p className="card-description">This request is unavailable or outside your authorised scope.</p>}
  </RecordPage>;
  if (localAppointmentId) return <RecordPage pageKey={`coordinator-appointment-${localAppointmentId}`} title="Supervisor appointment record" backLabel="Back to Supervisory teams" onBack={() => setLocalAppointmentId(undefined)}><PortalToast message={toast} />{lifecycleContent}</RecordPage>;
  const teamContent = <><SupervisoryTeamManagement role="Programme Coordinator" refreshVersion={refreshVersion + teamRefreshVersion}
    view={routeTeamStudentId ? 'detail' : 'roster'} routeStudentId={routeTeamStudentId} onNavigateToStudent={onNavigateToTeam}
    showResearchChanges={false} showRefresh={false} onBusyChange={setTeamBusy} onChanged={() => void loadRecords()} />{lifecycleContent}
    {!routeTeamStudentId ? <CapacityReassessments role="Programme Coordinator" showRefresh={false} refreshVersion={refreshVersion + teamRefreshVersion} onBusyChange={setCapacityBusy} /> : null}</>;
  if (routeTeamStudentId) return <RecordPage title="Supervision details" backLabel="Back to Supervisory teams" onBack={onNavigateToList} busy={busy}><PortalToast message={toast} />{teamContent}</RecordPage>;
  return <div id="coordinator-supervisor-approvals" className="space-y-6 animate-fade-in text-left font-sans">
    <PortalToast message={toast} />
    {showHeader ? <><PageHeader title="Supervisor Appointments" subtitle="Review appointment requests and manage supervision in your programmes."
      actions={<PortalButton icon={RefreshCw} disabled={workspaceBusy} onClick={() => { void loadRecords(); setTeamRefreshVersion(current => current + 1); }}>Refresh</PortalButton>} />
      <SupervisorWorkspaceNavigation role="Programme Coordinator" /></> : null}
    {workspaceView === 'teams' ? teamContent : loading ? <LoadingState message="Loading appointment requests…" /> : error ? <ErrorState message={error} onRetry={loadRecords} /> :
      <CoordinatorAppointmentRequestList queue={records} history={historyRecords} nominations={nominations} view={view} search={search} type={type} status={status} page={page} pageSize={pageSize} disabled={busy}
        onView={value => { setView(value); setStatus(''); setPage(1); }} onSearch={value => { setSearch(value); setPage(1); }}
        onType={value => { setType(value); setPage(1); }} onStatus={value => { setStatus(value); setPage(1); }} onPage={setPage} onPageSize={value => { setPageSize(value); setPage(1); }}
        onOpen={(id, kind) => { if (kind === 'supporting') { if (onNavigateToSupportingRequest) onNavigateToSupportingRequest(String(id)); else setLocalSupportingId(String(id)); }
          else if (onNavigateToApplication) onNavigateToApplication(String(id)); else setLocalApplicationId(String(id)); }} />}
  </div>;
};
