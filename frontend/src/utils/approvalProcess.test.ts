import assert from 'node:assert/strict';
import { buildSupervisorApprovalProcess as build, orderApprovalEvents, type ApprovalEvent } from './approvalProcess';

const at = '2026-10-14T02:00:00Z';
const event = (overrides: Partial<ApprovalEvent>): ApprovalEvent => ({ id: 1, action: 'SUBMIT', actorName: 'Actual submitter', actorRole: 'Student', previousStatus: '', newStatus: 'SUBMITTED_TO_SUPERVISOR', createdAt: at, ...overrides });
const find = (steps: ReturnType<typeof build>, id: string) => { const step = steps.find(row => row.id === id); assert.ok(step, `Has ${id}`); return step; };

for (const kind of ['primary', 'supporting'] as const) {
  const submitted = kind === 'supporting' ? 'SUBMITTED_TO_CO_SUPERVISOR' : 'SUBMITTED_TO_SUPERVISOR';
  const initial = build({ kind, status: submitted, submittedAt: at, waitingDays: 3 });
  assert.equal(find(initial, 'submitted').state, 'completed');
  assert.equal(find(initial, 'submitted').occurredAt, at);
  assert.equal(find(initial, 'supervisor').state, 'current');
  assert.match(find(initial, 'supervisor').description!, /3 calendar days/);
  assert.equal(find(initial, 'coordinator').state, 'upcoming');
  const accepted = build({ kind, status: 'PENDING_COORDINATOR' });
  assert.equal(find(accepted, 'supervisor').state, 'completed');
  assert.equal(find(accepted, 'supervisor').actorName, undefined);
  assert.equal(find(accepted, 'supervisor').occurredAt, undefined);
  assert.match(find(accepted, 'supervisor').description!, /Not recorded/);
  assert.equal(find(accepted, 'coordinator').state, 'current');
  const approved = build({ kind, status: 'APPROVED', waitingDays: 400 });
  assert.equal(find(approved, 'coordinator').state, 'completed');
  assert.equal(find(approved, 'outcome').state, 'completed');
  assert.doesNotMatch(JSON.stringify(approved), /400 calendar|current/);
}

const actual = build({ kind: 'primary', status: 'APPROVED', events: [
  event({ id: 3, action: 'COORDINATOR_APPROVE', actorName: 'Dr Coordinator', actorRole: 'Coordinator', previousStatus: 'PENDING_COORDINATOR', newStatus: 'APPROVED', createdAt: '2026-10-14T04:00:00Z' }),
  event({ id: 4, action: 'COMMENT', actorName: 'Office editor', previousStatus: 'APPROVED', newStatus: 'APPROVED', createdAt: '2026-10-14T05:00:00Z' }),
  event({ id: 1 }),
  event({ id: 2, action: 'SUPERVISOR_ACCEPT', actorName: 'Dr Supervisor', actorRole: 'Lecturer', previousStatus: 'SUBMITTED_TO_SUPERVISOR', newStatus: 'PENDING_COORDINATOR', createdAt: '2026-10-14T03:00:00Z' }),
] });
assert.equal(find(actual, 'supervisor').actorName, 'Dr Supervisor');
assert.equal(find(actual, 'coordinator').actorName, 'Dr Coordinator');
assert.equal(find(actual, 'submitted').actorName, 'Actual submitter');
assert.equal(find(actual, 'outcome').occurredAt, '2026-10-14T04:00:00Z');
assert.equal(find(actual, 'outcome').showRecordedDetails, false, 'Outcome keeps the event data without repeating the final reviewer in the visual timeline');

