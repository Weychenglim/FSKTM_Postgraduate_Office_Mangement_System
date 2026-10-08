import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CapacityReassessmentCard, CapacityReassessments } from './CapacityReassessments';
import type { CapacityReassessment } from '../types/capacityReassessment';

const semester = { id: 1, label: '2025/2026 Semester 2', lifecycleStatus: 'CLOSED' };
const active = { id: 2, label: '2026/2027 Semester 1', lifecycleStatus: 'ACTIVE' };
const policy = { semesterId: 2, planId: 4, planVersion: 3, limit: 5, activeLoad: 3, reservedLoad: 1, state: 'AVAILABLE', unavailableUntil: null };
const row: CapacityReassessment = {
  id: 7, kind: 'CO_SUPERVISOR', status: 'PENDING_COORDINATOR', latestEventId: 1,
  student: { id: 8, name: 'Student One', matricNo: 'PG001', programme: 'Computing' }, candidate: { id: 9, name: 'Dr Candidate' },
  originalSemester: semester, originalCapacity: null, currentCapacity: policy,
  authorization: { id: 3, targetSemester: semester, reason: 'Pending original approval', createdAt: '2026-09-01T00:00:00Z', state: 'STALE' },
  history: [{ id: 1, action: 'AUTHORIZED', actorName: 'Office Person', actorRole: 'Office Staff/Admin', reason: 'Pending original approval', createdAt: '2026-09-01T00:00:00Z', targetSemester: semester, policy }],
  canAuthorize: true, canRevoke: true,
};
const render = (office: boolean, value = row) => renderToStaticMarkup(<CapacityReassessmentCard row={value} activeSemester={active} office={office} busy={false} onAction={() => {}} />);
const html = render(true);
assert.match(html, /Co-supervisor/);
assert.match(html, /Pending coordinator/);
assert.match(html, /2025\/2026 Semester 2/);
assert.match(html, /2026\/2027 Semester 1/);
assert.match(html, /3 active/);
assert.match(html, /1 reserved/);
assert.match(html, /limit 5/);
assert.match(html, /new authorization/i);
assert.match(html, /Authorize reassessment/);
assert.match(html, /Revoke authorization/);
assert.match(html, /Office Person/);
const coordinator = render(false);
assert.doesNotMatch(coordinator, /<button/);
assert.match(coordinator, /Pending original approval/);
assert.doesNotMatch(render(true, { ...row, canAuthorize: false, canRevoke: false }), /<button/);
const revoked = render(true, { ...row, authorization: { ...row.authorization!, state: 'REVOKED' }, history: [{ ...row.history[0], action: 'REVOKED', reason: 'Incorrect request selected', policy: null }] });
assert.match(revoked, /Incorrect request selected/);
assert.doesNotMatch(revoked, /undefined|NaN|Invalid Date/);
const terminal = render(true, { ...row, status: 'CANCELLED', canAuthorize: false, canRevoke: false });
assert.doesNotMatch(terminal, /target semester is no longer active/i);
assert.match(terminal, /only pending requests/i);
for (const role of ['Student', 'Lecturer'] as const) {
  assert.equal(renderToStaticMarkup(<CapacityReassessments role={role} />), '');
}
console.log('Capacity reassessment role controls, policy labels and stale history passed');
