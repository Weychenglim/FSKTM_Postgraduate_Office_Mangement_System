import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { decideCoSupervisor, endCoSupervisor, getCoSupervisorCandidates, getSupervisoryWorkspace, nominateCoSupervisor } from '../services/coSupervisionApi';
import { ApiError } from '../services/apiClient';
import type { CoSupervisorAction, CoSupervisorAppointment, CoSupervisorCandidate, CoSupervisorNomination, CoSupervisorOutcome, SupervisoryTeam, SupervisoryWorkspace, TeamAudit } from '../types/coSupervision';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-navy';
const labels: Record<CoSupervisorAction, string> = { accept: 'Accept', reject: 'Reject', approve: 'Approve', 'coordinator-reject': 'Reject', cancel: 'Cancel nomination' };
const statusLabels: Record<string, string> = { SUBMITTED_TO_CO_SUPERVISOR: 'Awaiting co-supervisor', PENDING_COORDINATOR: 'Awaiting coordinator', APPROVED: 'Approved', REJECTED_BY_CO_SUPERVISOR: 'Rejected by co-supervisor', REJECTED_BY_COORDINATOR: 'Rejected by coordinator', CANCELLED: 'Cancelled', ACTIVE: 'Active', ENDED: 'Ended' };
const displayDate = (value: string) => new Date(value).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });

function TeamHistory({ events }: { events: TeamAudit[] }) {
  return events.length ? <details className="mt-3 text-xs text-slate-600">
    <summary className="cursor-pointer font-semibold">Audit history ({events.length})</summary>
    <ol className="mt-2 space-y-2 border-l border-slate-200 pl-3">{events.map(event => <li key={event.id}>
      <span className="font-semibold">{event.action.replaceAll('_', ' ')}</span> · {event.actor} · {displayDate(event.createdAt)}
      {event.reason ? <p className="mt-1 whitespace-pre-wrap">{event.reason}</p> : null}
    </li>)}</ol>
  </details> : null;
}

export function CoSupervisorNominationCard({ nomination: row, busy, onAction }: {
  nomination: CoSupervisorNomination; busy: boolean; onAction: (row: CoSupervisorNomination, action: CoSupervisorAction) => void;
}) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h4 className="font-semibold text-brand-navy">{row.candidate.name}</h4><p className="text-xs text-slate-500">{row.studentName} · {row.matricNo}</p></div>
      <StatusBadge tone={row.status === 'APPROVED' ? 'success' : row.allowedActions.length ? 'warning' : 'neutral'}>{statusLabels[row.status]}</StatusBadge>
    </div>
    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{row.justification}</p>
    <p className="mt-2 text-xs text-slate-500">Nominated by {row.nominator.name} · {displayDate(row.submittedAt)}{row.replacesAppointmentId ? ' · Replacement nomination' : ''}</p>
    {row.waitingDays != null ? <p className="mt-1 text-xs text-amber-800">Waiting on {row.responsibleStage === 'PROGRAMME_COORDINATOR' ? 'programme coordinator' : 'co-supervisor'} · {row.waitingDays} calendar days</p> : null}
    {row.reason ? <p className="mt-2 text-sm text-slate-600">Reason: {row.reason}</p> : null}
    {row.allowedActions.length ? <div className="mt-3 flex flex-wrap gap-2">{row.allowedActions.map(action =>
      <PortalButton key={action} size="sm" disabled={busy} variant={action === 'accept' || action === 'approve' ? 'primary' : 'secondary'} onClick={() => onAction(row, action)}>{labels[action]}</PortalButton>)}</div> : null}
    <TeamHistory events={row.history} />
  </article>;
}

