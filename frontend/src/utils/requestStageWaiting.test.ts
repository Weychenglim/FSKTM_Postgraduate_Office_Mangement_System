import assert from 'node:assert/strict';
import { formatRequestStageWaiting } from './requestStageWaiting';

for (const [status, label] of [
  ['APPROVED', 'Completed'], ['Approved', 'Completed'], ['COMPLETED', 'Completed'],
  ['CANCELLED', 'Cancelled'], ['CANCELLED_BY_STUDENT', 'Cancelled'], ['CANCELLED_BY_OFFICE', 'Cancelled'],
  ['CANCELLED_BY_SUPERVISOR', 'Cancelled'], ['REJECTED', 'Rejected'],
  ['REJECTED_BY_SUPERVISOR', 'Rejected'], ['REJECTED_BY_COORDINATOR', 'Rejected'],
  ['REJECTED_BY_CO_SUPERVISOR', 'Rejected'], ['REJECTED_BY_PANEL', 'Rejected'],
  ['ENDED', 'Ended'], ['WITHDRAWN', 'Withdrawn'], ['EXPIRED', 'Expired'],
] as const) {
  assert.equal(formatRequestStageWaiting(status, 99), label, `${status} never displays a stale ongoing age`);
  assert.equal(formatRequestStageWaiting(status, null, false), label, `${status} explains why waiting ended`);
}
assert.equal(formatRequestStageWaiting('PENDING_COORDINATOR', 0), '0 calendar days');
assert.equal(formatRequestStageWaiting('SUBMITTED_TO_SUPERVISOR', 1), '1 calendar day');
assert.equal(formatRequestStageWaiting('PENDING_SUPERVISOR', 12), '12 calendar days');
assert.equal(formatRequestStageWaiting('PENDING_SOURCE_COORDINATOR', null), 'Not recorded');
for (const value of [undefined, NaN, Infinity, -1, 0.5]) {
  assert.equal(formatRequestStageWaiting('SUBMITTED_TO_CO_SUPERVISOR', value), 'Not recorded');
}
assert.equal(formatRequestStageWaiting('UNKNOWN_FINAL', 5, false), 'No longer waiting');
assert.equal(formatRequestStageWaiting('No Supervisor', null, false), 'Not awaiting review');
console.log('Final request outcomes replace stage ages; ongoing requests retain calendar days and missing-data labels');
