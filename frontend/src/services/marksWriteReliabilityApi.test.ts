import assert from 'node:assert/strict';
import type { EvaluationTask } from '../types';
import { saveMarkDraft, submitMarkEntry } from './marksApi';

const task: EvaluationTask = { id: 4, studentId: 'PG001', studentName: 'Student', initials: 'ST', researchTitle: 'Research', semester: 'S1', deadline: '-', status: 'DRAFT SAVED', writeVersion: 'a'.repeat(64), components: [{ id: 3, code: 'research', name: 'Research', description: '', maxMarks: '100', required: true, marksAwarded: '75', feedback: 'Revised feedback' }], comments: 'Assessment' };
const calls: Array<{ url: string; method?: string; body: any }> = [];
globalThis.fetch = (async (url, init) => {
  calls.push({ url: String(url), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
  return Response.json({ ...task, writeVersion: 'b'.repeat(64), status: String(url).endsWith('/submit/') ? 'SUBMITTED' : 'DRAFT SAVED' });
}) as typeof fetch;
const saved = await saveMarkDraft(task);
assert.equal(calls[0].body.expectedVersion, task.writeVersion);
assert.equal(saved.writeVersion, 'b'.repeat(64));
calls.length = 0;
const reference = 'c6f289a2-1f1b-4388-aae2-e6d79ac0d439';
await submitMarkEntry(task, reference);
assert.equal(calls.length, 1, 'Submission must make one atomic request, without a preliminary draft save');
assert.deepEqual(calls[0], { url: '/api/marks/tasks/4/submit/', method: 'POST', body: { expectedVersion: task.writeVersion, submissionId: reference, scores: [{ componentId: 3, marksAwarded: 75, feedback: 'Revised feedback' }], comments: 'Assessment' } });
await submitMarkEntry(task, reference);
assert.equal(calls[1].body.submissionId, reference, 'Retry uses the same caller-owned reference');
calls.length = 0;
await assert.rejects(() => saveMarkDraft({ ...task, writeVersion: undefined }), /reload/i);
assert.equal(calls.length, 0, 'Missing versions must never produce an unprotected write');
console.log('Lecturer write versions and single-request submission transport passed');
