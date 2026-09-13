import assert from 'node:assert/strict';
import { ApiError, clearAuthToken } from './apiClient';
import { getSupervisoryWorkspace, getSupervisoryTeam, getCoSupervisorCandidates, nominateCoSupervisor, decideCoSupervisor, endCoSupervisor } from './coSupervisionApi';

const originalFetch = globalThis.fetch;
const calls: { url: string; method: string; body: unknown }[] = [];
try {
  clearAuthToken();
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ teams: [], nominations: [], appointments: [] }), { status: 200 });
  }) as typeof fetch;
  assert.deepEqual(await getSupervisoryWorkspace(), { teams: [], nominations: [], appointments: [] });
  await getSupervisoryTeam(7);
  await getCoSupervisorCandidates(7);
  await nominateCoSupervisor({ studentId: 7, candidateId: 23, justification: 'Research expertise', replacesAppointmentId: 4 });
  for (const action of ['accept', 'reject', 'approve', 'coordinator-reject', 'cancel'] as const) {
    await decideCoSupervisor(9, action, 'Recorded reason');
    assert.equal(calls.at(-1)?.url, `/api/appointments/co-supervisor/nominations/9/${action}/`);
    assert.deepEqual(calls.at(-1)?.body, { reason: 'Recorded reason' });
  }
  await endCoSupervisor(4, 'WITHDRAWN', 'Research supervision ended');
  assert.equal(calls[1].url, '/api/appointments/co-supervisor/students/7/');
  assert.equal(calls[2].url, '/api/appointments/co-supervisor/students/7/candidates/');
  assert.deepEqual(calls[3].body, { studentId: 7, candidateId: 23, justification: 'Research expertise', replacesAppointmentId: 4 });
  assert.deepEqual(calls.at(-1)?.body, { outcome: 'WITHDRAWN', reason: 'Research supervision ended' });
  for (const status of [401, 403, 404, 409, 500]) {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: `Server ${status}` }), { status })) as typeof fetch;
    await assert.rejects(getSupervisoryWorkspace(), (error: unknown) => error instanceof ApiError && error.status === status && error.message === `Server ${status}`);
  }
  globalThis.fetch = (async () => { throw new Error('Offline'); }) as typeof fetch;
  await assert.rejects(getSupervisoryWorkspace(), /Offline/);
} finally {
  globalThis.fetch = originalFetch;
  clearAuthToken();
}
console.log('Co-supervision API contracts and error propagation passed');
