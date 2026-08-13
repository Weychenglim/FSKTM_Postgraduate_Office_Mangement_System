/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Supervisor & Panel Appointment domain models (UC10–UC23).

export type WorkflowWaitingOn =
  | 'SUPERVISOR'
  | 'SELECTED_PANEL'
  | 'PROGRAMME_COORDINATOR'
  | 'FACULTY_PROCESSING';

export interface WorkflowAgeingMetadata {
  semesterId?: number | null;
  semesterCode?: string | null;
  waitingSince?: string | null;
  waitingDays?: number | null;
  waitingOn?: WorkflowWaitingOn | null;
}

export type AppointmentEndOutcome = 'COMPLETED' | 'REPLACED' | 'WITHDRAWN' | 'OTHER';

export interface AppointmentLifecycleEvent {
  id: number;
  action: 'ACTIVATED' | 'ENDED' | 'REPLACED';
  actorName: string;
  actorRole: string;
  previousStatus: string;
  newStatus: string;
  outcome: AppointmentEndOutcome | null;
  reason: string | null;
  createdAt: string;
}

export interface AppointmentLifecycle {
  appointmentId: number;
  status: 'ACTIVE' | 'ENDED' | 'COMPLETED';
  endOutcome: AppointmentEndOutcome | null;
  endReason: string | null;
  endedAt: string | null;
  endedBy: string | null;
  supersedesAppointmentId: number | null;
  replacementAppointmentId: number | null;
  lifecycle?: AppointmentLifecycleEvent[];
}

export type SupervisorAppointmentStatus =
  | 'Approved'
  | 'Ended'
  | 'Pending'
  | 'No Supervisor'
  | 'Workload Alert'
  | 'Rejected'
  | 'Cancelled';

export interface SupervisorRecord extends WorkflowAgeingMetadata {
  applicationId?: number;
  studentId: string;
  studentName: string;
  programme: string;
  supervisor: string;
  status: SupervisorAppointmentStatus;
  updatedDate: string;
  email?: string;
  semester?: string;
  researchTopic?: string;
  researchArea?: string;
  abstract?: string;
  appointmentId?: number | string | null;
  workloadLimit?: string;
  approvedDate?: string;
  releasedDate?: string;
  panelMemberName?: string;
  panelAssignedDate?: string;
  workflow?: SupervisorWorkflowEvent[];
  documents?: SupervisorApplicationDocument[];
  appointmentLifecycle?: AppointmentLifecycle | null;
  replacesAppointmentId?: number | null;
  replacementReason?: string | null;
}

export type PanelAppointmentStatus =
  | 'Approved'
  | 'Ended'
  | 'No Panel'
  | 'Pending'
  | 'Recommendation'
  | 'Rejected'
  | 'Cancelled';

export interface PanelRecord extends WorkflowAgeingMetadata {
  recordId: string;
  id: string; // student ID, e.g. "MEA2301184"
  studentName: string;
  programme: string;
  semester: string;
  supervisor: string;
  panelMember: string; // lecturer name, or "Pending" / "Not Assigned"
  status: PanelAppointmentStatus;
  updatedDate: string; // "23 Nov 2025" or "-"
  researchTitle?: string;
  researchArea?: string;
  abstract?: string;
  appointmentDate?: string;
  panelMemberId?: string;
  panelMemberDepartment?: string;
  panelMemberEmail?: string;
  recommendationSubmittedAt?: string | null;
  panelDecisionAt?: string | null;
  coordinatorDecisionAt?: string | null;
  appointmentConfirmedAt?: string | null;
  recommendationId?: number | string | null;
  rejectionStage?: 'Selected Panel' | 'Programme Coordinator' | null;
  rejectionReason?: string;
  cancelledAt?: string | null;
  cancellationReason?: string;
  workflow?: SupervisorWorkflowEvent[];
  appointmentLifecycle?: AppointmentLifecycle | null;
}

// ── Lecturer-facing supervisor appointment views (UC11–UC13) ──
// A pending supervisor appointment request shown to a lecturer to review.
export interface SupervisorRequest extends WorkflowAgeingMetadata {
  applicationId?: number;
  studentId: string;
  studentName: string;
  programme: string;
  proposedTopic: string;
  researchArea: string;
  submittedDate: string;
  receivedTime: string;
  status: string;
  abstract?: string;
}

// A row in the lecturer's active supervisee roster.
export interface ActiveSuperviseeRow {
  appointmentId: number;
  studentId: string;
  studentName: string;
  programme: string;
  semester: string;
  email: string;
  researchTitle: string;
  researchArea: string;
  researchAbstract: string;
  supervisorName: string;
  appointmentDate: string;
  status: string;
}

export interface SupervisorWorkloadSummary {
  currentStudents: number;
  workloadLimit: number;
  availableSlots: number;
}

