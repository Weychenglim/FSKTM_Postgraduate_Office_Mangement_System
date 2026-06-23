/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import {
  PANEL_RECOMMENDATION_STATUS_LABELS,
  canSubmitPanelCandidate,
  canReviewPanelRecommendation,
  canCreatePanelRecommendation,
  getPanelCandidateValidationMessage,
  getNextPanelRecommendationStatus,
  requiresPanelRejectionReason,
} from './panelRecommendationWorkflow';
import { PanelRecommendationStatus } from '../types';

const activeStatuses: PanelRecommendationStatus[] = [
  'SUBMITTED_TO_PANEL',
  'ACCEPTED_BY_PANEL',
  'PENDING_COORDINATOR',
  'APPROVED',
];

for (const status of activeStatuses) {
  assert.equal(
    canCreatePanelRecommendation([{ studentId: 'MEA2209841', status }], 'MEA2209841'),
    false,
    `${PANEL_RECOMMENDATION_STATUS_LABELS[status]} should block a duplicate recommendation`,
  );
}

assert.equal(
  Object.values(PANEL_RECOMMENDATION_STATUS_LABELS).includes('Draft'),
  false,
  'Panel recommendations should not expose a draft lifecycle state',
);

assert.equal(
  canCreatePanelRecommendation([{ studentId: 'MEA2209841', status: 'REJECTED_BY_PANEL' }], 'MEA2209841'),
  true,
  'A panel rejection should allow a fresh recommendation',
);

assert.equal(
  canCreatePanelRecommendation([{ studentId: 'MEA2209841', status: 'REJECTED_BY_COORDINATOR' }], 'MEA2209841'),
  true,
  'A coordinator rejection should allow a fresh recommendation',
);

assert.equal(
  canCreatePanelRecommendation(
    [
      { studentId: 'MEA2209841', status: 'REJECTED_BY_PANEL' },
      { studentId: 'MEA2209841', status: 'SUBMITTED_TO_PANEL' },
    ],
    'MEA2209841',
  ),
  false,
  'Any active recommendation should block duplicates even when older rejected recommendations exist',
);

assert.equal(
  getNextPanelRecommendationStatus('SUBMITTED_TO_PANEL', 'panelAccept'),
  'PENDING_COORDINATOR',
);

assert.equal(
  getNextPanelRecommendationStatus('SUBMITTED_TO_PANEL', 'panelReject'),
  'REJECTED_BY_PANEL',
);

assert.equal(
  getNextPanelRecommendationStatus('PENDING_COORDINATOR', 'coordinatorApprove'),
  'APPROVED',
);

assert.equal(
  getNextPanelRecommendationStatus('PENDING_COORDINATOR', 'coordinatorReject'),
  'REJECTED_BY_COORDINATOR',
);

assert.equal(requiresPanelRejectionReason('panelReject', ''), true);
assert.equal(requiresPanelRejectionReason('panelReject', 'Workload conflict'), false);

assert.equal(canReviewPanelRecommendation('SUBMITTED_TO_PANEL', 'SUPERVISOR'), false);
assert.equal(canReviewPanelRecommendation('SUBMITTED_TO_PANEL', 'SELECTED_PANEL'), true);
assert.equal(canReviewPanelRecommendation('SUBMITTED_TO_PANEL', 'PROGRAMME_COORDINATOR'), false);
assert.equal(canReviewPanelRecommendation('PENDING_COORDINATOR', 'SELECTED_PANEL'), false);
assert.equal(canReviewPanelRecommendation('PENDING_COORDINATOR', 'PROGRAMME_COORDINATOR'), true);
assert.equal(canReviewPanelRecommendation('APPROVED', 'PROGRAMME_COORDINATOR'), false);

assert.equal(canSubmitPanelCandidate({ workloadCount: 4, workloadLimit: 5, isSupervisor: false }), true);
assert.equal(canSubmitPanelCandidate({ workloadCount: 5, workloadLimit: 5, isSupervisor: false }), false);
assert.equal(canSubmitPanelCandidate({ workloadCount: 1, workloadLimit: 5, isSupervisor: true }), false);
assert.match(
  getPanelCandidateValidationMessage({ workloadCount: 5, workloadLimit: 5, isSupervisor: false, hasNotes: true }),
  /workload limit/i,
);

assert.equal(
  canCreatePanelRecommendation([{ studentId: 'MEA2209841', status: 'CANCELLED_BY_SUPERVISOR' }], 'MEA2209841'),
  true,
  'A supervisor cancellation should allow a fresh recommendation',
);
assert.match(
  getPanelCandidateValidationMessage({ workloadCount: 3, workloadLimit: 5, isSupervisor: false, hasNotes: false }),
  /justification/i,
);

console.log('panelRecommendationWorkflow tests passed');
