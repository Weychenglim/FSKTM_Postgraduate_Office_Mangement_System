/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PanelRecommendationStatus } from '../types';

export type PanelRecommendationAction =
  | 'panelAccept'
  | 'panelReject'
  | 'coordinatorApprove'
  | 'coordinatorReject';

export type PanelRecommendationReviewerRole =
  | 'SUPERVISOR'
  | 'SELECTED_PANEL'
  | 'PROGRAMME_COORDINATOR';

export interface PanelRecommendationStatusRecord {
  studentId: string;
  status: PanelRecommendationStatus;
}

export const PANEL_RECOMMENDATION_STATUS_LABELS: Record<PanelRecommendationStatus, string> = {
  SUBMITTED_TO_PANEL: 'Submitted to Panel',
  REJECTED_BY_PANEL: 'Rejected by Panel',
  PENDING_COORDINATOR: 'Pending Coordinator',
  REJECTED_BY_COORDINATOR: 'Rejected by Coordinator',
  CANCELLED_BY_SUPERVISOR: 'Cancelled by Supervisor',
  APPROVED: 'Confirmed',
};

const REJECTED_STATUSES: PanelRecommendationStatus[] = [
  'REJECTED_BY_PANEL',
  'REJECTED_BY_COORDINATOR',
  'CANCELLED_BY_SUPERVISOR',
];

export const isRejectedPanelRecommendationStatus = (status: PanelRecommendationStatus): boolean =>
  REJECTED_STATUSES.includes(status);

export const canCreatePanelRecommendation = (
  recommendations: PanelRecommendationStatusRecord[],
  studentId: string,
): boolean => {
  return !recommendations.some(
    (recommendation) =>
      recommendation.studentId === studentId &&
      !isRejectedPanelRecommendationStatus(recommendation.status),
  );
};

export const getNextPanelRecommendationStatus = (
  currentStatus: PanelRecommendationStatus,
  action: PanelRecommendationAction,
): PanelRecommendationStatus => {
  if (currentStatus === 'SUBMITTED_TO_PANEL') {
    if (action === 'panelAccept') return 'PENDING_COORDINATOR';
    if (action === 'panelReject') return 'REJECTED_BY_PANEL';
  }

  if (currentStatus === 'PENDING_COORDINATOR') {
    if (action === 'coordinatorApprove') return 'APPROVED';
    if (action === 'coordinatorReject') return 'REJECTED_BY_COORDINATOR';
  }

  return currentStatus;
};

export const canReviewPanelRecommendation = (
  status: PanelRecommendationStatus,
  reviewerRole: PanelRecommendationReviewerRole,
): boolean => {
  if (reviewerRole === 'SELECTED_PANEL') return status === 'SUBMITTED_TO_PANEL';
  if (reviewerRole === 'PROGRAMME_COORDINATOR') return status === 'PENDING_COORDINATOR';
  return false;
};

export const requiresPanelRejectionReason = (
  action: PanelRecommendationAction,
  reason: string,
): boolean => action === 'panelReject' && reason.trim().length === 0;

interface PanelCandidateValidationInput {
  workloadCount: number;
  workloadLimit: number;
  isSupervisor: boolean;
  hasNotes?: boolean;
}

export const canSubmitPanelCandidate = ({
  workloadCount,
  workloadLimit,
  isSupervisor,
  hasNotes = true,
}: PanelCandidateValidationInput): boolean =>
  !isSupervisor && hasNotes && workloadCount < workloadLimit;

export const getPanelCandidateValidationMessage = ({
  workloadCount,
  workloadLimit,
  isSupervisor,
  hasNotes = true,
}: PanelCandidateValidationInput): string => {
  if (isSupervisor) return 'The selected panel member cannot be the student supervisor.';
  if (workloadCount >= workloadLimit) {
    return 'This lecturer has reached the panel workload limit. Please choose another panel member.';
  }
  if (!hasNotes) return 'Add justification notes before submitting to the selected panel member.';
  return 'This recommendation is ready to be submitted to the selected panel member for acceptance.';
};