export interface SupervisorWorkloadRecord {
  lecturerId: string;
  lecturerName: string;
  department: string;
  currentStudents: number;
  workloadLimit: number;
  availability: 'Available' | 'Near Limit' | 'Full Load';
  email: string;
  supervisees: Array<{
    id: string;
    name: string;
    programme: string;
    status: string;
    topic: string;
    appointmentDate: string;
  }>;
}

// ── Lecturer-facing panel appointment views (UC20–UC23) ──
// A student assigned to a lecturer acting as panel member.
export interface PanelAssignment extends WorkflowAgeingMetadata {
  appointmentId: number;
  studentId: string;
  studentName: string;
  researchTitle: string;
  supervisor: string;
  appointmentDate: string;
  status: 'ACTIVE' | 'PENDING' | 'ENDED' | 'COMPLETED';
  programme?: string;
  intake?: string;
  researchArea?: string;
  abstract?: string;
  initials?: string;
  supervisorDepartment?: string;
  supervisorEmail?: string;
  recommendationSubmittedAt?: string | null;
  panelDecisionAt?: string | null;
  coordinatorDecisionAt?: string | null;
  appointmentConfirmedAt?: string | null;
  endOutcome?: AppointmentEndOutcome | null;
  endReason?: string | null;
  endedAt?: string | null;
  supersedesAppointmentId?: number | null;
}

// Approval lifecycle for a supervisor's panel-member recommendation.
export type PanelRecommendationStatus =
  | 'SUBMITTED_TO_PANEL'
  | 'REJECTED_BY_PANEL'
  | 'PENDING_COORDINATOR'
  | 'REJECTED_BY_COORDINATOR'
  | 'APPROVED'
  | 'CANCELLED_BY_SUPERVISOR';

// A panel-member recommendation a lecturer drafts/submits for a supervisee.
export interface PanelRecommendationDraft extends WorkflowAgeingMetadata {
  id?: number | string;
  studentId: string;
  studentName: string;
  programme: string;
  semester?: string;
  proposedTopic: string;
  researchArea?: string;
  abstract?: string;
  recommendedMember: string;
  recommendedMemberId: string;
  supervisorName?: string;
  submittedDate: string;
  submittedAt?: string | null;
  panelDecisionAt?: string | null;
  coordinatorDecisionAt?: string | null;
  cancelledAt?: string | null;
  status: PanelRecommendationStatus;
  justification?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  updatedAt?: string | null;
  selectedPanelDecision?: 'ACCEPTED' | 'REJECTED' | null;
  workflow?: SupervisorWorkflowEvent[];
  replacesAppointmentId?: number | null;
  replacementReason?: string | null;
  appointmentLifecycle?: AppointmentLifecycle | null;
}

export interface CoordinatorPanelWorkspace {
  programme: string;
  pendingCount: number;
  queue: PanelRecommendationDraft[];
  records: PanelRecommendationDraft[];
  message?: string;
}

export interface PanelRecommendationSupervisee {
  studentId: string;
  studentName: string;
  programme: string;
  semester: string;
  proposedTopic: string;
  researchArea: string;
  abstract: string;
  supervisorName: string;
  supervisorId: string;
  supervisorAppointmentId: number;
  panelAppointmentId: number | null;
  currentPanelMember: string | null;
  currentPanelMemberId: string | null;
  canRecommend: boolean;
}

export interface PanelCandidate {
  staffId: string;
  name: string;
  department: string;
  workloadCount: number;
  workloadLimit: number;
  canSubmit: boolean;
  availability: 'Available' | 'Workload Full' | string;
  workloadHelpText: string;
}

export interface PanelWorkloadItem {
  type: 'Confirmed Appointment' | 'Pending Nomination';
  studentName: string;
  studentId: string;
  researchTitle: string;
  date: string;
}

export interface PanelWorkloadRecord {
  id: string;
  name: string;
  department: string;
  currentStudents: number;
  workloadLimit: number;
  availability: 'Available' | 'Near Limit' | 'Full Load';
  initials: string;
  confirmedAppointments: number;
  pendingNominations: number;
  workloadItems: PanelWorkloadItem[];
}

export interface StudentPanelAppointmentView extends WorkflowAgeingMetadata {
  status: 'PENDING' | 'CONFIRMED';
  readinessState:
    | 'SUPERVISOR_REQUIRED'
    | 'SUPERVISOR_APPROVAL_PENDING'
    | 'READY_FOR_PANEL_RECOMMENDATION'
    | 'FACULTY_PROCESSING'
    | 'CONFIRMED';
  studentName: string;
  studentId: string;
  programme: string;
  semester: string;
  researchTitle: string;
  supervisorName: string;
  panelMemberName: string | null;
  panelMemberId: string | null;
  panelMemberDepartment: string | null;
  panelMemberEmail: string | null;
  appointmentDate: string | null;
}

