import { routeForNotificationTarget } from '../constants/routes';

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

export const notificationTargetToRoute = (target: WorkflowNotificationTarget) =>
  routeForNotificationTarget(target);
