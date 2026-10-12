import assert from 'node:assert/strict';
import { ApiError } from './apiClient';
import { LETTERS_NEED_ACTIVE_STATUS, inactiveStudentReason } from './lettersApi';

const reason =
  'Letters can only be generated while your status is Active. Your status is Deferred; please contact the PG Office if you need a letter.';

assert.equal(inactiveStudentReason(new ApiError(reason, 403, { detail: reason, code: LETTERS_NEED_ACTIVE_STATUS })), reason);
assert.equal(inactiveStudentReason(new ApiError('Forbidden', 403, { detail: 'Forbidden' })), null);
assert.equal(inactiveStudentReason(new ApiError(reason, 400, { code: LETTERS_NEED_ACTIVE_STATUS })), null);
assert.equal(inactiveStudentReason(new Error('offline')), null);

console.log('Letter eligibility reason tests passed.');
