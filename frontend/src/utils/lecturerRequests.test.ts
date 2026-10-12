import assert from 'node:assert/strict';
import * as requests from './lecturerRequests';

assert.equal(typeof requests.requestGroup, 'function', 'Request grouping must be available');
assert.equal(requests.requestGroup('PENDING_COORDINATOR', false), 'coordinator');
assert.equal(requests.requestGroup('SUBMITTED_TO_CO_SUPERVISOR', false), 'other', 'Cancel-only nominations are not decisions awaiting this Lecturer');
assert.equal(requests.requestGroup('SUBMITTED_TO_CO_SUPERVISOR', true), 'review');
assert.equal(requests.requestGroup('SUBMITTED_TO_SUPERVISOR', false), 'other', 'Ineligible students do not inflate actionable counts');
for (const status of ['APPROVED', 'REJECTED_BY_SUPERVISOR', 'REJECTED_BY_COORDINATOR', 'REJECTED_BY_CO_SUPERVISOR', 'REJECTED', 'CANCELLED', 'CANCELLED_BY_STUDENT', 'CANCELLED_BY_OFFICE']) {
  assert.equal(requests.requestGroup(status, false), 'history', `${status} has a final outcome`);
}
assert.equal(requests.requestGroup('PENDING_SUPERVISOR', true), 'review');
assert.equal(requests.requestGroup('PENDING_SOURCE_COORDINATOR', false), 'coordinator');
assert.equal(requests.requestStatusLabel('PENDING_COORDINATOR'), 'Awaiting Coordinator approval');
assert.equal(requests.requestStatusLabel('REJECTED_BY_COORDINATOR'), 'Rejected by Coordinator');
assert.equal(typeof requests.requestCalendarDay, 'function', 'Date filters must use faculty calendar dates');
assert.equal(requests.requestCalendarDay('2026-10-10T17:00:00Z'), '2026-10-11');
assert.equal(requests.requestWaitingDays('2026-10-10T17:00:00Z', '2026-10-11T16:05:00Z'), 1);
console.log('Lecturer request action counts, ongoing stages and final outcomes passed');
