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
  /** Created with its activation email held back, to send later. */
  invitationHeld?: boolean;
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
  invitationsHeld?: boolean;
  invitationsSentAt?: string | null;
  settingsUsed?: { defaults?: ImportDefaults; sendInvites?: boolean };
  problems: RegistryImportProblem[];
  createdAt: string;
}

export type BatchInvitationOutcome = 'sent' | 'failed' | 'alreadyActivated' | 'suspended';

/** What sending a held import's activation emails did. */
export interface BatchInvitationResult {
  sent: number;
  failed: number;
  alreadyActivated: number;
  suspended: number;
  notFound: number;
  /** Each student of the import, by the line of the file they came from. */
  students: { id: string; line: number; outcome: BatchInvitationOutcome }[];
  batch: RegistryImportBatch;
}

export interface ImportPreviewResponse {
  fileName: string;
  rows: ImportPreviewRow[];
}

/** The import fields a file's columns can be matched to (accounts/registry_columns.py). */
export type ImportFieldKey =
  | 'student_id'
  | 'full_name'
  | 'programme'
  | 'email'
  | 'phone'
  | 'intake'
  | 'current_semester';

export interface ImportField {
  key: ImportFieldKey;
  label: string;
  required: boolean;
}

export interface ImportColumn {
  index: number;
  letter: string;
  header: string;
  samples: string[];
  suggestedField: ImportFieldKey | null;
}

/** Which column (by index) holds each field; null when it is not in the file. */
export type ImportMapping = Record<ImportFieldKey, number | null>;

/** A file's layout, from the inspect step, for the office to confirm. */
export interface ImportInspectResponse {
  fileName: string;
  sheets: string[];
  sheet: string | null;
  headerRow: number;
  headerRowOptions: { row: number; preview: string }[];
  columns: ImportColumn[];
  fields: ImportField[];
  mapping: ImportMapping;
  ignoredColumns: string[];
  rowCount: number;
  layoutRecognised: boolean;
}

/** Values for every row; they fill blank cells and never overwrite the file. */
export interface ImportDefaults {
  programme?: string;
  intake?: string;
  semester?: string;
}

/** Sent with inspect, preview and import; leaving a key out lets the server decide. */
export interface ImportOptions {
  sheet?: string | null;
  headerRow?: number | null;
  mapping?: ImportMapping | null;
  defaults?: ImportDefaults;
  /** False holds the activation emails, to send later from Recent Imports. */
  sendInvites?: boolean;
}

export interface ImportCommitResponse {
  batch: RegistryImportBatch;
  rows: ImportPreviewRow[];
}
