import assert from 'node:assert/strict';
import type { EvaluationTask } from '../types/marks';
import { filterSubmissionHistory, submissionDateKey } from './marksSubmissionHistory';

const submission = (id: number, submittedAt: string, role: EvaluationTask['evaluatorRole'] = 'SUPERVISOR'): EvaluationTask => ({
  id, submittedAt, evaluatorRole: role, studentId: `PG${id}`, studentName: `Student ${id}`, initials: 'ST',
  researchTitle: 'Research study', semester: 'Semester I', deadline: '-', status: 'SUBMITTED', components: [],
});
const december = submission(1, '2025-12-31T12:00:00Z');
const january = submission(2, '2026-01-01T01:00:00Z');
const panel = submission(3, '2026-01-02T01:00:00Z', 'PANEL');
const nextMalaysiaDay = submission(4, '2026-01-01T16:30:00Z');
const rows = [december, january, panel, nextMalaysiaDay];
const filter = (search = '', from = '', to = '', semester = 'All semesters') => filterSubmissionHistory(rows, 'SUPERVISOR', search, semester, from, to);
assert.deepEqual(filter().map(row => row.id), [4, 2, 1], 'Sort timestamps rather than date labels across year boundaries');
assert.equal(submissionDateKey(nextMalaysiaDay), '2026-01-02', 'Date filters use faculty time, not UTC or device time');
assert.deepEqual(filter('', '2026-01-02', '2026-01-02').map(row => row.id), [4], 'Date range is inclusive in Malaysia');
assert.deepEqual(filter('', '', '2026-01-01').map(row => row.id), [2, 1]);
assert.deepEqual(filter(' PG2 ').map(row => row.id), [2]);
assert.deepEqual(filter('research', '', '', 'Other semester'), []);
assert.deepEqual(filter('', '2026-02-01', '2026-01-01'), []);
assert.deepEqual(filterSubmissionHistory(rows, 'PANEL', '', 'All semesters', '', ''), [panel], 'Role scope must survive date and search filtering');
assert.deepEqual(rows, [december, january, panel, nextMalaysiaDay], 'History sorting must not mutate loaded results');
const unknownDate = { ...january, id: 9, submittedAt: null };
assert.deepEqual(filterSubmissionHistory([unknownDate, january], 'SUPERVISOR', '', 'All semesters', '', '').map(row => row.id), [2, 9]);
assert.deepEqual(filterSubmissionHistory([unknownDate], 'SUPERVISOR', '', 'All semesters', '2026-01-01', ''), []);
console.log('Submission history role scope, timestamp sorting and inclusive Malaysia date filters passed');
