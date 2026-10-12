import { useListState } from './ListState';
import { RecordPage } from './RecordPage';
import { useRecordDraft } from './RecordDraft';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/apiClient';
import { cancelResearchAmendment, correctResearchProfile, decideResearchAmendment, getResearchAmendmentOptions, getResearchAmendments, submitResearchAmendment } from '../services/researchAmendmentsApi';
import type { ResearchAmendment, ResearchAmendmentOptions, ResearchRevision, ResearchSnapshot } from '../services/researchAmendmentsApi';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import type { UserRole } from '../types/auth';
import { requestGroup, requestStatusLabel, requestWaitingDays, type RequestGroup } from '../utils/lecturerRequests';
import { RequestViewSwitch, RequestFilters, RequestGroupSection, WorkspaceSectionHeader, WorkspaceRecordTable, WorkspaceRequestReference, WorkspacePagination, workspacePageSize, type WorkspaceRecord, type RequestListView } from './RequestWorkspacePrimitives';

const inputClass = 'form-control form-control-sm mt-1';
const date = (value: string) => new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const words = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
type Action = 'APPROVE' | 'REJECT' | 'CANCEL';

function researchChangeLabel(row: ResearchAmendment): string {
  const titleChanged = row.before.title !== row.after.title;
  const abstractChanged = row.before.abstract !== row.after.abstract;
  return row.kind === 'TRANSFER' ? 'Programme transfer' : titleChanged && abstractChanged ? 'Title and abstract change' : titleChanged ? 'Title change' : abstractChanged ? 'Abstract change' : 'Research change';
}

function researchWorkspaceRecord(row: ResearchAmendment, busy: boolean, onOpen?: () => void): WorkspaceRecord {
  const stageEvent = [...row.events].reverse().find(event => event.newStatus === row.status && event.previousStatus !== event.newStatus);
  return { key: row.id, studentName: row.studentName, matricNo: row.matricNo,
    kind: researchChangeLabel(row),
    submittedAt: row.createdAt, status: requestStatusLabel(row.status, row.canDecide),
    waitingDays: row.status.startsWith('PENDING') ? requestWaitingDays(stageEvent?.createdAt ?? row.createdAt) : null,
    waitingApplicable: requestGroup(row.status, row.canDecide) !== 'history',
    actionLabel: requestGroup(row.status, row.canDecide) === 'review' ? 'Review request' : 'View request', onOpen, disabled: busy };
}

function Comparison({ before, after, changedOnly = false, approved = false, afterLabel, initialRecord = false }: { before: ResearchSnapshot; after: ResearchSnapshot; changedOnly?: boolean; approved?: boolean; afterLabel?: string; initialRecord?: boolean }) {
  if (initialRecord) return <dl className="space-y-4">{(['programme', 'title', 'abstract'] as const).map(field => <div key={field} className="space-y-2">
    <dt className="card-value">{words(field)}</dt>
    <dd className="card-description whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-slate-700">{after[field] || 'Not recorded'}</dd>
  </div>)}</dl>;
  if (changedOnly) return <div className="space-y-4">{(['programme', 'title', 'abstract'] as const).filter(field => before[field] !== after[field]).map(field => <div key={field} className="space-y-2">
    <h4 className="card-value">{words(field)}</h4>
    <dl className={`grid gap-3 ${field === 'abstract' ? '' : 'sm:grid-cols-2'}`}>{[before, after].map((value, index) => <div key={index} className="rounded-lg bg-slate-50 p-3">
      <dt className="card-label">{index ? afterLabel ?? (approved ? 'Approved' : 'Proposed') : 'Previously'}</dt>
      <dd className="card-description mt-2 whitespace-pre-wrap break-words text-slate-700">{value[field] || 'Not recorded'}</dd>
    </div>)}</dl>
  </div>)}</div>;
  return <div className="grid gap-3 sm:grid-cols-2">{[before, after].map((value, index) => <div key={index} className="card-description rounded-lg bg-slate-50 p-3">
    <h4 className="card-value">{index ? 'Proposed / recorded after' : 'Before'}</h4>
    <p className="card-value mt-2"><span className="card-label">Programme:</span> {value.programme || 'Not recorded'}</p>
    <p className="card-value mt-2"><span className="card-label">Title:</span> {value.title || 'Not recorded'}</p>
    <p className="card-description mt-2 whitespace-pre-wrap text-slate-700"><span className="card-label">Abstract:</span> {value.abstract || 'Not recorded'}</p>
  </div>)}</div>;
}

