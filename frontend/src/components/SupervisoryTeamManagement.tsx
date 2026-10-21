import { DecisionDialog } from './DecisionDialog';
import { StudentResearchProfileSection } from './StudentResearchProfileSection';
import { completeDecision } from '../utils/decisionSubmission';
import { useReturnToFocusReload } from '../utils/returnToFocus';
import {officeSupervisorApi} from '../services/staffSupervisorWorkspaceApi';
import { getCoordinatorTeam } from '../services/coordinatorWorkspaceApi';
import { useRecordDraft } from './RecordDraft';
import { useListState } from './ListState';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { decideCoSupervisor, endCoSupervisor, getCoSupervisorCandidates, getSupervisoryWorkspace, getSupervisoryTeam, nominateCoSupervisor } from '../services/coSupervisionApi';
import { ApiError } from '../services/apiClient';
import type { CoSupervisorAction, CoSupervisorAppointment, CoSupervisorCandidate, CoSupervisorNomination, CoSupervisorOutcome, SupervisoryTeam, SupervisoryWorkspace, SupervisionPanel, TeamAudit } from '../types/coSupervision';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { ResearchAmendments } from './ResearchAmendments';
import { CapacityReassessments } from './CapacityReassessments';
import type { UserRole } from '../types/auth';
import { formatMalaysiaDate } from '../utils/malaysiaDateTime';
import { StudentAppointmentSection, StudentAppointmentMemberCard } from './StudentAppointmentPrimitives';
import { AppointmentMemberCard, appointmentDetailTypography } from './AppointmentPrimitives';
import { RequestFilters, WorkspaceSectionHeader, WorkspaceRecordTable, WorkspacePagination, workspacePageSize } from './RequestWorkspacePrimitives';
import { ApprovalProcess, formatRequestRecordedAt } from './ApprovalProcess';
import { RequestAuditHistory, RequestDetailCard, RequestMetadata, RequestSection, RequestField } from './RequestDetailPrimitives';
import { buildSupervisorApprovalProcess, type ApprovalEvent } from '../utils/approvalProcess';
import type {ActiveSuperviseeRow} from '../types';
import {endSupervisorAppointment} from '../services/appointmentsApi';
import {SupervisorAppointmentRecordCard,toCoordinatorAppointmentPresentation,type SupervisorAppointmentPresentation} from './SupervisorAppointmentRecordCard';
import {ViewStudentRecordAction,readableRecordStatus} from './RequestDetailPrimitives';
import { Select } from './Select';

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

export function supportingAuditEvents(events: TeamAudit[]): ApprovalEvent[] {
  return events.map(event => ({ id:event.id, action:event.action, actorName:event.actor,
    previousStatus:event.previousStatus, newStatus:event.newStatus ?? '', createdAt:event.createdAt, reason:event.reason }));
}

function TeamHistory({ events }: { events: TeamAudit[] }) {
  return <RequestAuditHistory events={supportingAuditEvents(events)} />;
}

export function supportingRequestMetadata(row: CoSupervisorNomination): React.ComponentProps<typeof RequestMetadata> {
  return {reference:`Supporting request #${row.id}`,submittedAt:row.submittedAt,submittedBy:row.nominator.name,
    statusLabel:statusLabels[row.status] ?? row.status,
    statusTone:row.status==='APPROVED'?'success':row.status.startsWith('REJECTED')?'danger':row.status==='CANCELLED'?'neutral':'warning'};
}

export function CoSupervisorNominationCard({ nomination: row, busy, onAction, actions, hideMetadata=false }: {
  nomination: CoSupervisorNomination; busy: boolean; onAction: (row: CoSupervisorNomination, action: CoSupervisorAction) => void; actions?:React.ReactNode; hideMetadata?:boolean;
}) {
  const events=supportingAuditEvents(row.history);
  const actionSlot=<>{row.allowedActions.length?<div className="flex flex-wrap gap-2">{row.allowedActions.map(action=>
    <PortalButton key={action} size="sm" disabled={busy} variant={action==='accept'||action==='approve'?'primary':'secondary'} onClick={()=>onAction(row,action)}>{labels[action]}</PortalButton>)}</div>:null}{actions}</>;
  const steps=buildSupervisorApprovalProcess({kind:'supporting',status:row.status,submittedAt:row.submittedAt,events,waitingDays:row.waitingDays,waitingOn:row.responsibleStage}).map(step=>({...step,reason:step.reason===row.reason?undefined:step.reason}));
  return <div className="space-y-4">
    {!hideMetadata?<RequestMetadata {...supportingRequestMetadata(row)}/>:null}
    <RequestDetailCard progress={<ApprovalProcess steps={steps}/>} actions={row.allowedActions.length||actions?actionSlot:undefined} audit={events.length?<RequestAuditHistory events={events}/>:undefined}>
      <RequestSection title="Request summary"><dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="card-label">Student</dt><dd className="card-value mt-1">{row.studentName}</dd><dd className="card-caption mt-1">{row.matricNo}</dd></div>
        <div><dt className="card-label">Requested supporting supervisor</dt><dd className="card-value mt-1">{row.candidate.name}</dd></div>
        <div><dt className="card-label">Programme</dt><dd className="card-description mt-1">{row.programme||'Not recorded'}</dd></div>
        <div><dt className="card-label">Semester</dt><dd className="card-description mt-1">{row.semester||'Not recorded'}</dd></div>
      </dl></RequestSection>
      <RequestSection title="Requested appointment"><p className="card-description whitespace-pre-wrap">{row.justification||'No justification recorded.'}</p>
        {row.replacesAppointmentId?<p className="card-description mt-3">Replacement for an existing supporting appointment</p>:null}
      </RequestSection>
      {row.reason?<RequestSection title={row.status==='CANCELLED'?'Cancellation reason':'Decision reason'}><p className="card-description whitespace-pre-wrap">{row.reason}</p></RequestSection>:null}
    </RequestDetailCard>
  </div>;
}

