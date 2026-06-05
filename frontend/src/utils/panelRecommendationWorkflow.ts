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
  DRAFT: 'Draft',
  SUBMITTED_TO_PANEL: 'Submitted to Panel',
  REJECTED_BY_PANEL: 'Rejected by Panel',
  ACCEPTED_BY_PANEL: 'Accepted by Panel',
  PENDING_COORDINATOR: 'Pending Coordinator',
  REJECTED_BY_COORDINATOR: 'Rejected by Coordinator',
  APPROVED: 'Approved',
};

const REJECTED_STATUSES: PanelRecommendationStatus[] = [
  'REJECTED_BY_PANEL',
  'REJECTED_BY_COORDINATOR',
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