function TransferTeamSnapshot({ row }: { row: ResearchAmendment }) {
  const team = row.teamSnapshot;
  return <>{row.kind === 'TRANSFER' ? <div className="card-description rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"><p className="card-value text-amber-900">Supervisory team retained on transfer</p><p>Primary supervisor: {team?.primary?.name ?? 'None recorded'}</p><p>Co-supervisors: {team?.coSupervisors?.map(member => member.name).join(', ') || 'None recorded'}</p><p>Panel: {team?.panel?.map(member => member.name).join(', ') || 'None recorded'}</p><p className="mt-2">Existing appointments keep their current workload slots; the transfer adds no new allocation.</p>{row.unfinishedTaskCount !== null ? <p>{row.unfinishedTaskCount} unfinished evaluation tasks remain assigned to their current evaluators.</p> : <p>Historical team snapshot. Current task counts are outside your access.</p>}</div> : null}</>;
}

export function ResearchAmendmentCard({ row, busy, onAction, studentView = false, lecturerView = false, presentation = 'embedded', onViewRequest }: { row: ResearchAmendment; busy: boolean; onAction: (row: ResearchAmendment, action: Action) => void; studentView?: boolean; lecturerView?: boolean; presentation?: 'embedded' | 'list' | 'detail'; onViewRequest?: () => void }) {
  if (!studentView && !lecturerView && presentation === 'list') return <WorkspaceRecordTable label="Research change request records" rows={[researchWorkspaceRecord(row, busy, onViewRequest)]} />;
  if (studentView || lecturerView) {
    const titleChanged = row.before.title !== row.after.title;
    const abstractChanged = row.before.abstract !== row.after.abstract;
    const heading = row.kind === 'TRANSFER' ? 'Programme transfer' : titleChanged && abstractChanged ? 'Title and abstract change' : titleChanged ? 'Title change' : abstractChanged ? 'Abstract change' : 'Research change';
    const stageEvent = [...row.events].reverse().find(event => event.newStatus === row.status && event.previousStatus !== event.newStatus);
    const waitingDays = lecturerView && row.status.startsWith('PENDING') ? requestWaitingDays(stageEvent?.createdAt ?? row.createdAt) : null;
    if (lecturerView && presentation === 'list') return <WorkspaceRecordTable label="Research change request records" rows={[researchWorkspaceRecord(row, busy, onViewRequest)]} />;
    const header = <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="section-label">{heading}</h3>{lecturerView ? <p className="card-description mt-1">{row.studentName} · {row.matricNo}</p> : null}<p className="card-description mt-1">Request #{row.id} · Submitted {date(row.createdAt)} (Malaysia)</p>{waitingDays != null ? <p className="card-description mt-1">Waiting {waitingDays} calendar {waitingDays === 1 ? 'day' : 'days'}</p> : null}</div><StatusBadge tone={row.status === 'APPROVED' ? 'success' : row.status.startsWith('PENDING') ? 'warning' : 'neutral'}>{lecturerView ? requestStatusLabel(row.status, row.canDecide) : row.stageLabel}</StatusBadge></div>;
    if (presentation === 'list') return <article className="space-y-3 rounded-xl border border-slate-200 p-4">{header}<PortalButton size="sm" onClick={onViewRequest}>View request</PortalButton></article>;
    const details = <div className="mt-4 space-y-4">
        <Comparison before={row.before} after={row.after} changedOnly approved={row.status === 'APPROVED'} />
        <p className="card-description whitespace-pre-wrap"><span className="card-label">Reason:</span> {row.reason}</p>
        {lecturerView ? <TransferTeamSnapshot row={row} /> : null}
        <div><h4 className="card-value">{lecturerView ? 'Recorded progress' : 'Approval history'}</h4><p className="card-description mt-1">Recorded submissions and decisions for this request.</p><ol className="card-description mt-3 space-y-3 border-l border-slate-200 pl-3">{row.events.map(event => <li key={event.id}><p className="card-value">{words(event.action)} · {event.actorName}</p><p>{date(event.createdAt)} (Malaysia)</p>{lecturerView ? <p>{words(event.previousStatus || 'Created')} → {words(event.newStatus)}</p> : null}{lecturerView && event.retainTeam ? <p>Existing supervisory team and unfinished evaluation tasks acknowledged.</p> : null}{event.reason ? <p className="mt-1 whitespace-pre-wrap">{event.reason}</p> : null}</li>)}</ol></div>
        {lecturerView && row.canDecide ? <div className="flex flex-wrap gap-2"><PortalButton size="sm" variant="primary" disabled={busy} onClick={() => onAction(row, 'APPROVE')}>{row.status === 'PENDING_SUPERVISOR' ? 'Endorse request' : 'Approve request'}</PortalButton><PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'REJECT')}>Reject request</PortalButton></div> : null}
        {row.canCancel ? <PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'CANCEL')}>Cancel request</PortalButton> : null}
      </div>;
    return <article className="space-y-3 rounded-xl border border-slate-200 p-4">{header}{lecturerView && presentation === 'detail' ? <><WorkspaceRequestReference reference={`Research request #${row.id}`} /><p className="card-description">Programme: {row.sourceProgramme || row.before.programme || 'Not recorded'}</p></> : null}{presentation === 'detail' ? details : <details><summary className="card-value cursor-pointer text-blue-600">View details</summary>{details}</details>}</article>;
  }
  return <article className="space-y-3 rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap justify-between gap-2"><div><h3 className="section-label">{row.kind === 'TRANSFER' ? 'Programme transfer' : 'Research amendment'} #{row.id}</h3><p className="card-description">{row.studentName} · {row.matricNo}</p></div><StatusBadge tone={row.status === 'APPROVED' ? 'success' : row.status.startsWith('PENDING') ? 'warning' : 'neutral'}>{row.stageLabel}</StatusBadge></div>
    <Comparison before={row.before} after={row.after} />
    <p className="card-description whitespace-pre-wrap"><span className="card-label">Reason:</span> {row.reason}</p>
    <TransferTeamSnapshot row={row} />
    <div className="flex flex-wrap gap-2">{row.canDecide ? <><PortalButton size="sm" variant="primary" disabled={busy} onClick={() => onAction(row, 'APPROVE')}>{row.status === 'PENDING_SUPERVISOR' ? 'Endorse' : 'Approve'}</PortalButton><PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'REJECT')}>Reject</PortalButton></> : null}{row.canCancel ? <PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'CANCEL')}>Cancel request</PortalButton> : null}</div>
    <details><summary className="card-value cursor-pointer">Request history ({row.events.length})</summary><ol className="card-description mt-2 space-y-3">{row.events.map(event => <li key={event.id}><p className="card-value">{words(event.action)} · {event.actorName} · {date(event.createdAt)} (Malaysia)</p><p>{words(event.previousStatus || 'Created')} → {words(event.newStatus)}</p>{event.reason ? <p className="card-description whitespace-pre-wrap">{event.reason}</p> : null}{event.retainTeam ? <p>Existing supervisory team and unfinished evaluation tasks acknowledged.</p> : null}</li>)}</ol></details>
  </article>;
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
  onRequestPage?: (page: number) => void;
  onRequestPageSize?: (size: number) => void;
  studentFilter?: number;
  onStudentFilter?: (studentId: number | undefined) => void;
};

