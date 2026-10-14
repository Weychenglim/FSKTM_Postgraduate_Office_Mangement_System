/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// File Management (UC24 to UC27): official documents linked to student records.

export type DocumentKind = 'PDF' | 'DOCX' | 'IMAGE' | 'XLSX' | 'PPTX';
export type DocumentCheckStatus = 'NONE' | 'WAITING' | 'ACCEPTED' | 'RETURNED';
export type StaffAudience = 'ACADEMIC' | 'COORDINATORS' | 'OFFICE';
export type DocumentTypeKind = 'STUDENT' | 'STAFF' | 'BOTH';
export type DocumentUploaderRole = 'STUDENT' | 'SUPERVISOR' | 'PANEL' | 'COORDINATOR' | 'LECTURER';

export interface DocumentTypeOption {
  code: string;
  label: string;
  description: string;
  group: string;
  groupLabel: string;
  kind: DocumentTypeKind;
  uploaders: DocumentUploaderRole[];
  allowedKinds: DocumentKind[];
  shareSupervisors: boolean;
  sharePanel: boolean;
  shareCoordinator: boolean;
  needsCheck: boolean;
  onePerStudent: boolean;
  isActive: boolean;
}

export interface DocumentOptions {
  types: DocumentTypeOption[];
  groups: Array<{ value: string; label: string }>;
  currentSemester: { id: number; label: string } | null;
  maxBytes: number;
  isOffice: boolean;
  canUploadStaffFiles: boolean;
  semesters?: Array<{ id: number; label: string }>;
  programmes?: string[];
  audiences?: Array<{ value: StaffAudience; label: string }>;
}

export interface DocumentStudentRef {
  matric: string;
  name: string;
  programme: string;
}

export interface DocumentFileInfo {
  number: number;
  name: string;
  kind: DocumentKind;
  size: number;
  pageCount: number | null;
  uploadedAt: string;
}

export interface DocumentSharing {
  supervisors: boolean;
  panel: boolean;
  coordinator: boolean;
}

export interface DocumentPermissions {
  canDownload: boolean;
  canDelete: boolean;
  canUploadVersion: boolean;
  canEdit: boolean;
  canChangeSharing: boolean;
  canCheck: boolean;
  canArchive: boolean;
  canRestore: boolean;
}

export interface PortalDocument {
  id: number;
  reference: string;
  title: string;
  description: string;
  type: { code: string; label: string };
  group: string;
  groupLabel: string;
  students: DocumentStudentRef[];
  isStaffFile: boolean;
  staffAudience: StaffAudience | '';
  staffAudienceLabel: string;
  staffProgrammes: string[];
  share: DocumentSharing;
  tags: string[];
  semester: { id: number; label: string } | null;
  uploadedBy: { name: string; role: string; roleLabel: string; isMe: boolean };
  uploadedAt: string;
  checkStatus: DocumentCheckStatus;
  checkStatusLabel: string;
  checkReason: string;
  checkedBy: string;
  checkedAt: string | null;
  file: DocumentFileInfo | null;
  archived: boolean;
  archivedAt: string | null;
  permissions: DocumentPermissions;
}

export interface DocumentDetail extends PortalDocument {
  sharedWith: Array<{ name: string; role: string }>;
  versions: DocumentFileInfo[];
}

export interface DocumentPage {
  count: number;
  limit: number;
  offset: number;
  results: PortalDocument[];
}

export interface DocumentSummary {
  all: number;
  staffFiles: number;
  mine: number;
  toCheck?: number;
  returned?: number;
  archived?: number;
}

export interface TaggableStudent {
  matric: string;
  name: string;
  programme: string;
  status: string;
  relation: string;
  roles: Array<'SUPERVISOR' | 'PANEL' | 'COORDINATOR'>;
  supervisors: string[];
  panel: string[];
  coordinators: string[];
}

export interface StudentFileHeader {
  matric: string;
  name: string;
  programme: string;
  status: string;
  supervisors: string[];
  panel: string[];
  letters: number | null;
}

export interface TagSuggestion {
  name: string;
  uses: number;
}

export type DocumentView = 'all' | 'check' | 'staff' | 'mine';

export interface DocumentFilters {
  view: DocumentView;
  q: string;
  type: string;
  semester: string;
  student: string;
  uploader: '' | 'me' | 'students' | 'staff';
  status: '' | DocumentCheckStatus;
  kind: '' | DocumentKind;
  from: string;
  to: string;
  tag: string;
}

export interface DocumentUploadInput {
  file: File;
  type: string;
  title: string;
  description: string;
  semester: string;
  students: string[];
  tags: string[];
  share?: DocumentSharing;
  audience?: StaffAudience;
  programmes?: string[];
  acknowledgeWarnings?: boolean;
}
