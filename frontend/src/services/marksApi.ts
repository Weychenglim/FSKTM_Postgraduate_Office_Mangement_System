/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  EvaluationPeriodOption,
  EvaluationPreviewTask,
  EvaluationTask,
  MarkRecord,
  MarkRecordDetail,
  MarksAssignmentOptions,
  RubricComponent,
  RubricVersion,
} from '../types';
import { buildMarkScorePayload } from '../utils/marksProductionManagement';
import { request } from './apiClient';

export async function getMarkRecords(): Promise<MarkRecord[]> {
  return request<MarkRecord[]>('/marks/');
}

export async function getMarkRecordById(id: string): Promise<MarkRecordDetail> {
  return request<MarkRecordDetail>(`/marks/records/${encodeURIComponent(id)}/`);
}

export async function getEvaluationPreviewTasks(): Promise<EvaluationPreviewTask[]> {
  return request<EvaluationPreviewTask[]>('/marks/evaluation-tasks/');
}

export async function getEvaluationPeriods(
  includeArchived = false,
): Promise<EvaluationPeriodOption[]> {
  const query = includeArchived ? '?includeArchived=true' : '';
  return request<EvaluationPeriodOption[]>(`/marks/periods/${query}`);
}

export async function getEvaluationPeriod(
  periodId: number,
): Promise<EvaluationPeriodOption> {
  return request<EvaluationPeriodOption>(`/marks/periods/${periodId}/`);
}

export type EvaluationPeriodPayload = {
  name: string;
  semester: string;
  rubricId: number;
  opensAt: string | null;
  closesAt: string | null;
};

