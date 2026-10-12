/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Student Registry domain models (UC05-UC09).

// Mirrors accounts.Student.Status in the Django backend. Keep the two in step:
// the API rejects anything outside this set, and the values reach the UI
// unchecked (apiClient casts the JSON response), so a drifted union here is
// invisible to the compiler but breaks status colours and filters at runtime.
export type StudentAcademicStatus = 'Active' | 'Graduated' | 'Deferred' | 'Withdrawn';

// Derived from User.is_active by the registry serializer.
export type StudentAccountStatus = 'Verified' | 'Suspended';

export interface StudentRecord {
  id: string; // e.g. "WGA210045"
  name: string;
  avatarText: string;
  avatarBg: string;
  programme: string;
  academicStatus: StudentAcademicStatus;
  accountStatus: StudentAccountStatus;
  semester: string;
  email: string;
  phone: string;
  supervisor: string;
  supervisorStaffNo?: string;
  intakeDate: string;
  activated?: boolean;
  lastLogin?: string | null;
}

export type ImportRowStatus =
  | 'Ready'
  | 'Missing Field'
  | 'Missing Email'
  | 'Bad Programme'
  | 'Invalid Field'
  | 'Duplicate In File'
  | 'Already Registered';

/** The registry account an already-registered import row matched. */
export interface ImportExistingRecord {
  id: string;
  name: string;
  email: string;
  programme: string;
  academicStatus: string;
  role: string;
}

/** Identity details in the file that disagree with the matched record. */
export type ImportDifference = 'id' | 'name' | 'email';

export interface ImportPreviewRow {
  line: number;
  id: string;
  name: string;
  programme: string;
  email: string;
  phone: string;
  intake?: string;
  semester?: string;
  status: ImportRowStatus;
  issue: string;
  result?: 'created' | 'skipped' | 'failed';
  invitationSent?: boolean;
  existing?: ImportExistingRecord;
  matchedBy?: 'studentId' | 'email';
  differences?: ImportDifference[];
  duplicateOf?: number;
}

/** A row kept on an import batch's record (older batches lack the optional keys). */
export interface RegistryImportProblem {
  line: number;
  id: string;
  result: string;
  issue: string;
  name?: string;
  status?: string;
  existingName?: string;
  differences?: ImportDifference[];
  duplicateOf?: number;
}

export interface RegistryImportBatch {
  id: number;
  fileName: string;
  uploadedBy: string;
  totalRows: number;
  created: number;
  skipped: number;
  failed: number;
  alreadyRegistered?: number;
  duplicateInFile?: number;
  invitationsFailed: number;
  problems: RegistryImportProblem[];
  createdAt: string;
}

export interface ImportPreviewResponse {
  fileName: string;
  rows: ImportPreviewRow[];
}

export interface ImportCommitResponse {
  batch: RegistryImportBatch;
  rows: ImportPreviewRow[];
}
