/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Letter generation domain models (UC40–UC42).

export type LetterTemplateStatus = 'Active' | 'Draft';

export interface LetterTemplate {
  id: string;
  name: string;
  type: string;
  status: LetterTemplateStatus;
  lastModified: string;
  modifiedBy: string;
  description: string;
  content: string;
}

export interface StudentLetterTemplate {
  id: string;
  name: string;
  description: string;
  badge: 'Standard' | 'Priority';
  refNo: string;
  date: string;
  body: string;
  notes: string;
}
