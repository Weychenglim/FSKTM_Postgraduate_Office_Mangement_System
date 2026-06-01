/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Marks Entry & Management API (UC24–UC29). Returns mock data for now.

import { MarkRecord, EvaluationPreviewTask, RubricComponent } from '../types';
import { MOCK_MARK_RECORDS } from '../mocks/marks';
import { MOCK_EVALUATION_PREVIEW_TASKS } from '../mocks/evaluationTasks';
import { MOCK_RUBRIC_COMPONENTS } from '../mocks/rubrics';
import { USE_MOCKS, mockResponse, request } from './apiClient';

export async function getMarkRecords(): Promise<MarkRecord[]> {
  if (USE_MOCKS) return mockResponse(MOCK_MARK_RECORDS);
  return request<MarkRecord[]>('/marks');
}

export async function getEvaluationPreviewTasks(): Promise<EvaluationPreviewTask[]> {
  if (USE_MOCKS) return mockResponse(MOCK_EVALUATION_PREVIEW_TASKS);
  return request<EvaluationPreviewTask[]>('/marks/evaluation-tasks');
}

export async function getRubricComponents(): Promise<RubricComponent[]> {
  if (USE_MOCKS) return mockResponse(MOCK_RUBRIC_COMPONENTS);
  return request<RubricComponent[]>('/marks/rubric-components');
}

export async function getMarkRecordById(id: string): Promise<MarkRecord | undefined> {
  if (USE_MOCKS) return mockResponse(MOCK_MARK_RECORDS.find((r) => r.id === id));
  return request<MarkRecord>(`/marks/${id}`);
}
