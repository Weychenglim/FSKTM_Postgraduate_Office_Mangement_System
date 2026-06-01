/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Marks Entry & Management domain models (UC24–UC29).

export type MarkStatus = 'Submitted' | 'Draft' | 'Not Started' | 'Overdue' | 'Closed';

export interface MarkRecord {
  id: string; // Record ID e.g. "MRK-2025-021"
  studentId: string;
  studentName: string;
  studentInitials: string;
  researchTitle: string;
  panelMember: string;
  semester: string;
  programme: string;
  totalMark: number | null | 'Draft'; // numeric, 'Draft' if draft, or null if not started
  status: MarkStatus;
  submittedDate: string; // "12 Dec 2025" or "-"
  rubricScores?: Record<string, number>;
}

// Rubric components (UC26).
export interface RubricComponent {
  id: string;
  name: string;
  description: string;
  maxMarks: number;
  required: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  displayOrder?: number;
}

// Evaluation task assignment preview rows (UC25).
export type EvaluationPreviewStatus = 'GENERATED' | 'PENDING' | 'NOTIFIED';

export interface EvaluationPreviewTask {
  id: string;
  studentId: string;
  studentName: string;
  researchTitle: string;
  panelMember: string;
  semester: string;
  status: EvaluationPreviewStatus;
}
