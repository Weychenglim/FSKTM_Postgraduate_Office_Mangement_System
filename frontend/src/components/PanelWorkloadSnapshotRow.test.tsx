import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PanelWorkloadSnapshotRow } from './PanelAppointmentManagement';
import type { PanelWorkloadRecord } from '../types';

const row: PanelWorkloadRecord = {
  id: 'P-002', name: 'Synthetic Panel', department: 'Computing', initials: 'SP',
  currentStudents: 1, workloadLimit: 5, confirmedAppointments: 0, pendingNominations: 1,
  availability: 'Available', capacityState: 'TEMPORARILY_UNAVAILABLE',
  unavailableUntil: '2026-10-20', workloadItems: [],
};
const render = (record: PanelWorkloadRecord) => renderToStaticMarkup(<PanelWorkloadSnapshotRow record={record} />);
const unavailable = render(row);
assert.match(unavailable, /TEMPORARILY UNAVAILABLE/);
assert.match(unavailable, /2026-10-20/);
assert.match(unavailable, /1 \/ 5 reserved panel seats/);
assert.doesNotMatch(unavailable, />AVAILABLE<|text-emerald-600|bg-emerald-500/);
for (const [state, label] of [
  ['OVER_CAPACITY','OVER CAPACITY'], ['NOT_CONFIGURED','NOT CONFIGURED'], ['INELIGIBLE','INELIGIBLE'], ['FULL','FULL'],
] as const) {
  const markup = render({...row, capacityState: state, unavailableUntil: undefined});
  assert.match(markup, new RegExp(label));
  assert.doesNotMatch(markup, />AVAILABLE<|2026-10-20/);
}
const available = render({...row, capacityState: 'AVAILABLE', unavailableUntil: undefined, availability: 'Full Load'});
assert.match(available, />AVAILABLE</);
assert.doesNotMatch(available, /FULL LOAD/);
assert.match(render({...row, capacityState: undefined, unavailableUntil: undefined, availability: 'Near Limit'}), /NEAR LIMIT/);
console.log('Panel workload snapshot authoritative capacity rendering passed');
