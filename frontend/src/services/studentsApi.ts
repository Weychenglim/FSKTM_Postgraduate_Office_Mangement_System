/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Student Registry API (UC05–UC09). Backed by the Django `registry` endpoints
// under /api/registry/. Reads fall back to mock data when the backend is
// unreachable *and* mocks are enabled, so the screen still renders offline;
// writes always go to the backend (they require an Office Staff/Admin session).

import { StudentRecord } from '../types';
import { MOCK_STUDENTS } from '../mocks/students';
import { USE_MOCKS, isTransportFailure, mockResponse, request } from './apiClient';

const parseBooleanEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const USE_REGISTRY_BACKEND = parseBooleanEnv(
  import.meta.env.VITE_USE_REGISTRY_BACKEND,
  true,
);

/** Fields Office Staff may correct from the Registry Management screen. */
export interface StudentRecordUpdate {
  programme?: string;
  academicStatus?: StudentRecord['academicStatus'];
  accountStatus?: StudentRecord['accountStatus'];
  phone?: string;
  semester?: string;
  intakeDate?: string;
}

export async function getStudents(search?: string): Promise<StudentRecord[]> {
  if (!USE_REGISTRY_BACKEND && USE_MOCKS) return mockResponse(MOCK_STUDENTS);
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  try {
    return await request<StudentRecord[]>(`/registry/students/${query}`);
  } catch (err) {
    // Never mask a 401/403/404 with fixtures — that would present invented
    // student records as though the office had really entered them.
    if (USE_MOCKS && isTransportFailure(err)) return mockResponse(MOCK_STUDENTS);
    throw err;
  }
}

export async function getStudentById(id: string): Promise<StudentRecord | undefined> {
  if (!USE_REGISTRY_BACKEND && USE_MOCKS) {
    return mockResponse(MOCK_STUDENTS.find((s) => s.id === id));
  }
  try {
    return await request<StudentRecord>(`/registry/students/${encodeURIComponent(id)}/`);
  } catch (err) {
    if (USE_MOCKS && isTransportFailure(err)) {
      return mockResponse(MOCK_STUDENTS.find((s) => s.id === id));
    }
    throw err;
  }
}

export async function updateStudent(
  id: string,
  changes: StudentRecordUpdate,
): Promise<StudentRecord> {
  return request<StudentRecord>(`/registry/students/${encodeURIComponent(id)}/`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

/** Fields the office supplies when registering a student. */
export interface StudentRecordCreate {
  id: string;
  name: string;
  email: string;
  programme?: string;
  phone?: string;
  semester?: string;
  intakeDate?: string;
  academicStatus?: StudentRecord['academicStatus'];
}

/**
 * Register a new student. The account is created without a password — the
 * student sets one through the password-reset flow — so no temporary
 * credential ever has to be handed over.
 */
export async function createStudent(input: StudentRecordCreate): Promise<StudentRecord> {
  return request<StudentRecord>('/registry/students/', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
