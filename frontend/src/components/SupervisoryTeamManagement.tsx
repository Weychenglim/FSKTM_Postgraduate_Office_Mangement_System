import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { decideCoSupervisor, endCoSupervisor, getCoSupervisorCandidates, getSupervisoryWorkspace, nominateCoSupervisor } from '../services/coSupervisionApi';
import { ApiError } from '../services/apiClient';
import type { CoSupervisorAction, CoSupervisorAppointment, CoSupervisorCandidate, CoSupervisorNomination, CoSupervisorOutcome, SupervisoryTeam, SupervisoryWorkspace, TeamAudit } from '../types/coSupervision';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { ResearchAmendments } from './ResearchAmendments';
import { CapacityReassessments } from './CapacityReassessments';
import type { UserRole } from '../types/auth';
import { formatMalaysiaDate } from '../utils/malaysiaDateTime';
import { StudentAppointmentSection, StudentAppointmentMemberCard } from './StudentAppointmentPrimitives';
import { AppointmentMemberCard } from './AppointmentPrimitives';

const inputClass = 'form-control form-control-sm mt-1';
const labels: Record<CoSupervisorAction, string> = { accept: 'Accept', reject: 'Reject', approve: 'Approve', 'coordinator-reject': 'Reject', cancel: 'Cancel nomination' };
const statusLabels: Record<string, string> = { SUBMITTED_TO_CO_SUPERVISOR: 'Awaiting co-supervisor', PENDING_COORDINATOR: 'Awaiting coordinator', APPROVED: 'Approved', REJECTED_BY_CO_SUPERVISOR: 'Rejected by co-supervisor', REJECTED_BY_COORDINATOR: 'Rejected by coordinator', CANCELLED: 'Cancelled', ACTIVE: 'Active', ENDED: 'Ended' };
const displayDate = formatMalaysiaDate;

export function SupervisoryTeamTimeline({ entries, kind }: {
  entries: SupervisoryTeam['timeline']; kind?: 'appointments' | 'semester';
}) {
  const timelineStatusLabels: Record<string, string> = { ...statusLabels, FACULTY_PROCESSING: 'Faculty processing', CONFIRMED: 'Confirmed' };
  if (kind) {
    const selected = (entries ?? []).filter(entry => String(entry.id).startsWith('timeline-') === (kind === 'semester'));
    return selected.length ? <ol className="divide-y divide-slate-200">{selected.map(entry => {
      const status = entry.status?.toUpperCase() ?? '';
      const label = timelineStatusLabels[status] ?? entry.status?.replaceAll('_', ' ').toLowerCase();
      const tone = status.startsWith('REJECTED') ? 'danger' : ['APPROVED','ACTIVE','CONFIRMED','COMPLETED'].includes(status) ? 'success' : status.startsWith('PENDING') || status.startsWith('SUBMITTED') ? 'warning' : 'neutral';
      return <li key={entry.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1"><p className="card-value break-words">{entry.title}</p>{entry.date ? <p className="card-description">{kind === 'semester' ? 'Date' : String(entry.id).startsWith('co-') ? 'Recorded' : 'Last updated'}: {displayDate(entry.date)}</p> : null}</div>
        {label ? <div className="shrink-0"><StatusBadge tone={tone}>{label}</StatusBadge></div> : null}
      </li>;
    })}</ol> : null;
  }
  return entries?.length ? <details>
    <summary className="card-value cursor-pointer">Timeline and progress</summary>
    <ol className="card-description mt-2 space-y-2">{entries.map(entry => <li key={entry.id}>
      {entry.title}{entry.date ? ` · ${displayDate(entry.date)}` : ''}
      {entry.status ? ` · ${timelineStatusLabels[entry.status] ?? entry.status.replaceAll('_', ' ').toLowerCase()}` : ''}
    </li>)}</ol>
  </details> : null;
}

function TeamHistory({ events }: { events: TeamAudit[] }) {
  return events.length ? <details className="card-description mt-3">
    <summary className="card-value cursor-pointer">Audit history ({events.length})</summary>
    <ol className="mt-2 space-y-2 border-l border-slate-200 pl-3">{events.map(event => <li key={event.id}>
      <span className="card-value">{event.action.replaceAll('_', ' ')}</span> · {event.actor} · {displayDate(event.createdAt)}
      {event.reason ? <p className="card-description mt-1 whitespace-pre-wrap">{event.reason}</p> : null}
    </li>)}</ol>
  </details> : null;
}

export function CoSupervisorNominationCard({ nomination: row, busy, onAction }: {
  nomination: CoSupervisorNomination; busy: boolean; onAction: (row: CoSupervisorNomination, action: CoSupervisorAction) => void;
}) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h4 className="section-label">{row.candidate.name}</h4><p className="card-description">{row.studentName} · {row.matricNo}</p></div>
      <StatusBadge tone={row.status === 'APPROVED' ? 'success' : row.allowedActions.length ? 'warning' : 'neutral'}>{statusLabels[row.status]}</StatusBadge>
    </div>
    <p className="card-description mt-2 whitespace-pre-wrap text-slate-700">{row.justification}</p>
    <p className="card-description mt-2">Nominated by {row.nominator.name} · {displayDate(row.submittedAt)}{row.replacesAppointmentId ? ' · Replacement nomination' : ''}</p>
    {row.waitingDays != null ? <p className="card-description mt-1 text-amber-800">Waiting on {row.responsibleStage === 'PROGRAMME_COORDINATOR' ? 'programme coordinator' : 'co-supervisor'} · {row.waitingDays} calendar days</p> : null}
    {row.reason ? <p className="card-description mt-2">Reason: {row.reason}</p> : null}
    {row.allowedActions.length ? <div className="mt-3 flex flex-wrap gap-2">{row.allowedActions.map(action =>
      <PortalButton key={action} size="sm" disabled={busy} variant={action === 'accept' || action === 'approve' ? 'primary' : 'secondary'} onClick={() => onAction(row, action)}>{labels[action]}</PortalButton>)}</div> : null}
    <TeamHistory events={row.history} />
  </article>;
}

