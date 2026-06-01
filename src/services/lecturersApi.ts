/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Staff & Lecturer accounts API (UC03, UC04). Returns mock data for now.

import { StaffRecord } from '../types';
import { MOCK_STAFF } from '../mocks/lecturers';
import { USE_MOCKS, mockResponse, request } from './apiClient';

export async function getStaff(): Promise<StaffRecord[]> {
  if (USE_MOCKS) return mockResponse(MOCK_STAFF);
  return request<StaffRecord[]>('/staff');
}

export async function getLecturers(): Promise<StaffRecord[]> {
  if (USE_MOCKS) return mockResponse(MOCK_STAFF.filter((s) => s.role === 'Lecturer'));
  return request<StaffRecord[]>('/staff?role=Lecturer');
}
