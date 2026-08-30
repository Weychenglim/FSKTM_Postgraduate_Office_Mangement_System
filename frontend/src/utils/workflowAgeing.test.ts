import assert from 'node:assert/strict';
import type {
  WorkflowAgeingMetadata,
  WorkflowWaitingOn,
} from '../types/appointment';
import type { DashboardTask } from '../types/dashboard';
import type { DeadlineMetadata } from '../types/marks';
import {
  compareLongestWaiting,
  formatDeadlineText,
  formatWaitingText,
  resolveDashboardTaskRoute,
} from './workflowAgeing';

const waitingOn: WorkflowWaitingOn = 'PROGRAMME_COORDINATOR';
const waitingMetadata: WorkflowAgeingMetadata = {
  waitingSince: '2026-07-20T08:00:00Z',
  waitingDays: 3,
  waitingOn,
};

assert.equal(
  formatWaitingText(waitingMetadata),
  'Waiting on Programme Coordinator for 3 days',
);
assert.equal(
  formatWaitingText({ waitingDays: 1, waitingOn: 'SELECTED_PANEL' }),
  'Waiting on Selected Panel for 1 day',
);
assert.equal(
  formatWaitingText({ waitingDays: 0, waitingOn: 'SUPERVISOR' }),
  'Waiting on Supervisor today',
);
assert.equal(
  formatWaitingText({ waitingDays: 2, waitingOn: 'FACULTY_PROCESSING' }),
  'Waiting on Faculty Processing for 2 days',
);
assert.equal(
  formatWaitingText({ waitingDays: null, waitingOn: 'SUPERVISOR' }),
  'Waiting on Supervisor',
);
assert.equal(formatWaitingText(null), 'Not waiting');

const upcomingDeadline: DeadlineMetadata = {
  dueAt: '2026-07-26T23:59:59Z',
  daysUntilDue: 3,
  deadlineState: 'UPCOMING',
};

assert.equal(formatDeadlineText(upcomingDeadline), 'Due in 3 days');
assert.equal(
  formatDeadlineText({ daysUntilDue: 1, deadlineState: 'UPCOMING' }),
  'Due in 1 day',
);
assert.equal(
  formatDeadlineText({ daysUntilDue: 0, deadlineState: 'DUE_TODAY' }),
  'Due today',
);
assert.equal(
  formatDeadlineText({ daysUntilDue: -4, deadlineState: 'OVERDUE' }),
  'Overdue by 4 days',
);
assert.equal(
  formatDeadlineText({ daysUntilDue: null, deadlineState: 'OVERDUE' }),
  'Overdue',
);
assert.equal(formatDeadlineText({ deadlineState: 'COMPLETE' }), 'Complete');
assert.equal(formatDeadlineText({ deadlineState: 'NO_DEADLINE' }), 'No deadline');
assert.equal(formatDeadlineText(null), 'No deadline');

const waitingRecords: WorkflowAgeingMetadata[] = [
  { waitingDays: null },
  { waitingDays: 2 },
  { waitingDays: 5 },
  { waitingDays: 0 },
];
waitingRecords.sort(compareLongestWaiting);
assert.deepEqual(
  waitingRecords.map((record) => record.waitingDays),
  [5, 2, 0, null],
);

const taskDefaults = {
  id: 'task-1',
  name: 'Review workflow',
  status: 'Pending',
  statusText: 'Pending review',
  target: '/legacy-target',
} satisfies DashboardTask;

assert.equal(
  resolveDashboardTaskRoute({
    ...taskDefaults,
    targetModule: 'DASHBOARD',
    recordType: 'TIMELINE_ENTRY',
    recordId: 'timeline-1',
  }),
  '/dashboard/timeline',
);
assert.equal(
  resolveDashboardTaskRoute({
    ...taskDefaults,
    targetModule: 'SUPERVISOR_APPOINTMENTS',
    recordType: 'SUPERVISOR_APPLICATION',
    recordId: 'A/42',
  }),
  '/supervisor-appointments/A%2F42',
);
assert.equal(
  resolveDashboardTaskRoute({
    ...taskDefaults,
    targetModule: 'PANEL_APPOINTMENTS',
    recordType: 'PANEL_RECOMMENDATION',
    recordId: '7',
  }),
  '/panel-appointments/recommendations/7',
);
assert.equal(
  resolveDashboardTaskRoute({
    ...taskDefaults,
    targetModule: 'PANEL_APPOINTMENTS',
    recordType: 'PANEL_RECORD',
    recordId: 'appointment-42',
  }),
  '/panel-appointments/records/appointment-42',
);
assert.equal(
  resolveDashboardTaskRoute({
    ...taskDefaults,
    targetModule: 'MARKS',
    recordType: 'MARK_RECORD',
    recordId: 'MARK/001',
  }),
  '/marks/records/MARK%2F001',
);
assert.equal(
  resolveDashboardTaskRoute({
    ...taskDefaults,
    targetModule: 'PANEL_APPOINTMENTS',
    recordType: null,
    recordId: null,
  }),
  '/panel-appointments',
);
assert.equal(resolveDashboardTaskRoute(taskDefaults), '/legacy-target');

console.log('workflowAgeing tests passed');