export async function createEvaluationPeriod(
  payload: EvaluationPeriodPayload,
): Promise<EvaluationPeriodOption> {
  return request<EvaluationPeriodOption>('/marks/periods/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEvaluationPeriod(
  periodId: number,
  payload: Partial<EvaluationPeriodPayload> & { reason?: string },
): Promise<EvaluationPeriodOption> {
  return request<EvaluationPeriodOption>(`/marks/periods/${periodId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function publishEvaluationPeriod(
  periodId: number,
): Promise<EvaluationPeriodOption> {
  return request<EvaluationPeriodOption>(
    `/marks/periods/${periodId}/publish/`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function closeEvaluationPeriod(
  periodId: number,
  reason: string,
): Promise<EvaluationPeriodOption> {
  return request<EvaluationPeriodOption>(
    `/marks/periods/${periodId}/close/`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
}

export async function archiveEvaluationPeriod(
  periodId: number,
  reason: string,
): Promise<EvaluationPeriodOption> {
  return request<EvaluationPeriodOption>(
    `/marks/periods/${periodId}/archive/`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
}

export async function getRubricVersions(): Promise<RubricVersion[]> {
  return request<RubricVersion[]>('/marks/rubrics/');
}

export async function getRubricVersion(
  rubricId: number,
): Promise<RubricVersion> {
  return request<RubricVersion>(`/marks/rubrics/${rubricId}/`);
}

export type RubricPayload = {
  familyCode: string;
  name: string;
  description: string;
  targetMark: string;
};

export async function createRubricVersion(
  payload: RubricPayload,
): Promise<RubricVersion> {
  return request<RubricVersion>('/marks/rubrics/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRubricVersion(
  rubricId: number,
  payload: Partial<Omit<RubricPayload, 'familyCode'>> & {
    isActive?: boolean;
  },
): Promise<RubricVersion> {
  return request<RubricVersion>(`/marks/rubrics/${rubricId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function cloneRubricVersion(
  rubricId: number,
): Promise<RubricVersion> {
  return request<RubricVersion>(`/marks/rubrics/${rubricId}/clone/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export type RubricComponentPayload = {
  code: string;
  name: string;
  description: string;
  maxMarks: string;
  required: boolean;
  isActive: boolean;
  displayOrder: number;
};

export async function createRubricComponent(
  rubricId: number,
  payload: RubricComponentPayload,
): Promise<RubricComponent> {
  return request<RubricComponent>(
    `/marks/rubrics/${rubricId}/components/`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function updateRubricComponent(
  rubricId: number,
  componentId: number,
  payload: Partial<RubricComponentPayload>,
): Promise<RubricComponent> {
  return request<RubricComponent>(
    `/marks/rubrics/${rubricId}/components/${componentId}/`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export async function getRubricComponents(): Promise<RubricComponent[]> {
  const rubrics = await getRubricVersions();
  return rubrics.flatMap((rubric) => rubric.components);
}

export async function getMarksAssignmentOptions(): Promise<MarksAssignmentOptions> {
  return request<MarksAssignmentOptions>('/marks/assignment-options/');
}

export async function generateEvaluationTasks(periodId: number): Promise<{
  createdCount: number;
  supervisorCreatedCount: number;
  panelCreatedCount: number;
  totalCount: number;
}> {
  return request(`/marks/periods/${periodId}/generate-tasks/`, {
    method: 'POST',
  });
}

export async function createBackupEvaluationTask(
  periodId: number,
  payload: {
    studentId: string;
    evaluatorId: number;
    reason: string;
    originalTaskId?: number;
  },
): Promise<EvaluationTask> {
  const created = await request<EvaluationTask>(
    `/marks/periods/${periodId}/manual-overrides/`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return withLegacyRubricFields(created);
}

export async function getEvaluationTasks(): Promise<EvaluationTask[]> {
  const tasks = await request<EvaluationTask[]>('/marks/my-evaluation-tasks/');
  return tasks.map(withLegacyRubricFields);
}

const legacyScoreFields: Record<string, {
  score: keyof EvaluationTask;
  feedback: keyof EvaluationTask;
}> = {
  problem_definition: {
    score: 'problemDefinitionScore',
    feedback: 'problemDefinitionFeedback',
  },
  literature_review: {
    score: 'literatureReviewScore',
    feedback: 'literatureReviewFeedback',
  },
  methodology: {
    score: 'methodologyScore',
    feedback: 'methodologyFeedback',
  },
  technical_understanding: {
    score: 'technicalUnderstandingScore',
    feedback: 'technicalUnderstandingFeedback',
  },
  presentation: {
    score: 'presentationScore',
    feedback: 'presentationFeedback',
  },
};

function withLegacyRubricFields(task: EvaluationTask): EvaluationTask {
  const normalized: EvaluationTask = { ...task };
  for (const component of task.components || []) {
    const fields = legacyScoreFields[component.code];
    if (!fields) continue;
    (normalized as unknown as Record<string, unknown>)[fields.score] =
      component.marksAwarded === null ? undefined : Number(component.marksAwarded);
    (normalized as unknown as Record<string, unknown>)[fields.feedback] =
      component.feedback;
  }
  return normalized;
}

function taskScores(task: EvaluationTask) {
  const components = (task.components || []).map((component) => {
    const fields = legacyScoreFields[component.code];
    if (!fields) return component;
    const legacyScore = task[fields.score] as number | undefined;
    return {
      ...component,
      marksAwarded: legacyScore === undefined
        ? component.marksAwarded
        : String(legacyScore),
      feedback:
        (task[fields.feedback] as string | undefined) ?? component.feedback,
    };
  });
  return buildMarkScorePayload(components);
}

export async function saveMarkDraft(
  task: EvaluationTask,
): Promise<EvaluationTask> {
  if (!task.id) throw new Error('Evaluation task ID is missing.');
  const updated = await request<EvaluationTask>(
    `/marks/tasks/${task.id}/draft/`,
    {
      method: 'PUT',
      body: JSON.stringify({
        scores: taskScores(task),
        comments: task.comments || '',
      }),
    },
  );
  return withLegacyRubricFields(updated);
}

export async function submitMarkEntry(
  task: EvaluationTask,
): Promise<EvaluationTask> {
  if (!task.id) throw new Error('Evaluation task ID is missing.');
  await saveMarkDraft(task);
  const submitted = await request<EvaluationTask>(
    `/marks/tasks/${task.id}/submit/`,
    { method: 'POST' },
  );
  return withLegacyRubricFields(submitted);
}
