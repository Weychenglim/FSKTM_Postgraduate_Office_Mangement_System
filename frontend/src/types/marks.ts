/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Marks Entry & Management domain models (UC24–UC29).

export type MarkStatus = 'Submitted' | 'Draft' | 'Not Started' | 'Overdue' | 'Closed';

export type DeadlineState =
  | 'NO_DEADLINE'
  | 'UPCOMING'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'COMPLETE';

export interface DeadlineMetadata {
  dueAt?: string | null;
  daysUntilDue?: number | null;
  deadlineState?: DeadlineState | null;
}

export interface MarkRecord extends DeadlineMetadata {
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
  taskLifecycleStatus?: 'ACTIVE' | 'RETIRED';
  retiredAt?: string | null;
  retirementReason?: string | null;
}

// Rubric components (UC26).
export interface RubricComponent {
  id: number | string;
  code?: string;
  name: string;
  description: string;
  maxMarks: number | string;
  required: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
  displayOrder?: number;
}

export type EvaluationPeriodLifecycle = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type EvaluationPeriodEffectiveStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'ARCHIVED';

export interface MarksConfigurationAuditEvent {
  id: number;
  entityType: 'RUBRIC' | 'PERIOD';
  entityId: number;
  action: string;
  actorName: string;
  actorRole: string;
  reason: string;
  beforeValues: Record<string, unknown>;
  afterValues: Record<string, unknown>;
  createdAt: string;
}

export interface RubricVersion {
  id: number;
  familyCode: string;
  code: string;
  name: string;
  description: string;
  version: number;
  targetMark: string;
  componentTotal: string;
  isReady: boolean;
  isLocked: boolean;
  isActive: boolean;
  supersedesId: number | null;
  components: RubricComponent[];
  auditEvents?: MarksConfigurationAuditEvent[];
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
  semesterId: number | null;
  semesterCode: string | null;
  rubricId: number;
  rubricName: string;
  opensAt: string | null;
  closesAt: string | null;
  isOpen: boolean;
  lifecycleStatus: EvaluationPeriodLifecycle;
  effectiveStatus: EvaluationPeriodEffectiveStatus;
  publishedAt?: string | null;
  closedAt?: string | null;
  archivedAt?: string | null;
  rubric?: RubricVersion;
  auditEvents?: MarksConfigurationAuditEvent[];
  taskTotals: EvaluationTaskTotals;
}

export interface MarkRecordDetail extends DeadlineMetadata {
  recordId: string;
  taskId: number;
  student: {
    studentId: string;
    name: string;
    programme: string;
    semester: string;
    researchTitle: string;
  };
  evaluator: {
    userId: number;
    name: string;
    email: string;
    staffId: string;
    department: string;
    role: EvaluationTaskRole;
    roleLabel: string;
  };
  assignment: {
    assignedAt: string;
    assignedBy: string | null;
    lifecycleStatus: 'ACTIVE' | 'RETIRED';
    retiredAt: string | null;
    retiredBy: string | null;
    retirementReason: string | null;
  };
  period: DeadlineMetadata & {
    id: number;
    name: string;
    semester: string;
    opensAt: string | null;
    closesAt: string | null;
    lifecycleStatus: EvaluationPeriodLifecycle;
    effectiveStatus: EvaluationPeriodEffectiveStatus;
  };
  rubric: {
    id: number;
    familyCode: string;
    name: string;
    version: number;
    targetMark: string;
    componentTotal: string;
    components: Array<RubricComponent & {
      marksAwarded: string | null;
      feedback: string;
    }>;
  };
  entry: {
    status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';
    totalMark: string | null;
    comments: string;
    submittedAt: string | null;
    updatedAt: string | null;
    isLocked: boolean;
  };
  overrideHistory: Array<{
    id: number;
    actorName: string;
    originalEvaluator: string | null;
    newEvaluator: string;
    reason: string;
    createdAt: string;
  }>;
  correctionHistory: Array<{
    id: number;
    action: 'CORRECT' | 'REOPEN';
    actorName: string;
    actorRole: string;
    reason: string;
    beforeValues: Record<string, unknown>;
    afterValues: Record<string, unknown>;
    createdAt: string;
  }>;
  handoverHistory: Array<{
    id: number;
    replacementTaskId: number | null;
    actorName: string;
    reason: string;
    draftSnapshot: Record<string, unknown>;
    createdAt: string;
  }>;
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

export interface EvaluationPreviewTask extends DeadlineMetadata {
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

export interface EvaluationTask extends DeadlineMetadata {
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
