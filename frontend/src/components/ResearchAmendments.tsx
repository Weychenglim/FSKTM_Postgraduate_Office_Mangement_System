import { PortalSelect } from './PortalSelect';
import { DecisionDialog } from './DecisionDialog';
import { completeDecision } from '../utils/decisionSubmission';
import { useReturnToFocusReload } from '../utils/returnToFocus';
import { CoordinatorFiltersBar, type CoordinatorFilterControls } from './CoordinatorBrowsePrimitives';
import { useListState } from './ListState';
import { RecordPage } from './RecordPage';
import { useRecordDraft } from './RecordDraft';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ClipboardList, FilePenLine, History, ListChecks, UsersRound } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { cancelResearchAmendment, correctResearchProfile, decideResearchAmendment, getNextResearchAmendment, loadResearchAmendmentWorkspace, submitResearchAmendment } from '../services/researchAmendmentsApi';
import type { ResearchAmendment, ResearchAmendmentOptions, ResearchRevision, ResearchPageQuery, ResearchPagination, ResearchNextTarget } from '../services/researchAmendmentsApi';
import { PortalButton } from './PortalPrimitives';
import { ApprovalProcess } from './ApprovalProcess';
import { AppointmentIcon, appointmentDetailTypography } from './AppointmentPrimitives';
import { RequestMetadata, RequestDetailCard, RequestSection, RequestAuditHistory, RequestField, requestBodyTextClass } from './RequestDetailPrimitives';
import { RequestedChangesComparison } from './RequestedChangesComparison';
import { buildSupervisorApprovalProcess } from '../utils/approvalProcess';
import { ErrorState, LoadingState } from './StateViews';
import type { UserRole } from '../types/auth';
import { requestGroup, requestStatusLabel, requestWaitingDays, type RequestGroup } from '../utils/lecturerRequests';
import { RequestViewSwitch, RequestFilters, RequestGroupSection, WorkspaceSectionHeader, WorkspaceRecordTable, WorkspacePagination, workspacePageSize, type WorkspaceRecord, type RequestListView } from './RequestWorkspacePrimitives';

const inputClass = 'form-control form-control-sm mt-1';
const date = (value: string) => new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const words = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
type Action = 'APPROVE' | 'REJECT' | 'CANCEL';

function researchChangeLabel(row: ResearchAmendment): string {
  const titleChanged = row.before.title !== row.after.title;
  const abstractChanged = row.before.abstract !== row.after.abstract;
  return row.kind === 'TRANSFER' ? 'Programme transfer' : titleChanged && abstractChanged ? 'Title and abstract change' : titleChanged ? 'Title change' : abstractChanged ? 'Abstract change' : 'Research change';
}

function researchReviewStatus(row: ResearchAmendment) {
  return row.kind === 'RESEARCH' && row.status === 'PENDING_COORDINATOR' ? 'PENDING_SUPERVISOR' : row.status;
}

function researchStatusLabel(row: ResearchAmendment) {
  const status = researchReviewStatus(row);
  return row.kind === 'RESEARCH' && status === 'PENDING_SUPERVISOR'
    ? 'Awaiting Supervisor review'
    : requestStatusLabel(status, row.canDecide);
}

function researchWorkspaceRecord(row: ResearchAmendment, busy: boolean, onOpen?: () => void): WorkspaceRecord {
  const stageEvent = [...row.events].reverse().find(event => event.newStatus === row.status && event.previousStatus !== event.newStatus);
  return { key: row.id, studentName: row.studentName, matricNo: row.matricNo,
    kind: researchChangeLabel(row),
    submittedAt: row.createdAt, status: researchStatusLabel(row), workflowStatus: researchReviewStatus(row),
    waitingDays: row.status.startsWith('PENDING') ? requestWaitingDays(stageEvent?.createdAt ?? row.createdAt) : null,
    waitingApplicable: requestGroup(researchReviewStatus(row), row.canDecide) !== 'history',
    actionLabel: requestGroup(researchReviewStatus(row), row.canDecide) === 'review' ? 'Review request' : 'View request', onOpen, disabled: busy };
}

function TransferTeamSnapshot({ row }: { row: ResearchAmendment }) {
  const team = row.teamSnapshot;
  return <>{row.kind === 'TRANSFER' ? <div className="card-description rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"><p className="card-value text-amber-900">Supervisory team retained on transfer</p><p>Primary supervisor: {team?.primary?.name ?? 'None recorded'}</p><p>Co-supervisors: {team?.coSupervisors?.map(member => member.name).join(', ') || 'None recorded'}</p><p>Panel: {team?.panel?.map(member => member.name).join(', ') || 'None recorded'}</p><p className="mt-2">Existing appointments keep their current workload slots; the transfer adds no new allocation.</p>{row.unfinishedTaskCount !== null ? <p>{row.unfinishedTaskCount} unfinished evaluation tasks remain assigned to their current evaluators.</p> : <p>Historical team snapshot. Current task counts are outside your access.</p>}</div> : null}</>;
}

export function researchRequestMetadata(row: ResearchAmendment): React.ComponentProps<typeof RequestMetadata> {
  const submission = row.events.find(event => ['SUBMIT', 'SUBMITTED'].includes(event.action));
  return {
    reference: `${row.kind === 'TRANSFER' ? 'Programme transfer' : 'Research request'} #${row.id}`,
    submittedAt: submission?.createdAt || row.createdAt,
    submittedBy: submission?.actorName ? `${submission.actorName}${submission.actorRole ? ` · ${submission.actorRole}` : ''}` : 'Not recorded',
    statusLabel: row.kind === 'RESEARCH' && researchReviewStatus(row) === 'PENDING_SUPERVISOR' ? 'Awaiting Supervisor review' : row.stageLabel || requestStatusLabel(row.status),
    statusTone: row.status === 'APPROVED' ? 'success' : row.status.startsWith('PENDING') ? 'warning' : row.status === 'REJECTED' ? 'danger' : 'neutral',
  };
}