const primaryRejection = build({ kind: 'primary', status: 'REJECTED_BY_SUPERVISOR', events: [event({ action: 'SUPERVISOR_REJECT', actorName: 'Dr Reviewer', previousStatus: 'SUBMITTED_TO_SUPERVISOR', newStatus: 'REJECTED_BY_SUPERVISOR', reason: 'Out of scope' })] });
assert.equal(find(primaryRejection, 'supervisor').state, 'rejected');
assert.equal(find(primaryRejection, 'supervisor').reason, 'Out of scope');
assert.equal(find(primaryRejection, 'coordinator').state, 'not_reached');
assert.equal(find(primaryRejection, 'outcome').state, 'rejected');
assert.equal(primaryRejection.filter(step => step.reason === 'Out of scope').length, 1, 'Decision reason appears once in the process');
assert.equal(find(build({ kind: 'research', status: 'PENDING_SUPERVISOR', events: [event({ reason: 'Submission reason' })] }), 'submitted').reason, undefined, 'Submission explanation belongs to request content and raw audit');
const coRejection = build({ kind: 'supporting', status: 'REJECTED_BY_COORDINATOR' });
assert.equal(find(coRejection, 'supervisor').state, 'completed');
assert.equal(find(coRejection, 'coordinator').state, 'rejected');
const cancelled = build({ kind: 'primary', status: 'CANCELLED_BY_STUDENT', waitingDays: 7, events: [event({ action: 'STUDENT_CANCEL', previousStatus: 'PENDING_COORDINATOR', newStatus: 'CANCELLED_BY_STUDENT', reason: 'Change of plans' })] });
assert.equal(find(cancelled, 'supervisor').state, 'completed');
assert.equal(find(cancelled, 'coordinator').state, 'not_reached');
assert.equal(find(cancelled, 'outcome').state, 'cancelled');
assert.equal(find(cancelled, 'outcome').reason, 'Change of plans');
assert.doesNotMatch(JSON.stringify(cancelled), /7 calendar|current/);
const noCancelHistory = build({ kind: 'primary', status: 'CANCELLED' });
assert.equal(find(noCancelHistory, 'supervisor').state, 'not_reached');
assert.equal(find(noCancelHistory, 'coordinator').state, 'not_reached');

for (const status of ['PENDING_SUPERVISOR', 'PENDING_COORDINATOR']) {
  const research = build({ kind: 'research', status, waitingDays: 0 });
  assert.deepEqual(research.map(row => row.id), ['submitted', 'supervisor', 'outcome']);
  assert.equal(find(research, 'supervisor').state, 'current');
}
const researchDone = build({ kind: 'research', status: 'APPROVED', events: [event({ action: 'APPROVE', actorName: 'Primary reviewer', actorRole: 'Lecturer', previousStatus: 'PENDING_SUPERVISOR', newStatus: 'APPROVED' })] });
assert.equal(find(researchDone, 'supervisor').actorName, 'Primary reviewer');
assert.equal(researchDone.some(row => row.label.includes('Coordinator')), false);
const approvalReason = build({ kind: 'research', status: 'APPROVED', events: [event({ action: 'APPROVE', actorName: 'Reviewer', actorRole: 'Lecturer', previousStatus: 'PENDING_SUPERVISOR', newStatus: 'APPROVED', reason: 'Positive decision note' })] });
assert.equal(approvalReason.filter(step => step.reason === 'Positive decision note').length, 1);
const legacyDone = build({ kind: 'research', status: 'APPROVED', events: [
  event({ id: 2, action: 'APPROVE', actorName: 'Historical Coordinator', actorRole: 'Coordinator', previousStatus: 'PENDING_COORDINATOR', newStatus: 'APPROVED', createdAt: '2026-10-14T04:00:00Z' }),
  event({ id: 1, action: 'ENDORSE', actorName: 'Earlier Supervisor', actorRole: 'Lecturer', previousStatus: 'PENDING_SUPERVISOR', newStatus: 'PENDING_COORDINATOR' }),
] });
assert.equal(find(legacyDone, 'supervisor').actorName, 'Earlier Supervisor');
assert.equal(find(legacyDone, 'legacy-coordinator').state, 'completed');
assert.equal(find(legacyDone, 'legacy-coordinator').actorName, 'Historical Coordinator');
assert.match(find(legacyDone, 'legacy-coordinator').label, /Historical/);
const legacyRejected = build({ kind: 'research', status: 'REJECTED', events: [event({ action: 'REJECT', actorName: 'Historical rejecting Coordinator', actorRole: 'Programme Coordinator', previousStatus: 'PENDING_COORDINATOR', newStatus: 'REJECTED', reason: 'Legacy rejection note' })] });
assert.equal(find(legacyRejected, 'legacy-coordinator').state, 'rejected');
assert.equal(find(legacyRejected, 'legacy-coordinator').actorName, 'Historical rejecting Coordinator');
assert.equal(find(legacyRejected, 'supervisor').state, 'completed');
const legacyPending = build({ kind: 'research', status: 'PENDING_COORDINATOR', events: [event({ action: 'ENDORSE', actorName: 'Earlier Supervisor', actorRole: 'Lecturer', previousStatus: 'PENDING_SUPERVISOR', newStatus: 'PENDING_COORDINATOR' })] });
assert.equal(find(legacyPending, 'supervisor').state, 'current');
assert.equal(legacyPending.some(row => row.id === 'legacy-coordinator'), false);
const reviewedAfterLegacy = build({ kind: 'research', status: 'APPROVED', events: [
  event({ id: 1, action: 'ENDORSE', actorName: 'Historical Coordinator', actorRole: 'Coordinator', previousStatus: 'PENDING_SUPERVISOR', newStatus: 'PENDING_COORDINATOR' }),
  event({ id: 2, action: 'APPROVE', actorName: 'Current primary Supervisor', actorRole: 'Lecturer', previousStatus: 'PENDING_COORDINATOR', newStatus: 'APPROVED', createdAt: '2026-10-14T04:00:00Z' }),
] });
assert.equal(find(reviewedAfterLegacy, 'supervisor').actorName, 'Current primary Supervisor');
assert.equal(reviewedAfterLegacy.some(row=>row.id==='legacy-coordinator'),false,'A Coordinator account endorsing at the Supervisor stage is not an extra Coordinator approval');
const coordinatorAsSupervisor=build({kind:'research',status:'APPROVED',events:[event({action:'APPROVE',actorName:'Primary reviewer with Coordinator account',actorRole:'Programme Coordinator',previousStatus:'PENDING_SUPERVISOR',newStatus:'APPROVED'})]});
assert.equal(coordinatorAsSupervisor.some(row=>row.id==='legacy-coordinator'),false,'Account role does not determine the stage being reviewed');
assert.equal(find(coordinatorAsSupervisor,'supervisor').actorName,'Primary reviewer with Coordinator account');
const waitingCode = build({ kind: 'supporting', status: 'PENDING_COORDINATOR', waitingOn: 'PROGRAMME_COORDINATOR' });
assert.match(find(waitingCode, 'coordinator').description!, /Awaiting Programme Coordinator/);

