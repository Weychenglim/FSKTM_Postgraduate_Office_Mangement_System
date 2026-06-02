/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Student Registry API (UC05–UC09). Returns mock data for now; see apiClient.ts
// for how to swap in real HTTP calls without touching the components.

import { StudentRecord } from '../types';
import { MOCK_STUDENTS } from '../mocks/students';
import { USE_MOCKS, mockResponse, request } from './apiClient';

export async function getStudents(): Promise<StudentRecord[]> {
  if (USE_MOCKS) return mockResponse(MOCK_STUDENTS);
  return request<StudentRecord[]>('/students');
}

export async function getStudentById(id: string): Promise<StudentRecord | undefined> {
  if (USE_MOCKS) return mockResponse(MOCK_STUDENTS.find((s) => s.id === id));
  return request<StudentRecord>(`/students/${id}`);
}