export function supportingAppointmentMetadata(row: CoSupervisorAppointment): React.ComponentProps<typeof RequestMetadata> {
  return { reference: `Supporting appointment #${row.id}`, submittedAt: row.appointmentDate, dateLabel: 'Started',
    statusLabel: statusLabels[row.status], statusTone: row.status === 'ACTIVE' ? 'success' : 'neutral' };
}

export function CoSupervisorAppointmentCard({ appointment: row, busy, canReplace, onEnd, onReplace, compact = false, detail = false, relaxed = false }: {
  appointment: CoSupervisorAppointment; busy: boolean; canReplace: boolean; compact?: boolean; detail?: boolean; relaxed?: boolean; onEnd: (row: CoSupervisorAppointment) => void; onReplace: (row: CoSupervisorAppointment) => void;
}) {
  if (detail) return <RequestDetailCard audit={row.history.length?<TeamHistory events={row.history}/>:undefined}
    actions={canReplace || row.canEnd ? <div className="flex flex-wrap gap-2">
      {canReplace ? <PortalButton disabled={busy} onClick={() => onReplace(row)}>Replace</PortalButton> : null}
      {row.canEnd ? <PortalButton variant="danger" disabled={busy} onClick={() => onEnd(row)}>End appointment</PortalButton> : null}
    </div> : undefined}>
    <RequestSection title="Appointment summary"><dl className="grid gap-4 sm:grid-cols-2">
      <div><dt className="card-label">Student</dt><dd className="card-value mt-1">{row.studentName}</dd><dd className="card-caption mt-1">{row.matricNo}</dd></div>
      <div><dt className="card-label">Supporting supervisor</dt><dd className="card-value mt-1">{row.supervisor.name}</dd></div>
      <div><dt className="card-label">Started on</dt><dd className="card-description mt-1">{formatRequestRecordedAt(row.appointmentDate)}</dd></div>
      {row.status === 'ENDED' ? <div><dt className="card-label">Ended on</dt><dd className="card-description mt-1">{formatRequestRecordedAt(row.endedAt)}</dd></div> : null}
    </dl>{row.supersedesId ? <p className="card-description">Replaces an earlier supporting appointment</p> : null}</RequestSection>
    {row.status === 'ENDED' ? <RequestSection title="Appointment outcome"><p className="card-value capitalize">{row.endOutcome?.replaceAll('_', ' ').toLowerCase() || 'Not recorded'}</p><p className="card-description whitespace-pre-wrap">{row.endReason || 'End reason: Not recorded.'}</p></RequestSection> : null}
  </RequestDetailCard>;
  return <article className={relaxed ? "space-y-4 border-t border-slate-200 pt-5" : "rounded-xl border border-slate-200 bg-slate-50 p-4"}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h4 className={relaxed ? supervisionHeadingClass : "section-label"}>{row.supervisor.name}</h4><p className={relaxed ? `${supervisionBodyClass} mt-2` : "card-description"}>{compact ? null : <>Co-supervisor · {row.studentName} · </>}Since {displayDate(row.appointmentDate)}</p></div>
      <StatusBadge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{statusLabels[row.status]}</StatusBadge>
    </div>
    {row.status === 'ENDED' ? <p className="card-description mt-2">{readableRecordStatus(row.endOutcome)}{row.endReason?` · ${row.endReason}`:''}{row.endedAt ? ` · ${displayDate(row.endedAt)}` : ''}</p> : null}
    {row.supersedesId ? <p className="card-description mt-1">Replaces an earlier supporting appointment</p> : null}
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
  useRecordDraft(!!candidateId || !!justification.trim(), busy);
  const selected = candidates.find(row => String(row.id) === candidateId);
  return <form className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3" onSubmit={event => { event.preventDefault(); if (selected?.selectable && justification.trim() && !busy) onSubmit(selected.id, justification.trim()); }}>
    <h4 className="section-label">{replacement ? `Replace ${replacement.supervisor.name}` : 'Nominate a co-supervisor'}</h4>
    <p className="card-description">{replacement ? 'The current appointment continues until the replacement is approved. ' : ''}The lecturer accepts before programme coordinator approval. Each approved appointment uses one supervision slot.</p>
    {loading ? <LoadingState message="Loading eligible lecturers…" /> : error ? <ErrorState message={error} onRetry={() => setAttempt(value => value + 1)} /> : <label className="form-label block">Lecturer
      <Select className={inputClass} required value={candidateId} disabled={busy} onChange={event => setCandidateId(event.target.value)}>
        <option value="">Select a lecturer</option>
        {candidates.map(candidate => <option key={candidate.id} value={candidate.id} disabled={!candidate.selectable}>{candidate.name} · {candidate.activeLoad}/{candidate.limit ?? 'Unconfigured'} · {candidate.reason || candidate.capacityState.replaceAll('_', ' ').toLowerCase()}{candidate.unavailableUntil ? ` until ${candidate.unavailableUntil}` : ''}</option>)}
      </Select>
    </label>}
    {!loading && !error && candidates.length === 0 ? <p className="card-description">No eligible lecturers are available.</p> : null}
    <label className="form-label block">Justification<textarea className={inputClass} required rows={3} value={justification} disabled={busy} onChange={event => setJustification(event.target.value)} /></label>
    <div className="flex gap-2"><PortalButton type="submit" variant="primary" isLoading={busy} disabled={loading || !!error || !selected?.selectable || !justification.trim()}>Submit nomination</PortalButton><PortalButton type="button" disabled={busy} onClick={onCancel}>Cancel</PortalButton></div>
  </form>;
}

