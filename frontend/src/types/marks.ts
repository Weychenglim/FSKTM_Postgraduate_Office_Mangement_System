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
  evaluatorRole?: EvaluationTaskRole;
  evaluatorRoleLabel?: string;
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

export interface EditableRubricWeight {
  id: number;
  name: string;
  weight: number;
}

export interface MarkRubricBreakdownRow {
  component: string;
  maxMarks: number;
  marksAwarded: number;
  feedback: string;
}

// Evaluation task assignment preview rows (UC25).
export type EvaluationPreviewStatus = 'GENERATED' | 'PENDING' | 'NOTIFIED' | 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'OVERDUE';
export type EvaluationTaskRole = 'SUPERVISOR' | 'PANEL' | 'BACKUP';

export interface EvaluationTaskTotals {
  total: number;
  supervisor: number;
  panel: number;
  backup: number;
  submitted: number;
  incomplete: number;
  overdue: number;
}

export interface EvaluationPeriodOption {
  id: number;
  name: string;
  semester: string;
  rubricId: number;
  rubricName: string;
  opensAt: string | null;
  closesAt: string | null;
  isOpen: boolean;
  taskTotals: EvaluationTaskTotals;
}

export interface MarksAssignmentStudentOption {
  studentId: string;
  studentName: string;
  programme: string;
  semester: string;
  researchTitle: string;
  supervisorName: string;
}

export interface MarksAssignmentLecturerOption {
  userId: number;
  staffId: string;
  fullName: string;
  department: string;
  email: string;
}

export interface EvaluationPreviewTask {
  taskId?: number;
  id: string;
  periodId?: number;
  studentId: string;
  studentName: string;
  researchTitle: string;
  panelMember: string;
  evaluatorId?: number;
  evaluatorRole?: EvaluationTaskRole;
  evaluatorRoleLabel?: string;
  semester: string;
  status: EvaluationPreviewStatus;
}

export interface MarksAssignmentOptions {
  students: MarksAssignmentStudentOption[];
  lecturers: MarksAssignmentLecturerOption[];
  tasks: EvaluationPreviewTask[];
}

// Lecturer marks-entry task (UC24). Owned by LecturerMarksEntry and re-used by
// MarkEntryDetail, MarksEntryHistory, and SubmittedMarkDetail.
export type EvaluationStatus = 'NOT STARTED' | 'DRAFT SAVED' | 'SUBMITTED';

export interface EvaluationTaskComponent {
  id: number;
  code: string;
  name: string;
  description: string;
  maxMarks: string;
  required: boolean;
  marksAwarded: string | null;
  feedback: string;
}

export interface EvaluationTask {
  id?: number;
  studentId: string;
  studentName: string;
  initials: string;
  researchTitle: string;
  semester: string;
  deadline: string;
  status: EvaluationStatus;
  evaluatorRole?: EvaluationTaskRole;
  evaluatorRoleLabel?: string;
  // Interactive rubric components from the evaluation form.
  problemDefinitionScore?: number;       // max 20
  problemDefinitionFeedback?: string;
  literatureReviewScore?: number;        // max 20
  literatureReviewFeedback?: string;
  methodologyScore?: number;            // max 25
  methodologyFeedback?: string;
  technicalUnderstandingScore?: number;  // max 20
  technicalUnderstandingFeedback?: string;
  presentationScore?: number;           // max 15
  presentationFeedback?: string;
  comments?: string;
  submittedDate?: string;
  totalMark?: string | null;
  components?: EvaluationTaskComponent[];
}
