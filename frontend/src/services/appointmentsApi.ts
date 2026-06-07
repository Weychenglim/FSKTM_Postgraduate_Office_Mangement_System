/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Supervisor & Panel Appointment API (UC10–UC23). Returns mock data for now.

import {
  SupervisorRecord,
  PanelRecord,
  SupervisorRequest,
  ActiveSuperviseeRow,
  PanelAssignment,
  PanelCandidate,
  PanelRecommendationDraft,
  PanelRecommendationSupervisee,
  PanelWorkloadRecord,
  StudentPanelAppointmentView,
  SubmittedRecommendation,
  SupervisorRequestHistoryRow,
} from '../types';
import {
  MOCK_SUPERVISOR_APPOINTMENTS,
  MOCK_PANEL_APPOINTMENTS,
  MOCK_SUPERVISOR_REQUESTS,
  MOCK_ACTIVE_SUPERVISEES,
  MOCK_PANEL_ASSIGNMENTS,
  MOCK_PANEL_RECOMMENDATION_DRAFTS,
  MOCK_PANEL_RECOMMENDATIONS,
  MOCK_SUPERVISOR_REQUEST_HISTORY,
} from '../mocks/appointments';
import { USE_MOCKS, mockResponse, request } from './apiClient';

const parseBooleanEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const USE_PANEL_BACKEND = parseBooleanEnv(import.meta.env.VITE_USE_PANEL_BACKEND, true);
const USE_PANEL_MOCKS = USE_MOCKS && !USE_PANEL_BACKEND;

export async function getSupervisorAppointments(): Promise<SupervisorRecord[]> {
  if (USE_MOCKS) return mockResponse(MOCK_SUPERVISOR_APPOINTMENTS);
  return request<SupervisorRecord[]>('/appointments/supervisor');
}

export async function getPanelAppointments(): Promise<PanelRecord[]> {
  if (USE_PANEL_MOCKS) return mockResponse(MOCK_PANEL_APPOINTMENTS);
  return request<PanelRecord[]>('/appointments/panel/');
}

// Lecturer-facing: pending supervisor requests awaiting the lecturer's review.
export async function getSupervisorRequests(): Promise<SupervisorRequest[]> {
  if (USE_MOCKS) return mockResponse(MOCK_SUPERVISOR_REQUESTS);
  return request<SupervisorRequest[]>('/appointments/supervisor/requests');
}

// Lecturer-facing: the lecturer's active supervisee roster.
export async function getActiveSupervisees(): Promise<ActiveSuperviseeRow[]> {
  if (USE_MOCKS) return mockResponse(MOCK_ACTIVE_SUPERVISEES);
  return request<ActiveSuperviseeRow[]>('/appointments/supervisor/supervisees');
}

// Lecturer-facing: students assigned to this lecturer as panel member.
export async function getPanelAssignments(): Promise<PanelAssignment[]> {
  if (USE_PANEL_MOCKS) return mockResponse(MOCK_PANEL_ASSIGNMENTS);
  return request<PanelAssignment[]>('/appointments/panel/assignments/');
}

export async function getEligiblePanelSupervisees(): Promise<PanelRecommendationSupervisee[]> {
  if (USE_PANEL_MOCKS) {
    return mockResponse([
      {
        studentId: 'MEA2209841',
        studentName: 'Ahmad Luqman',
        programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
        semester: 'Sem 1 2025/2026',
        proposedTopic: 'Optimizing Generative Adversarial Networks for Low-Resource Languages',
        researchArea: 'Artificial Intelligence',
        abstract: 'This research explores novel architectural improvements for GANs to improve synthetic data quality in languages with limited linguistic resources.',
        supervisorName: 'Prof. Dr. Ahmad Shahrir',
        supervisorId: 'L84920',
        canRecommend: true,
      },
    ]);
  }
  return request<PanelRecommendationSupervisee[]>('/appointments/panel/eligible-supervisees/');
}