export function ResearchAmendmentRouteContent({ routeView, routeRequestId, role, options, rows, revisions, busy, onAction, onNavigateToRequest, onNavigateToProfile, onNavigateToNew, requestForm, requestView = 'requests', requestSearch = '', requestPage = 1, requestPageSize, onRequestPage, onRequestPageSize }: ResearchNavigationProps & {
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
  if (routeView === 'detail') {
    const row = rows.find(request => String(request.id) === routeRequestId);
    return row ? <ResearchAmendmentCard row={row} busy={busy} studentView={studentView} lecturerView={lecturerView} presentation="detail" onAction={onAction} /> : <p role="status" className="card-description">Request not found. It may no longer be available or you may not have access to it.</p>;
  }
  if (routeView === 'new') {
    if (options.profile && ((studentView && options.canSubmitResearch) || ((role === 'Programme Coordinator' || role === 'Office Staff/Admin') && (options.canCorrect || options.canTransfer)))) return <>{requestForm}</>;
    return <p className="card-description">{studentView && rows.some(row => row.status.startsWith('PENDING')) ? 'You have a request awaiting a decision. You can submit another after it is resolved.' : 'You cannot request a research change at this time.'}</p>;
  }
  if (routeView === 'profile') return <>
    {options.profile ? <div className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="section-label">Current research profile</h3><Comparison before={options.profile} after={options.profile} initialRecord /></div> : <p className="card-description">{lecturerView && options.students.length ? 'Select a student to view their current research profile and saved revisions.' : 'No current research profile is available.'}</p>}
    {options.profile && revisions.length ? <div className="space-y-3"><h3 className="section-label">Research profile history</h3><p className="card-description">Saved research profiles, including the initial record and approved changes.</p>{revisions.map(revision => <ResearchRevisionCard key={revision.id} revision={revision} studentView={studentView} lecturerView={lecturerView} />)}</div> : options.profile ? <p className="card-description">No saved research revisions to display.</p> : null}
  </>;
  const visible = rows.filter(row => (requestGroup(row.status, row.canDecide) === 'history') === (requestView === 'history')
    && `${row.studentName} ${row.matricNo} ${row.id} ${row.after.title} ${researchChangeLabel(row)} Research request #${row.id} Research amendment #${row.id} Request #${row.id}`.toLowerCase().includes(requestSearch.trim().toLowerCase()))
    .sort((a, b) => (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * (requestView === 'history' ? -1 : 1));
  const pageSize = workspacePageSize(requestPageSize);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number.isFinite(requestPage) ? Math.floor(requestPage) : 1));
  const paged = visible.slice((page - 1) * pageSize, page * pageSize);
  const groups: RequestGroup[] = requestView === 'history' ? ['history'] : ['review', 'coordinator', 'other'];
  const table = (selected: ResearchAmendment[]) => <WorkspaceRecordTable label="Research change request records" identityLabel={studentView ? 'Research change' : 'Student'} hideRequestType={studentView} rows={selected.map(row => {
    const record = researchWorkspaceRecord(row, busy, () => onNavigateToRequest?.(String(row.id)));
    return studentView ? { ...record, studentName: record.kind ?? 'Research change', matricNo: '', actionLabel: 'View request' } : record;
  })} />;
  return <div className="space-y-5">
    {studentView ? <div className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="section-label">Current research profile</h3><p className="card-value">{options.profile?.title || 'Research title not recorded'}</p><PortalButton size="sm" onClick={() => onNavigateToProfile?.()}>View research profile</PortalButton>
      {options.canSubmitResearch && options.profile ? <PortalButton size="sm" variant="primary" onClick={onNavigateToNew}>Request research change</PortalButton> : rows.some(row => row.status.startsWith('PENDING')) ? <p className="card-description">You have a request awaiting a decision. You can submit another after it is resolved.</p> : null}</div> : null}
    {!studentView && !lecturerView && options.profile ? <div className="flex flex-wrap gap-2"><PortalButton onClick={() => onNavigateToProfile?.()}>View research profile</PortalButton>{options.canCorrect || options.canTransfer ? <PortalButton onClick={onNavigateToNew}>Request research change</PortalButton> : null}</div> : null}
    {studentView ? (paged.length ? table(paged) : null) : groups.map(group => {
      const selected = paged.filter(row => requestGroup(row.status, row.canDecide) === group);
      return selected.length ? <RequestGroupSection key={group} group={group} count={selected.length}>{table(selected)}</RequestGroupSection> : null;
    })}
    {!visible.length ? <p className="card-description rounded-lg bg-slate-50 p-4">{requestSearch ? 'No matching requests. Adjust the filters to see more records.' : requestView === 'history' ? 'No final request outcomes yet.' : studentView ? 'No research change requests to display.' : 'No ongoing research change requests.'}</p> : null}
    <WorkspacePagination page={page} pageCount={pageCount} total={visible.length} noun="requests" pageSize={pageSize} onPageSize={onRequestPageSize} onPage={value => onRequestPage?.(value)} />
  </div>;
}

