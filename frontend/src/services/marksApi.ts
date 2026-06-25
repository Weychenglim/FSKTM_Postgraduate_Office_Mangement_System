/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Marks Entry & Management API (UC24–UC29). Returns mock data for now.

import {
  EvaluationPeriodOption,
  EvaluationPreviewTask,
  EvaluationTask,
  MarksAssignmentOptions,
  MarkRecord,
  RubricComponent,
} from '../types';
import { MOCK_MARK_RECORDS, MOCK_EVALUATION_TASKS } from '../mocks/marks';
import { MOCK_EVALUATION_PREVIEW_TASKS } from '../mocks/evaluationTasks';
import { MOCK_RUBRIC_COMPONENTS } from '../mocks/rubrics';
import { USE_MOCKS, mockResponse, request } from './apiClient';

const parseBooleanEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const USE_MARKS_BACKEND = parseBooleanEnv(import.meta.env.VITE_USE_MARKS_BACKEND, true);
const USE_MARKS_MOCKS = USE_MOCKS && !USE_MARKS_BACKEND;

export async function getMarkRecords(): Promise<MarkRecord[]> {
  if (USE_MARKS_MOCKS) return mockResponse(MOCK_MARK_RECORDS);
  return request<MarkRecord[]>('/marks/');
}

export async function getEvaluationPreviewTasks(): Promise<EvaluationPreviewTask[]> {
  if (USE_MARKS_MOCKS) return mockResponse(MOCK_EVALUATION_PREVIEW_TASKS);
  return request<EvaluationPreviewTask[]>('/marks/evaluation-tasks/');
}

export async function getEvaluationPeriods(): Promise<EvaluationPeriodOption[]> {
  if (USE_MARKS_MOCKS) {
    return mockResponse([
      {
        id: 1,
        name: 'Semester 1 Evaluation',
        semester: 'Sem 1 2025/2026',
        rubricId: 1,
        rubricName: 'EE Evaluation Rubric',
        opensAt: '2025-12-01T00:00:00+08:00',
        closesAt: '2025-12-10T23:59:00+08:00',
        isOpen: true,
        taskTotals: {
          total: MOCK_EVALUATION_PREVIEW_TASKS.length,
          supervisor: MOCK_EVALUATION_PREVIEW_TASKS.filter((task) => task.evaluatorRole === 'SUPERVISOR').length,
          panel: MOCK_EVALUATION_PREVIEW_TASKS.filter((task) => (task.evaluatorRole || 'PANEL') === 'PANEL').length,
          backup: MOCK_EVALUATION_PREVIEW_TASKS.filter((task) => task.evaluatorRole === 'BACKUP').length,
          submitted: 0,
          incomplete: MOCK_EVALUATION_PREVIEW_TASKS.length,
          overdue: 0,
        },
      },
    ]);
  }
  return request<EvaluationPeriodOption[]>('/marks/periods/');
}

export async function getMarksAssignmentOptions(): Promise<MarksAssignmentOptions> {
  if (USE_MARKS_MOCKS) {
    return mockResponse({
      students: MOCK_EVALUATION_PREVIEW_TASKS.map((task) => ({
        studentId: task.studentId,
        studentName: task.studentName,
        programme: 'Postgraduate Programme',
        semester: task.semester,
        researchTitle: task.researchTitle,
        supervisorName: 'Assigned Supervisor',
      })),
      lecturers: [
        {
          userId: 1,
          staffId: 'L84920',
          fullName: 'Dr. Sarah Lim',
          department: 'Software Engineering',
          email: 'sarah.lim@fsktm.edu.my',
        },
        {
          userId: 2,
          staffId: 'A004812',
          fullName: 'Assoc. Prof. Dr. Amina Malik',
          department: 'Artificial Intelligence',
          email: 'amina.malik@fsktm.edu.my',
        },
        {
          userId: 3,
          staffId: 'A003328',
          fullName: 'Dr. Robert Chen',
          department: 'Data Science',
          email: 'robert.chen@fsktm.edu.my',
        },
      ],
      tasks: MOCK_EVALUATION_PREVIEW_TASKS.map((task, index) => ({
        ...task,
        taskId: index + 1,
        periodId: 1,
        evaluatorId: index + 1,
      })),
    });
  }
  return request<MarksAssignmentOptions>('/marks/assignment-options/');
}

