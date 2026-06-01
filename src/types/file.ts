/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// File Management domain models (UC34–UC39).

export type FileCategory = 'Coursework' | 'Research' | 'Administrative' | 'Evaluation';
export type FileStatus = 'Active' | 'Archived';
export type FileType = 'pdf' | 'docx' | 'xlsx' | 'pptx';

export interface FileItem {
  id: string;
  name: string;
  studentId: string;
  category: FileCategory;
  sem: string;
  uploadedBy: string;
  date: string;
  size: string;
  status: FileStatus;
  tags: string[];
  moduleName?: string;
  fileType: FileType;
  description?: string;
}

// A student's own document submissions (UC35).
export type SubmissionStatus = 'Approved' | 'Pending Review' | 'Draft';

export interface SubmissionRecord {
  id: string;
  name: string;
  category: string;
  uploaded: string;
  size: string;
  sizeBytes: number;
  status: SubmissionStatus;
}