export function ResearchRevisionCard({ revision, studentView = false, lecturerView = false }: { revision: ResearchRevision; studentView?: boolean; lecturerView?: boolean }) {
  const compactView = studentView || lecturerView;
  return <article className={compactView ? 'space-y-3 rounded-xl border border-slate-200 p-4' : 'space-y-2 rounded-xl border border-slate-200 p-3'}>
    <div className="space-y-1">
      <h3 className={compactView ? 'section-label' : 'card-value'}>{compactView && revision.kind === 'BASELINE' ? 'Initial record' : `Revision ${revision.revision} · ${words(revision.kind)}`}{!studentView && revision.studentName ? ` · ${revision.studentName}` : ''}</h3>
      <p className="card-description">{revision.actorName} · {date(revision.createdAt)} (Malaysia)</p>
    </div>
    <Comparison before={revision.before} after={revision.after} changedOnly={compactView} initialRecord={compactView && revision.kind === 'BASELINE'} afterLabel="Recorded" />
    {revision.reason ? <p className="card-description whitespace-pre-wrap">{revision.reason}</p> : null}
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
    {!studentView ? <label className="form-label block">Change type<select className={inputClass} disabled={busy} value={kind} onChange={event => setKind(event.target.value as typeof kind)}>{options.canSubmitResearch ? <option value="RESEARCH">Research title / abstract amendment</option> : null}{options.canCorrect ? <option value="CORRECTION">Typographical correction</option> : null}{options.canTransfer ? <option value="TRANSFER">Programme transfer</option> : null}</select></label> : null}
    {kind === 'TRANSFER' ? <label className="form-label block">Destination programme<select required className={inputClass} value={destinationProgramme} disabled={busy} onChange={event => setDestination(event.target.value)}><option value="">Select destination programme</option>{options.programmes.filter(programme => programme !== options.profile?.programme).map(programme => <option key={programme}>{programme}</option>)}</select></label> : <><label className="form-label block">Research title<input required className={inputClass} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label><label className="form-label block">Research abstract<textarea required rows={5} className={inputClass} value={abstract} disabled={busy} onChange={event => setAbstract(event.target.value)} /></label></>}
    <label className="form-label block">Reason<textarea required rows={2} className={inputClass} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></label>
    {kind === 'CORRECTION' ? <label className="card-description flex items-start gap-2 text-slate-700"><input type="checkbox" required disabled={busy} checked={unchanged} onChange={event => setUnchanged(event.target.checked)} />I confirm this corrects typography only and does not change the research meaning.</label> : <p className="card-description">{kind === 'RESEARCH' ? 'The primary supervisor endorses the request before the programme coordinator makes the final decision.' : 'The source programme coordinator reviews first, followed by the destination programme coordinator. Both must acknowledge the existing team and unfinished tasks.'}</p>}
    <PortalButton type="submit" variant="primary" isLoading={busy} disabled={!valid}>{kind === 'CORRECTION' ? 'Save audited correction' : 'Submit request'}</PortalButton>
  </form>;
}

