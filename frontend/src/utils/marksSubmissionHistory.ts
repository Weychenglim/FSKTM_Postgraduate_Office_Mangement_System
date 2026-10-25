import type { EvaluationTask, EvaluationTaskRole } from '../types/marks';
import { markingRole } from './lecturerMarking';
import { toMalaysiaDateTimeLocalValue } from './malaysiaDateTime';

export function submissionDateKey(task: EvaluationTask): string {
  return toMalaysiaDateTimeLocalValue(task.submittedAt).slice(0, 10);
}

export function filterSubmissionHistory(
  tasks: EvaluationTask[], role: EvaluationTaskRole, query: string, semester: string, from: string, to: string,
): EvaluationTask[] {
  const normalized = query.trim().toLowerCase();
  if (from && to && from > to) return [];
  const timestamp = (task: EvaluationTask) => submissionDateKey(task) ? Date.parse(task.submittedAt!) : Number.MIN_SAFE_INTEGER;
  return tasks.filter(task => {
    const day = submissionDateKey(task);
    return task.status === 'SUBMITTED' && markingRole(task) === role
      && (semester === 'All semesters' || task.semester === semester)
      && (!normalized || [task.studentName, task.studentId, task.researchTitle, task.periodName || ''].some(value => value.toLowerCase().includes(normalized)))
      && (!from || !!day && day >= from) && (!to || !!day && day <= to);
  }).sort((a, b) => timestamp(b) - timestamp(a) || (b.id ?? 0) - (a.id ?? 0));
}