export function CoSupervisorAppointmentCard({ appointment: row, busy, canReplace, onEnd, onReplace, compact = false }: {
  appointment: CoSupervisorAppointment; busy: boolean; canReplace: boolean; compact?: boolean; onEnd: (row: CoSupervisorAppointment) => void; onReplace: (row: CoSupervisorAppointment) => void;
}) {
  return <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h4 className="section-label">{row.supervisor.name}</h4><p className="card-description">{compact ? null : <>Co-supervisor · {row.studentName} · </>}Since {displayDate(row.appointmentDate)}</p></div>
      <StatusBadge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{statusLabels[row.status]}</StatusBadge>
    </div>
    {row.status === 'ENDED' ? <p className="card-description mt-2">{row.endOutcome} · {row.endReason}{row.endedAt ? ` · ${displayDate(row.endedAt)}` : ''}</p> : null}
    {row.supersedesId ? <p className="card-description mt-1">Replaces appointment #{row.supersedesId}</p> : null}
    <div className="mt-2 flex flex-wrap gap-2">
      {canReplace ? <PortalButton size="sm" disabled={busy} onClick={() => onReplace(row)}>Replace</PortalButton> : null}
      {row.canEnd ? <PortalButton size="sm" variant="danger" disabled={busy} onClick={() => onEnd(row)}>End appointment</PortalButton> : null}
    </div>
    <TeamHistory events={row.history} />
  </article>;
}

function NominationForm({ team, replacement, busy, onSubmit, onCancel }: {
  team: SupervisoryTeam; replacement: CoSupervisorAppointment | null; busy: boolean;
  onSubmit: (candidateId: number, justification: string) => void; onCancel: () => void;
}) {
  const [candidates, setCandidates] = useState<CoSupervisorCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [candidateId, setCandidateId] = useState('');
  const [justification, setJustification] = useState('');
  useEffect(() => {
    let current = true;
    setLoading(true); setError(null);
    getCoSupervisorCandidates(team.studentId).then(rows => { if (current) setCandidates(rows); })
      .catch(failure => { if (current) setError(failure instanceof Error ? failure.message : 'Candidates could not be loaded.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [team.studentId, attempt]);
  const selected = candidates.find(row => String(row.id) === candidateId);
  return <form className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3" onSubmit={event => { event.preventDefault(); if (selected?.selectable && justification.trim() && !busy) onSubmit(selected.id, justification.trim()); }}>
    <h4 className="section-label">{replacement ? `Replace ${replacement.supervisor.name}` : 'Nominate a co-supervisor'}</h4>
    <p className="card-description">{replacement ? 'The current appointment continues until the replacement is approved. ' : ''}The lecturer accepts before programme coordinator approval. Each approved appointment uses one supervision slot.</p>
    {loading ? <LoadingState message="Loading eligible lecturers…" /> : error ? <ErrorState message={error} onRetry={() => setAttempt(value => value + 1)} /> : <label className="form-label block">Lecturer
      <select className={inputClass} required value={candidateId} disabled={busy} onChange={event => setCandidateId(event.target.value)}>
        <option value="">Select a lecturer</option>
        {candidates.map(candidate => <option key={candidate.id} value={candidate.id} disabled={!candidate.selectable}>{candidate.name} · {candidate.activeLoad}/{candidate.limit ?? 'Unconfigured'} · {candidate.reason || candidate.capacityState.replaceAll('_', ' ').toLowerCase()}{candidate.unavailableUntil ? ` until ${candidate.unavailableUntil}` : ''}</option>)}
      </select>
    </label>}
    {!loading && !error && candidates.length === 0 ? <p className="card-description">No eligible lecturers are available.</p> : null}
    <label className="form-label block">Justification<textarea className={inputClass} required rows={3} value={justification} disabled={busy} onChange={event => setJustification(event.target.value)} /></label>
    <div className="flex gap-2"><PortalButton type="submit" variant="primary" isLoading={busy} disabled={loading || !!error || !selected?.selectable || !justification.trim()}>Submit nomination</PortalButton><PortalButton type="button" disabled={busy} onClick={onCancel}>Cancel</PortalButton></div>
  </form>;
}

type EditAction = { kind: 'nominate'; team: SupervisoryTeam; replacement: CoSupervisorAppointment | null }
  | { kind: 'decision'; nomination: CoSupervisorNomination; action: CoSupervisorAction }
  | { kind: 'end'; appointment: CoSupervisorAppointment };

export function StudentSupervisorsOverview({ workspace, actions, overviewOnly = false }: { workspace: SupervisoryWorkspace; actions?: React.ReactNode; overviewOnly?: boolean }) {
  const team = workspace.teams[0];
  const supporting = (team?.appointments ?? []).filter(row => row.status === 'ACTIVE');
  const previous = workspace.appointments.filter(row => row.status === 'ENDED');
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <StudentAppointmentMemberCard label="Primary supervisor" name={team?.primarySupervisor?.name ?? 'Supervisor not appointed'} status={team?.primarySupervisor ? 'Active' : 'Not appointed'} tone={team?.primarySupervisor ? 'success' : 'neutral'} actions={actions} />
      <div className="space-y-2 rounded-xl border border-slate-200 p-4"><p className="card-label">Supporting supervisors</p>{supporting.length ? supporting.map(row => <div key={row.id} className="space-y-1"><h3 className="section-label">{row.supervisor.name}</h3><p className="card-description">Co-supervisor · Active since {displayDate(row.appointmentDate)}</p></div>) : <p className="card-description">No supporting supervisors assigned.</p>}</div>
    </div>
    {team?.research.title ? <div className="space-y-2"><p className="card-label">Current research title</p><p className="card-value break-words">{team.research.title}</p>{!overviewOnly ? <details><summary className="card-value cursor-pointer text-blue-600">Research profile</summary><dl className="mt-3 space-y-3 rounded-xl bg-slate-50 p-4"><div><dt className="card-label">Programme</dt><dd className="card-description mt-1">{team.programme}</dd></div><div><dt className="card-label">Research area</dt><dd className="card-description mt-1">{team.research.area || 'Not recorded'}</dd></div><div><dt className="card-label">Abstract</dt><dd className="card-description mt-1 whitespace-pre-wrap break-words text-slate-700">{team.research.abstract || 'Not recorded'}</dd></div></dl></details> : null}</div> : null}
    {!overviewOnly && (workspace.nominations.length || previous.length) ? <details><summary className="card-value cursor-pointer">Supporting appointment history</summary><div className="mt-3 space-y-3">{previous.map(row => <CoSupervisorAppointmentCard key={row.id} appointment={{...row, canEnd: false}} busy={false} canReplace={false} onEnd={() => {}} onReplace={() => {}} />)}{workspace.nominations.map(row => <CoSupervisorNominationCard key={row.id} nomination={{...row, allowedActions: []}} busy={false} onAction={() => {}} />)}</div></details> : null}
  </div>;
}

export function LecturerSupervisoryTeamCard({ team, busy, initiallyOpen = false, collapsible = true, onNominate, onEnd, onReplace, onNominationAction }: {
  team: SupervisoryTeam; busy: boolean; initiallyOpen?: boolean; collapsible?: boolean;
  onNominate: () => void; onEnd: (row: CoSupervisorAppointment) => void;
  onReplace: (row: CoSupervisorAppointment) => void;
  onNominationAction: (row: CoSupervisorNomination, action: CoSupervisorAction) => void;
}) {
  const supporting = team.appointments.filter(row => row.status === 'ACTIVE');
  const previous = team.appointments.filter(row => row.status !== 'ACTIVE');
  const activity = (team.timeline ?? []).filter(entry => !String(entry.id).startsWith('timeline-'));
  const dates = (team.timeline ?? []).filter(entry => String(entry.id).startsWith('timeline-'));
  const Wrapper = collapsible ? 'details' : 'article';
  const heading = <><span className="section-label">{team.studentName}</span>{' '}<span className="card-description ml-2">{team.matricNo}</span></>;
  return <Wrapper className="rounded-xl border border-slate-200 p-4" {...(collapsible ? { open: initiallyOpen } : {})}>
    {collapsible ? <summary className="cursor-pointer">{heading}</summary> : <h3>{heading}</h3>}
    <div className="mt-5 space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <AppointmentMemberCard label="Primary supervisor" name={team.primarySupervisor?.name ?? 'Supervisor not appointed'}
          status={team.primarySupervisor ? 'Active' : 'Not appointed'} tone={team.primarySupervisor ? 'success' : 'neutral'} />
        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><p className="card-label">Supporting supervisors ({supporting.length}/2)</p>{team.canNominate ? <PortalButton size="sm" disabled={busy} onClick={onNominate}>Nominate co-supervisor</PortalButton> : null}</div>
          {supporting.length ? supporting.map(row => <CoSupervisorAppointmentCard key={row.id} appointment={row} busy={busy}
            compact canReplace={team.canNominate && !team.nominations.some(nomination => nomination.replacesAppointmentId === row.id && ['SUBMITTED_TO_CO_SUPERVISOR','PENDING_COORDINATOR'].includes(nomination.status))}
            onEnd={onEnd} onReplace={onReplace} />) : <p className="card-description">No supporting supervisors assigned.</p>}
        </div>
      </div>
      <div className="space-y-2"><p className="card-label">Current research title</p><p className="card-value break-words">{team.research.title || 'Research profile pending'}</p></div>
      <details className="border-t border-slate-200 pt-4"><summary className="card-value cursor-pointer">Research profile</summary>
        <dl className="mt-3 space-y-4 rounded-xl bg-slate-50 p-4">
          <div><dt className="card-label">Programme</dt><dd className="card-description mt-1">{team.programme}</dd></div>
          <div><dt className="card-label">Enrolment status</dt><dd className="card-description mt-1">{team.studentStatus}</dd></div>
          <div><dt className="card-label">Research area</dt><dd className="card-description mt-1">{team.research.area || 'Not recorded'}</dd></div>
          <div><dt className="card-label">Abstract</dt><dd className="card-description mt-1 max-w-prose whitespace-pre-wrap break-words">{team.research.abstract || 'Not recorded'}</dd></div>
        </dl>
      </details>
      {previous.length || team.nominations.length ? <details className="border-t border-slate-200 pt-4"><summary className="card-value cursor-pointer">Supporting appointment history ({previous.length + team.nominations.length})</summary>
        <div className="mt-3 space-y-3">{previous.map(row => <CoSupervisorAppointmentCard key={row.id} compact appointment={row} busy={busy} canReplace={false} onEnd={onEnd} onReplace={onReplace} />)}{team.nominations.map(row => <CoSupervisorNominationCard key={row.id} nomination={row} busy={busy} onAction={onNominationAction} />)}</div>
      </details> : null}
      {activity.length ? <details className="border-t border-slate-200 pt-4"><summary className="card-value cursor-pointer">Appointment activity ({activity.length})</summary>
        <p className="card-description mt-3">Applications show their latest recorded status. Supporting-supervisor entries come from recorded appointment events.</p>
        <SupervisoryTeamTimeline entries={team.timeline} kind="appointments" />
      </details> : null}
      {dates.length ? <details className="border-t border-slate-200 pt-4"><summary className="card-value cursor-pointer">Semester dates ({dates.length})</summary>
        <p className="card-description mt-3">Office-managed dates for the current semester. These shared schedule statuses do not measure this student’s research progress.</p>
        <SupervisoryTeamTimeline entries={team.timeline} kind="semester" />
      </details> : null}
    </div>
  </Wrapper>;
}

export type SupervisoryTeamView = 'studentOverview' | 'studentHistory' | 'requests' | 'roster' | 'detail' | 'history';

export function SupervisoryTeamRouteContent({ workspace, view, routeStudentId, studentActions, busy, search, page, onSearch, onPage, onNavigateToStudent, onNominate, onEnd, onReplace, onNominationAction }: {
  workspace: SupervisoryWorkspace; view: SupervisoryTeamView; routeStudentId?: string; studentActions?: React.ReactNode;
  busy: boolean; search: string; page: number; onSearch: (value: string) => void; onPage: (value: number) => void;
  onNavigateToStudent?: (matricNo: string) => void; onNominate: (team: SupervisoryTeam) => void;
  onEnd: (row: CoSupervisorAppointment) => void; onReplace: (team: SupervisoryTeam, row: CoSupervisorAppointment) => void;
  onNominationAction: (row: CoSupervisorNomination, action: CoSupervisorAction) => void;
}) {
  if (view === 'studentOverview') return <StudentSupervisorsOverview workspace={workspace} actions={studentActions} overviewOnly />;
  if (view === 'detail') {
    const team = workspace.teams.find(row => row.matricNo === routeStudentId);
    return team ? <LecturerSupervisoryTeamCard key={team.matricNo} team={team} busy={busy} initiallyOpen collapsible={false}
      onNominate={() => onNominate(team)} onEnd={onEnd} onReplace={row => onReplace(team, row)} onNominationAction={onNominationAction} />
      : <EmptyState title="Supervision not found" description="This student is not available in your supervisory workspace." />;
  }
  const query = search.trim().toLowerCase();
  const unique = <T extends { id: number },>(rows: T[]) => [...new Map(rows.map(row => [row.id, row])).values()];
  const appointments = unique([...workspace.appointments, ...workspace.teams.flatMap(team => team.appointments)]).filter(row => row.status === 'ENDED');
  const nominations = unique([...workspace.nominations, ...workspace.teams.flatMap(team => team.nominations)]);
  if (view === 'studentHistory' || view === 'history') {
    const closed = view === 'studentHistory' ? nominations : nominations.filter(row => !row.allowedActions.length);
    return appointments.length || closed.length ? <div className="space-y-3">
      <h3 className="section-label">Supporting appointment history</h3>
      {appointments.map(row => <CoSupervisorAppointmentCard key={row.id} appointment={{ ...row, canEnd: false }} busy={busy} canReplace={false} onEnd={() => {}} onReplace={() => {}} />)}
      {closed.map(row => <CoSupervisorNominationCard key={row.id} nomination={{ ...row, allowedActions: [] }} busy={busy} onAction={() => {}} />)}
    </div> : <EmptyState title="No supporting appointment history" description="Recorded supporting appointments and nominations will appear here." />;
  }
  const searchField = <label className="form-label block">Find a student<input className={inputClass} type="search" value={search} placeholder={view === 'requests' ? 'Name, matric number or candidate' : 'Name, matric number, programme or research title'} onChange={event => onSearch(event.target.value)} /></label>;
  if (view === 'requests') {
    const reviews = nominations.filter(row => row.allowedActions.length && `${row.studentName} ${row.matricNo} ${row.candidate.name}`.toLowerCase().includes(query));
    return <div className="space-y-4">{searchField}{reviews.length ? <div className="space-y-3"><h3 className="section-label">Nominations requiring action ({reviews.length})</h3>{reviews.map(row => <CoSupervisorNominationCard key={row.id} nomination={row} busy={busy} onAction={onNominationAction} />)}</div> : <EmptyState title={query ? 'No matching nominations' : 'No nominations requiring action'} description="Supporting-supervisor nominations awaiting your decision will appear here." />}</div>;
  }
  const teams = workspace.teams.filter(team => `${team.studentName} ${team.matricNo} ${team.programme} ${team.research.title}`.toLowerCase().includes(query));
  const pageCount = Math.max(1, Math.ceil(teams.length / 8));
  const currentPage = Math.max(1, Math.min(page, pageCount));
  return <div className="space-y-4">{searchField}{teams.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200">
    <table className="data-table min-w-[720px] text-xs"><thead><tr className="data-thead"><th className="data-th">Student</th><th className="data-th">Programme</th><th className="data-th">Research title</th><th className="data-th text-right">Action</th></tr></thead>
      <tbody>{teams.slice((currentPage - 1) * 8, currentPage * 8).map(team => <tr key={team.studentId} className="data-row">
        <td className="data-td"><p className="card-value">{team.studentName}</p><p className="card-description">{team.matricNo}</p></td>
        <td className="data-td">{team.programme}</td><td className="data-td max-w-sm break-words">{team.research.title || 'Research profile pending'}</td>
        <td className="data-td text-right"><PortalButton size="sm" disabled={!onNavigateToStudent} onClick={() => onNavigateToStudent?.(team.matricNo)} aria-label={`View supervision for ${team.studentName}`}>View supervision</PortalButton></td>
      </tr>)}</tbody>
    </table></div> : <EmptyState title={query ? 'No matching supervisees' : 'No current supervisees'} description="Students in your current primary and supporting supervisory teams will appear here." />}
    {teams.length > 8 ? <div className="card-description flex items-center justify-between"><PortalButton size="sm" disabled={currentPage === 1} onClick={() => onPage(currentPage - 1)}>Previous</PortalButton><span>Page {currentPage} of {pageCount}</span><PortalButton size="sm" disabled={currentPage === pageCount} onClick={() => onPage(currentPage + 1)}>Next</PortalButton></div> : null}
  </div>;
}

export function SupervisoryTeamManagement({ onChanged, role, refreshVersion = 0, studentActions, onRefresh, showResearchChanges = true, view, routeStudentId, onNavigateToStudent }: { onChanged?: () => void; role?: UserRole; refreshVersion?: number; studentActions?: React.ReactNode; onRefresh?: () => void; showResearchChanges?: boolean; view?: SupervisoryTeamView; routeStudentId?: string; onNavigateToStudent?: (matricNo: string) => void }) {
  const [workspace, setWorkspace] = useState<SupervisoryWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditAction | null>(null);
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState<CoSupervisorOutcome>('COMPLETED');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const version = useRef(0);
  const mutating = useRef(false);
  const editPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { setEdit(null); setReason(''); setOutcome('COMPLETED'); setSearch(''); setPage(1); setNotice(null); }, [view, routeStudentId]);
  useEffect(() => {
    if (!edit) return;
    editPanel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    editPanel.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus({ preventScroll: true });
  }, [edit]);
  const load = useCallback(async () => {
    const token = ++version.current;
    setLoading(true); setError(null);
    try { const data = await getSupervisoryWorkspace(); if (version.current === token) setWorkspace(data); }
    catch (failure) { if (version.current === token) { setWorkspace(null); setError(failure instanceof Error ? failure.message : 'The supervisory team could not be loaded.'); } }
    finally { if (version.current === token) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { version.current += 1; }; }, [load, refreshVersion, view, routeStudentId]);
  const run = async (operation: () => Promise<unknown>) => {
    if (mutating.current) return;
    mutating.current = true; setBusy(true); setNotice(null);
    try { await operation(); setEdit(null); setReason(''); setNotice('Supervisory team updated.'); onChanged?.(); await load(); }
    catch (failure) {
      setNotice(failure instanceof Error ? failure.message : 'The change could not be saved.');
      if (failure instanceof ApiError && failure.status === 409) await load();
    } finally { mutating.current = false; setBusy(false); }
  };
  const begin = (value: EditAction) => { setEdit(value); setReason(''); setOutcome('COMPLETED'); setNotice(null); };
  const query = search.trim().toLowerCase();
  const teams = (workspace?.teams ?? []).filter(team => `${team.studentName} ${team.matricNo} ${team.programme}`.toLowerCase().includes(query));
  const pageCount = Math.max(1, Math.ceil(teams.length / 8));
  const currentPage = Math.min(page, pageCount);
  const teamIds = new Set(workspace?.teams.map(team => team.studentId));
  const reviews = workspace?.nominations.filter(row => row.allowedActions.length && `${row.studentName} ${row.matricNo} ${row.candidate.name}`.toLowerCase().includes(query)) ?? [];
  const history = workspace?.appointments.filter(row => !teamIds.has(row.studentId)) ?? [];
  const historicalNominations = workspace?.nominations.filter(row => !teamIds.has(row.studentId) && !row.allowedActions.length) ?? [];
  const routeContent = workspace && view ? <SupervisoryTeamRouteContent workspace={workspace} view={view} routeStudentId={routeStudentId} studentActions={studentActions} busy={busy} search={search} page={page}
    onSearch={value => { setSearch(value); setPage(1); }} onPage={setPage} onNavigateToStudent={onNavigateToStudent}
    onNominate={team => begin({ kind: 'nominate', team, replacement: null })} onEnd={appointment => begin({ kind: 'end', appointment })}
    onReplace={(team, replacement) => begin({ kind: 'nominate', team, replacement })} onNominationAction={(nomination, action) => begin({ kind: 'decision', nomination, action })} /> : null;
  if (role === 'Student') return <StudentAppointmentSection id="supervisory-team-management" title={view === 'studentHistory' ? 'Supporting appointment history' : 'My supervisors'} description={view === 'studentHistory' ? 'Your recorded supporting appointments and nominations.' : 'Your primary supervisor and supporting supervisors.'} onRefresh={onRefresh ?? (() => void load())} refreshing={loading}>
    {loading ? <LoadingState message="Loading your supervisors…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : workspace ? view ? routeContent : <StudentSupervisorsOverview workspace={workspace} actions={studentActions} /> : null}
  </StudentAppointmentSection>;
  return <section id="supervisory-team-management" className="font-sans space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="section-label flex items-center gap-2"><Users className="h-5 w-5" />{view === 'roster' ? 'My supervisees' : view === 'requests' ? 'Supporting-supervisor requests' : view === 'detail' ? 'Supervision details' : view === 'history' ? 'Supporting appointment history' : 'Supervisory teams'}</h2><p className="card-description mt-1">One primary supervisor and up to two supporting co-supervisors.</p></div>
      <PortalButton size="sm" icon={RefreshCw} disabled={busy || loading} onClick={() => void load()}>Refresh teams</PortalButton>
    </div>
    {role !== 'Lecturer' ? <p className="card-description">The primary supervisor manages Panel nominations and supervisor Marks. Supporting appointments provide research and progress access.</p> : null}
    {notice ? <p role="status" className="card-description rounded-lg border border-slate-200 bg-slate-50 p-3">{notice}</p> : null}
    <div ref={editPanel}>
    {edit?.kind === 'nominate' ? <NominationForm key={`${edit.team.studentId}-${edit.replacement?.id ?? 'new'}`} team={edit.team} replacement={edit.replacement} busy={busy} onCancel={() => setEdit(null)} onSubmit={(candidateId, justification) => void run(() => nominateCoSupervisor({ studentId: edit.team.studentId, candidateId, justification, ...(edit.replacement ? { replacesAppointmentId: edit.replacement.id } : {}) }))} /> : null}
    {edit && edit.kind !== 'nominate' ? <form className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4" onSubmit={event => {
      event.preventDefault();
      const needsReason = edit.kind === 'end' || !['accept', 'approve'].includes(edit.action);
      if (needsReason && !reason.trim()) return;
      void run(() => edit.kind === 'end' ? endCoSupervisor(edit.appointment.id, outcome, reason.trim()) : decideCoSupervisor(edit.nomination.id, edit.action, reason.trim()));
    }}>
      <h3 className="card-value">{edit.kind === 'end' ? `End appointment: ${edit.appointment.supervisor.name}` : `${labels[edit.action]}: ${edit.nomination.candidate.name}`}</h3>
      {edit.kind === 'end' ? <label className="form-label block">Outcome<select className={inputClass} value={outcome} onChange={event => setOutcome(event.target.value as CoSupervisorOutcome)} disabled={busy}><option value="COMPLETED">Completed</option><option value="WITHDRAWN">Withdrawn</option><option value="OTHER">Other</option></select></label> : null}
      {edit.kind === 'end' || !['accept', 'approve'].includes(edit.action) ? <label className="form-label block">Reason<textarea className={inputClass} required rows={2} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label> : <p className="card-description">Confirm this decision for {edit.nomination.studentName}. The current eligibility and appointment rules will be checked again.</p>}
      <div className="flex gap-2"><PortalButton type="submit" variant="primary" isLoading={busy}>Confirm decision</PortalButton><PortalButton type="button" disabled={busy} onClick={() => setEdit(null)}>Back</PortalButton></div>
    </form> : null}
    </div>
    {loading ? <LoadingState message="Loading supervisory teams…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : workspace ? view ? routeContent : <>
      {(workspace.teams.length > 1 || workspace.nominations.length > 1) ? <label className="form-label block">Find a student<input className={inputClass} type="search" value={search} placeholder="Name, matric number or programme" onChange={event => { setSearch(event.target.value); setPage(1); }} /></label> : null}
      {reviews.length ? <div className="space-y-3"><h3 className="section-label">Nominations requiring action ({reviews.length})</h3>{reviews.map(row => <CoSupervisorNominationCard key={row.id} nomination={row} busy={busy} onAction={(nomination, action) => begin({ kind: 'decision', nomination, action })} />)}</div> : null}
      {teams.slice((currentPage - 1) * 8, currentPage * 8).map(team => role === 'Lecturer' ? <LecturerSupervisoryTeamCard key={team.studentId} team={team} busy={busy} initiallyOpen={workspace.teams.length === 1}
        onNominate={() => begin({ kind: 'nominate', team, replacement: null })}
        onEnd={appointment => begin({ kind: 'end', appointment })}
        onReplace={replacement => begin({ kind: 'nominate', team, replacement })}
        onNominationAction={(nomination, action) => begin({ kind: 'decision', nomination, action })} /> : <details key={team.studentId} className="rounded-xl border border-slate-200 p-4" open={workspace.teams.length === 1}>
        <summary className="section-label cursor-pointer">{team.studentName} <span className="card-label">{team.matricNo} · {team.studentStatus} · {team.appointments.filter(row => row.status === 'ACTIVE').length}/2 co-supervisors</span></summary>
        <div className="mt-4 space-y-3">
          <p className="card-value"><span className="card-label">Primary supervisor:</span> {team.primarySupervisor?.name ?? 'Awaiting primary appointment'}</p>
          <p className="card-description">{team.programme}</p>
          <div className="rounded-xl bg-slate-50 p-3"><h4 className="card-value">{team.research.title || 'Research profile pending'}</h4><p className="card-description">{team.research.area}</p><p className="card-description mt-2 whitespace-pre-wrap text-slate-700">{team.research.abstract}</p></div>
          {team.canNominate ? <PortalButton size="sm" disabled={busy} onClick={() => begin({ kind: 'nominate', team, replacement: null })}>Nominate co-supervisor</PortalButton> : null}
          {team.appointments.map(row => <CoSupervisorAppointmentCard key={row.id} appointment={row} busy={busy} canReplace={team.canNominate && row.status === 'ACTIVE' && !team.nominations.some(nomination => nomination.replacesAppointmentId === row.id && ['SUBMITTED_TO_CO_SUPERVISOR', 'PENDING_COORDINATOR'].includes(nomination.status))} onEnd={appointment => begin({ kind: 'end', appointment })} onReplace={replacement => begin({ kind: 'nominate', team, replacement })} />)}
          {team.nominations.length ? <details><summary className="card-value cursor-pointer">Nomination history ({team.nominations.length})</summary><div className="mt-3 space-y-3">{team.nominations.map(row => <CoSupervisorNominationCard key={row.id} nomination={row} busy={busy} onAction={(nomination, action) => begin({ kind: 'decision', nomination, action })} />)}</div></details> : null}
          <SupervisoryTeamTimeline entries={team.timeline} />
        </div>
      </details>)}
      {teams.length > 8 ? <div className="card-description flex items-center justify-between"><PortalButton size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</PortalButton><span>Page {currentPage} of {pageCount}</span><PortalButton size="sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</PortalButton></div> : null}
      {history.length || historicalNominations.length ? <details><summary className="card-value cursor-pointer">My previous supporting appointments and nominations</summary><div className="mt-3 space-y-3">{history.map(row => <CoSupervisorAppointmentCard key={row.id} appointment={row} busy={busy} canReplace={false} onEnd={() => {}} onReplace={() => {}} />)}{historicalNominations.map(row => <CoSupervisorNominationCard key={row.id} nomination={row} busy={busy} onAction={() => {}} />)}</div></details> : null}
      {!teams.length && !reviews.length && !history.length && !historicalNominations.length ? <EmptyState title={query ? 'No matching teams' : 'No supervisory team records yet'} description="Supporting appointments and nominations will appear here when available." /> : null}
    </> : null}
    {!view ? <CapacityReassessments role={role} onChanged={() => { void load(); onChanged?.(); }} /> : null}
    {!view && showResearchChanges ? <ResearchAmendments role={role} onChanged={() => { void load(); onChanged?.(); }} /> : null}
  </section>;
}