export async function generateEvaluationTasks(periodId: number): Promise<{
  createdCount: number;
  supervisorCreatedCount: number;
  panelCreatedCount: number;
  totalCount: number;
}> {
  if (USE_MARKS_MOCKS) {
    return mockResponse({
      createdCount: 0,
      supervisorCreatedCount: 0,
      panelCreatedCount: 0,
      totalCount: MOCK_EVALUATION_PREVIEW_TASKS.length,
    });
  }
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
  if (USE_MARKS_MOCKS) {
    const task: EvaluationTask = {
      id: Date.now(),
      studentId: payload.studentId,
      studentName: 'Backup Evaluator Student',
      initials: 'BE',
      researchTitle: 'Manual backup evaluation task',
      semester: 'Sem 1 2025/2026',
      deadline: '-',
      status: 'NOT STARTED',
      evaluatorRole: 'BACKUP',
      evaluatorRoleLabel: 'Backup / Manual Override',
      components: [],
    };
    return mockResponse(task);
  }
  const created = await request<EvaluationTask>(`/marks/periods/${periodId}/manual-overrides/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return withLegacyRubricFields(created);
}

export async function getRubricComponents(): Promise<RubricComponent[]> {
  if (USE_MARKS_MOCKS) return mockResponse(MOCK_RUBRIC_COMPONENTS);
  return request<RubricComponent[]>('/marks/rubric-components/');
}

export async function getMarkRecordById(id: string): Promise<MarkRecord | undefined> {
  if (USE_MARKS_MOCKS) return mockResponse(MOCK_MARK_RECORDS.find((r) => r.id === id));
  const records = await getMarkRecords();
  return records.find((record) => record.id === id);
}

// Lecturer-facing: evaluation tasks assigned to the logged-in lecturer (UC24).
export async function getEvaluationTasks(): Promise<EvaluationTask[]> {
  if (USE_MARKS_MOCKS) return mockResponse(MOCK_EVALUATION_TASKS);
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
    (normalized as unknown as Record<string, unknown>)[fields.feedback] = component.feedback;
  }
  return normalized;
}

function taskScores(task: EvaluationTask) {
  return (task.components || []).map((component) => {
    const fields = legacyScoreFields[component.code];
    const score = fields
      ? (task[fields.score] as number | undefined)
      : component.marksAwarded === null
      ? 0
      : Number(component.marksAwarded);
    const feedback = fields
      ? (task[fields.feedback] as string | undefined)
      : component.feedback;
    return {
      componentId: component.id,
      marksAwarded: score ?? 0,
      feedback: feedback || '',
    };
  });
}

export async function saveMarkDraft(task: EvaluationTask): Promise<EvaluationTask> {
  if (USE_MARKS_MOCKS) return mockResponse({ ...task, status: 'DRAFT SAVED' });
  if (!task.id) throw new Error('Evaluation task ID is missing.');
  const updated = await request<EvaluationTask>(`/marks/tasks/${task.id}/draft/`, {
    method: 'PUT',
    body: JSON.stringify({
      scores: taskScores(task),
      comments: task.comments || '',
    }),
  });
  return withLegacyRubricFields(updated);
}

export async function submitMarkEntry(task: EvaluationTask): Promise<EvaluationTask> {
  if (USE_MARKS_MOCKS) return mockResponse({ ...task, status: 'SUBMITTED' });
  if (!task.id) throw new Error('Evaluation task ID is missing.');
  await saveMarkDraft(task);
  const submitted = await request<EvaluationTask>(`/marks/tasks/${task.id}/submit/`, {
    method: 'POST',
  });
  return withLegacyRubricFields(submitted);
}
