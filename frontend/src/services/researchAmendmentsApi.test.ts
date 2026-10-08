import assert from 'node:assert/strict';
import { ApiError } from './apiClient';
import { getResearchAmendmentOptions, getResearchAmendments, submitResearchAmendment, correctResearchProfile, decideResearchAmendment, cancelResearchAmendment } from './researchAmendmentsApi';
const originalFetch = globalThis.fetch;
const calls: { url: string; body: unknown }[] = [];
try {
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ requests: [], revisions: [] }));
  }) as typeof fetch;
  await getResearchAmendmentOptions(17);
  await getResearchAmendments();
  await submitResearchAmendment({ kind: 'RESEARCH', title: 'New title', abstract: 'New abstract', reason: 'Scope refined' });
  await correctResearchProfile({ studentId: 17, title: 'Corrected', reason: 'Typo', meaningUnchanged: true, expectedRevision: 3 });
  await decideResearchAmendment(5, { decision: 'APPROVE', retainTeam: true, expectedStatus: 'PENDING_SOURCE_COORDINATOR' });
  await cancelResearchAmendment(5, 'Reconsidered');
  assert.equal(calls[0].url, '/api/appointments/research-amendments/options/?studentId=17');
  assert.equal(calls[1].url, '/api/appointments/research-amendments/');
  assert.deepEqual(calls[2].body, { kind: 'RESEARCH', title: 'New title', abstract: 'New abstract', reason: 'Scope refined' });
  assert.deepEqual(calls[3].body, { studentId: 17, title: 'Corrected', reason: 'Typo', meaningUnchanged: true, expectedRevision: 3 });
  assert.deepEqual(calls[4], { url: '/api/appointments/research-amendments/5/decision/', body: { decision: 'APPROVE', retainTeam: true, expectedStatus: 'PENDING_SOURCE_COORDINATOR' } });
  assert.deepEqual(calls[5].body, { reason: 'Reconsidered' });
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'Profile changed. Refresh.' }), { status: 409 })) as typeof fetch;
  await assert.rejects(getResearchAmendments(), (error: unknown) => error instanceof ApiError && error.status === 409);
} finally { globalThis.fetch = originalFetch; }
console.log('Research amendment API contracts passed');