const transfer = build({ kind: 'transfer', status: 'PENDING_DESTINATION_COORDINATOR', events: [event({ action: 'ENDORSE', actorName: 'Source reviewer', actorRole: 'Coordinator', previousStatus: 'PENDING_SOURCE_COORDINATOR', newStatus: 'PENDING_DESTINATION_COORDINATOR', retainTeam: true })] });
assert.deepEqual(transfer.map(row => row.id), ['submitted', 'source-coordinator', 'destination-coordinator', 'outcome']);
assert.equal(find(transfer, 'source-coordinator').actorName, 'Source reviewer');
assert.equal(find(transfer, 'destination-coordinator').state, 'current');
const transferRejected = build({ kind: 'transfer', status: 'REJECTED', events: [event({ action: 'REJECT', actorName: 'Destination reviewer', previousStatus: 'PENDING_DESTINATION_COORDINATOR', newStatus: 'REJECTED', reason: 'Programme mismatch' })] });
assert.equal(find(transferRejected, 'source-coordinator').state, 'completed');
assert.equal(find(transferRejected, 'destination-coordinator').state, 'rejected');
const ambiguousRejected = build({ kind: 'transfer', status: 'REJECTED' });
assert.equal(find(ambiguousRejected, 'source-coordinator').state, 'unknown');
assert.equal(find(ambiguousRejected, 'destination-coordinator').state, 'unknown');
assert.equal(find(ambiguousRejected, 'outcome').state, 'rejected');
const unknown = build({ kind: 'primary', status: 'UNRECOGNIZED' });
assert.equal(find(unknown, 'submitted').state, 'unknown', 'Unknown status and no submission evidence cannot invent completed submission');
assert.equal(find(unknown, 'supervisor').state, 'unknown');
assert.equal(unknown.some(row => row.state === 'current'), false);

const sameStatus = build({ kind: 'primary', status: 'SUBMITTED_TO_SUPERVISOR', events: [event({ action: 'NOTE', previousStatus: 'SUBMITTED_TO_SUPERVISOR' })] });
assert.equal(find(sameStatus, 'supervisor').actorName, undefined);
assert.equal(find(sameStatus, 'supervisor').state, 'current');
const sameTime = [event({ id: 'first' }), event({ id: 'second' }), event({ id: 'invalid', createdAt: 'bad' }), event({ id: 'earlier', createdAt: '2026-10-13T02:00:00Z' })];
assert.deepEqual(orderApprovalEvents(sameTime).map(row => row.id), ['earlier', 'first', 'second', 'invalid']);
assert.deepEqual(sameTime.map(row => row.id), ['first', 'second', 'invalid', 'earlier']);
console.log('Shared approval process workflows, truthful history and terminal states passed');
