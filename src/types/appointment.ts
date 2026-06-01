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
