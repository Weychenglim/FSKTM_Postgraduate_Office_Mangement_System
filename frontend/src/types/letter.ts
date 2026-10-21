/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Letter generation domain models (UC21, UC23).

export type LetterTemplateStatus = 'Active' | 'Draft' | 'Archived';

/**
 * What a template is used for. Students request REQUEST letters; the two
 * appointment letters are made by themselves when a coordinator approves an
 * appointment (UC22).
 */
export type LetterPurpose = 'REQUEST' | 'SUPERVISOR_APPOINTMENT' | 'PANEL_APPOINTMENT';

/** One placeholder a template may use, from `GET /api/letter-templates/placeholders/`. */
export interface LetterPlaceholder {
  tag: string;
  name: string;
  label: string;
  source: string;
  /** The kinds of letter it works in. */
  purposes?: LetterPurpose[];
}

/** A value the office types in when it approves a request, e.g. attendance. */
export interface LetterCustomField {
  /** The tag's name: `{{ATTENDANCE}}` has the name `ATTENDANCE`. */
  name: string;
  label: string;
  hint: string;
}

/**
 * A single official letter template. Staff author and manage these (name,
 * status, `content` with `{{PLACEHOLDER}}` tags, and their own office-filled
 * fields); students only see an Active template's name and description, and
 * request a letter from it. Shape matches the Django
 * `LetterTemplate.to_public_dict`.
 */
export interface LetterTemplate {
  id: string;
  name: string;
  type: string;
  status: LetterTemplateStatus;
  lastModified: string;
  modifiedBy: string;
  description: string;
  /** The wording; only staff get it. */
  content?: string;
  /** Office-filled fields; only staff get them. */
  customFields?: LetterCustomField[];
  /** Prefix used to build the reference number, e.g. "UMF/PG". */
  referencePrefix?: string;
  purpose?: LetterPurpose;
  /** Printed under the signature line; blank keeps the faculty default. */
  signatoryName?: string;
  signatoryTitle?: string;
}

/** Someone an appointment letter was sent to, besides the office. */
export interface LetterRecipient {
  name: string;
  relation: 'Student' | 'Supervisor' | 'Panel member';
}

/** An active appointment with no letter yet, and why it cannot be made now (or null). */
export interface MissingAppointmentLetter {
  kind: 'supervisor' | 'panel';
  appointmentId: string;
  studentName: string;
  matricNumber: string;
  lecturerName: string;
  appointedOn: string;
  problem: string | null;
}

export interface MadeAppointmentLetters {
  made: number;
  results: Array<{
    kind: 'supervisor' | 'panel';
    appointmentId: string;
    letterId: string | null;
    status: GeneratedLetterStatus | null;
    problem: string | null;
  }>;
}

/**
 * Pending: waiting for the office. Issued: approved, with its reference number.
 * Rejected: turned down with a reason. Withdrawn: taken back by the student.
 * Revoked: issued, then withdrawn by the office.
 */
export type GeneratedLetterStatus = 'Pending' | 'Issued' | 'Rejected' | 'Withdrawn' | 'Revoked';

export const LETTER_REQUEST_STATUSES: readonly GeneratedLetterStatus[] = [
  'Pending',
  'Issued',
  'Rejected',
  'Withdrawn',
  'Revoked',
];

/** One value a pending letter needs, as the office sees it when reviewing. */
export interface LetterRequestField {
  name: string;
  label: string;
  hint: string;
  /** From the student's record, or typed in by the office. */
  source: 'record' | 'office';
  /** The record's value (blank when the record has none). */
  value: string;
  /** The office must type it in before approving. */
  needed: boolean;
}

/**
 * A letter request and, once approved, the letter as issued, from
 * `/api/letters/requests/`. Shape matches the Django
 * `GeneratedLetter.to_public_dict`. `content` (the filled wording) only comes
 * with a single issued letter; the review fields only reach office staff.
 */
export interface GeneratedLetter {
  id: string;
  /** Blank until the office approves. */
  referenceNumber: string;
  templateId: string | null;
  templateName: string;
  letterType: string;
  /** REQUEST for a student's request; an appointment letter otherwise. */
  purpose?: LetterPurpose;
  /** The letter that replaced this one, when the office reissued it. */
  replacedById?: string | null;
  signatoryName?: string;
  signatoryTitle?: string;
  /** Appointment letters: who it was sent to. */
  recipients?: LetterRecipient[];
  status: GeneratedLetterStatus;
  /** Issue date as printed on the letter, e.g. "11 October 2026"; blank until approved. */
  date: string;
  requestedAt: string;
  issuedAt: string | null;
  studentName: string;
  matricNumber: string;
  programName: string;
  /** The student's note to the office. */
  note: string;
  decidedAt: string | null;
  decidedBy: string;
  rejectReason: string;
  withdrawnAt: string | null;
  revokedAt: string | null;
  revokeReason: string;
  content?: string;
  /** Office only: what the office typed in when approving. */
  officeValues?: Record<string, string>;
  /** Office only, while pending: the template's current wording and needs. */
  templateContent?: string;
  templateStatus?: LetterTemplateStatus | null;
  referencePrefix?: string;
  fields?: LetterRequestField[];
  /** Office only, while pending: why it cannot be approved, if anything. */
  problem?: string | null;
  /** Office only, while pending: the student's issued copies this approval replaces. */
  replaces?: { id: string; referenceNumber: string; issuedAt: string | null }[];
}

/** Office list filters; dates are YYYY-MM-DD and bound the issue date. */
export interface LetterRequestFilters {
  search?: string;
  from?: string;
  to?: string;
  /** One status, or several separated by commas. */
  status?: string;
  /** Letters students asked for, or appointment letters made automatically. */
  madeBy?: '' | 'request' | 'automatic';
}

export type LetterRequestCounts = Record<GeneratedLetterStatus, number>;
