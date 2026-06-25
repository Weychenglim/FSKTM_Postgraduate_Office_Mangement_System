import { SIDEBAR_ITEMS } from '../constants/navigation';

type SupervisorWorkflowStatus =
  | 'SUBMITTED_TO_SUPERVISOR'
  | 'REJECTED_BY_SUPERVISOR'
  | 'PENDING_COORDINATOR'
  | 'REJECTED_BY_COORDINATOR'
  | 'CANCELLED_BY_STUDENT'
  | 'APPROVED';

export const canStudentCancelSupervisorApplication = (
  status: SupervisorWorkflowStatus,
) => status === 'SUBMITTED_TO_SUPERVISOR';

interface WorkflowNotificationTarget {
  targetModule?: string;
  recordType?: string;
  recordId?: string;
}

export const notificationTargetToNavigation = (
  target: WorkflowNotificationTarget,
) => ({
  sidebarItem:
    target.targetModule === 'SUPERVISOR_APPOINTMENTS'
      ? SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS
      : target.targetModule === 'PANEL_APPOINTMENTS'
      ? SIDEBAR_ITEMS.PANEL_APPOINTMENTS
      : SIDEBAR_ITEMS.NOTIFICATIONS,
  recordType: target.recordType,
  recordId: target.recordId,
});