type EditAction = { kind: 'nominate'; team: SupervisoryTeam; replacement: CoSupervisorAppointment | null }
  | { kind: 'decision'; nomination: CoSupervisorNomination; action: CoSupervisorAction }
  | { kind: 'end'; appointment: CoSupervisorAppointment };

export function StudentSupervisorsOverview({ workspace, actions }: { workspace: SupervisoryWorkspace; actions?: React.ReactNode }) {
  const team = workspace.teams[0];
  const supporting = (team?.appointments ?? []).filter(row => row.status === 'ACTIVE');
  const previous = workspace.appointments.filter(row => row.status === 'ENDED');
  return <div className="space-y-6">
    <div className="grid gap-6 sm:grid-cols-2">
      <StudentAppointmentMemberCard detail label="Primary supervisor" name={team?.primarySupervisor?.name ?? 'Supervisor not appointed'} status={team?.primarySupervisor ? 'Active' : 'Not appointed'} tone={team?.primarySupervisor ? 'success' : 'neutral'} actions={actions} />
      <div className="space-y-6 rounded-xl border border-slate-200 p-6"><p className={appointmentDetailTypography.label}>Supporting supervisors</p>{supporting.length ? supporting.map(row => <div key={row.id} className="space-y-1"><h3 className={appointmentDetailTypography.name}>{row.supervisor.name}</h3><p className={appointmentDetailTypography.body}>Co-supervisor · Active since {displayDate(row.appointmentDate)}</p></div>) : <p className={appointmentDetailTypography.body}>No supporting supervisors assigned.</p>}</div>
    </div>
    {team && Object.values(team.research).some(value => value.trim()) ? <StudentResearchProfileSection profile={{ ...team.research, programme: team.programme }} /> : null}
    {previous.length ? <details><summary className={appointmentDetailTypography.disclosure}>Previous supporting supervisors</summary><div className="mt-3 space-y-3">{previous.map(row => <article key={row.id} className="rounded-xl border border-slate-200 p-4"><h3 className={appointmentDetailTypography.name}>{row.supervisor.name}</h3><p className={appointmentDetailTypography.body}>Supporting supervisor · {displayDate(row.appointmentDate)}{row.endedAt ? ` – ${displayDate(row.endedAt)}` : ''}</p><StatusBadge tone="neutral">Ended</StatusBadge></article>)}</div></details> : null}
  </div>;
}

const { label: supervisionLabelClass, body: supervisionBodyClass, name: supervisionHeadingClass, disclosure: supervisionDisclosureClass } = appointmentDetailTypography;

export function SupervisionPanelSummary({panel,busy,onRecommend,onViewRequest}:{panel?:SupervisionPanel;busy:boolean;onRecommend?:()=>void;onViewRequest?:(id:number,recordKey?:string)=>void}) {
  const current=panel?.current;
  const pending=panel?.pending;
  const canOpenCurrent = Boolean(current?.canView && onViewRequest);
  const canOpenPending = Boolean(pending?.canView && onViewRequest);
  const canStartRecommendation = Boolean(!pending && onRecommend && (panel?.canRecommend || panel?.canReplace));
  const actions=<>
    {current?.canView&&onViewRequest?<PortalButton size="sm" disabled={busy} onClick={()=>onViewRequest(current.requestId,current.recordKey)}>View Panel details</PortalButton>:null}
    {pending?.canView&&onViewRequest?<PortalButton size="sm" disabled={busy} onClick={()=>onViewRequest(pending.id,pending.recordKey)}>View recommendation</PortalButton>:null}
    {!pending&&onRecommend&&(panel?.canRecommend||panel?.canReplace)?<PortalButton size="sm" variant={current?'secondary':'primary'} disabled={busy} onClick={onRecommend}>{current?'Replace Panel':'Recommend Panel'}</PortalButton>:null}
  </>;
  return <AppointmentMemberCard detail label="Panel member" name={current?.member.name ?? (panel?'Panel not appointed':'Panel information unavailable')}
    status={current?'Active':pending?'Appointment pending':'Not appointed'} tone={current?'success':pending?'warning':'neutral'}
    actions={canOpenCurrent || canOpenPending || canStartRecommendation ? actions : undefined}>
    {current?<dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      <div><dt className={supervisionLabelClass}>Department</dt><dd className={`${supervisionBodyClass} mt-2`}>{current.department||'Not recorded'}</dd></div>
      <div><dt className={supervisionLabelClass}>Email</dt><dd className={`${supervisionBodyClass} mt-2 break-words`}>{current.email?<a href={`mailto:${current.email}`} className="hover:underline">{current.email}</a>:'Not recorded'}</dd></div>
      <div><dt className={supervisionLabelClass}>Appointed on</dt><dd className={`${supervisionBodyClass} mt-2`}>{displayDate(current.appointmentDate)}</dd></div>
    </dl>:panel&&!pending?<p className={supervisionBodyClass}>No Panel assigned.</p>:!panel?<p className={supervisionBodyClass}>Panel information unavailable.</p>:null}
    {pending?<p className="text-xs font-normal leading-relaxed text-amber-800">{pending.replacement?'Replacement pending · ':''}{pending.status==='PENDING_COORDINATOR'?'Awaiting Coordinator confirmation':'Awaiting Panel review'}</p>:null}
  </AppointmentMemberCard>;
}

