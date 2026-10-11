/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Letter generation domain models (UC40-UC42).

export type LetterTemplateStatus = 'Active' | 'Draft' | 'Archived';

/** One placeholder a template may use, from `GET /api/letter-templates/placeholders/`. */
export interface LetterPlaceholder {
  tag: string;
  name: string;
  label: string;
  source: string;
}

/**
 * A single official letter template. Staff author and manage these (name,
 * status, `content` with `{{PLACEHOLDER}}` tags); students generate a letter
 * from the `Active` ones by substituting their own details into the
 * placeholders. Shape matches the Django `LetterTemplate.to_public_dict`.
 */
export interface LetterTemplate {
  id: string;
  name: string;
  type: string;
  status: LetterTemplateStatus;
  lastModified: string;
  modifiedBy: string;
  description: string;
  content: string;
  /** Prefix used to build the student's reference number, e.g. "UMF/PG". */
  referencePrefix?: string;
}

export type GeneratedLetterStatus = 'Issued' | 'Revoked';

/**
 * A letter issued to a student, from `/api/letters/requests/`. Shape matches
 * the Django `GeneratedLetter.to_public_dict`. `content` (the filled wording)
 * only comes with a single letter, and students never get it once revoked.
 */
export interface GeneratedLetter {
  id: string;
  referenceNumber: string;
  templateId: string | null;
  templateName: string;
  letterType: string;
  status: GeneratedLetterStatus;
  /** Issue date as printed on the letter, e.g. "11 October 2026". */
  date: string;
  issuedAt: string;
  studentName: string;
  matricNumber: string;
  programName: string;
  revokedAt: string | null;
  revokeReason: string;
  content?: string;
}

/** Office register filters; dates are YYYY-MM-DD. */
export interface IssuedLetterFilters {
  search?: string;
  from?: string;
  to?: string;
  status?: GeneratedLetterStatus | '';
}
