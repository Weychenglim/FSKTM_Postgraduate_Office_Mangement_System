import assert from 'node:assert/strict';

import { getSupervisorAppointments } from './appointmentsApi';
import { ApiError, clearAuthToken } from './apiClient';
import { getActiveTimeline } from './timelineApi';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

try {
  clearAuthToken();
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrls.push(String(input));
    if (String(input).endsWith('/appointments/supervisor/')) {
      return jsonResponse([], 200);
    }
    return jsonResponse({
      available: false,
      id: null,
      semester: '',
      session: '',
      sourceFilename: '',
      uploadedAt: null,
      levels: [],
    }, 200);
  }) as typeof fetch;

  assert.deepEqual(await getSupervisorAppointments(), []);
  assert.equal((await getActiveTimeline()).available, false);
  assert.deepEqual(requestedUrls, [
    '/api/appointments/supervisor/',
    '/api/dashboard/timeline/active/',
  ]);

  for (const status of [401, 403, 404, 409, 500]) {
    globalThis.fetch = (async () => jsonResponse(
      { error: `Persisted API error ${status}` },
      status,
    )) as typeof fetch;

    await assert.rejects(
      getSupervisorAppointments(),
      (error: unknown) => (
        error instanceof ApiError
        && error.status === status
        && error.message === `Persisted API error ${status}`
      ),
      `owned service must propagate HTTP ${status} without mock fallback`,
    );
  }

  globalThis.fetch = (async () => {
    throw new Error('Django is unavailable');
  }) as typeof fetch;
  await assert.rejects(
    getActiveTimeline(),
    /Django is unavailable/,
    'network failure must surface instead of returning a mock timeline',
  );
} finally {
  globalThis.fetch = originalFetch;
  clearAuthToken();
}

console.log('owned backend error propagation tests passed');
