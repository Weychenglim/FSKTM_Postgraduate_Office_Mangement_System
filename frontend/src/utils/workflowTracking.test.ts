import {
  canStudentCancelSupervisorApplication,
  notificationTargetToNavigation,
} from './workflowTracking';

if (!canStudentCancelSupervisorApplication('SUBMITTED_TO_SUPERVISOR')) {
  throw new Error('A student should be able to cancel before supervisor action.');
}

for (const status of [
  'PENDING_COORDINATOR',
  'REJECTED_BY_SUPERVISOR',
  'REJECTED_BY_COORDINATOR',
  'CANCELLED_BY_STUDENT',
  'APPROVED',
] as const) {
  if (canStudentCancelSupervisorApplication(status)) {
    throw new Error(`A student should not be able to cancel ${status}.`);
  }
}

const supervisorTarget = notificationTargetToNavigation({
  targetModule: 'SUPERVISOR_APPOINTMENTS',
  recordType: 'SUPERVISOR_APPLICATION',
  recordId: '42',
});
if (
  supervisorTarget.sidebarItem !== 'Supervisor Appointments'
  || supervisorTarget.recordId !== '42'
) {
  throw new Error('Supervisor notification target was not resolved correctly.');
}

const panelTarget = notificationTargetToNavigation({
  targetModule: 'PANEL_APPOINTMENTS',
  recordType: 'PANEL_RECOMMENDATION',
  recordId: '7',
});
if (
  panelTarget.sidebarItem !== 'Panel Appointments'
  || panelTarget.recordId !== '7'
) {
  throw new Error('Panel notification target was not resolved correctly.');
}

console.log('workflowTracking tests passed');
