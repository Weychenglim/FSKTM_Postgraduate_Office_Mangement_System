import type { EvaluationTask } from '../types/marks';

export function getMarkTaskSemesters(tasks: EvaluationTask[]): string[] {
  return [...new Set(tasks.map(task => task.semester))];
}

export function filterMarkTasks(
  tasks: EvaluationTask[],
  search: string,
  semester: string,
  status: string,
): EvaluationTask[] {
  const query = search.toLowerCase();
  return tasks.filter(task => (
    (task.studentName.toLowerCase().includes(query)
      || task.studentId.toLowerCase().includes(query)
      || task.researchTitle.toLowerCase().includes(query))
    && (semester === 'All Semesters' || task.semester === semester)
    && (status === 'All Statuses' || task.status === status)
  ));
}
