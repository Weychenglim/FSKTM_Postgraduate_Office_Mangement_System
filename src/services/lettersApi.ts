/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Letter generation API (UC40–UC42). Returns mock data for now.

import { LetterTemplate } from '../types';
import { MOCK_LETTER_TEMPLATES } from '../mocks/letters';
import { USE_MOCKS, mockResponse, request } from './apiClient';

export async function getLetterTemplates(): Promise<LetterTemplate[]> {
  if (USE_MOCKS) return mockResponse(MOCK_LETTER_TEMPLATES);
  return request<LetterTemplate[]>('/letter-templates');
}