export async function getPanelCandidates(): Promise<PanelCandidate[]> {
  if (USE_PANEL_MOCKS) {
    return mockResponse([
      {
        staffId: 'A004812',
        name: 'Assoc. Prof. Dr. Amina Malik',
        department: 'Data Science Department',
        workloadCount: 2,
        workloadLimit: 5,
        canSubmit: true,
        availability: 'Available',
        workloadHelpText: 'Workload includes confirmed active panel appointments and submitted nominations.',
      },
      {
        staffId: 'A004918',
        name: 'Dr. Siti Noor',
        department: 'Software Engineering Department',
        workloadCount: 3,
        workloadLimit: 5,
        canSubmit: true,
        availability: 'Available',
        workloadHelpText: 'Workload includes confirmed active panel appointments and submitted nominations.',
      },
      {
        staffId: 'A002931',
        name: 'Dr. Robert Chen',
        department: 'Information Systems Department',
        workloadCount: 5,
        workloadLimit: 5,
        canSubmit: false,
        availability: 'Workload Full',
        workloadHelpText: 'Workload includes confirmed active panel appointments and submitted nominations.',
      },
      {
        staffId: 'A003328',
        name: 'Dr. Aris Ghaffar',
        department: 'Computer System & Technology Department',
        workloadCount: 1,
        workloadLimit: 5,
        canSubmit: true,
        availability: 'Available',
        workloadHelpText: 'Workload includes confirmed active panel appointments and submitted nominations.',
      },
    ]);
  }
  return request<PanelCandidate[]>('/appointments/panel/candidates/');
}

export async function getPanelWorkloads(): Promise<PanelWorkloadRecord[]> {
  if (USE_PANEL_MOCKS) {
    return mockResponse([
      {
        id: 'A004812',
        name: 'Assoc. Prof. Dr. Amina Malik',
        department: 'Data Science Department',
        currentStudents: 2,
        workloadLimit: 5,
        availability: 'Available',
        initials: 'AM',
        confirmedAppointments: 1,
        pendingNominations: 1,
        workloadItems: [
          {
            type: 'Confirmed Appointment',
            studentName: 'Ahmad Luqman',
            studentId: 'MEA2209841',
            researchTitle: 'Optimizing Generative Adversarial Networks for Low-Resource Languages',
            date: '05 Jun 2026',
          },
          {
            type: 'Pending Nomination',
            studentName: 'Nur Aina Rahman',
            studentId: 'MEA2400712',
            researchTitle: 'Blockchain-Based Academic Record Verification',
            date: '05 Jun 2026',
          },
        ],
      },
    ]);
  }
  return request<PanelWorkloadRecord[]>('/appointments/panel/workload/');
}

export async function getStudentPanelAppointment(): Promise<StudentPanelAppointmentView> {
  if (USE_PANEL_MOCKS) {
    return mockResponse({
      status: 'CONFIRMED',
      studentName: 'Ahmad Luqman',
      studentId: 'MEA2209841',
      programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
      semester: 'Sem 1 2025/2026',
      researchTitle: 'Optimizing Generative Adversarial Networks for Low-Resource Languages',
      supervisorName: 'Prof. Dr. Ahmad Shahrir',
      panelMemberName: 'Assoc. Prof. Dr. Amina Malik',
      panelMemberId: 'A004812',
      panelMemberDepartment: 'Data Science Department',
      panelMemberEmail: 'panelamina@fsktm.edu.my',
      appointmentDate: '05 Jun 2026',
    });
  }
  return request<StudentPanelAppointmentView>('/appointments/panel/student/');
}

// Lecturer-facing: panel recommendations this lecturer has submitted.
export async function getPanelRecommendationDrafts(): Promise<PanelRecommendationDraft[]> {
  if (USE_PANEL_MOCKS) return mockResponse(MOCK_PANEL_RECOMMENDATION_DRAFTS);
  return request<PanelRecommendationDraft[]>('/appointments/panel/recommendations/');
}

// Submitted panel recommendation history shown in SubmittedRecommendationsPage.
export async function getPanelRecommendations(): Promise<SubmittedRecommendation[]> {
  if (USE_PANEL_MOCKS) return mockResponse(MOCK_PANEL_RECOMMENDATIONS);
  const recommendations = await request<PanelRecommendationDraft[]>('/appointments/panel/recommendations/');
  return recommendations.map((r) => ({
    id: r.id !== undefined ? `REC-${String(r.id).padStart(4, '0')}` : String(r.studentId),
    studentName: r.studentName,
    studentId: r.studentId,
    researchTitle: r.proposedTopic,
    recommendedPanel: r.recommendedMember,
    recommendedPanelId: r.recommendedMemberId,
    date: r.submittedDate,
    status: r.status === 'APPROVED'
      ? 'Approved'
      : r.status === 'REJECTED_BY_PANEL' || r.status === 'REJECTED_BY_COORDINATOR'
      ? 'Rejected'
      : 'Pending Approval',
    workflowStatus: r.status,
    semester: r.semester || 'Sem 1 2025/2026',
    programme: r.programme,
    researchArea: r.researchArea,
    abstract: r.abstract,
    justification: r.justification,
    rejectionReason: r.rejectionReason,
    submittedAt: r.submittedAt,
    panelDecisionAt: r.panelDecisionAt,
    coordinatorDecisionAt: r.coordinatorDecisionAt,
  }));
}

