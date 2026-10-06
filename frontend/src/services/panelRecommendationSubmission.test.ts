import assert from 'node:assert/strict';
import { createPanelRecommendation } from './appointmentsApi';

const originalFetch = globalThis.fetch;
const bodies: Record<string, unknown>[] = [];
globalThis.fetch = (async (input, init) => {
  assert.equal(String(input), '/api/appointments/panel/recommendations/');
  assert.equal(init?.method, 'POST');
  bodies.push(JSON.parse(String(init?.body)));
  return new Response(JSON.stringify({ id: 1, status: 'SUBMITTED_TO_PANEL' }), { status: 201 });
}) as typeof fetch;

const base = { studentId: 'SYNTHETIC-001', recommendedMemberId: 'PANEL-001',
  justification: 'Synthetic Panel review', status: 'SUBMITTED_TO_PANEL' as const };
try {
  await createPanelRecommendation({ ...base, replacesAppointmentId: null, replacementReason: null });
  assert.equal(Object.hasOwn(bodies[0], 'replacementReason'), false,
    'a first nomination must omit an absent replacement reason instead of sending API-invalid null');
  assert.equal(bodies[0].justification, base.justification);
  await createPanelRecommendation({ ...base, replacesAppointmentId: 7, replacementReason: 'Retirement handover' });
  assert.equal(bodies[1].replacesAppointmentId, 7);
  assert.equal(bodies[1].replacementReason, 'Retirement handover');
  await createPanelRecommendation({ ...base, replacesAppointmentId: 7, replacementReason: '' });
  assert.equal(bodies[2].replacementReason, '', 'blank replacement reasons must still reach backend validation');
} finally {
  globalThis.fetch = originalFetch;
}
console.log('Panel submission optional-reason and replacement contract tests passed');
