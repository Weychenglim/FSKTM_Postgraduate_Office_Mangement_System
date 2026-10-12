/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Letter template API (UC40-UC42). Talks to the real Django `letters` backend
// (`/api/letter-templates/`). Reads fall back to mock data when the backend is
// unreachable *and* mocks are enabled, so the UI still renders offline; writes
// always go to the backend (they require an authenticated staff user).

import { GeneratedLetter, IssuedLetterFilters, LetterPlaceholder, LetterTemplate } from '../types';
import { MOCK_LETTER_TEMPLATES } from '../mocks/letters';
import { letterDataFromIssued, letterFileName } from '../utils/letterDocument';
import { ApiError, USE_MOCKS, isTransportFailure, mockResponse, request, requestBlob } from './apiClient';

/** Code the server sends when a student whose status is not Active asks for letters. */
export const LETTERS_NEED_ACTIVE_STATUS = 'letters_need_active_status';

/** The server's reason when letters are refused because the student is not Active, else null. */
export function inactiveStudentReason(err: unknown): string | null {
  if (!(err instanceof ApiError) || err.status !== 403) return null;
  const body = err.body;
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined;
  return code === LETTERS_NEED_ACTIVE_STATUS ? err.message : null;
}

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

/** Fetch the logged-in student's letter details (live; requires auth, like
 *  `/auth/me/`). Used by the student Letter Generation screen. */
export async function getMyLetterDetails(): Promise<StudentLetterDetails> {
  return request<StudentLetterDetails>('/auth/me/letter-details/');
}

/** All templates, used by the office-staff template manager. */
export async function getLetterTemplates(): Promise<LetterTemplate[]> {
  try {
    return await request<LetterTemplate[]>('/letter-templates/');
  } catch (err) {
    // Only a genuine transport failure may fall back; a 401/403 must surface.
    if (USE_MOCKS && isTransportFailure(err)) return mockResponse(MOCK_LETTER_TEMPLATES);
    throw err;
  }
}

/** Only `Active` templates: what students may generate letters from. */
export async function getStudentLetterTemplates(): Promise<LetterTemplate[]> {
  try {
    return await request<LetterTemplate[]>('/letter-templates/?status=Active');
  } catch (err) {
    if (USE_MOCKS && isTransportFailure(err)) {
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

/** The placeholders a template may use, with labels and value sources. */
export async function getLetterPlaceholders(): Promise<LetterPlaceholder[]> {
  return request<LetterPlaceholder[]>('/letter-templates/placeholders/');
}

// Issued letters (UC23). Always live: an issued letter is an official record,
// so there is no mock fallback.

/** The record fields the server says a letter still needs, else null. */
export function missingFieldsFrom(err: unknown): string[] | null {
  if (!(err instanceof ApiError) || err.status !== 400) return null;
  const body = err.body;
  const fields = body && typeof body === 'object' ? (body as { missingFields?: unknown }).missingFields : undefined;
  return Array.isArray(fields) && fields.every((field) => typeof field === 'string') ? fields : null;
}

/** Issue a letter from an Active template; the server fills it and numbers it. */
export async function generateLetter(templateId: string): Promise<GeneratedLetter> {
  return request<GeneratedLetter>('/letters/requests/', {
    method: 'POST',
    body: JSON.stringify({ templateId }),
  });
}

/** Letters issued to the signed-in student, newest first. */
export async function getMyLetters(): Promise<GeneratedLetter[]> {
  return request<GeneratedLetter[]>('/letters/requests/');
}

/** The office register of issued letters. */
export async function getIssuedLetters(filters: IssuedLetterFilters = {}): Promise<GeneratedLetter[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value.trim()) params.set(key, value.trim());
  }
  const query = params.toString();
  return request<GeneratedLetter[]>(`/letters/requests/${query ? `?${query}` : ''}`);
}

/** One issued letter with its filled wording, for printing. */
export async function getIssuedLetter(id: string): Promise<GeneratedLetter> {
  return request<GeneratedLetter>(`/letters/requests/${id}/`);
}

/** Download the PDF of an issued letter, locked against editing. */
export async function downloadLetterPdf(letter: GeneratedLetter): Promise<void> {
  const blob = await requestBlob(`/letters/requests/${letter.id}/pdf/`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${letterFileName(letterDataFromIssued(letter))}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Office: send the student the "letter ready" notification again. */
export async function resendLetterNotification(id: string): Promise<string> {
  const result = await request<{ detail: string }>(`/letters/requests/${id}/resend-notification/`, {
    method: 'POST',
  });
  return result.detail;
}

/** Office: revoke a letter issued in error. The reason is shown to the student. */
export async function revokeLetter(id: string, reason: string): Promise<GeneratedLetter> {
  return request<GeneratedLetter>(`/letters/requests/${id}/revoke/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
