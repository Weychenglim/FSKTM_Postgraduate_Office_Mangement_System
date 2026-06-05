/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Supervisor & Panel Appointment domain models (UC10–UC23).

export type SupervisorAppointmentStatus =
  | 'Approved'
  | 'Pending'
  | 'No Supervisor'
  | 'Workload Alert'
  | 'Rejected';

export interface SupervisorRecord {
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
  appointmentId?: string;
  workloadLimit?: string;
  approvedDate?: string;
  releasedDate?: string;
  panelMemberName?: string;
  panelAssignedDate?: string;
}

export type PanelAppointmentStatus =
  | 'Approved'
  | 'No Panel'
  | 'Pending'
  | 'Recommendation'
  | 'Workload Alert'
  | 'Rejected';

export interface PanelRecord {
  id: string; // student ID, e.g. "MEA2301184"
  studentName: string;
  programme: string;
  semester: string;
  supervisor: string;
  panelMember: string; // lecturer name, or "Pending" / "Not Assigned"
  status: PanelAppointmentStatus;
  updatedDate: string; // "23 Nov 2025" or "-"
}

// ── Lecturer-facing supervisor appointment views (UC11–UC13) ──
// A pending supervisor appointment request shown to a lecturer to review.
export interface SupervisorRequest {
  studentId: string;
  studentName: string;
  programme: string;
  proposedTopic: string;
  submittedDate: string;
  receivedTime: string;
  status: string;
  abstract?: string;
}

// A row in the lecturer's active supervisee roster.
export interface ActiveSuperviseeRow {
  studentId: string;
  studentName: string;
  researchTitle: string;
  appointmentDate: string;
  status: string;
}

// ── Lecturer-facing panel appointment views (UC20–UC23) ──
// A student assigned to a lecturer acting as panel member.
export interface PanelAssignment {
  studentId: string;
  studentName: string;
  researchTitle: string;
  supervisor: string;
  appointmentDate: string;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
  programme?: string;
  intake?: string;
  abstract?: string;
  initials?: string;
}

// Approval lifecycle for a supervisor's panel-member recommendation.
export type PanelRecommendationStatus =
  | 'SUBMITTED_TO_PANEL'
  | 'REJECTED_BY_PANEL'
  | 'ACCEPTED_BY_PANEL'
  | 'PENDING_COORDINATOR'
  | 'REJECTED_BY_COORDINATOR'
  | 'APPROVED';

// A panel-member recommendation a lecturer drafts/submits for a supervisee.
export interface PanelRecommendationDraft {
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
  submittedDate: string;
  submittedAt?: string | null;
  panelDecisionAt?: string | null;
  coordinatorDecisionAt?: string | null;
  status: PanelRecommendationStatus;
  justification?: string;
  rejectionReason?: string;
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

// A submitted panel recommendation record shown in the history list.
export interface SubmittedRecommendation {
  id: string;
  studentName: string;
  studentId: string;
  researchTitle: string;
  recommendedPanel: string;
  recommendedPanelId?: string;
  date: string;
  status: 'Approved' | 'Pending Approval' | 'Rejected';
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
}

// A past supervisor appointment request the lecturer already approved/rejected.
export interface SupervisorRequestHistoryRow {
  requestId: string;
  studentName: string;
  studentId: string;
  programme: string;
  researchTitle: string;
  submittedDate: string;
  decision: 'Approved' | 'Rejected';
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
  | 'APPROVED';

export interface StudentSupervisorApplication {
  id: string;
  title: string;
  supervisor: string;
  date: string;
  status: StudentSupervisorApplicationStatus;
}

export interface SupervisorCandidate {
  id: string;
  name: string;
  initials: string;
  filled: number;
  total: number;
  domain: string;
}
