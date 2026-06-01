/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Supervisor & Panel Appointment API (UC10–UC23). Returns mock data for now.

import { SupervisorRecord, PanelRecord } from '../types';
import { MOCK_SUPERVISOR_APPOINTMENTS, MOCK_PANEL_APPOINTMENTS } from '../mocks/appointments';
import { USE_MOCKS, mockResponse, request } from './apiClient';

export async function getSupervisorAppointments(): Promise<SupervisorRecord[]> {
  if (USE_MOCKS) return mockResponse(MOCK_SUPERVISOR_APPOINTMENTS);
  return request<SupervisorRecord[]>('/appointments/supervisor');
}

export async function getPanelAppointments(): Promise<PanelRecord[]> {
  if (USE_MOCKS) return mockResponse(MOCK_PANEL_APPOINTMENTS);
  return request<PanelRecord[]>('/appointments/panel');
}