export function ResearchAmendmentCard({ row, busy, onAction, studentView = false, lecturerView = false, presentation = 'embedded', onViewRequest, onViewProfile }: { row: ResearchAmendment; busy: boolean; onAction: (row: ResearchAmendment, action: Action) => void; studentView?: boolean; lecturerView?: boolean; presentation?: 'embedded' | 'list' | 'detail'; onViewRequest?: () => void; onViewProfile?:()=>void }) {
  if (presentation === 'list') {
    const record = researchWorkspaceRecord(row, busy, onViewRequest);
    return <WorkspaceRecordTable label="Research change request records" identityLabel={studentView ? 'Research change' : 'Student'} hideRequestType={studentView} rows={[studentView ? { ...record, studentName: record.kind ?? 'Research change', matricNo: '', actionLabel: 'View request' } : record]} />;
  }
  const stageEvent = [...row.events].reverse().find(event => event.newStatus === row.status && event.previousStatus !== event.newStatus);
  const steps = buildSupervisorApprovalProcess({ kind: row.kind === 'TRANSFER' ? 'transfer' : 'research', status: researchReviewStatus(row), submittedAt: row.createdAt, events: row.events, waitingDays: row.status.startsWith('PENDING') ? requestWaitingDays(stageEvent?.createdAt ?? row.createdAt) : null });
  const actions = <div className="flex flex-wrap gap-2">{!studentView && row.canDecide ? <><PortalButton size="sm" variant="primary" disabled={busy} onClick={() => onAction(row, 'APPROVE')}>Approve request</PortalButton><PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'REJECT')}>Reject request</PortalButton></> : null}{row.canCancel ? <PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'CANCEL')}>Cancel request</PortalButton> : null}</div>;
  const detail = <RequestDetailCard progress={<ApprovalProcess steps={steps} icon={ListChecks} />} actions={(!studentView && row.canDecide) || row.canCancel ? actions : undefined} audit={row.events.length?<RequestAuditHistory events={row.events} showTeamRetention={row.kind==='TRANSFER'}/>:undefined}>
    <RequestSection title="Request summary" icon={ClipboardList} headingClassName={appointmentDetailTypography.heading} actions={onViewProfile?<PortalButton size="sm" icon={BookOpen} disabled={busy} onClick={onViewProfile}>View research profile</PortalButton>:undefined}>
      <dl className="grid gap-4 sm:grid-cols-2">
        <RequestField label="Student" value={`${row.studentName} · ${row.matricNo}`} />
        <RequestField label="Change type" value={researchChangeLabel(row)} />
        <RequestField label="Programme" value={row.sourceProgramme || row.before.programme} />
      </dl>
      {row.reason ? <p className={`${requestBodyTextClass} mt-4`}><span className="card-label">Reason:</span> {row.reason}</p> : null}
    </RequestSection>
    <RequestSection title="Requested changes" icon={FilePenLine} headingClassName={appointmentDetailTypography.heading}>
      <RequestedChangesComparison before={row.before} after={row.after} applied={row.status === 'APPROVED'} />
    </RequestSection>
    {!studentView && row.kind === 'TRANSFER' ? <RequestSection title="Supervisory team at submission" icon={UsersRound} headingClassName={appointmentDetailTypography.heading}><TransferTeamSnapshot row={row} /></RequestSection> : null}
  </RequestDetailCard>;
  return studentView || lecturerView ? presentation === 'detail' ? detail : <article className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="section-label">{researchChangeLabel(row)}</h3><details><summary className="card-value cursor-pointer text-blue-600">View details</summary><div className="mt-4">{detail}</div></details></article> : detail;
}

export type ResearchRouteView = 'list' | 'detail' | 'profile' | 'new';

type ResearchNavigationProps = {
  routeView?: ResearchRouteView;
  routeRequestId?: string;
  onNavigateToRequest?: (id: string) => void;
  onNavigateToList?: () => void;
  onNavigateToProfile?: (studentId?: number) => void;
  onNavigateToNew?: () => void;
  requestView?: RequestListView;
  requestSearch?: string;
  requestPage?: number;
  requestPageSize?: number;
  onRequestViewChange?: (view: RequestListView) => void;
  onRequestSearch?: (value: string) => void;
  onRequestReset?: () => void;
  onRequestPage?: (page: number) => void;
  onRequestPageSize?: (size: number) => void;
  studentFilter?: number;
  onStudentFilter?: (studentId: number | undefined) => void;
  researchFilters?: ResearchPageQuery;
  onResearchFilter?: (key: string, value: string) => void;
  pagination?: ResearchPagination;
  nextRequestQuery?: ResearchPageQuery;
  onNavigateToNextRequest?: (id: string, page: number) => void;
};

export function StudentResearchProfileCard({options,hasPending,onNavigateToProfile,onNavigateToNew}:{
  options:ResearchAmendmentOptions;hasPending:boolean;
  onNavigateToProfile?:ResearchNavigationProps['onNavigateToProfile'];onNavigateToNew?:()=>void;
}) {
  return <section aria-label="Current research profile" className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex items-center gap-3"><AppointmentIcon icon={BookOpen} tone="info" /><h2 className="card-label">Current research profile</h2></div>
      <p className="section-label [overflow-wrap:anywhere]">{options.profile?.title || 'Research title not recorded'}</p>
      {!options.canSubmitResearch && hasPending ? <p className="card-description">You have a research change awaiting a decision. You can submit another after it is resolved.</p> : null}
    </div>
    <div className="flex flex-wrap gap-2 lg:shrink-0">
      <PortalButton size="sm" onClick={() => onNavigateToProfile?.()}>View research profile</PortalButton>
      {options.canSubmitResearch && options.profile ? <PortalButton size="sm" variant="primary" onClick={onNavigateToNew}>Request research change</PortalButton> : null}
    </div>
  </section>;
}

