/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// File Management API (UC34–UC39). Returns mock data for now.

import { FileItem, SubmissionRecord } from '../types';
import { MOCK_FILES } from '../mocks/files';
import { MOCK_STUDENT_SUBMISSIONS } from '../mocks/submissions';
import { USE_MOCKS, mockResponse, request } from './apiClient';

export async function getFiles(): Promise<FileItem[]> {
  if (USE_MOCKS) return mockResponse(MOCK_FILES);
  return request<FileItem[]>('/files');
}

export async function getFilesByStudent(studentId: string): Promise<FileItem[]> {
  if (USE_MOCKS) return mockResponse(MOCK_FILES.filter((f) => f.studentId === studentId));
  return request<FileItem[]>(`/files?studentId=${encodeURIComponent(studentId)}`);
}

export async function getStudentSubmissions(): Promise<SubmissionRecord[]> {
  if (USE_MOCKS) return mockResponse(MOCK_STUDENT_SUBMISSIONS);
  return request<SubmissionRecord[]>('/student/submissions');
}