export function SupervisoryStudentDetailCard({ team, busy, initiallyOpen = false, collapsible = true, context, actions, onRecommendPanel, onViewPanelRequest, onNominate, onEnd, onReplace, onNominationAction }: {
  team: SupervisoryTeam; busy: boolean; initiallyOpen?: boolean; collapsible?: boolean;
  context?: {semester?:string;email?:string}; actions?:React.ReactNode;
  onRecommendPanel?:()=>void; onViewPanelRequest?:(id:number,recordKey?:string)=>void;
  onNominate: () => void; onEnd: (row: CoSupervisorAppointment) => void;
  onReplace: (row: CoSupervisorAppointment) => void;
  onNominationAction: (row: CoSupervisorNomination, action: CoSupervisorAction) => void;
}) {
  const supporting = team.appointments.filter(row => row.status === 'ACTIVE');
  const previous = team.appointments.filter(row => row.status !== 'ACTIVE');
  const activity = (team.timeline ?? []).filter(entry => !String(entry.id).startsWith('timeline-'));
  const dates = (team.timeline ?? []).filter(entry => String(entry.id).startsWith('timeline-'));
  const Wrapper = collapsible ? 'details' : 'article';
  const heading = <><span className={supervisionHeadingClass}>{team.studentName}</span>{' '}<span className={`${supervisionBodyClass} ml-2 text-slate-500`}>{team.matricNo}</span></>;
  return <Wrapper className="rounded-2xl border border-slate-200 bg-white p-6 shadow-3xs md:p-8 [&_.section-label]:font-semibold [&_.card-value]:font-semibold [&_.card-description]:font-normal" {...(collapsible ? { open: initiallyOpen } : {})}>
    {collapsible ? <summary className="cursor-pointer">{heading}</summary> : <div className="flex flex-wrap items-start justify-between gap-3"><h2>{heading}</h2>{actions?<div className="flex flex-wrap gap-2">{actions}</div>:null}</div>}
    <div className="mt-8 space-y-8">
      <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2"><div><dt className={supervisionLabelClass}>Programme</dt><dd className={`${supervisionBodyClass} mt-2`}>{team.programme}</dd></div><div><dt className={supervisionLabelClass}>Student status</dt><dd className={`${supervisionBodyClass} mt-2 capitalize`}>{team.studentStatus.replaceAll('_',' ').toLowerCase()}</dd></div>{context?.semester?<div><dt className={supervisionLabelClass}>Semester</dt><dd className={`${supervisionBodyClass} mt-2`}>{context.semester}</dd></div>:null}{team.studentEmail||context?.email?<div><dt className={supervisionLabelClass}>Student email</dt><dd className={`${supervisionBodyClass} mt-2 break-words`}><a className="hover:underline" href={`mailto:${team.studentEmail||context?.email}`}>{team.studentEmail||context?.email}</a></dd></div>:null}</dl>
      {collapsible&&actions?<div className="flex flex-wrap gap-2">{actions}</div>:null}
      <div className="grid gap-6 lg:grid-cols-2">
        <AppointmentMemberCard detail label="Primary supervisor" name={team.primarySupervisor?.name ?? 'Supervisor not appointed'}
          status={team.primarySupervisor ? 'Active' : 'Not appointed'} tone={team.primarySupervisor ? 'success' : 'neutral'} />
        <div className="space-y-6 rounded-xl border border-slate-200 p-6">
          <p className={supervisionLabelClass}>Supporting supervisors ({supporting.length}/2)</p>
          {supporting.length ? supporting.map(row => <CoSupervisorAppointmentCard key={row.id} appointment={row} busy={busy}
            compact relaxed canReplace={team.canNominate && !team.nominations.some(nomination => nomination.replacesAppointmentId === row.id && ['SUBMITTED_TO_CO_SUPERVISOR','PENDING_COORDINATOR'].includes(nomination.status))}
            onEnd={onEnd} onReplace={onReplace} />) : <p className={supervisionBodyClass}>No supporting supervisors assigned.</p>}
          {team.canNominate ? <div className="flex flex-wrap gap-3"><PortalButton size="sm" disabled={busy} onClick={onNominate}>Nominate co-supervisor</PortalButton></div> : null}
        </div>
      </div>
      {!collapsible?<SupervisionPanelSummary panel={team.panel} busy={busy} onRecommend={onRecommendPanel} onViewRequest={onViewPanelRequest}/>:null}
      <div className="space-y-2"><p className={supervisionLabelClass}>Current research title</p><p className={`${supervisionBodyClass} break-words`}>{team.research.title || 'Research profile pending'}</p></div>
      <div>
      <details className="border-t border-slate-200"><summary className={supervisionDisclosureClass}>Research profile</summary>
        <dl className="mb-5 space-y-6 rounded-xl bg-slate-50 p-6">
          <div><dt className={supervisionLabelClass}>Programme</dt><dd className={`${supervisionBodyClass} mt-2`}>{team.programme}</dd></div>
          <div><dt className={supervisionLabelClass}>Enrolment status</dt><dd className={`${supervisionBodyClass} mt-2 capitalize`}>{readableRecordStatus(team.studentStatus)}</dd></div>
          <div><dt className={supervisionLabelClass}>Research area</dt><dd className={`${supervisionBodyClass} mt-2`}>{team.research.area || 'Not recorded'}</dd></div>
          <div><dt className={supervisionLabelClass}>Abstract</dt><dd className={`${supervisionBodyClass} mt-2 max-w-prose whitespace-pre-wrap break-words`}>{team.research.abstract || 'Not recorded'}</dd></div>
        </dl>
      </details>
      {previous.length || team.nominations.length ? <details className="border-t border-slate-200"><summary className={supervisionDisclosureClass}>Supporting appointment history ({previous.length + team.nominations.length})</summary>
        <div className="mt-3 space-y-3">{previous.map(row => <CoSupervisorAppointmentCard key={row.id} compact appointment={row} busy={busy} canReplace={false} onEnd={onEnd} onReplace={onReplace} />)}{team.nominations.map(row => <CoSupervisorNominationCard key={row.id} nomination={row} busy={busy} onAction={onNominationAction} />)}</div>
      </details> : null}
      {activity.length ? <details className="border-t border-slate-200"><summary className={supervisionDisclosureClass}>Appointment activity ({activity.length})</summary>
        <p className={`${supervisionBodyClass} mb-5`}>Applications show their latest recorded status. Supporting-supervisor entries come from recorded appointment events.</p>
        <SupervisoryTeamTimeline entries={team.timeline} kind="appointments" />
      </details> : null}
      {dates.length ? <details className="border-t border-slate-200"><summary className={supervisionDisclosureClass}>Semester dates ({dates.length})</summary>
        <p className={`${supervisionBodyClass} mb-5`}>Office-managed dates for the current semester. These shared schedule statuses do not measure this student’s research progress.</p>
        <SupervisoryTeamTimeline entries={team.timeline} kind="semester" />
      </details> : null}
      </div>
    </div>
  </Wrapper>;
}

