/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Letter template API (UC40-UC42). Talks to the real Django `letters` backend
// (`/api/letter-templates/`). Reads fall back to mock data when the backend is
// unreachable *and* mocks are enabled, so the UI still renders offline; writes
// always go to the backend (they require an authenticated staff user).

import {
  GeneratedLetter,
  LetterCustomField,
  LetterPlaceholder,
  LetterRequestCounts,
  LetterRequestFilters,
  LetterTemplate,
} from '../types';
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
  customFields?: LetterCustomField[];
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

/** Only `Active` templates, without their wording: what students may request. */
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

// Letter requests and issued letters (UC23). Always live: a letter is an
// official record, so there is no mock fallback.

/** Code the server sends when the student already has this letter pending. */
export const LETTER_REQUEST_PENDING = 'letter_request_pending';

/** True when the server refused a request because the same letter is already pending. */
export function isAlreadyRequested(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 409) return false;
  const body = err.body;
  return Boolean(body && typeof body === 'object' && (body as { code?: unknown }).code === LETTER_REQUEST_PENDING);
}

/** Per-field problems from a refused approval, keyed by placeholder name, else null. */
export function approvalFieldErrors(err: unknown): Record<string, string> | null {
  if (!(err instanceof ApiError) || err.status !== 400) return null;
  const body = err.body;
  const errors = body && typeof body === 'object' ? (body as { fieldErrors?: unknown }).fieldErrors : undefined;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return null;
  return Object.fromEntries(
    Object.entries(errors as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

/** Student: ask the office for a letter from an Active template. */
export async function requestLetter(templateId: string, note = ''): Promise<GeneratedLetter> {
  return request<GeneratedLetter>('/letters/requests/', {
    method: 'POST',
    body: JSON.stringify({ templateId, note }),
  });
}

/** Student: their own requests and letters, newest first. */
export async function getMyLetterRequests(): Promise<GeneratedLetter[]> {
  return request<GeneratedLetter[]>('/letters/requests/');
}

/** Student: take back a request the office has not decided yet. */
export async function withdrawLetterRequest(id: string): Promise<GeneratedLetter> {
  return request<GeneratedLetter>(`/letters/requests/${id}/withdraw/`, { method: 'POST' });
}

/** Office: every request, narrowed by status, search and issue date. */
export async function getLetterRequests(filters: LetterRequestFilters = {}): Promise<GeneratedLetter[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value.trim()) params.set(key, value.trim());
  }
  const query = params.toString();
  return request<GeneratedLetter[]>(`/letters/requests/${query ? `?${query}` : ''}`);
}

/** Office: how many requests are in each status. */
export async function getLetterRequestCounts(): Promise<LetterRequestCounts> {
  return request<LetterRequestCounts>('/letters/requests/counts/');
}

/**
 * One request. Issued letters come with their wording; office staff also get
 * what they need to review a pending one.
 */
export async function getLetterRequest(id: string): Promise<GeneratedLetter> {
  return request<GeneratedLetter>(`/letters/requests/${id}/`);
}

/** Office: issue the letter, with the values typed in by placeholder name. */
export async function approveLetterRequest(id: string, values: Record<string, string>): Promise<GeneratedLetter> {
  return request<GeneratedLetter>(`/letters/requests/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify({ values }),
  });
}

/** Office: turn a request down; the reason is shown to the student. */
export async function rejectLetterRequest(id: string, reason: string): Promise<GeneratedLetter> {
  return request<GeneratedLetter>(`/letters/requests/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
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
