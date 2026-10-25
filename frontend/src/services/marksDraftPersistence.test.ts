import assert from 'node:assert/strict';
import { getEvaluationTasks, saveMarkDraft, submitMarkEntry } from './marksApi';
import type { EvaluationTask } from '../types';

let stored: EvaluationTask = {
  id: 4, studentId: 'PG001', studentName: 'Test Student', initials: 'TS', researchTitle: 'Research',
  semester: 'Semester I', deadline: '-', status: 'DRAFT SAVED', writeVersion: 'a'.repeat(64),
  components: [{ id: 3, code: 'problem_definition', name: 'Problem', description: '', maxMarks: '100', required: true, marksAwarded: '40.00', feedback: 'Old feedback' }],
};
const writes: Array<{ scores: Array<{ componentId: number; marksAwarded: number; feedback: string }> }> = [];
globalThis.fetch = (async (url, init) => {
  if (String(url).endsWith('/draft/') || String(url).endsWith('/submit/')) {
    const payload = JSON.parse(String(init?.body));
    writes.push(payload);
    stored = { ...stored, components: stored.components!.map(component => ({ ...component, ...payload.scores.find((score: { componentId: number }) => score.componentId === component.id) })) };
    return Response.json({ ...stored, status: String(url).endsWith('/submit/') ? 'SUBMITTED' : 'DRAFT SAVED' });
  }
  return Response.json([stored]);
}) as typeof fetch;

const loaded = (await getEvaluationTasks())[0];
assert.equal(loaded.problemDefinitionScore, 40, 'Exercise the real API compatibility normalisation');
const edited = { ...loaded, components: loaded.components!.map(component => ({ ...component, marksAwarded: '75.00', feedback: 'Revised feedback' })) };
const saved = await saveMarkDraft(edited);
assert.deepEqual(writes[0].scores, [{ componentId: 3, marksAwarded: 75, feedback: 'Revised feedback' }], 'Edited rubric values must override stale legacy aliases');
assert.equal(saved.problemDefinitionScore, 75);
await submitMarkEntry({ ...saved, components: saved.components!.map(component => ({ ...component, marksAwarded: '80.00', feedback: '' })) }, 'c6f289a2-1f1b-4388-aae2-e6d79ac0d439');
assert.deepEqual(writes[1].scores, [{ componentId: 3, marksAwarded: 80, feedback: '' }], 'Submitting a revised saved draft must retain its new score and allow clearing feedback');
await saveMarkDraft({ ...saved, components: saved.components!.map(component => ({ ...component, marksAwarded: null, feedback: '' })) });
assert.deepEqual(writes[2].scores, [], 'Clearing a score must not resurrect its legacy value');
console.log('Draft and submission payloads retain edited rubric scores and feedback');
