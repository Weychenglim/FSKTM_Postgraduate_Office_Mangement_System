import assert from 'node:assert/strict';

import {
  academicSemesterErrorMessage,
  formatSemesterLifecycle,
  isConsecutiveAcademicSession,
  validateSemesterDates,
} from './academicSemesters';

assert.equal(isConsecutiveAcademicSession('2026/2027'), true);
assert.equal(isConsecutiveAcademicSession('2026/2028'), false);
assert.equal(isConsecutiveAcademicSession('26/27'), false);

assert.equal(formatSemesterLifecycle('ACTIVE'), 'Active');
assert.equal(formatSemesterLifecycle('EXPIRED'), 'Expired');
assert.equal(formatSemesterLifecycle('SEMESTER_I'), 'Semester I');

assert.equal(validateSemesterDates('2026-09-01', '2027-01-31'), null);
assert.equal(
  validateSemesterDates('2027-01-31', '2026-09-01'),
  'End date must be on or after the start date.',
);

assert.equal(
  academicSemesterErrorMessage({ status: 409, message: 'Dates overlap an existing semester.' }),
  'Dates overlap an existing semester.',
);
assert.equal(
  academicSemesterErrorMessage({ status: 500, message: 'Internal Server Error' }),
  'Semester changes could not be saved. Try again.',
);
