import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { EvaluationTask } from '../types/marks';

const source = readFileSync(new URL('../components/LecturerMarksEntry.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(source, /<option>Sem [12] 20\d\d\/20\d\d<\/option>/,
  'Lecturer semester options must come from assigned evaluation tasks');

const { getMarkTaskSemesters, filterMarkTasks } = await import('./marksSemesterFilters');
const task = (id: number, semester: string, status: EvaluationTask['status']): EvaluationTask => ({
  id, semester, status, studentId: `ST-${id}`, studentName: `Student ${id}`,
  initials: 'ST', researchTitle: 'Retained research profile', deadline: '-',
  components: [], totalMark: null, comments: '',
});
const current = task(1, 'Semester I 2026/2027', 'NOT STARTED');
const historical = task(2, 'Sem 2 2024/2025', 'SUBMITTED');
const draft = task(3, current.semester, 'DRAFT SAVED');
const tasks = [current, historical, draft];
assert.deepEqual(getMarkTaskSemesters(tasks), [current.semester, historical.semester]);
assert.deepEqual(getMarkTaskSemesters([]), []);
assert.deepEqual(filterMarkTasks(tasks, '', current.semester, 'All Statuses'), [current, draft]);
assert.deepEqual(filterMarkTasks(tasks, '', historical.semester, 'All Statuses'), [historical]);
assert.deepEqual(filterMarkTasks(tasks, '', 'All Semesters', 'All Statuses'), tasks);
assert.deepEqual(filterMarkTasks(tasks, 'student 3', current.semester, 'DRAFT SAVED'), [draft]);
assert.deepEqual(filterMarkTasks(tasks, 'ST-2', historical.semester, 'SUBMITTED'), [historical]);
assert.deepEqual(filterMarkTasks(tasks, 'retained', current.semester, 'SUBMITTED'), []);
assert.deepEqual(filterMarkTasks(tasks, '', 'Missing semester', 'All Statuses'), []);
assert.match(source, /getMarkTaskSemesters\(tasks\)/);
assert.match(source, /semesterOptions\.map/);
assert.match(source, /filterMarkTasks\(tasks,/);
console.log('Lecturer Marks current/historical semester options and combined filters passed');