export function ResearchAmendmentRouteContent({ routeView, routeRequestId, role, options, rows, revisions, busy, onAction, onNavigateToRequest, onNavigateToProfile, onNavigateToNew, requestForm, requestView = 'requests', requestSearch = '', requestPage = 1, requestPageSize, onRequestPage, onRequestPageSize, pagination, researchFilters }: ResearchNavigationProps & {
  role?: UserRole;
  options: ResearchAmendmentOptions;
  rows: ResearchAmendment[];
  revisions: ResearchRevision[];
  busy: boolean;
  onAction: (row: ResearchAmendment, action: Action) => void;
  requestForm: React.ReactNode;
}) {
  const studentView = role === 'Student';
  const lecturerView = role === 'Lecturer';
  const transferWorkspace = role === 'Programme Coordinator' && researchFilters?.type === 'TRANSFER';
  if (routeView === 'detail') {
    const row = rows.find(request => String(request.id) === routeRequestId);
    return row ? <ResearchAmendmentCard row={row} busy={busy} studentView={studentView} lecturerView={lecturerView} presentation="detail" onAction={onAction} onViewProfile={onNavigateToProfile?()=>onNavigateToProfile(row.studentId):undefined}/> : <p role="status" className="card-description">Request not found. It may no longer be available or you may not have access to it.</p>;
  }
  if (routeView === 'new') {
    if (options.profile && ((studentView && options.canSubmitResearch) || ((role === 'Programme Coordinator' || role === 'Office Staff/Admin') && (options.canCorrect || options.canTransfer)))) return <>{requestForm}</>;
    return <p className="card-description">{studentView && rows.some(row => row.status.startsWith('PENDING')) ? 'You have a request awaiting a decision. You can submit another after it is resolved.' : 'You cannot request a research change at this time.'}</p>;
  }
  if (routeView === 'profile') return <>
    {role==='Office Staff/Admin'&&options.profile&&(options.canCorrect||options.canTransfer)?<div><PortalButton icon={FilePenLine} disabled={busy} onClick={onNavigateToNew}>Correct research or request transfer</PortalButton></div>:null}
    {options.profile ? <div className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3"><AppointmentIcon icon={BookOpen} tone="info" /><h3 className={appointmentDetailTypography.heading}>Current research profile</h3></div><RequestedChangesComparison before={options.profile} after={options.profile} initialRecord /></div> : <p className="card-description">{(lecturerView||role==='Office Staff/Admin') && options.students.length ? 'Select a student to view their current research profile and saved revisions.' : 'No current research profile is available.'}</p>}
  </>;
  const serverPaged = (role === 'Programme Coordinator'||role === 'Office Staff/Admin') && !!pagination;
  const visible = serverPaged ? rows : rows.filter(row => (requestGroup(researchReviewStatus(row), row.canDecide) === 'history') === (requestView === 'history')
    && `${row.studentName} ${row.matricNo} ${row.id} ${row.after.title} ${researchChangeLabel(row)} Research request #${row.id} Research amendment #${row.id} Request #${row.id}`.toLowerCase().includes(requestSearch.trim().toLowerCase()))
    .sort((a, b) => (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * (requestView === 'history' ? -1 : 1));
  const pageSize = pagination?.pageSize ?? workspacePageSize(requestPageSize);
  const pageCount = pagination?.pageCount ?? Math.max(1, Math.ceil(visible.length / pageSize));
  const page = pagination?.page ?? Math.min(pageCount, Math.max(1, Number.isFinite(requestPage) ? Math.floor(requestPage) : 1));
  const paged = serverPaged ? visible : visible.slice((page - 1) * pageSize, page * pageSize);
  const groups: RequestGroup[] = requestView === 'history' ? ['history'] : ['review', 'coordinator', 'other'];
  const coordinatorHistory = (role === 'Programme Coordinator'||role === 'Office Staff/Admin'&&serverPaged) && requestView === 'history';
  const table = (selected: ResearchAmendment[]) => <WorkspaceRecordTable label={transferWorkspace?'Programme transfer requests':'Research change request records'} identityLabel={studentView ? 'Research change' : 'Student'} hideRequestType={studentView||transferWorkspace} dateLabel={coordinatorHistory ? 'Outcome recorded' : 'Submitted'} rows={selected.map(row => {
    const record = {...researchWorkspaceRecord(row, busy, () => onNavigateToRequest?.(String(row.id))), submittedAt:coordinatorHistory ? row.updatedAt : row.createdAt};
    return studentView ? { ...record, studentName: record.kind ?? 'Research change', matricNo: '', actionLabel: 'View request' } : record;
  })} />;
  return <div className="space-y-5">
    {!studentView && !lecturerView && options.profile ? <div className="flex flex-wrap gap-2"><PortalButton onClick={() => onNavigateToProfile?.()}>View research profile</PortalButton>{options.canCorrect || options.canTransfer ? <PortalButton onClick={onNavigateToNew}>Request research change</PortalButton> : null}</div> : null}
    {studentView ? (paged.length ? table(paged) : null) : groups.map(group => {
      const selected = paged.filter(row => requestGroup(researchReviewStatus(row), row.canDecide) === group);
      return selected.length ? serverPaged && group === 'review' ? <section key={group} className="space-y-3" aria-label="Needs your decision"><h3 className="section-label">Needs your decision</h3>{table(selected)}</section> : <RequestGroupSection key={group} group={group} count={selected.length}>{table(selected)}</RequestGroupSection> : null;
    })}
    {!visible.length ? <p className="card-description rounded-lg bg-slate-50 p-4">{requestSearch ? 'No matching requests. Adjust the filters to see more records.' : requestView === 'history' ? 'No final request outcomes yet.' : transferWorkspace ? 'No programme transfers awaiting your decision.' : studentView ? 'No research change requests to display.' : serverPaged && role === 'Programme Coordinator' ? 'No research change requests awaiting your decision.' : 'No ongoing research change requests.'}</p> : null}
    <WorkspacePagination page={page} pageCount={pageCount} total={pagination?.total ?? visible.length} noun="requests" pageSize={pageSize} onPageSize={onRequestPageSize} onPage={value => onRequestPage?.(value)} />
  </div>;
}

export function CoordinatorResearchFilters({query, pagination, onFilter, transferOnly=false}: {query: ResearchPageQuery; pagination?: ResearchPagination; onFilter: (key: string, value: string) => void; transferOnly?:boolean}) {
  const setter = (key: string) => (value: string) => onFilter(key, value);
  const filters: CoordinatorFilterControls = {
    q:query.q ?? '',programme:query.programme ?? '',semester:query.semester ?? '',type:query.type ?? 'all',status:query.status ?? '',
    from:query.from ?? '',to:query.to ?? '',sort:query.sort ?? (query.view === 'history' ? 'newest' : 'waiting'),
    setQ:setter('q'),setProgramme:setter('programme'),setSemester:setter('semester'),setType:setter('type'),setStatus:setter('status'),
    setFrom:setter('from'),setTo:setter('to'),setSort:setter('sort'),setPage:()=>{},
    change:callback=>callback,reset:()=>onFilter('clear',''),
  };
  const facets = transferOnly && pagination ? {...pagination.facets, statuses:pagination.facets.statuses.filter(status=>!['PENDING_SUPERVISOR','PENDING_COORDINATOR'].includes(status))} : pagination?.facets;
  return <CoordinatorFiltersBar filters={filters} facets={facets} requests history={query.view === 'history'}
    statusLabel={status => status === 'PENDING_SUPERVISOR' || status === 'PENDING_COORDINATOR' ? 'Awaiting Supervisor review' : requestStatusLabel(status)}
    searchPlaceholder="Student name, matric number or request" typeOptions={transferOnly?undefined:[
      ['all','All types'],['RESEARCH','Research change'],['TRANSFER','Programme transfer'],['Title change','Title change'],
      ['Abstract change','Abstract change'],['Title and abstract change','Title and abstract change']
    ]} />;
}

export function ResearchNextRequestControl({nextId, loading = false, disabled = false, onNext, error}: {nextId: number | null; loading?: boolean; disabled?: boolean; onNext: () => void; error?: string | null}) {
  return <div className="flex flex-wrap items-center gap-3"><PortalButton size="sm" disabled={disabled || loading || nextId === null} onClick={onNext}>Next request</PortalButton>{error ? <p className="card-description">{error}</p> : null}</div>;
}

export function ResearchProfileHistoryCard({ revisions, studentView }: { revisions: ResearchRevision[]; studentView: boolean }) {
  const ordered = [...revisions].sort((a, b) => b.revision - a.revision);
  return <details aria-label="Research history" className="group/history mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
      <span className="flex min-w-0 items-center gap-3"><AppointmentIcon icon={History} tone="info" /><span className={appointmentDetailTypography.heading}>Research history <span className="card-description">· {ordered.length} {ordered.length === 1 ? 'revision' : 'revisions'}</span></span></span>
      <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500 group-open/history:rotate-180" />
    </summary>
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
      {ordered.length ? ordered.map(revision => <ResearchRevisionCard key={revision.id} revision={revision} studentView={studentView} collapsible />) : <p className="card-description">No saved research revisions to display.</p>}
    </div>
  </details>;
}

export function ResearchRevisionCard({ revision, studentView = false, collapsible = false }: { revision: ResearchRevision; studentView?: boolean; lecturerView?: boolean; collapsible?: boolean }) {
  const title = revision.kind === 'BASELINE' ? 'Initial record' : `Revision ${revision.revision} · ${words(revision.kind)}`;
  const metadata = `${revision.actorName} · ${date(revision.createdAt)} (Malaysia)`;
  const comparison = <>
    <RequestedChangesComparison before={revision.before} after={revision.after} revision initialRecord={revision.kind === 'BASELINE'} />
    {revision.reason ? <p className="card-description whitespace-pre-wrap">{revision.reason}</p> : null}
  </>;
  if (collapsible) return <details className="group/revision rounded-xl border border-slate-200 p-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0 space-y-1 [overflow-wrap:anywhere]"><span className="section-label block">{title}</span><span className="card-description block">{metadata}</span></span>
      <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500 group-open/revision:rotate-180" />
    </summary>
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">{comparison}</div>
  </details>;
  return <article className="space-y-3 rounded-xl border border-slate-200 p-4">
    <div className="space-y-1">
      <h3 className="section-label">{title}{!studentView && revision.studentName ? ` · ${revision.studentName}` : ''}</h3>
      <p className="card-description">{metadata}</p>
    </div>
    {comparison}
  </article>;
}

export function ResearchAmendmentForm({ options, busy, onSave, studentView = false }: { options: ResearchAmendmentOptions; busy: boolean; studentView?: boolean; onSave: (kind: 'RESEARCH' | 'TRANSFER' | 'CORRECTION', values: { title: string; abstract: string; destinationProgramme: string; reason: string }) => void }) {
  const [kind, setKind] = useState<'RESEARCH' | 'TRANSFER' | 'CORRECTION'>(options.canSubmitResearch ? 'RESEARCH' : 'CORRECTION');
  const [title, setTitle] = useState(options.profile?.title ?? '');
  const [abstract, setAbstract] = useState(options.profile?.abstract ?? '');
  const [destinationProgramme, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [unchanged, setUnchanged] = useState(false);
  useRecordDraft(title !== (options.profile?.title ?? '') || abstract !== (options.profile?.abstract ?? '') || !!destinationProgramme || !!reason.trim() || unchanged || kind !== (options.canSubmitResearch ? 'RESEARCH' : 'CORRECTION'), busy);
  if (!options.profile || !(options.canSubmitResearch || options.canCorrect || options.canTransfer)) return null;
  const allowed = kind === 'RESEARCH' ? options.canSubmitResearch : kind === 'CORRECTION' ? options.canCorrect : options.canTransfer;
  const valid = allowed && reason.trim() && (kind === 'TRANSFER' ? destinationProgramme : title.trim() && abstract.trim() && (kind !== 'CORRECTION' || unchanged));
  return <form className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4" onSubmit={event => { event.preventDefault(); if (valid && !busy) onSave(kind, { title: title.trim(), abstract: abstract.trim(), destinationProgramme, reason: reason.trim() }); }}>
    <h3 className="section-label">Request a change</h3>
    {!studentView ? <label className="form-label block">Change type<PortalSelect className={inputClass} disabled={busy} value={kind} onChange={event => setKind(event.target.value as typeof kind)}>{options.canSubmitResearch ? <option value="RESEARCH">Research title / abstract amendment</option> : null}{options.canCorrect ? <option value="CORRECTION">Typographical correction</option> : null}{options.canTransfer ? <option value="TRANSFER">Programme transfer</option> : null}</PortalSelect></label> : null}
    {kind === 'TRANSFER' ? <label className="form-label block">Destination programme<PortalSelect required className={inputClass} value={destinationProgramme} disabled={busy} onChange={event => setDestination(event.target.value)}><option value="">Select destination programme</option>{options.programmes.filter(programme => programme !== options.profile?.programme).map(programme => <option key={programme}>{programme}</option>)}</PortalSelect></label> : <><label className="form-label block">Research title<input required className={inputClass} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label><label className="form-label block">Research abstract<textarea required rows={5} className={inputClass} value={abstract} disabled={busy} onChange={event => setAbstract(event.target.value)} /></label></>}
    <label className="form-label block">Reason<textarea required rows={2} className={inputClass} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></label>
    {kind === 'CORRECTION' ? <label className="card-description flex items-start gap-2 text-slate-700"><input type="checkbox" required disabled={busy} checked={unchanged} onChange={event => setUnchanged(event.target.checked)} />I confirm this corrects typography only and does not change the research meaning.</label> : <p className="card-description">{kind === 'RESEARCH' ? 'The primary supervisor makes the final decision on your research change request.' : 'The source programme coordinator reviews first, followed by the destination programme coordinator. Both must acknowledge the existing team and unfinished tasks.'}</p>}
    <PortalButton type="submit" variant="primary" isLoading={busy} disabled={!valid}>{kind === 'CORRECTION' ? 'Save audited correction' : 'Submit request'}</PortalButton>
  </form>;
}

export function ResearchAmendments({ onChanged, role, refreshVersion = 0, hideHeader = false, showRefresh = true, onBusyChange, onDetailMetadata, onDetailTitle, routeView, routeRequestId, onNavigateToRequest, onNavigateToList, onNavigateToProfile, onNavigateToNew,
  requestView = 'requests', requestSearch = '', requestPage = 1, requestPageSize, onRequestViewChange, onRequestSearch, onRequestReset, onRequestPage, onRequestPageSize, studentFilter, onStudentFilter,
  researchFilters, onResearchFilter, nextRequestQuery, onNavigateToNextRequest,
}: { onChanged?: () => void; role?: UserRole; refreshVersion?: number; hideHeader?: boolean; showRefresh?: boolean; onBusyChange?: (busy: boolean) => void; onDetailMetadata?: (metadata: React.ReactNode) => void; onDetailTitle?: (title: string | null) => void } & ResearchNavigationProps) {
  const studentView = role === 'Student';
  const lecturerView = role === 'Lecturer';
  const coordinatorView = role === 'Programme Coordinator';
  const transferWorkspace = coordinatorView && researchFilters?.type === 'TRANSFER';
  const staffPaged = coordinatorView || role === 'Office Staff/Admin';
  const compactView = studentView || lecturerView;
  const routedView = routeView;
  const [options, setOptions] = useState<ResearchAmendmentOptions | null>(null);
  const [rows, setRows] = useState<ResearchAmendment[]>([]);
  const [revisions, setRevisions] = useState<ResearchRevision[]>([]);
  const [pagination, setPagination] = useState<ResearchPagination>();
  const [nextRequest, setNextRequest] = useState<{scope: string; target: ResearchNextTarget | null; loading: boolean; error: string | null}>({scope:'',target:null,loading:false,error:null});
  const [localStudentId, setLocalStudentId] = useListState<number | undefined>(`research:${role}`, 'studentId', undefined);
  const studentId = onStudentFilter ? studentFilter : localStudentId;
  const setStudentId = onStudentFilter ?? setLocalStudentId;
  // Coordinator details resolve the exact authorised record independently of list filters.
  const requestStudentId = routedView === 'detail' || staffPaged && routedView === 'list' ? undefined : studentId;
  const pageQuery = staffPaged && routedView === 'list' ? JSON.stringify({...researchFilters, view:requestView, q:requestSearch, page:requestPage, size:workspacePageSize(requestPageSize)}) : '{}';
  const scope = `${role ?? ''}:${routedView ?? 'embedded'}:${routeRequestId ?? ''}:${requestStudentId ?? ''}:${refreshVersion}:${staffPaged && routedView === 'list' ? pageQuery : ''}`;
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localDetail, setLocalDetail] = useState<number | null>(null);
  const [localNew, setLocalNew] = useState(false);
  const [edit, setEdit] = useState<{ row: ResearchAmendment; action: Action } | null>(null);
  const [reason, setReason] = useState('');
  const [retainTeam, setRetainTeam] = useState(false);
  const version = useRef(0);
  const mutating = useRef(false);
  const mounted = useRef(false);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const load = useCallback(async (strict = false) => {
    const token = ++version.current;
    setLoading(true); setError(null);
    try { const data = await loadResearchAmendmentWorkspace({coordinator:coordinatorView,office:role==='Office Staff/Admin', routeView:routedView, requestId:routeRequestId, studentId:requestStudentId, pageQuery:JSON.parse(pageQuery)}); if (token === version.current && currentScope.current === scope) { setOptions(data.options); setRows(data.requests); setRevisions(data.revisions); setPagination(data.pagination); setLoadedScope(scope); } }
    catch (failure) { if (token === version.current && currentScope.current === scope) { setOptions(null); setRows([]); setRevisions([]); setPagination(undefined); setLoadedScope(scope); setError(failure instanceof Error ? failure.message : 'Research changes could not be loaded.'); } if (strict) throw failure; }
    finally { if (token === version.current) setLoading(false); }
  }, [requestStudentId, scope, coordinatorView, routedView, routeRequestId, pageQuery]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setEdit(null); setReason(''); setRetainTeam(false); setNotice(null); }, [role, routedView, routeRequestId, requestStudentId]);
  useEffect(() => { void load(); return () => { version.current += 1; }; }, [load]);
  useReturnToFocusReload(() => void load(), routedView === 'list' && !loading && !busy && !edit && !localNew);
  const run = async (operation: () => Promise<unknown>, closeCreationOnSuccess = false) => {
    if (mutating.current) return;
    mutating.current = true; setBusy(true); setNotice(null);
    const operationScope = scope;
    try { await operation(); if (closeCreationOnSuccess && mounted.current && currentScope.current === operationScope) setLocalNew(false); onChanged?.(); if (mounted.current && currentScope.current === operationScope) { setEdit(null); setNotice('Research change recorded.'); await load(); } }
    catch (failure) { if (mounted.current && currentScope.current === operationScope) { setNotice(failure instanceof Error ? failure.message : 'The change could not be saved.'); if (failure instanceof ApiError && failure.status === 409) { setEdit(null); await load(); } } }
    finally { mutating.current = false; if (mounted.current) setBusy(false); }
  };
  const requestForm = options ? <ResearchAmendmentForm key={`${scope}-${options.profile?.studentId}-${options.profile?.revision}`} options={options} busy={busy} studentView={studentView} onSave={(kind, values) => void run(() => kind === 'CORRECTION' ? correctResearchProfile({ studentId: options.profile!.studentId, title: values.title, abstract: values.abstract, reason: values.reason, meaningUnchanged: true, expectedRevision: options.profile!.revision }) : submitResearchAmendment({ kind, ...(kind === 'TRANSFER' ? { studentId: options.profile!.studentId, destinationProgramme: values.destinationProgramme } : { title: values.title, abstract: values.abstract }), reason: values.reason }), true)} /> : null;
  useRecordDraft(!!edit && (!!reason.trim() || retainTeam), busy);
  const pageLoading = loading || loadedScope !== scope;
  const detailRow = !pageLoading && !error && routedView === 'detail' ? rows.find(row => String(row.id) === routeRequestId) : undefined;
  useEffect(() => { onDetailMetadata?.(detailRow ? <RequestMetadata {...researchRequestMetadata(detailRow)} /> : null); }, [detailRow, onDetailMetadata]);
  useEffect(() => () => onDetailMetadata?.(null), [onDetailMetadata]);
  useEffect(() => { onDetailTitle?.(detailRow ? detailRow.kind === 'TRANSFER' ? 'Programme transfer request' : 'Research change request' : null); }, [detailRow, onDetailTitle]);
  useEffect(() => () => onDetailTitle?.(null), [onDetailTitle]);
  const nextQueue = nextRequestQuery ? JSON.stringify(nextRequestQuery) : '';
  const nextScope = `${scope}:${nextQueue}:${rows.find(row => String(row.id) === routeRequestId)?.updatedAt ?? ''}`;
  useEffect(() => {
    let active = true;
    if (!coordinatorView || routedView !== 'detail' || !nextQueue || pageLoading || busy || edit || !rows.some(row => String(row.id) === routeRequestId)) return;
    setNextRequest({scope:nextScope,target:null,loading:true,error:null});
    void getNextResearchAmendment(JSON.parse(nextQueue), Number(routeRequestId)).then(target => {
      if (active && currentScope.current === scope) setNextRequest({scope:nextScope,target,loading:false,error:null});
    }).catch(() => {
      if (active && currentScope.current === scope) setNextRequest({scope:nextScope,target:null,loading:false,error:'Next request could not be loaded.'});
    });
    return () => { active = false; };
  }, [coordinatorView,routedView,nextQueue,nextScope,pageLoading,busy,edit,rows,routeRequestId,scope]);
  useEffect(() => { onBusyChange?.(pageLoading || busy); }, [onBusyChange, pageLoading, busy]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  const heading = routedView === 'detail' ? 'Research change request' : routedView === 'profile' ? 'Research profile' : routedView === 'new' ? 'Request research change' : routedView === 'list' ? transferWorkspace?'Programme transfers':'Research change requests' : compactView ? 'Research change requests' : 'Research amendments and programme transfers';
  const selectAction = (selected: ResearchAmendment, action: Action) => { setEdit({ row: selected, action }); setReason(''); setRetainTeam(false); setNotice(null); };
  const lecturerList = routedView === 'list' && !!onRequestViewChange;
  const studentSelector = !studentView && !(staffPaged && routedView === 'list') && (!routedView || routedView === 'list') && options && options.students.length > 0 && !options.canSubmitResearch ? <label className="form-label min-w-48 flex-1">Student<PortalSelect className={inputClass} value={studentId ?? ''} disabled={busy} onChange={event => { setStudentId(event.target.value ? Number(event.target.value) : undefined); setEdit(null); }}><option value="">{lecturerList ? 'All students' : 'Select a student to view their profile and history'}</option>{options.students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.matricNo} · {student.programme}</option>)}</PortalSelect></label> : null;
  const decide = async () => {
    if (!edit || mutating.current || (edit.action !== 'APPROVE' && !reason.trim()) || (edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement && !retainTeam)) return false;
    mutating.current = true; setBusy(true);
    try { return await completeDecision(() => edit.action === 'CANCEL' ? cancelResearchAmendment(edit.row.id, reason.trim()) : decideResearchAmendment(edit.row.id, { decision: edit.action, expectedStatus: edit.row.status, reason: reason.trim(), ...(retainTeam ? { retainTeam: true } : {}) }), async () => { await load(true); onChanged?.(); }); }
    finally { mutating.current = false; if (mounted.current) setBusy(false); }
  };
  const decisionLabel = edit?.action === 'CANCEL' ? 'Cancel request' : `${words(edit?.action ?? 'APPROVE')} ${edit?.row.kind === 'TRANSFER' ? edit.row.status === 'PENDING_DESTINATION_COORDINATOR' ? 'destination programme transfer' : 'source programme transfer' : 'research change'}`;
  const decisionDialog = <DecisionDialog isOpen={!!edit} decisionKey={edit?.row.id} title={decisionLabel} confirmLabel={decisionLabel} tone={edit?.action==='APPROVE'?'info':'danger'}
    kind={edit?.action === 'CANCEL' ? 'confirmation' : 'review'} context={<p>{edit?.row.studentName} · {edit?.row.matricNo} · {edit?.row.sourceProgramme}{edit?.row.kind === 'TRANSFER' ? ` to ${edit.row.destinationProgramme}` : ''}</p>}
    message={edit?.action === 'APPROVE' ? edit.row.kind === 'TRANSFER' ? edit.row.status === 'PENDING_DESTINATION_COORDINATOR' ? 'Approval completes the transfer to the destination programme while retaining the acknowledged team and unfinished tasks.' : 'Approval forwards this transfer to the destination Programme Coordinator for final review.' : 'Approval updates the research profile and records this request in its history.' : edit?.action === 'CANCEL' ? 'This pending request will be cancelled.' : 'This request will be rejected with your reason recorded.'}
    busy={busy} dirty={!!reason.trim() || retainTeam} canConfirm={!!edit && (edit.action === 'APPROVE' || !!reason.trim()) && !(edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement && !retainTeam)}
    successMessage="Research change decision recorded." onClose={() => { setEdit(null); setReason(''); setRetainTeam(false); }} onConfirm={decide} onReload={() => load(true)}>
    <label className="form-label block">{edit?.action === 'APPROVE' ? 'Decision note (optional)' : 'Reason (required)'}<textarea className={inputClass} required={edit?.action !== 'APPROVE'} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
    {edit?.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement ? <label className="card-description flex items-start gap-2"><input required type="checkbox" checked={retainTeam} disabled={busy} onChange={event => setRetainTeam(event.target.checked)} />I acknowledge retention of the existing primary supervisor, co-supervisors, panel and {edit.row.unfinishedTaskCount} unfinished evaluation tasks shown in this request.</label> : null}
  </DecisionDialog>;
  const localRecord = rows.find(row => row.id === localDetail);
  return <>{decisionDialog}
  {studentView && routedView === 'list' && !pageLoading && !error && options ? <StudentResearchProfileCard options={options} hasPending={rows.some(row=>row.status.startsWith('PENDING'))} onNavigateToProfile={onNavigateToProfile} onNavigateToNew={onNavigateToNew}/> : null}
  <section className={routedView === 'detail' ? 'space-y-5' : compactView || routedView ? 'space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm' : 'mt-6 space-y-4 border-t border-slate-200 pt-5'} aria-label={routedView === 'profile' ? 'Current research profile' : transferWorkspace && routedView === 'list' ? 'Programme transfer requests' : compactView || routedView ? 'Research change requests' : 'Research amendments and programme transfers'}>
    {!hideHeader && routedView && routedView !== 'list' ? <PortalButton size="sm" onClick={onNavigateToList}>Back to research changes</PortalButton> : null}
    {!hideHeader ? <WorkspaceSectionHeader title={hideHeader ? undefined : heading} description={compactView || routedView ? routedView === 'profile' ? 'View the current research record and saved revisions.' : routedView === 'new' ? 'The primary supervisor makes the final decision on research changes.' : routedView === 'detail' ? 'Compare changed fields and follow the recorded submissions and decisions for this request.' : studentView ? 'Track requests to update your research title or abstract. Open a request to see what changed and who reviewed it.' : transferWorkspace ? 'Review programme transfers awaiting your decision, or view final transfer outcomes.' : 'Review research changes and follow their recorded progress and outcomes.' : undefined}
      actions={<>{lecturerList && onRequestViewChange ? <RequestViewSwitch view={requestView} reviewCount={pageLoading || error ? 0 : (pagination?.reviewCount ?? rows.filter(row => requestGroup(researchReviewStatus(row), row.canDecide) === 'review').length)} onChange={onRequestViewChange} /> : null}</>} /> : null}
    {notice ? <p role="status" className="card-description rounded-lg bg-slate-50 p-3">{notice}</p> : null}
    {staffPaged && routedView === 'list' && onResearchFilter ? <CoordinatorResearchFilters query={JSON.parse(pageQuery)} pagination={pagination} onFilter={onResearchFilter} transferOnly={transferWorkspace} /> : null}
    {pageLoading ? <LoadingState message={transferWorkspace?'Loading programme transfers…':'Loading research changes…'} /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : options ? <>
      {routedView === 'profile' && !studentView ? options.students.filter(student => student.id === options.profile?.studentId).map(student => <div key={student.id} className="space-y-1 border-b border-slate-200 pb-4"><h2 className="section-label">{student.name}</h2><p className="card-description">{student.matricNo} · {student.programme}</p></div>) : null}
      {!staffPaged && lecturerList && onRequestSearch ? <RequestFilters onReset={onRequestReset ?? (()=>{onRequestSearch('');setStudentId(undefined);onRequestPage?.(1);setEdit(null);})} search={requestSearch} onSearch={onRequestSearch}>{studentSelector}{studentId ? <PortalButton size="sm" onClick={() => onNavigateToProfile?.()}>View research profile</PortalButton> : null}</RequestFilters> : studentSelector ? <div className="flex flex-wrap items-end gap-3">{studentSelector}</div> : null}
      {!routedView ? studentView ? options.canSubmitResearch ? <details><summary className="card-value cursor-pointer text-blue-600">Request a research change</summary><div className="mt-3">{requestForm}</div></details> : rows.some(row => row.status.startsWith('PENDING')) ? <p className="card-description rounded-lg bg-slate-50 p-3">You have a request awaiting a decision. You can submit another after it is resolved.</p> : null : (options.canCorrect || options.canTransfer || options.canSubmitResearch) ? <PortalButton disabled={busy} onClick={() => setLocalNew(true)}>Request research change</PortalButton> : null : null}
      {coordinatorView && routedView === 'detail' && nextQueue && onNavigateToNextRequest ? <ResearchNextRequestControl nextId={nextRequest.scope === nextScope ? nextRequest.target?.id ?? null : null} loading={nextRequest.loading} disabled={pageLoading || busy || !!edit} error={nextRequest.scope === nextScope ? nextRequest.error : null} onNext={() => { if (!busy && !edit && !pageLoading && nextRequest.scope === nextScope && !nextRequest.loading && nextRequest.target) onNavigateToNextRequest(String(nextRequest.target.id),nextRequest.target.page); }} /> : null}
      {routedView ? <ResearchAmendmentRouteContent routeView={routedView} routeRequestId={routeRequestId} role={role} options={options} rows={rows} revisions={revisions} busy={busy} onAction={selectAction} requestForm={requestForm} onNavigateToRequest={onNavigateToRequest} onNavigateToProfile={onNavigateToProfile} onNavigateToNew={onNavigateToNew} requestView={requestView} requestSearch={requestSearch} requestPage={requestPage} requestPageSize={requestPageSize} onRequestPage={onRequestPage} onRequestPageSize={onRequestPageSize} pagination={pagination} researchFilters={researchFilters} /> : <>
        {compactView ? rows.map(row => <ResearchAmendmentCard key={row.id} row={row} studentView={studentView} lecturerView={lecturerView} busy={busy} onAction={selectAction} />) : <WorkspaceRecordTable label="Research change request records" rows={rows.map(row => researchWorkspaceRecord(row, busy, () => setLocalDetail(row.id)))} />}
        {!rows.length ? <p className="card-description">No research amendment or transfer requests to display.</p> : null}
        {revisions.length ? <details><summary className="card-value cursor-pointer">{compactView ? 'Research profile history' : 'Research revision history'} ({revisions.length})</summary>{studentView ? <p className="card-description mt-2">Saved research profiles, including your initial record and approved changes.</p> : null}<div className="mt-3 space-y-3">{revisions.map(revision => <ResearchRevisionCard key={revision.id} revision={revision} studentView={studentView} lecturerView={lecturerView} />)}</div></details> : null}
      </>}
    </> : null}
  </section>
  {routedView === 'profile' && !pageLoading && !error && options?.profile ? <ResearchProfileHistoryCard key={`${role}:${options.profile.studentId}`} revisions={revisions} studentView={studentView} /> : null}
  {!compactView && localDetail !== null ? <RecordPage title={localRecord?.kind === 'TRANSFER' ? 'Programme transfer request' : 'Research change request'} backLabel="Back to Supervisor Appointments" onBack={() => { setLocalDetail(null); setEdit(null); setReason(''); setRetainTeam(false); }} pageKey={`staff-research:${localDetail}`} metadata={!pageLoading && !error && localRecord ? <RequestMetadata {...researchRequestMetadata(localRecord)} /> : undefined} dirty={!!edit && (!!reason.trim() || retainTeam)} busy={busy}>
    {notice ? <p role="status" className="card-description">{notice}</p> : null}
    {pageLoading ? <LoadingState message="Loading research changes…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : localRecord ? <><ResearchAmendmentCard row={localRecord} busy={busy} onAction={selectAction} presentation="detail" /></> : <p className="card-description">This request is unavailable or outside your authorised scope.</p>}
  </RecordPage> : null}
  {!compactView && localNew ? <RecordPage title="Request research change" backLabel="Back to Supervisor Appointments" onBack={() => setLocalNew(false)} pageKey="staff-research-new" busy={busy}>{requestForm}{notice ? <p role="status" className="card-description">{notice}</p> : null}</RecordPage> : null}
  </>;
}
