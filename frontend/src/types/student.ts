/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Student Registry domain models (UC05–UC09).

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
  | 'Duplicate In File'
  | 'Already Registered';

export interface ImportPreviewRow {
  line: number;
  id: string;
  name: string;
  programme: string;
  email: string;
  phone: string;
  status: ImportRowStatus;
  issue: string;
  result?: 'created' | 'skipped' | 'failed';
  invitationSent?: boolean;
}

export interface RegistryImportBatch {
  id: number;
  fileName: string;
  uploadedBy: string;
  totalRows: number;
  created: number;
  skipped: number;
  failed: number;
  invitationsFailed: number;
  problems: { line: number; id: string; result: string; issue: string }[];
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