export function ResearchAmendments({ onChanged, role, refreshVersion = 0, hideHeader = false, showRefresh = true, onBusyChange, routeView, routeRequestId, onNavigateToRequest, onNavigateToList, onNavigateToProfile, onNavigateToNew,
  requestView = 'requests', requestSearch = '', requestPage = 1, requestPageSize, onRequestViewChange, onRequestSearch, onRequestPage, onRequestPageSize, studentFilter, onStudentFilter,
}: { onChanged?: () => void; role?: UserRole; refreshVersion?: number; hideHeader?: boolean; showRefresh?: boolean; onBusyChange?: (busy: boolean) => void } & ResearchNavigationProps) {
  const studentView = role === 'Student';
  const lecturerView = role === 'Lecturer';
  const compactView = studentView || lecturerView;
  const routedView = routeView;
  const [options, setOptions] = useState<ResearchAmendmentOptions | null>(null);
  const [rows, setRows] = useState<ResearchAmendment[]>([]);
  const [revisions, setRevisions] = useState<ResearchRevision[]>([]);
  const [localStudentId, setLocalStudentId] = useListState<number | undefined>(`research:${role}`, 'studentId', undefined);
  const studentId = onStudentFilter ? studentFilter : localStudentId;
  const setStudentId = onStudentFilter ?? setLocalStudentId;
  // Detail routes resolve against every request returned by the authorised endpoint,
  // regardless of the student filter used on a previous list or profile page.
  const requestStudentId = routedView === 'detail' ? undefined : studentId;
  const scope = `${role ?? ''}:${routedView ?? 'embedded'}:${routeRequestId ?? ''}:${requestStudentId ?? ''}:${refreshVersion}`;
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
  const editPanel = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!compactView || !edit) return;
    editPanel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    editPanel.current?.querySelector('textarea')?.focus({ preventScroll: true });
  }, [edit, compactView]);
  const load = useCallback(async () => {
    const token = ++version.current;
    setLoading(true); setError(null);
    try { const [nextOptions, data] = await Promise.all([getResearchAmendmentOptions(requestStudentId), getResearchAmendments(requestStudentId)]); if (token === version.current && currentScope.current === scope) { setOptions(nextOptions); setRows(data.requests); setRevisions(data.revisions); setLoadedScope(scope); } }
    catch (failure) { if (token === version.current && currentScope.current === scope) { setOptions(null); setRows([]); setRevisions([]); setLoadedScope(scope); setError(failure instanceof Error ? failure.message : 'Research changes could not be loaded.'); } }
    finally { if (token === version.current) setLoading(false); }
  }, [requestStudentId, scope]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setEdit(null); setReason(''); setRetainTeam(false); setNotice(null); }, [role, routedView, routeRequestId, requestStudentId]);
  useEffect(() => { void load(); return () => { version.current += 1; }; }, [load]);
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
  useEffect(() => { onBusyChange?.(pageLoading || busy); }, [onBusyChange, pageLoading, busy]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  const heading = routedView === 'detail' ? 'Research change request' : routedView === 'profile' ? 'Research profile' : routedView === 'new' ? 'Request research change' : routedView === 'list' ? 'Research change requests' : compactView ? 'Research change requests' : 'Research amendments and programme transfers';
  const selectAction = (selected: ResearchAmendment, action: Action) => { setEdit({ row: selected, action }); setReason(''); setRetainTeam(false); setNotice(null); };
  const lecturerList = routedView === 'list' && !!onRequestViewChange;
  const studentSelector = !studentView && (!routedView || routedView === 'list' || routedView === 'profile') && options && options.students.length > 0 && !options.canSubmitResearch ? <label className="form-label min-w-48 flex-1">Student<select className={inputClass} value={studentId ?? ''} disabled={busy} onChange={event => { setStudentId(event.target.value ? Number(event.target.value) : undefined); setEdit(null); }}><option value="">{lecturerList ? 'All students' : 'Select a student to view their profile and history'}</option>{options.students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.matricNo} · {student.programme}</option>)}</select></label> : null;
  const decisionForm = edit ? <form ref={editPanel} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4" onSubmit={event => { event.preventDefault(); if (edit.action !== 'APPROVE' && !reason.trim()) return; if (edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement && !retainTeam) return; void run(() => edit.action === 'CANCEL' ? cancelResearchAmendment(edit.row.id, reason.trim()) : decideResearchAmendment(edit.row.id, { decision: edit.action, expectedStatus: edit.row.status, reason: reason.trim(), ...(retainTeam ? { retainTeam: true } : {}) })); }}>
        <h3 className="card-value">{edit.action === 'CANCEL' ? 'Cancel request' : edit.action === 'APPROVE' && edit.row.status === 'PENDING_SUPERVISOR' ? 'Endorse request' : `${words(edit.action)} request`} #{edit.row.id} · {edit.row.studentName}</h3>
        <label className="form-label block">{edit.action === 'APPROVE' ? 'Decision note (optional)' : 'Reason (required)'}<textarea className={inputClass} required={edit.action !== 'APPROVE'} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
        {edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement ? <label className="card-description flex items-start gap-2 text-slate-700"><input required type="checkbox" checked={retainTeam} disabled={busy} onChange={event => setRetainTeam(event.target.checked)} />I acknowledge retention of the existing primary supervisor, co-supervisors, panel and {edit.row.unfinishedTaskCount} unfinished evaluation tasks shown in this request.</label> : null}
        <div className="flex gap-2"><PortalButton type="submit" variant="primary" isLoading={busy} disabled={(edit.action !== 'APPROVE' && !reason.trim()) || (edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement && !retainTeam)}>Confirm decision</PortalButton><PortalButton type="button" disabled={busy} onClick={() => setEdit(null)}>Cancel</PortalButton></div>
      </form> : null;
  const localRecord = rows.find(row => row.id === localDetail);
  return <><section className={compactView || routedView ? 'space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm' : 'mt-6 space-y-4 border-t border-slate-200 pt-5'} aria-label={compactView || routedView ? 'Research change requests' : 'Research amendments and programme transfers'}>
    {!hideHeader && routedView && routedView !== 'list' ? <PortalButton size="sm" onClick={onNavigateToList}>Back to research changes</PortalButton> : null}
    {!hideHeader || showRefresh ? <WorkspaceSectionHeader title={hideHeader ? undefined : heading} description={compactView || routedView ? routedView === 'profile' ? 'View the current research record and saved revisions.' : routedView === 'new' ? 'The primary supervisor endorses research changes before the programme coordinator makes the final decision.' : routedView === 'detail' ? 'Compare changed fields and follow the recorded submissions and decisions for this request.' : studentView ? 'Track requests to update your research title or abstract. Open a request to see what changed and who reviewed it.' : 'Review research changes and follow their recorded progress and outcomes.' : undefined}
      actions={<>{lecturerList && onRequestViewChange ? <RequestViewSwitch view={requestView} reviewCount={pageLoading || error ? 0 : rows.filter(row => requestGroup(row.status, row.canDecide) === 'review').length} onChange={onRequestViewChange} /> : null}{showRefresh ? <PortalButton size="sm" disabled={pageLoading || busy} onClick={() => void load()}>Refresh research changes</PortalButton> : null}</>} /> : null}
    {notice ? <p role="status" className="card-description rounded-lg bg-slate-50 p-3">{notice}</p> : null}
    {pageLoading ? <LoadingState message="Loading research changes…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : options ? <>
      {lecturerList && onRequestSearch ? <RequestFilters search={requestSearch} onSearch={onRequestSearch}>{studentSelector}{studentId ? <PortalButton size="sm" onClick={() => onNavigateToProfile?.()}>View research profile</PortalButton> : null}</RequestFilters> : studentSelector ? <div className="flex flex-wrap items-end gap-3">{studentSelector}</div> : null}
      {lecturerView && routedView === 'detail' && rows.some(row => String(row.id) === routeRequestId) ? <PortalButton size="sm" onClick={() => onNavigateToProfile?.(rows.find(row => String(row.id) === routeRequestId)!.studentId)}>View research profile</PortalButton> : null}
      {!routedView ? studentView ? options.canSubmitResearch ? <details><summary className="card-value cursor-pointer text-blue-600">Request a research change</summary><div className="mt-3">{requestForm}</div></details> : rows.some(row => row.status.startsWith('PENDING')) ? <p className="card-description rounded-lg bg-slate-50 p-3">You have a request awaiting a decision. You can submit another after it is resolved.</p> : null : (options.canCorrect || options.canTransfer || options.canSubmitResearch) ? <PortalButton disabled={busy} onClick={() => setLocalNew(true)}>Request research change</PortalButton> : null : null}
      {compactView || routedView ? decisionForm : null}
      {routedView ? <ResearchAmendmentRouteContent routeView={routedView} routeRequestId={routeRequestId} role={role} options={options} rows={rows} revisions={revisions} busy={busy} onAction={selectAction} requestForm={requestForm} onNavigateToRequest={onNavigateToRequest} onNavigateToProfile={onNavigateToProfile} onNavigateToNew={onNavigateToNew} requestView={requestView} requestSearch={requestSearch} requestPage={requestPage} requestPageSize={requestPageSize} onRequestPage={onRequestPage} onRequestPageSize={onRequestPageSize} /> : <>
        {compactView ? rows.map(row => <ResearchAmendmentCard key={row.id} row={row} studentView={studentView} lecturerView={lecturerView} busy={busy} onAction={selectAction} />) : <WorkspaceRecordTable label="Research change request records" rows={rows.map(row => researchWorkspaceRecord(row, busy, () => setLocalDetail(row.id)))} />}
        {!rows.length ? <p className="card-description">No research amendment or transfer requests to display.</p> : null}
        {revisions.length ? <details><summary className="card-value cursor-pointer">{compactView ? 'Research profile history' : 'Research revision history'} ({revisions.length})</summary>{studentView ? <p className="card-description mt-2">Saved research profiles, including your initial record and approved changes.</p> : null}<div className="mt-3 space-y-3">{revisions.map(revision => <ResearchRevisionCard key={revision.id} revision={revision} studentView={studentView} lecturerView={lecturerView} />)}</div></details> : null}
      </>}
    </> : null}
  </section>
  {!compactView && localDetail !== null ? <RecordPage title="Research change request" backLabel="Back to Supervisor Appointments" onBack={() => { setLocalDetail(null); setEdit(null); setReason(''); setRetainTeam(false); }} pageKey={`staff-research:${localDetail}`} dirty={!!edit && (!!reason.trim() || retainTeam)} busy={busy}>
    {notice ? <p role="status" className="card-description">{notice}</p> : null}
    {pageLoading ? <LoadingState message="Loading research changes…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : localRecord ? <>{decisionForm}<ResearchAmendmentCard row={localRecord} busy={busy} onAction={selectAction} presentation="detail" /></> : <p className="card-description">This request is unavailable or outside your authorised scope.</p>}
  </RecordPage> : null}
  {!compactView && localNew ? <RecordPage title="Request research change" backLabel="Back to Supervisor Appointments" onBack={() => setLocalNew(false)} pageKey="staff-research-new" busy={busy}>{requestForm}{notice ? <p role="status" className="card-description">{notice}</p> : null}</RecordPage> : null}
  </>;
}