// A submitted panel recommendation record shown in the history list.
export interface SubmittedRecommendation extends WorkflowAgeingMetadata {
  id: string;
  recommendationId?: number | string;
  studentName: string;
  studentId: string;
  researchTitle: string;
  recommendedPanel: string;
  recommendedPanelId?: string;
  date: string;
  status: 'Approved' | 'Pending Approval' | 'Rejected' | 'Cancelled';
  workflowStatus?: PanelRecommendationStatus;
  semester: string;
  programme?: string;
  researchArea?: string;
  abstract?: string;
  justification?: string;
  rejectionReason?: string;
  submittedAt?: string | null;
  panelDecisionAt?: string | null;
  coordinatorDecisionAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string;
  workflow?: SupervisorWorkflowEvent[];
}

// A past supervisor appointment request the lecturer already approved/rejected.
export interface SupervisorRequestHistoryRow {
  requestId: string;
  studentName: string;
  studentId: string;
  programme: string;
  researchTitle: string;
  submittedDate: string;
  decision: 'Approved' | 'Rejected' | 'Cancelled';
  semester: string;
  abstract: string;
  decisionReason?: string;
}

// Lecturer workload tracking (UC16, UC21).
export interface WorkloadStat {
  lecturerName: string;
  assigned: number;
  limit: number;
  status: 'AVAILABLE' | 'NEAR LIMIT' | 'FULL';
}

// Compact appointment summary used on dashboard cards.
export interface RecentAppointment {
  studentName: string;
  date: string;
  status: string;
}

// Student-facing supervisor appointment application workflow.
export type StudentSupervisorApplicationStatus =
  | 'PENDING REVIEW'
  | 'RETURNED'
  | 'CANCELLED'
  | 'APPROVED';

export interface StudentSupervisorApplication extends WorkflowAgeingMetadata {
  applicationId?: number;
  id: string;
  title: string;
  researchArea: string;
  supervisor: string;
  date: string;
  status: StudentSupervisorApplicationStatus;
  workflowStatus?: SupervisorApplicationWorkflowStatus;
  workflow?: SupervisorWorkflowEvent[];
  cancellationReason?: string;
  cancelledAt?: string | null;
  rejectionReason?: string;
  documents?: SupervisorApplicationDocument[];
  appointmentLifecycle?: AppointmentLifecycle | null;
  replacesAppointmentId?: number | null;
  replacementReason?: string | null;
}

export type SupervisorApplicationWorkflowStatus =
  | 'SUBMITTED_TO_SUPERVISOR'
  | 'REJECTED_BY_SUPERVISOR'
  | 'PENDING_COORDINATOR'
  | 'REJECTED_BY_COORDINATOR'
  | 'CANCELLED_BY_STUDENT'
  | 'APPROVED';

export interface SupervisorWorkflowEvent {
  id: number;
  action: string;
  actorName: string;
  actorRole: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  createdAt: string;
}

export interface SupervisorApplicationRecord extends WorkflowAgeingMetadata {
  id: number;
  studentId: string;
  studentName: string;
  programme: string;
  semester: string;
  proposedSupervisor: string;
  proposedSupervisorId: string;
  researchTitle: string;
  researchArea: string;
  researchAbstract: string;
  researchProfileReady: boolean;
  status: SupervisorApplicationWorkflowStatus;
  rejectionReason: string;
  submittedAt: string;
  supervisorDecisionAt?: string | null;
  coordinatorDecisionAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string;
  documents?: SupervisorApplicationDocument[];
  workflow: SupervisorWorkflowEvent[];
  appointmentLifecycle?: AppointmentLifecycle | null;
  replacesAppointmentId?: number | null;
  replacementReason?: string | null;
}

export interface SupervisorDocumentRequirement {
  id: number;
  code: string;
  label: string;
  description: string;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  isUsed: boolean;
}

export interface SupervisorApplicationDocument {
  id: number;
  requirementCode: string | null;
  requirementLabel: string;
  name: string;
  contentType:
    | 'application/pdf'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    | null;
  size: number;
  checksum: string | null;
  availability: 'AVAILABLE' | 'LEGACY_METADATA';
  uploadedAt: string;
}

export interface SupervisorDocumentRequirementAudit {
  id: number;
  requirementId: number;
  requirementCode: string;
  requirementLabel: string;
  actorName: string;
  actorRole: string;
  action: 'CREATE' | 'UPDATE';
  reason: string;
  beforeValues: Record<string, unknown>;
  afterValues: Record<string, unknown>;
  createdAt: string;
}

export interface SupervisorCandidate {
  id: string;
  name: string;
  initials: string;
  filled: number;
  total: number;
  domain: string;
}
