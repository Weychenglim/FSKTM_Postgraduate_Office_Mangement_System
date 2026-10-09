import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentDashboard } from './StudentDashboard';
import { StudentAppointmentStatusCardsView } from './StudentAppointmentStatusCards';
import type { StudentPanelAppointmentView, SupervisorApplicationRecord } from '../types';

const markup = renderToStaticMarkup(<StudentDashboard studentName="Synthetic Student" onNavigateToTab={() => {}} />);
assert.doesNotMatch(markup, /Dr\. Siti Noor/, 'The student dashboard must never invent an assigned supervisor.');
assert.match(markup, /Loading appointment status/, 'Appointment cards must wait for persisted records.');
console.log('Student dashboard initial appointment state passed');

const application = (name: string, status: SupervisorApplicationRecord['status'], lifecycle: 'ACTIVE' | 'ENDED' | null): SupervisorApplicationRecord => ({
  id: 1, studentId: 'SYN-001', studentName: 'Synthetic Student', programme: 'AI', semester: '2026/2027',
  proposedSupervisor: name, proposedSupervisorId: name, researchTitle: 'Synthetic Research', researchArea: 'Computing',
  researchAbstract: 'Synthetic abstract', researchProfileReady: true, status, rejectionReason: '', submittedAt: '2026-10-07',
  workflow: [], appointmentLifecycle: lifecycle ? { appointmentId: 1, status: lifecycle,
    endOutcome: lifecycle === 'ENDED' ? 'REPLACED' : null, endReason: null, endedAt: null, endedBy: null,
    supersedesAppointmentId: null, replacementAppointmentId: null } : null,
});
const confirmedPanel: StudentPanelAppointmentView = {
  status: 'CONFIRMED', readinessState: 'CONFIRMED', studentId: 'SYN-001', studentName: 'Synthetic Student',
  programme: 'AI', semester: '2026/2027', researchTitle: 'Synthetic Research', supervisorName: 'Incoming Supervisor',
  panelMemberName: 'Incoming Panel', panelMemberId: 'P-002', panelMemberDepartment: 'Computing',
  panelMemberEmail: 'panel@example.test', appointmentDate: '2026-10-07',
};
const render = (applications: SupervisorApplicationRecord[], panel: StudentPanelAppointmentView | null = confirmedPanel,
                loading = false, error: string | null = null) => renderToStaticMarkup(
  <StudentAppointmentStatusCardsView applications={applications} panel={panel} loading={loading} error={error}
    onNavigateToTab={() => {}} onRetry={() => {}} />,
);
const incumbent = application('Incumbent Supervisor', 'APPROVED', 'ACTIVE');
for (const status of ['SUBMITTED_TO_SUPERVISOR', 'PENDING_COORDINATOR'] as const) {
  const pending = application('Proposed Replacement', status, null);
  const duringReview = render([pending, incumbent]);
  assert.match(duringReview, /Incumbent Supervisor is assigned/);
  assert.doesNotMatch(duringReview, /Proposed Replacement/);
  assert.match(render([pending]), /Awaiting approval/);
  assert.doesNotMatch(render([pending]), /is assigned as your current supervisor/);
}
const afterHandover = render([
  application('Former Supervisor', 'APPROVED', 'ENDED'), application('Incoming Supervisor', 'APPROVED', 'ACTIVE'),
]);
assert.match(afterHandover, /Incoming Supervisor is assigned/);
assert.match(afterHandover, /Incoming Panel is assigned/);
assert.match(afterHandover, /Confirmed/);
assert.doesNotMatch(afterHandover, /Former Supervisor|Awaiting release|Dr\. Siti Noor/);
for (const records of [[], [application('Former Supervisor','APPROVED','ENDED')],
                       [application('Legacy Approval','APPROVED',null)],
                       [application('Cancelled Request','CANCELLED_BY_STUDENT',null)],
                       [application('Rejected Request','REJECTED_BY_COORDINATOR',null)]]) {
  assert.match(render(records), /No active supervisor/);
  assert.doesNotMatch(render(records), /is assigned as your current supervisor/);
}
for (const readinessState of ['SUPERVISOR_REQUIRED', 'SUPERVISOR_APPROVAL_PENDING', 'READY_FOR_PANEL_RECOMMENDATION', 'FACULTY_PROCESSING'] as const) {
  const pendingPanel = { ...confirmedPanel, status: 'PENDING' as const, readinessState, panelMemberName: 'Private Pending Reviewer' };
  const pendingMarkup = render([], pendingPanel);
  assert.doesNotMatch(pendingMarkup, /Private Pending Reviewer|Incoming Panel|Confirmed/);
  assert.match(pendingMarkup, /Supervisor appointment required|Supervisor approval is in progress|Ready for Panel recommendation|Panel appointment is being processed/);
}
const loading = render([incumbent], confirmedPanel, true);
assert.match(loading, /Loading appointment status/);
assert.doesNotMatch(loading, /Incumbent Supervisor|Incoming Panel|Approved|Confirmed/);
const failed = render([incumbent], confirmedPanel, false, 'Synthetic appointment API outage');
assert.match(failed, /Synthetic appointment API outage/);
assert.match(failed, /Retry/);
assert.doesNotMatch(failed, /Incumbent Supervisor|Incoming Panel|Approved|Confirmed/);
assert.match(render([], null), /Appointment status could not be loaded/);
console.log('Student dashboard replacement, inactive history, readiness privacy and stale-content checks passed');