export function CoSupervisorAppointmentCard({ appointment: row, busy, canReplace, onEnd, onReplace }: {
  appointment: CoSupervisorAppointment; busy: boolean; canReplace: boolean; onEnd: (row: CoSupervisorAppointment) => void; onReplace: (row: CoSupervisorAppointment) => void;
}) {
  return <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h4 className="font-semibold text-brand-navy">{row.supervisor.name}</h4><p className="text-xs text-slate-500">Co-supervisor · {row.studentName} · Since {displayDate(row.appointmentDate)}</p></div>
      <StatusBadge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{statusLabels[row.status]}</StatusBadge>
    </div>
    {row.status === 'ENDED' ? <p className="mt-2 text-sm text-slate-600">{row.endOutcome} · {row.endReason}{row.endedAt ? ` · ${displayDate(row.endedAt)}` : ''}</p> : null}
    {row.supersedesId ? <p className="mt-1 text-xs text-slate-500">Replaces appointment #{row.supersedesId}</p> : null}
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
    <h4 className="font-semibold text-brand-navy">{replacement ? `Replace ${replacement.supervisor.name}` : 'Nominate a co-supervisor'}</h4>
    <p className="text-xs text-slate-600">{replacement ? 'The current appointment continues until the replacement is approved. ' : ''}The lecturer accepts before programme coordinator approval. Each approved appointment uses one supervision slot.</p>
    {loading ? <LoadingState message="Loading eligible lecturers…" /> : error ? <ErrorState message={error} onRetry={() => setAttempt(value => value + 1)} /> : <label className="block text-sm font-medium">Lecturer
      <select className={inputClass} required value={candidateId} disabled={busy} onChange={event => setCandidateId(event.target.value)}>
        <option value="">Select a lecturer</option>
        {candidates.map(candidate => <option key={candidate.id} value={candidate.id} disabled={!candidate.selectable}>{candidate.name} · {candidate.activeLoad}/{candidate.limit ?? 'Unconfigured'} · {candidate.reason || candidate.capacityState.replaceAll('_', ' ').toLowerCase()}{candidate.unavailableUntil ? ` until ${candidate.unavailableUntil}` : ''}</option>)}
      </select>
    </label>}
    {!loading && !error && candidates.length === 0 ? <p className="text-sm text-slate-600">No eligible lecturers are available.</p> : null}
    <label className="block text-sm font-medium">Justification<textarea className={inputClass} required rows={3} value={justification} disabled={busy} onChange={event => setJustification(event.target.value)} /></label>
    <div className="flex gap-2"><PortalButton type="submit" variant="primary" isLoading={busy} disabled={loading || !!error || !selected?.selectable || !justification.trim()}>Submit nomination</PortalButton><PortalButton type="button" disabled={busy} onClick={onCancel}>Cancel</PortalButton></div>
  </form>;
}

type EditAction = { kind: 'nominate'; team: SupervisoryTeam; replacement: CoSupervisorAppointment | null }
  | { kind: 'decision'; nomination: CoSupervisorNomination; action: CoSupervisorAction }
  | { kind: 'end'; appointment: CoSupervisorAppointment };

export function SupervisoryTeamManagement({ onChanged }: { onChanged?: () => void }) {
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
  useEffect(() => { void load(); return () => { version.current += 1; }; }, [load]);
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
  return <section id="supervisory-team-management" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy"><Users className="h-5 w-5" />Supervisory teams</h2><p className="mt-1 text-sm text-slate-500">One primary supervisor and up to two supporting co-supervisors.</p></div>
      <PortalButton size="sm" icon={RefreshCw} disabled={busy || loading} onClick={() => void load()}>Refresh teams</PortalButton>
    </div>
    <p className="text-xs text-slate-500">The primary supervisor manages Panel nominations and supervisor Marks. Supporting appointments provide research and progress access.</p>
    {notice ? <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">{notice}</p> : null}
    <div ref={editPanel}>
    {edit?.kind === 'nominate' ? <NominationForm key={`${edit.team.studentId}-${edit.replacement?.id ?? 'new'}`} team={edit.team} replacement={edit.replacement} busy={busy} onCancel={() => setEdit(null)} onSubmit={(candidateId, justification) => void run(() => nominateCoSupervisor({ studentId: edit.team.studentId, candidateId, justification, ...(edit.replacement ? { replacesAppointmentId: edit.replacement.id } : {}) }))} /> : null}
    {edit && edit.kind !== 'nominate' ? <form className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4" onSubmit={event => {
      event.preventDefault();
      const needsReason = edit.kind === 'end' || !['accept', 'approve'].includes(edit.action);
      if (needsReason && !reason.trim()) return;
      void run(() => edit.kind === 'end' ? endCoSupervisor(edit.appointment.id, outcome, reason.trim()) : decideCoSupervisor(edit.nomination.id, edit.action, reason.trim()));
    }}>
      <h3 className="font-semibold">{edit.kind === 'end' ? `End appointment: ${edit.appointment.supervisor.name}` : `${labels[edit.action]}: ${edit.nomination.candidate.name}`}</h3>
      {edit.kind === 'end' ? <label className="block text-sm">Outcome<select className={inputClass} value={outcome} onChange={event => setOutcome(event.target.value as CoSupervisorOutcome)} disabled={busy}><option value="COMPLETED">Completed</option><option value="WITHDRAWN">Withdrawn</option><option value="OTHER">Other</option></select></label> : null}
      {edit.kind === 'end' || !['accept', 'approve'].includes(edit.action) ? <label className="block text-sm">Reason<textarea className={inputClass} required rows={2} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label> : <p className="text-sm text-slate-600">Confirm this decision for {edit.nomination.studentName}. The current eligibility and appointment rules will be checked again.</p>}
      <div className="flex gap-2"><PortalButton type="submit" variant="primary" isLoading={busy}>Confirm decision</PortalButton><PortalButton type="button" disabled={busy} onClick={() => setEdit(null)}>Back</PortalButton></div>
    </form> : null}
    </div>
    {loading ? <LoadingState message="Loading supervisory teams…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : workspace ? <>
      {(workspace.teams.length > 1 || workspace.nominations.length > 1) ? <label className="block text-sm font-medium">Find a student<input className={inputClass} type="search" value={search} placeholder="Name, matric number or programme" onChange={event => { setSearch(event.target.value); setPage(1); }} /></label> : null}
      {reviews.length ? <div className="space-y-3"><h3 className="text-sm font-bold text-brand-navy">Nominations requiring action ({reviews.length})</h3>{reviews.map(row => <CoSupervisorNominationCard key={row.id} nomination={row} busy={busy} onAction={(nomination, action) => begin({ kind: 'decision', nomination, action })} />)}</div> : null}
      {teams.slice((currentPage - 1) * 8, currentPage * 8).map(team => <details key={team.studentId} className="rounded-xl border border-slate-200 p-4" open={workspace.teams.length === 1}>
        <summary className="cursor-pointer font-semibold text-brand-navy">{team.studentName} <span className="text-xs font-normal text-slate-500">{team.matricNo} · {team.studentStatus} · {team.appointments.filter(row => row.status === 'ACTIVE').length}/2 co-supervisors</span></summary>
        <div className="mt-4 space-y-3">
          <p className="text-sm"><strong>Primary supervisor:</strong> {team.primarySupervisor?.name ?? 'Awaiting primary appointment'}</p>
          <p className="text-xs text-slate-500">{team.programme}</p>
          <div className="rounded-xl bg-slate-50 p-3"><h4 className="font-semibold text-sm">{team.research.title || 'Research profile pending'}</h4><p className="text-xs text-slate-500">{team.research.area}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{team.research.abstract}</p></div>
          {team.canNominate ? <PortalButton size="sm" disabled={busy} onClick={() => begin({ kind: 'nominate', team, replacement: null })}>Nominate co-supervisor</PortalButton> : null}
          {team.appointments.map(row => <CoSupervisorAppointmentCard key={row.id} appointment={row} busy={busy} canReplace={team.canNominate && row.status === 'ACTIVE' && !team.nominations.some(nomination => nomination.replacesAppointmentId === row.id && ['SUBMITTED_TO_CO_SUPERVISOR', 'PENDING_COORDINATOR'].includes(nomination.status))} onEnd={appointment => begin({ kind: 'end', appointment })} onReplace={replacement => begin({ kind: 'nominate', team, replacement })} />)}
          {team.nominations.length ? <details><summary className="cursor-pointer text-sm font-semibold">Nomination history ({team.nominations.length})</summary><div className="mt-3 space-y-3">{team.nominations.map(row => <CoSupervisorNominationCard key={row.id} nomination={row} busy={busy} onAction={(nomination, action) => begin({ kind: 'decision', nomination, action })} />)}</div></details> : null}
          {team.timeline?.length ? <details><summary className="cursor-pointer text-sm font-semibold">Timeline and progress</summary><ol className="mt-2 space-y-2 text-sm">{team.timeline.map(entry => <li key={entry.id}>{entry.title}{entry.date ? ` · ${displayDate(entry.date)}` : ''}{entry.status ? ` · ${entry.status}` : ''}</li>)}</ol></details> : null}
        </div>
      </details>)}
      {teams.length > 8 ? <div className="flex items-center justify-between text-xs"><PortalButton size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</PortalButton><span>Page {currentPage} of {pageCount}</span><PortalButton size="sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</PortalButton></div> : null}
      {history.length || historicalNominations.length ? <details><summary className="cursor-pointer text-sm font-semibold">My previous supporting appointments and nominations</summary><div className="mt-3 space-y-3">{history.map(row => <CoSupervisorAppointmentCard key={row.id} appointment={row} busy={busy} canReplace={false} onEnd={() => {}} onReplace={() => {}} />)}{historicalNominations.map(row => <CoSupervisorNominationCard key={row.id} nomination={row} busy={busy} onAction={() => {}} />)}</div></details> : null}
      {!teams.length && !reviews.length && !history.length && !historicalNominations.length ? <EmptyState title={query ? 'No matching teams' : 'No supervisory team records yet'} description="Supporting appointments and nominations will appear here when available." /> : null}
    </> : null}
  </section>;
}
