import assert from 'node:assert/strict';
import { ApiError, clearAuthToken } from './apiClient';
import { createCoordinatorDelegation, getCoordinatorDelegationOptions, getCoordinatorDelegations, revokeCoordinatorDelegation } from './coordinatorDelegationsApi';

const originalFetch = globalThis.fetch;
const calls: { url: string; method: string; body: unknown; signal?: AbortSignal | null }[] = [];
try {
  clearAuthToken();
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : null, signal: init?.signal });
    return new Response(JSON.stringify([]), { status: 200 });
  }) as typeof fetch;
  const controller = new AbortController();
  assert.deepEqual(await getCoordinatorDelegations(controller.signal), []);
  await getCoordinatorDelegationOptions(controller.signal);
  const values = { programme: 'MSc Computing', coordinatorId: 7, startsOn: '2026-09-20', endsOn: '2026-09-25', justification: 'Leave coverage' };
  await createCoordinatorDelegation(values);
  await revokeCoordinatorDelegation(9, 'Returned early');
  assert.equal(calls[0].url, '/api/accounts/coordinator-delegations/');
  assert.equal(calls[0].signal, controller.signal);
  assert.equal(calls[1].url, '/api/accounts/coordinator-delegations/options/');
  assert.equal(calls[1].signal, controller.signal);
  assert.equal(calls[2].method, 'POST');
  assert.deepEqual(calls[2].body, values);
  assert.equal(calls[3].url, '/api/accounts/coordinator-delegations/9/revoke/');
  assert.equal(calls[3].method, 'POST');
  assert.deepEqual(calls[3].body, { reason: 'Returned early' });
  for (const status of [403, 409, 500]) {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'Delegation no longer available' }), { status })) as typeof fetch;
    await assert.rejects(createCoordinatorDelegation(values), (error: unknown) => error instanceof ApiError && error.status === status && error.message === 'Delegation no longer available');
  }
} finally { globalThis.fetch = originalFetch; clearAuthToken(); }
console.log('Coordinator delegation API contracts, cancellation signals and errors passed');
