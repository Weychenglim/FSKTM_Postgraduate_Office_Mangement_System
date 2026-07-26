import {
  APP_ROUTES,
  routeForDashboardTimeline,
  routeForMarkRecord,
  routeForPanelRecommendation,
  routeForPanelRecord,
  routeForSupervisorApplication,
} from '../constants/routes';
import type {
  WorkflowAgeingMetadata,
  WorkflowWaitingOn,
} from '../types/appointment';
import type { DashboardTask } from '../types/dashboard';
import type { DeadlineMetadata } from '../types/marks';

const WAITING_ON_LABELS: Record<WorkflowWaitingOn, string> = {
  SUPERVISOR: 'Supervisor',
  SELECTED_PANEL: 'Selected Panel',
  PROGRAMME_COORDINATOR: 'Programme Coordinator',
  FACULTY_PROCESSING: 'Faculty Processing',
};

const finiteWholeDays = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
};

const dayUnit = (days: number): string => (days === 1 ? 'day' : 'days');

export const formatWaitingText = (
  metadata: WorkflowAgeingMetadata | null | undefined,
): string => {
  const waitingOn = metadata?.waitingOn ?? null;
  const rawDays = finiteWholeDays(metadata?.waitingDays);
  const waitingDays = rawDays === null ? null : Math.max(0, rawDays);
  const prefix = waitingOn
    ? `Waiting on ${WAITING_ON_LABELS[waitingOn]}`
    : 'Waiting';

  if (waitingDays === null) {
    return waitingOn || metadata?.waitingSince ? prefix : 'Not waiting';
  }

  if (waitingDays === 0) {
    return `${prefix} today`;
  }

  return `${prefix} for ${waitingDays} ${dayUnit(waitingDays)}`;
};

export const formatDeadlineText = (
  metadata: DeadlineMetadata | null | undefined,
): string => {
  const state = metadata?.deadlineState ?? 'NO_DEADLINE';
  const daysUntilDue = finiteWholeDays(metadata?.daysUntilDue);

  if (state === 'COMPLETE') {
    return 'Complete';
  }

  if (state === 'NO_DEADLINE') {
    return 'No deadline';
  }

  if (state === 'DUE_TODAY') {
    return 'Due today';
  }

  if (state === 'OVERDUE') {
    const overdueDays = daysUntilDue === null ? null : Math.abs(daysUntilDue);
    return overdueDays
      ? `Overdue by ${overdueDays} ${dayUnit(overdueDays)}`
      : 'Overdue';
  }

  if (daysUntilDue === null) {
    return 'Upcoming deadline';
  }

  const upcomingDays = Math.max(0, daysUntilDue);
  return upcomingDays === 0
    ? 'Due today'
    : `Due in ${upcomingDays} ${dayUnit(upcomingDays)}`;
};

export const compareLongestWaiting = <
  T extends Pick<WorkflowAgeingMetadata, 'waitingDays'>,
>(
  left: T,
  right: T,
): number => {
  const leftDays = finiteWholeDays(left.waitingDays);
  const rightDays = finiteWholeDays(right.waitingDays);

  if (leftDays === null) {
    return rightDays === null ? 0 : 1;
  }

  if (rightDays === null) {
    return -1;
  }

  return Math.max(0, rightDays) - Math.max(0, leftDays);
};

export const resolveDashboardTaskRoute = (task: DashboardTask): string => {
  if (task.targetModule === 'DASHBOARD') {
    return task.recordType === 'TIMELINE_ENTRY'
      ? routeForDashboardTimeline()
      : APP_ROUTES.dashboard;
  }

  if (task.targetModule === 'SUPERVISOR_APPOINTMENTS') {
    return task.recordType === 'SUPERVISOR_APPLICATION' && task.recordId
      ? routeForSupervisorApplication(task.recordId)
      : APP_ROUTES.supervisorAppointments;
  }

  if (task.targetModule === 'PANEL_APPOINTMENTS') {
    if (task.recordType === 'PANEL_RECOMMENDATION' && task.recordId) {
      return routeForPanelRecommendation(task.recordId);
    }

    if (task.recordType === 'PANEL_RECORD' && task.recordId) {
      return routeForPanelRecord(task.recordId);
    }

    return APP_ROUTES.panelAppointments;
  }

  if (task.targetModule === 'MARKS') {
    return task.recordType === 'MARK_RECORD' && task.recordId
      ? routeForMarkRecord(task.recordId)
      : APP_ROUTES.marks;
  }

  return task.target || APP_ROUTES.dashboard;
};
