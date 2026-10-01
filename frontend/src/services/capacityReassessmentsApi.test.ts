import assert from 'node:assert/strict';
import { ApiError } from './apiClient';
import { authorizeCapacityReassessment, getCapacityReassessments, revokeCapacityReassessment, runCapacityReassessmentAction } from './capacityReassessmentsApi';

const previousFetch = globalThis.fetch;
const calls: { url: string; method: string; body: unknown }[] = [];
try {
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ activeSemester: null, requests: [] }));
  }) as typeof fetch;
  await getCapacityReassessments(17);
  await authorizeCapacityReassessment('CO_SUPERVISOR', 7, { reason: 'Carryover', expectedStatus: 'PENDING_COORDINATOR', expectedActiveSemesterId: 2, expectedAuthorizationId: null, expectedEventId: null });
  await revokeCapacityReassessment('PANEL', 8, { reason: 'Wrong request', expectedStatus: 'FACULTY_PROCESSING', expectedAuthorizationId: 4, expectedEventId: 6 });
  assert.equal(calls[0].url, '/api/appointments/capacity-reassessments/?studentId=17');
  assert.deepEqual(calls[1], { url: '/api/appointments/capacity-reassessments/CO_SUPERVISOR/7/authorize/', method: 'POST', body: { reason: 'Carryover', expectedStatus: 'PENDING_COORDINATOR', expectedActiveSemesterId: 2, expectedAuthorizationId: null, expectedEventId: null } });
  assert.deepEqual(calls[2].body, { reason: 'Wrong request', expectedStatus: 'FACULTY_PROCESSING', expectedAuthorizationId: 4, expectedEventId: 6 });
  assert.equal(calls[2].url, '/api/appointments/capacity-reassessments/PANEL/8/revoke/');
  await authorizeCapacityReassessment('PANEL', 8, { reason: 'New grant after revocation', expectedStatus: 'FACULTY_PROCESSING', expectedActiveSemesterId: 2, expectedAuthorizationId: 4, expectedEventId: 6 });
  assert.deepEqual(calls[3].body, { reason: 'New grant after revocation', expectedStatus: 'FACULTY_PROCESSING', expectedActiveSemesterId: 2, expectedAuthorizationId: 4, expectedEventId: 6 });
  const events: string[] = [];
  globalThis.fetch = (async (_input, init) => {
    events.push(init?.method ?? 'GET');
    return init?.method === 'POST' ? new Response(JSON.stringify({ error: 'Semester changed' }), { status: 409 }) : new Response(JSON.stringify({ activeSemester: null, requests: [] }));
  }) as typeof fetch;
  const result = await runCapacityReassessmentAction(() => authorizeCapacityReassessment('SUPERVISOR', 7, { reason: 'Carryover', expectedStatus: 'PENDING_COORDINATOR', expectedActiveSemesterId: 2, expectedAuthorizationId: null, expectedEventId: null }), async () => { await getCapacityReassessments(); });
  assert.equal(result.ok, false);
  assert.equal(result.conflict, true);
  assert.match(result.message, /review/i);
  assert.deepEqual(events, ['POST', 'GET']); // Stale writes reload and are never retried.
  events.length = 0;
  const revocation = await runCapacityReassessmentAction(() => revokeCapacityReassessment('PANEL', 8, { reason: 'Reconsidered', expectedStatus: 'FACULTY_PROCESSING', expectedAuthorizationId: 4, expectedEventId: 6 }), async () => { await getCapacityReassessments(); });
  assert.equal(revocation.ok, false);
  assert.equal(revocation.conflict, true);
  assert.deepEqual(events, ['POST', 'GET']);
  events.length = 0;
  const denied = await runCapacityReassessmentAction(async () => { throw new ApiError('Forbidden', 403); }, async () => { await getCapacityReassessments(); });
  assert.equal(denied.conflict, false);
  assert.equal(denied.message, 'Forbidden');
  assert.deepEqual(events, []);
} finally { globalThis.fetch = previousFetch; }
console.log('Capacity reassessment API contracts and conflict refresh passed');
