/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Letter template API (UC40–UC42). Talks to the real Django `letters` backend
// (`/api/letter-templates/`). Reads fall back to mock data when the backend is
// unreachable *and* mocks are enabled, so the UI still renders offline; writes
// always go to the backend (they require an authenticated staff user).

import { LetterTemplate } from '../types';
import { MOCK_LETTER_TEMPLATES } from '../mocks/letters';
import { USE_MOCKS, mockResponse, request } from './apiClient';

/** Payload for creating/updating a template (frontend field names). */
export interface LetterTemplateInput {
  name: string;
  type: string;
  status: LetterTemplate['status'];
  description: string;
  content: string;
  referencePrefix?: string;
}

/** The logged-in student's details used to fill a letter's placeholders.
 *  Combines the base student profile with the StudentRegistry extras. */
export interface StudentLetterDetails {
  studentName: string;
  matricNumber: string;
  programName: string;
  currentStatus: string;
  supervisorName: string;
  passportNumber: string;
  country: string;
  programmeMode: string;
  fieldOfResearch: string;
  modeOfStudy: string;
  initialSemester: string;
  currentSemester: string;
  maxSemester: string;
  expectedCompletion: string;
}

/** Fetch the logged-in student's letter details (live; requires auth — like
 *  `/auth/me/`). Used by the student Letter Generation screen. */
export async function getMyLetterDetails(): Promise<StudentLetterDetails> {
  return request<StudentLetterDetails>('/auth/me/letter-details/');
}

/** All templates — used by the office-staff template manager. */
export async function getLetterTemplates(): Promise<LetterTemplate[]> {
  try {
    return await request<LetterTemplate[]>('/letter-templates/');
  } catch (err) {
    if (USE_MOCKS) return mockResponse(MOCK_LETTER_TEMPLATES);
    throw err;
  }
}

/** Only `Active` templates — what students may generate letters from. */
export async function getStudentLetterTemplates(): Promise<LetterTemplate[]> {
  try {
    return await request<LetterTemplate[]>('/letter-templates/?status=Active');
  } catch (err) {
    if (USE_MOCKS) {
      return mockResponse(MOCK_LETTER_TEMPLATES.filter((t) => t.status === 'Active'));
    }
    throw err;
  }
}

export async function createLetterTemplate(
  input: LetterTemplateInput,
): Promise<LetterTemplate> {
  return request<LetterTemplate>('/letter-templates/', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateLetterTemplate(
  id: string,
  input: Partial<LetterTemplateInput>,
): Promise<LetterTemplate> {
  return request<LetterTemplate>(`/letter-templates/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteLetterTemplate(id: string): Promise<void> {
  await request<void>(`/letter-templates/${id}/`, { method: 'DELETE' });
}