export async function createPanelRecommendation(
  payload: {
    studentId: string;
    recommendedMemberId: string;
    justification: string;
    status: PanelRecommendationDraft['status'];
  },
): Promise<PanelRecommendationDraft> {
  if (USE_PANEL_MOCKS) {
    return mockResponse({
      studentId: payload.studentId,
      studentName: 'Ahmad Luqman',
      programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
      proposedTopic: 'Optimizing Generative Adversarial Networks for Low-Resource Languages',
      recommendedMember: 'Assoc. Prof. Dr. Amina Malik',
      recommendedMemberId: payload.recommendedMemberId,
      submittedDate: '04 Jun 2026',
      status: payload.status,
      justification: payload.justification,
    });
  }
  return request<PanelRecommendationDraft>('/appointments/panel/recommendations/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPanelReviewQueue(): Promise<PanelRecommendationDraft[]> {
  if (USE_PANEL_MOCKS) {
    return mockResponse(MOCK_PANEL_RECOMMENDATION_DRAFTS.filter((r) => r.status === 'SUBMITTED_TO_PANEL'));
  }
  return request<PanelRecommendationDraft[]>('/appointments/panel/review-queue/');
}

export async function getCoordinatorPanelReviewQueue(): Promise<PanelRecommendationDraft[]> {
  if (USE_PANEL_MOCKS) {
    return mockResponse(MOCK_PANEL_RECOMMENDATION_DRAFTS.filter((r) => r.status === 'PENDING_COORDINATOR'));
  }
  return request<PanelRecommendationDraft[]>('/appointments/panel/coordinator-queue/');
}

export async function acceptPanelRecommendation(id: number | string): Promise<PanelRecommendationDraft> {
  if (USE_PANEL_MOCKS) {
    const recommendation = MOCK_PANEL_RECOMMENDATION_DRAFTS[0];
    return mockResponse({ ...recommendation, status: 'PENDING_COORDINATOR' });
  }
  return request<PanelRecommendationDraft>(`/appointments/panel/recommendations/${id}/panel-accept/`, {
    method: 'POST',
  });
}

export async function rejectPanelRecommendation(
  id: number | string,
  reason: string,
): Promise<PanelRecommendationDraft> {
  if (USE_PANEL_MOCKS) {
    const recommendation = MOCK_PANEL_RECOMMENDATION_DRAFTS[0];
    return mockResponse({ ...recommendation, status: 'REJECTED_BY_PANEL', rejectionReason: reason });
  }
  return request<PanelRecommendationDraft>(`/appointments/panel/recommendations/${id}/panel-reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function approvePanelRecommendationByCoordinator(
  id: number | string,
): Promise<PanelRecommendationDraft> {
  if (USE_PANEL_MOCKS) {
    const recommendation = MOCK_PANEL_RECOMMENDATION_DRAFTS[0];
    return mockResponse({ ...recommendation, status: 'APPROVED' });
  }
  return request<PanelRecommendationDraft>(`/appointments/panel/recommendations/${id}/coordinator-approve/`, {
    method: 'POST',
  });
}

export async function rejectPanelRecommendationByCoordinator(
  id: number | string,
  reason: string,
): Promise<PanelRecommendationDraft> {
  if (USE_PANEL_MOCKS) {
    const recommendation = MOCK_PANEL_RECOMMENDATION_DRAFTS[0];
    return mockResponse({ ...recommendation, status: 'REJECTED_BY_COORDINATOR', rejectionReason: reason });
  }
  return request<PanelRecommendationDraft>(`/appointments/panel/recommendations/${id}/coordinator-reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// Lecturer-facing: supervisor appointment requests the lecturer has decided on.
export async function getSupervisorRequestHistory(): Promise<SupervisorRequestHistoryRow[]> {
  if (USE_MOCKS) return mockResponse(MOCK_SUPERVISOR_REQUEST_HISTORY);
  return request<SupervisorRequestHistoryRow[]>('/appointments/supervisor/request-history');
}
