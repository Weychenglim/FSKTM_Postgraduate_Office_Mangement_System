import { requestReviewStepLabel } from './appointmentRequestStatus';

export interface ApprovalEvent {
  id: string | number;
  action: string;
  actorName: string;
  actorRole?: string;
  previousStatus?: string;
  newStatus: string;
  reason?: string;
  createdAt: string;
  retainTeam?: boolean;
}

export interface ApprovalStep {
  id: string;
  label: string;
  state: 'completed' | 'current' | 'upcoming' | 'rejected' | 'cancelled' | 'not_reached' | 'unknown';
  actorName?: string;
  actorRole?: string;
  occurredAt?: string;
  description?: string;
  reason?: string;
  showRecordedDetails?: boolean;
}

export interface SupervisorApprovalProcessInput {
  kind: 'primary' | 'supporting' | 'research' | 'transfer';
  status: string;
  submittedAt?: string | null;
  events?: ApprovalEvent[];
  waitingDays?: number | null;
  waitingOn?: string | null;
}

const normalized = (value: string | undefined) => (value ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();
const isApproval = (event: ApprovalEvent) => /(?:^|_)(ACCEPT|ACCEPTED|APPROVE|APPROVED|ENDORSE|ENDORSED)$/.test(normalized(event.action))
  && normalized(event.previousStatus) !== normalized(event.newStatus);
const isSubmission = (event: ApprovalEvent) => /^(SUBMIT|SUBMITTED|NOMINATE|NOMINATED)$/.test(normalized(event.action));
const isRejection = (status: string) => status.startsWith('REJECTED') || status === 'RETURNED';
const isCancellation = (status: string) => status.startsWith('CANCELLED') || status === 'WITHDRAWN';
const waitingLabels: Record<string, string> = {
  SUPERVISOR: 'Supervisor', CO_SUPERVISOR: 'Supporting Supervisor', COORDINATOR: 'Coordinator',
  PROGRAMME_COORDINATOR: 'Programme Coordinator', SOURCE_COORDINATOR: 'Source Coordinator',
  DESTINATION_COORDINATOR: 'Destination Coordinator', FACULTY_PROCESSING: 'Faculty processing',
};

/** Invalid timestamps retain their input order after dated events; equal instants are stable. */
export function orderApprovalEvents(events: ApprovalEvent[]): ApprovalEvent[] {
  const instant = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? Date.parse(value) : NaN;
  return events.map((event, index) => ({ event, index, time: instant(event.createdAt) }))
    .sort((left, right) => {
      const a = Number.isFinite(left.time) ? left.time : Infinity;
      const b = Number.isFinite(right.time) ? right.time : Infinity;
      return (a === b ? 0 : a - b) || left.index - right.index;
    }).map(row => row.event);
}

export function buildSupervisorApprovalProcess({ kind, status: rawStatus, submittedAt, events = [], waitingDays, waitingOn }: SupervisorApprovalProcessInput): ApprovalStep[] {
  const status = normalized(rawStatus);
  const history = orderApprovalEvents(events);
  const latest = (predicate: (event: ApprovalEvent) => boolean) => history.filter(predicate).at(-1);
  const approved = ['APPROVED', 'CONFIRMED', 'COMPLETED'].includes(status);
  const rejected = isRejection(status);
  const cancelled = isCancellation(status);
  const terminal = approved || rejected || cancelled;
  const terminalEvent = latest(event => normalized(event.newStatus) === status
    && normalized(event.previousStatus) !== status
    && (approved ? isApproval(event) : rejected ? /REJECT/.test(normalized(event.action)) : /CANCEL|WITHDRAW/.test(normalized(event.action))));
  const legacyDecision = kind === 'research' ? latest(event => normalized(event.previousStatus)==='PENDING_COORDINATOR'
    && (isApproval(event) || /REJECT/.test(normalized(event.action)) && isRejection(normalized(event.newStatus)))
    && /COORDINATOR/.test(normalized(event.actorRole) + '_' + normalized(event.action))
    && (['APPROVED', 'PENDING_COORDINATOR'].includes(normalized(event.newStatus)) || isRejection(normalized(event.newStatus)))) : undefined;
  const stages = kind === 'transfer'
    ? [{ id: 'source-coordinator', label: 'Source Coordinator review' }, { id: 'destination-coordinator', label: 'Destination Coordinator approval' }]
    : [{ id: 'supervisor', label: kind === 'supporting' ? 'Supporting Supervisor review' : 'Supervisor review' },
      ...(kind === 'research' ? legacyDecision ? [{ id: 'legacy-coordinator', label: 'Historical recorded review' }] : [] : [{ id: 'coordinator', label: 'Coordinator approval' }])];
  const stageIndex = (value: string | undefined): number | undefined => {
    const stage = normalized(value);
    if (kind === 'transfer') {
      if (stage === 'PENDING_SOURCE_COORDINATOR') return 0;
      if (stage === 'PENDING_DESTINATION_COORDINATOR') return 1;
      return undefined;
    }
    if (['SUBMITTED_TO_SUPERVISOR', 'SUBMITTED_TO_CO_SUPERVISOR', 'PENDING_SUPERVISOR', 'SUPERVISOR_APPROVAL_PENDING'].includes(stage)) return 0;
    if (stage === 'PENDING_COORDINATOR') return kind === 'research' ? legacyDecision && terminal ? 1 : 0 : 1;
    return undefined;
  };
  const stageDecision = (index: number) => latest(event => {
    if (!isApproval(event)) return false;
    if (stages[index].id === 'legacy-coordinator') return event === legacyDecision;
    if (kind === 'research' && event === legacyDecision) return false;
    // A current Supervisor can decide an old pending-Coordinator research record.
    if (kind === 'research' && normalized(event.previousStatus) === 'PENDING_COORDINATOR'
      && !/COORDINATOR/.test(normalized(event.actorRole) + '_' + normalized(event.action))) return index === 0;
    const before = stageIndex(event.previousStatus);
    if (before != null) return before === index;
    const action = normalized(event.action);
    const next = normalized(event.newStatus);
    if (kind === 'transfer') return index === 0 ? next === 'PENDING_DESTINATION_COORDINATOR' : next === 'APPROVED';
    if (index === 0) return /SUPERVISOR|CO_SUPERVISOR/.test(action) || next === 'PENDING_COORDINATOR' || kind === 'research' && next === 'APPROVED';
    return /COORDINATOR/.test(action) || next === 'APPROVED';
  });
  let stoppedAt = stageIndex(terminalEvent?.previousStatus);
  if (kind === 'research' && terminalEvent && normalized(terminalEvent.previousStatus) === 'PENDING_COORDINATOR') {
    stoppedAt = legacyDecision && /COORDINATOR/.test(normalized(terminalEvent.actorRole) + '_' + normalized(terminalEvent.action)) ? 1 : 0;
  }
  if (rejected) {
    if (status.includes('COORDINATOR')) stoppedAt = stages.length - 1;
    else if (status.includes('SUPERVISOR') || kind === 'research' && !legacyDecision) stoppedAt = 0;
  }
  const current = terminal ? undefined : stageIndex(status);
  const submission = history.find(isSubmission);
  const recorded = (event?: ApprovalEvent): Pick<ApprovalStep, 'actorName' | 'actorRole' | 'occurredAt' | 'reason'> => event ? {
    actorName: event.actorName || undefined, actorRole: event.actorRole || undefined, occurredAt: event.createdAt || undefined, reason: event.reason || undefined,
  } : {};
  const submissionKnown = !!submission || !!submittedAt || terminal || current != null;
  const steps: ApprovalStep[] = [{ id: 'submitted', label: 'Request submitted', state: submissionKnown ? 'completed' : 'unknown', ...recorded(submission),
    occurredAt: submission?.createdAt || submittedAt || undefined, reason: undefined,
    ...(!submission ? { description: 'Submission actor: Not recorded.' } : {}),
  }];
  for (const [index, stage] of stages.entries()) {
    const decision = stageDecision(index);
    let state: ApprovalStep['state'];
    if (approved) state = 'completed';
    else if (rejected) state = stoppedAt == null ? decision ? 'completed' : 'unknown' : index < stoppedAt ? 'completed' : index === stoppedAt ? 'rejected' : 'not_reached';
    else if (cancelled) state = decision || stoppedAt != null && index < stoppedAt ? 'completed' : 'not_reached';
    else if (current != null) state = index < current ? 'completed' : index === current ? 'current' : 'upcoming';
    else state = decision ? 'completed' : 'unknown';
    const details = state === 'rejected' ? terminalEvent : state === 'completed' ? decision : undefined;
    let description: string | undefined;
    if (state === 'current') {
      description = `Awaiting ${waitingLabels[normalized(waitingOn ?? '')] || waitingOn?.trim() || stage.label.replace(/ review| approval$/, '')}.`;
      if (Number.isSafeInteger(waitingDays) && waitingDays! >= 0) description += ` ${waitingDays} calendar ${waitingDays === 1 ? 'day' : 'days'} at this stage.`;
    } else if ((state === 'completed' || state === 'rejected') && !details) description = 'Decision details: Not recorded.';
    else if (state === 'not_reached') description = 'Not reached before the request ended.';
    else if (state === 'unknown') description = 'Stage history: Not recorded.';
    if (stage.id === 'legacy-coordinator' && details) description = 'Recorded under the earlier approval process.';
    const label = kind === 'primary' || kind === 'supporting'
      ? requestReviewStepLabel(index === 0 ? kind === 'supporting' ? 'Supporting Supervisor' : 'Supervisor' : 'Coordinator', state, !!details, index === 0 ? 'accepted' : 'approved')
      : stage.label;
    steps.push({ ...stage, label, state, ...recorded(details), description });
  }
  steps.push({ id: 'outcome', label: 'Outcome', state: approved ? 'completed' : rejected ? 'rejected' : cancelled ? 'cancelled' : current != null ? 'upcoming' : 'unknown',
    ...(terminal ? recorded(terminalEvent) : {}),
    showRecordedDetails: !terminalEvent || !steps.some(step => step.occurredAt === terminalEvent.createdAt && step.actorName === terminalEvent.actorName && ['completed','rejected'].includes(step.state)),
    ...(terminalEvent?.reason && steps.some(step => step.reason === terminalEvent.reason) ? { reason: undefined } : {}),
    description: approved ? kind === 'research' || kind === 'transfer' ? 'Applied on approval.' : 'Request approved.'
      : rejected ? stoppedAt == null ? 'Request rejected. Deciding stage: Not recorded.' : `Request rejected at ${stages[stoppedAt].label}.`
        : cancelled ? stoppedAt == null ? 'Request cancelled. Cancellation stage: Not recorded.' : `Request cancelled while awaiting ${stages[stoppedAt].label}.`
          : current != null ? 'Pending decision.' : 'Current workflow status: Not recorded.',
  });
  return steps;
}
