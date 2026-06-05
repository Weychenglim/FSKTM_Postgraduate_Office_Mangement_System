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
  PanelRecommendationDraft,
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

export async function getSupervisorAppointments(): Promise<SupervisorRecord[]> {
  if (USE_MOCKS) return mockResponse(MOCK_SUPERVISOR_APPOINTMENTS);
  return request<SupervisorRecord[]>('/appointments/supervisor');
}

export async function getPanelAppointments(): Promise<PanelRecord[]> {
  if (USE_MOCKS) return mockResponse(MOCK_PANEL_APPOINTMENTS);
  return request<PanelRecord[]>('/appointments/panel');
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
  if (USE_MOCKS) return mockResponse(MOCK_PANEL_ASSIGNMENTS);
  return request<PanelAssignment[]>('/appointments/panel/assignments');
}

// Lecturer-facing: panel recommendation drafts this lecturer has submitted.
export async function getPanelRecommendationDrafts(): Promise<PanelRecommendationDraft[]> {
  if (USE_MOCKS) return mockResponse(MOCK_PANEL_RECOMMENDATION_DRAFTS);
  return request<PanelRecommendationDraft[]>('/appointments/panel/recommendation-drafts');
}

// Submitted panel recommendation history shown in SubmittedRecommendationsPage.
export async function getPanelRecommendations(): Promise<SubmittedRecommendation[]> {
  if (USE_MOCKS) return mockResponse(MOCK_PANEL_RECOMMENDATIONS);
  return request<SubmittedRecommendation[]>('/appointments/panel/recommendations');
}

// Lecturer-facing: supervisor appointment requests the lecturer has decided on.
export async function getSupervisorRequestHistory(): Promise<SupervisorRequestHistoryRow[]> {
  if (USE_MOCKS) return mockResponse(MOCK_SUPERVISOR_REQUEST_HISTORY);
  return request<SupervisorRequestHistoryRow[]>('/appointments/supervisor/request-history');
}