export const LecturerSupervisoryTeamCard = SupervisoryStudentDetailCard;

export type SupervisoryTeamView = 'studentOverview' | 'studentHistory' | 'requests' | 'roster' | 'detail' | 'history';

export function SupervisoryTeamRouteContent({ workspace, view, routeStudentId, studentActions, busy, search, page, pageSize: requestedPageSize, onPageSize, lecturerId, role, detailContext, detailActions, onNavigateToDossier, onNavigateToPanelRequest, onNavigateToPanelRecommendation, onEndPrimary, onSearch, onPage, onNavigateToStudent, onNominate, onEnd, onReplace, onNominationAction }: {
  workspace: SupervisoryWorkspace; view: SupervisoryTeamView; routeStudentId?: string; studentActions?: React.ReactNode;
  busy: boolean; search: string; page: number; onSearch: (value: string) => void; onPage: (value: number) => void;
  pageSize?: number; onPageSize?: (size: number) => void; lecturerId?: string; role?: UserRole;
  detailContext?: ActiveSuperviseeRow; detailActions?: React.ReactNode; onNavigateToDossier?: (matricNo:string)=>void;
  onNavigateToPanelRequest?:(id:string,recordKey?:string)=>void; onNavigateToPanelRecommendation?:(matricNo:string)=>void;
  onEndPrimary?: React.ComponentProps<typeof SupervisorAppointmentRecordCard>['onEnd'];
  onNavigateToStudent?: (matricNo: string) => void; onNominate: (team: SupervisoryTeam) => void;
  onEnd: (row: CoSupervisorAppointment) => void; onReplace: (team: SupervisoryTeam, row: CoSupervisorAppointment) => void;
  onNominationAction: (row: CoSupervisorNomination, action: CoSupervisorAction) => void;
}) {
  if (view === 'studentHistory') return null;
  if (view === 'studentOverview') return <StudentSupervisorsOverview workspace={workspace} actions={studentActions} />;
  if (view === 'detail') {
    const team = workspace.teams.find(row => row.matricNo === routeStudentId);
    if(!team)return <EmptyState title="Supervision not found" description="This student is not available in your supervisory workspace."/>;
    const primary=workspace.primaryApplication?.studentId===team.matricNo&&workspace.primaryApplication.appointmentLifecycle?.appointmentId===team.primaryAppointmentId?workspace.primaryApplication:null;
    const ownDetails=detailContext?.studentId===team.matricNo&&detailContext.appointmentId===team.primaryAppointmentId?detailContext:undefined;
    const appointment:SupervisorAppointmentPresentation|null=primary?toCoordinatorAppointmentPresentation(primary):ownDetails?{studentName:team.studentName,studentId:team.matricNo,supervisor:ownDetails.supervisorName,status:ownDetails.status.toUpperCase(),approvedAt:ownDetails.appointmentDate,events:[]}:null;
    return <div className="space-y-5"><SupervisoryStudentDetailCard key={team.matricNo} team={team} busy={busy} initiallyOpen collapsible={false}
      context={{semester:ownDetails?.semester??primary?.semester,email:ownDetails?.email??(primary as typeof primary & {email?:string})?.email}}
      actions={onNavigateToDossier||detailActions?<><ViewStudentRecordAction studentId={team.matricNo} onOpen={onNavigateToDossier} disabled={busy}/>{detailActions}</>:undefined}
      onRecommendPanel={role==='Lecturer'&&onNavigateToPanelRecommendation?()=>onNavigateToPanelRecommendation(team.matricNo):undefined}
      onViewPanelRequest={onNavigateToPanelRequest?(id,key)=>onNavigateToPanelRequest(String(id),key):undefined}
      onNominate={() => onNominate(team)} onEnd={onEnd} onReplace={row => onReplace(team, row)} onNominationAction={onNominationAction}/>
      {appointment?<fieldset disabled={busy} className="contents"><SupervisorAppointmentRecordCard record={appointment} onEnd={primary&&['Office Staff/Admin','Programme Coordinator'].includes(role??'')?onEndPrimary:undefined}/></fieldset>:null}
    </div>;
  }
  const query = search.trim().toLowerCase();
  const unique = <T extends { id: number },>(rows: T[]) => [...new Map(rows.map(row => [row.id, row])).values()];
  const appointments = unique([...workspace.appointments, ...workspace.teams.flatMap(team => team.appointments)]).filter(row => row.status === 'ENDED');
  const nominations = unique([...workspace.nominations, ...workspace.teams.flatMap(team => team.nominations)]);
  if (view === 'history') {
    const closed = nominations.filter(row => !row.allowedActions.length);
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
  const pageSize = workspacePageSize(requestedPageSize);
  const pageCount = Math.max(1, Math.ceil(teams.length / pageSize));
  const currentPage = Math.max(1, Math.min(page, pageCount));
  const staffView = role === 'Office Staff/Admin' || role === 'Programme Coordinator';
  return <div className="space-y-5"><RequestFilters search={search} onSearch={onSearch} searchLabel="Find a student" searchPlaceholder="Student name, matric number, programme or research title" />{teams.length ? <section className="space-y-3" aria-label={staffView ? 'Supervisory teams' : 'Current supervisees'}>
    <div className="flex items-center gap-2"><h3 className="section-label">{staffView ? 'Current teams' : 'Current supervisees'}</h3><span className="card-description">({teams.length})</span></div>
    <WorkspaceRecordTable label={staffView ? 'Supervisory team records' : 'Current supervisee records'} roster roleLabel={staffView ? 'Primary supervisor' : undefined} rows={teams.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(team => ({
      key: team.studentId, studentName: team.studentName, matricNo: team.matricNo, programme: team.programme,
      role: staffView ? team.primarySupervisor?.name ?? 'Awaiting primary appointment' : lecturerId && String(team.primarySupervisor?.id) === lecturerId ? 'Primary supervisor' : lecturerId && team.appointments.some(row => row.status === 'ACTIVE' && String(row.supervisor.id) === lecturerId) ? 'Supporting supervisor' : 'Not recorded',
      actionLabel: 'View supervision', disabled: !onNavigateToStudent || busy,
      onOpen: () => onNavigateToStudent?.(team.matricNo), actionAriaLabel: `View supervision for ${team.studentName}`,
    }))} />
    </section> : <EmptyState title={query ? 'No matching supervisees' : 'No current supervisees'} description="Students in your current primary and supporting supervisory teams will appear here." />}
    <WorkspacePagination page={currentPage} pageCount={pageCount} total={teams.length} noun={staffView ? 'teams' : 'supervisees'} onPage={onPage} pageSize={pageSize} onPageSize={onPageSize} />
  </div>;
}

export function SupervisoryTeamManagement({ onChanged, role, refreshVersion = 0, studentActions, onRefresh, showResearchChanges = true, showRefresh = true, onBusyChange, view, routeStudentId, onNavigateToStudent, lecturerId, rosterState, detailContext, detailActions, onNavigateToDossier, onNavigateToPanelRequest, onNavigateToPanelRecommendation }: { onChanged?: () => void; role?: UserRole; refreshVersion?: number; studentActions?: React.ReactNode; onRefresh?: () => void; showResearchChanges?: boolean; showRefresh?: boolean; onBusyChange?: (busy: boolean) => void; view?: SupervisoryTeamView; routeStudentId?: string; onNavigateToStudent?: (matricNo: string) => void; detailContext?:ActiveSuperviseeRow; detailActions?:React.ReactNode; onNavigateToDossier?:(matricNo:string)=>void; onNavigateToPanelRequest?:(id:string,recordKey?:string)=>void; onNavigateToPanelRecommendation?:(matricNo:string)=>void; lecturerId?: string; rosterState?: { search: string; page: number; size: number; onSearch: (value: string) => void; onPage: (value: number) => void; onPageSize: (value: number) => void } }) {
  const [workspace, setWorkspace] = useState<SupervisoryWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditAction | null>(null);
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState<CoSupervisorOutcome>('COMPLETED');
  const [busy, setBusy] = useState(false);
  useEffect(() => { onBusyChange?.(loading || busy); }, [onBusyChange, loading, busy]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useRecordDraft(!!edit && (!!reason.trim() || outcome !== 'COMPLETED'), busy);
  const [localSearch, setLocalSearch] = useListState(`supervisory-teams:${role}`, 'search', '');
  const search = rosterState?.search ?? localSearch;
  const setSearch = rosterState?.onSearch ?? setLocalSearch;
  const [localPage, setLocalPage] = useListState(`supervisory-teams:${role}`, 'page', 1);
  const page = rosterState?.page ?? localPage;
  const setPage = rosterState?.onPage ?? setLocalPage;
  const [localPageSize, setLocalPageSize] = useListState(`supervisory-teams:${role}`, 'size', 10);
  const pageSize = rosterState?.size ?? localPageSize;
  const setPageSize = rosterState?.onPageSize ?? setLocalPageSize;
  const version = useRef(0);
  const mutating = useRef(false);
  const editPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { setEdit(null); setReason(''); setOutcome('COMPLETED'); setNotice(null); }, [view, routeStudentId]);
  useEffect(() => {
    if (!edit) return;
    editPanel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    editPanel.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus({ preventScroll: true });
  }, [edit]);
  const load = useCallback(async (strict = false, background = false) => {
    const token = ++version.current;
    if (!background) { setLoading(true); setError(null); }
    try { let data = role === 'Programme Coordinator' && view === 'detail' && routeStudentId ? await getCoordinatorTeam(routeStudentId) : role === 'Office Staff/Admin' && view === 'detail' && routeStudentId ? await officeSupervisorApi.team(routeStudentId) : await getSupervisoryWorkspace();
      if (role === 'Lecturer' && view === 'detail' && routeStudentId) {
        const target = data.teams.find(team => team.matricNo === routeStudentId);
        if (target) {
          const exact = await getSupervisoryTeam(target.studentId);
          if (exact.matricNo !== routeStudentId) throw new Error('The returned supervision record does not match this student.');
          data = {...data, teams:[exact]};
        }
      }
      if (version.current === token) setWorkspace(data);
    }
    catch (failure) { if (!background && version.current === token) { setWorkspace(null); setError(failure instanceof Error ? failure.message : 'The supervisory team could not be loaded.'); } if (strict) throw failure; }
    finally { if (!background && version.current === token) setLoading(false); }
  }, [role, view, routeStudentId]);
  useEffect(() => { void load(); return () => { version.current += 1; }; }, [load, refreshVersion, view, routeStudentId]);
  useReturnToFocusReload(() => void load(), (view === 'roster' || view === 'studentOverview') && !loading && !busy && !edit);
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
  const routeContent = workspace && view ? <SupervisoryTeamRouteContent workspace={workspace} role={role} view={view} routeStudentId={routeStudentId} studentActions={studentActions} busy={busy} search={search} page={page}
    lecturerId={lecturerId} detailContext={detailContext} detailActions={detailActions} onNavigateToDossier={onNavigateToDossier} onNavigateToPanelRequest={onNavigateToPanelRequest} onNavigateToPanelRecommendation={onNavigateToPanelRecommendation} onEndPrimary={async(endOutcome,endReason)=>{
      const application=workspace.primaryApplication; if(mutating.current||application?.appointmentLifecycle?.status!=='ACTIVE'||application.studentId!==routeStudentId||!['Office Staff/Admin','Programme Coordinator'].includes(role??''))throw new Error('This appointment is unavailable for ending.');
      mutating.current=true;setBusy(true);try{return await completeDecision(()=>endSupervisorAppointment(application.appointmentLifecycle.appointmentId,endOutcome,endReason),async()=>{await load(true,true);onChanged?.();});}finally{mutating.current=false;setBusy(false);}
    }} pageSize={pageSize} onPageSize={value => { setPageSize(value); if (!rosterState) setPage(1); }}
    onSearch={value => { setSearch(value); if (!rosterState) setPage(1); }} onPage={setPage} onNavigateToStudent={onNavigateToStudent}
    onNominate={team => begin({ kind: 'nominate', team, replacement: null })} onEnd={appointment => begin({ kind: 'end', appointment })}
    onReplace={(team, replacement) => begin({ kind: 'nominate', team, replacement })} onNominationAction={(nomination, action) => begin({ kind: 'decision', nomination, action })} /> : null;
  if (role === 'Student') return <StudentAppointmentSection detail id="supervisory-team-management" title="My supervisors" description="Your confirmed primary and supporting supervisors.">
    {loading ? <LoadingState message="Loading your supervisors…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : workspace ? view ? routeContent : <StudentSupervisorsOverview workspace={workspace} actions={studentActions} /> : null}
  </StudentAppointmentSection>;
  return <section id="supervisory-team-management" className={view==='detail'?'font-sans space-y-5 text-left':'font-sans space-y-5 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm'}>
    {view!=='detail'?<WorkspaceSectionHeader title={view === 'roster' ? (role === 'Lecturer' ? 'My supervisees' : 'Supervisory teams') : view === 'requests' ? 'Supporting-supervisor requests' : view === 'history' ? 'Supporting appointment history' : 'Supervisory teams'} description={view === 'roster' ? (role === 'Lecturer' ? 'View your current supervisees and their supervision details.' : 'View students and their supervisory teams.') : 'One primary supervisor and up to two supporting co-supervisors.'}
       />:null}
    {view!=='detail'&&role !== 'Lecturer' ? <p className="card-description">The primary supervisor manages Panel nominations and supervisor Marks. Supporting appointments provide research and progress access.</p> : null}
    {notice ? <p role="status" className="card-description rounded-lg border border-slate-200 bg-slate-50 p-3">{notice}</p> : null}
    <div ref={editPanel}>
    {edit?.kind === 'nominate' ? <NominationForm key={`${edit.team.studentId}-${edit.replacement?.id ?? 'new'}`} team={edit.team} replacement={edit.replacement} busy={busy} onCancel={() => setEdit(null)} onSubmit={(candidateId, justification) => void run(() => nominateCoSupervisor({ studentId: edit.team.studentId, candidateId, justification, ...(edit.replacement ? { replacesAppointmentId: edit.replacement.id } : {}) }))} /> : null}
    <DecisionDialog isOpen={!!edit && edit.kind !== 'nominate'} decisionKey={edit?.kind === 'end' ? `end:${edit.appointment.id}` : edit?.kind === 'decision' ? `supporting:${edit.nomination.id}` : undefined}
      tone={edit?.kind==='decision'&&['accept','approve'].includes(edit.action)?'info':'danger'} title={edit?.kind === 'end' ? 'End supporting appointment' : edit?.kind === 'decision' ? `${labels[edit.action]} supporting request` : 'Supporting request'}
      confirmLabel={edit?.kind === 'end' ? 'End supporting appointment' : edit?.kind === 'decision' ? `${labels[edit.action]} supporting request` : 'Approve supporting appointment'}
      kind={edit?.kind === 'end' || (edit?.kind === 'decision' && edit.action === 'cancel') ? 'confirmation' : 'review'}
      context={edit?.kind === 'end' ? <p>{edit.appointment.studentName} · {edit.appointment.matricNo} · {workspace?.teams.find(team => team.studentId === edit.appointment.studentId)?.programme}</p> : edit?.kind === 'decision' ? <p>{edit.nomination.studentName} · {edit.nomination.matricNo} · {edit.nomination.programme}</p> : null}
      message={edit?.kind === 'end' ? 'This supporting appointment will end with the selected outcome and recorded reason.' : edit?.kind === 'decision' && edit.action === 'accept' ? 'Acceptance forwards the nomination to the Programme Coordinator.' : edit?.kind === 'decision' && edit.action === 'approve' ? 'Approval confirms the supporting appointment after eligibility and capacity checks.' : edit?.kind === 'decision' && edit.action === 'cancel' ? 'This nomination will be cancelled.' : 'This supporting request will be rejected with your reason recorded.'}
      busy={busy} dirty={!!reason.trim() || outcome !== 'COMPLETED'} canConfirm={!!edit && edit.kind !== 'nominate' && (edit.kind === 'decision' && ['accept', 'approve'].includes(edit.action) || !!reason.trim())}
      successMessage="Supervisory team decision recorded." onClose={() => { setEdit(null); setReason(''); setOutcome('COMPLETED'); }} onReload={() => load(true)} onConfirm={async () => {
        if (!edit || edit.kind === 'nominate' || mutating.current) return false;
        if ((edit.kind === 'end' || !['accept', 'approve'].includes(edit.action)) && !reason.trim()) return false;
        mutating.current = true; setBusy(true);
        try { return await completeDecision(() => edit.kind === 'end' ? endCoSupervisor(edit.appointment.id, outcome, reason.trim()) : decideCoSupervisor(edit.nomination.id, edit.action, reason.trim()), async () => { await load(true); onChanged?.(); }); }
        finally { mutating.current = false; setBusy(false); }
      }}>
      {edit?.kind === 'end' ? <label className="form-label block">Outcome<Select className={inputClass} value={outcome} onChange={event => setOutcome(event.target.value as CoSupervisorOutcome)} disabled={busy}><option value="COMPLETED">Completed</option><option value="WITHDRAWN">Withdrawn</option><option value="OTHER">Other</option></Select></label> : null}
      {edit && edit.kind !== 'nominate' && (edit.kind === 'end' || !['accept', 'approve'].includes(edit.action)) ? <label className="form-label block">Reason (required)<textarea required className={inputClass} rows={3} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label> : null}
    </DecisionDialog>
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
