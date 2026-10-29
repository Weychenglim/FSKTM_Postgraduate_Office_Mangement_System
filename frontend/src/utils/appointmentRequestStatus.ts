import type { ApprovalStep } from './approvalProcess';

const labels: Record<string, string> = {
  SUBMITTED_TO_SUPERVISOR: 'Awaiting Supervisor review',
  SUBMITTED_TO_CO_SUPERVISOR: 'Awaiting supporting Supervisor review',
  SUBMITTED_TO_PANEL: 'Awaiting Panel review',
  PENDING_SUPERVISOR: 'Awaiting Supervisor review',
  PENDING_COORDINATOR: 'Awaiting Coordinator approval',
  PENDING_SOURCE_COORDINATOR: 'Awaiting source Coordinator review',
  PENDING_DESTINATION_COORDINATOR: 'Awaiting destination Coordinator approval',
  APPROVED: 'Approved',
  REJECTED_BY_SUPERVISOR: 'Rejected by Supervisor',
  REJECTED_BY_CO_SUPERVISOR: 'Rejected by supporting Supervisor',
  REJECTED_BY_PANEL: 'Rejected by Panel',
  REJECTED_BY_COORDINATOR: 'Rejected by Coordinator',
  REJECTED: 'Rejected',
  CANCELLED_BY_STUDENT: 'Cancelled by Student',
  CANCELLED_BY_SUPERVISOR: 'Cancelled by Supervisor',
  CANCELLED_BY_OFFICE: 'Cancelled by Office',
  CANCELLED_CAPACITY_FULL: 'Capacity full',
  CANCELLED: 'Cancelled',
  NOT_SUBMITTED: 'No request submitted',
  UNKNOWN: 'Status unavailable',
  ACTIVE: 'Active',
  ENDED: 'Ended',
  COMPLETED: 'Completed',
  REPLACED: 'Replaced',
  WITHDRAWN: 'Withdrawn',
  OTHER: 'Other',
  RETURNED: 'Returned for changes',
  CONFIRMED: 'Approved',
  PENDING: 'Awaiting review',
  PENDING_REVIEW: 'Awaiting review',
  NO_SUPERVISOR: 'Not appointed',
  NO_PANEL: 'Not appointed',
};

export function appointmentRequestStatusLabel(status: string): string {
  return labels[status.trim().toUpperCase().replaceAll(' ', '_')] ?? 'Status unavailable';
}

export function appointmentRequestStatusTone(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'APPROVED') return 'success';
  if (status.startsWith('REJECTED')) return 'danger';
  if (status.startsWith('SUBMITTED_') || status.startsWith('PENDING_')) return 'warning';
  return 'neutral';
}

/** Action wording needs evidence; a terminal outcome alone cannot supply a reviewer. */
export function requestReviewStepLabel(reviewer: string, state: ApprovalStep['state'], decisionRecorded = false, verb = 'accepted'): string {
  const stage = `${reviewer} ${verb === 'approved' ? 'approval' : 'review'}`;
  if (state === 'current') return `Awaiting ${stage}`;
  if (state === 'completed' && decisionRecorded) return `${reviewer} ${verb}`;
  if (state === 'rejected') return `${reviewer} rejected`;
  return stage;
}
