import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  allowedParticipantTransitions,
  lifecycleLabel,
  participantConflictMessage,
} from './participantLifecycle';
import { APP_ROUTES, routeForParticipantLifecycle } from '../constants/routes';

assert.deepEqual(allowedParticipantTransitions('STUDENT', 'ACTIVE'), [
  'DEFERRED',
  'GRADUATED',
  'WITHDRAWN',
]);
assert.deepEqual(allowedParticipantTransitions('STUDENT', 'DEFERRED'), ['ACTIVE', 'WITHDRAWN']);
assert.deepEqual(allowedParticipantTransitions('LECTURER', 'RETIRING'), ['ACTIVE', 'RETIRED']);
assert.deepEqual(allowedParticipantTransitions('LECTURER', 'RETIRED'), []);
assert.equal(lifecycleLabel('RETIRING'), 'Retiring');
assert.equal(participantConflictMessage(new Error('Resolve assigned work')), 'Resolve assigned work');
assert.equal(routeForParticipantLifecycle(), APP_ROUTES.dashboardParticipantLifecycle);

const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const workspace = readFileSync(new URL('../components/ParticipantLifecycleManagement.tsx', import.meta.url), 'utf8');
const studentSupervisor = readFileSync(new URL('../components/StudentSupervisorAppointment.tsx', import.meta.url), 'utf8');
const coordinatorSupervisor = readFileSync(new URL('../components/CoordinatorSupervisorApprovals.tsx', import.meta.url), 'utf8');
const lecturerPanel = readFileSync(new URL('../components/LecturerPanelAppointments.tsx', import.meta.url), 'utf8');
const markRecords = readFileSync(new URL('../components/MarkEntryRecords.tsx', import.meta.url), 'utf8');
const markDetail = readFileSync(new URL('../components/MarkEntryRecordDetail.tsx', import.meta.url), 'utf8');
assert.match(app, /ParticipantLifecycleManagement/);
assert.match(app, /currentUser\.role !== 'Office Staff\/Admin'/);
assert.match(workspace, /pendingWork/);
assert.match(workspace, /transitionParticipant/);
assert.match(workspace, /cancelParticipantPendingWork/);
assert.match(workspace, /Audit history/);
assert.match(studentSupervisor, /workflowEligible/);
assert.match(coordinatorSupervisor, /participantEligible === false/);
assert.match(lecturerPanel, /recommendation\.participantEligible !== false/);
assert.match(markRecords, /taskLifecycleStatus === 'ACTIVE'/);
assert.match(markRecords, /taskLifecycleStatus === 'PAUSED'/);
assert.match(markDetail, /Paused evaluation task/);
