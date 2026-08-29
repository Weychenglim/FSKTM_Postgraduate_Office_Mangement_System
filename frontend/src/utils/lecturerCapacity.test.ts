import assert from 'node:assert/strict';
import { ApiError } from '../services/apiClient';
import type { AcademicSemester } from '../types';
import {
  capacityConflictMessage,
  capacityStateLabel,
  capacityUtilization,
  validateAvailabilityWindow,
  validateCapacityDraftEntry,
} from './lecturerCapacity';

const semester: AcademicSemester = {
  id: 1,
  code: '2026-2027-S1',
  academicSession: '2026/2027',
  term: 'SEMESTER_I',
  label: '2026/2027 Semester I',
  startsOn: '2026-09-01',
  endsOn: '2027-01-31',
  lifecycleStatus: 'DRAFT',
  effectiveStatus: 'DRAFT',
  isActive: false,
  activatedAt: null,
  closedAt: null,
  archivedAt: null,
};

assert.equal(capacityStateLabel('OVER_CAPACITY'), 'Over capacity');
assert.equal(capacityStateLabel('TEMPORARILY_UNAVAILABLE'), 'Temporarily unavailable');
assert.equal(capacityUtilization(7, 5), 100);
assert.equal(capacityUtilization(2, 0), 0);
assert.equal(capacityUtilization(-3, 5), 0);
assert.equal(capacityUtilization(Number.NaN, 5), 0);

assert.deepEqual(
  validateCapacityDraftEntry({
    hasSupervisorRole: true,
    hasPanelRole: false,
    supervisorLimit: null,
    panelLimit: null,
  }),
  ['A Supervisor limit is required.'],
);
assert.deepEqual(
  validateCapacityDraftEntry({
    hasSupervisorRole: true,
    hasPanelRole: true,
    supervisorLimit: 0,
    panelLimit: 4,
  }),
  [],
);
assert.deepEqual(
  validateCapacityDraftEntry({
    hasSupervisorRole: false,
    hasPanelRole: false,
    supervisorLimit: 2,
    panelLimit: null,
  }),
  ['Remove the Supervisor limit for a Lecturer without that role.'],
);

assert.equal(
  validateAvailabilityWindow('2026-09-01', '2026-09-03', semester),
  null,
);
assert.equal(
  validateAvailabilityWindow('2026-08-31', '2026-09-03', semester),
  'Availability dates must stay within the selected semester.',
);
assert.equal(
  validateAvailabilityWindow('2026-09-04', '2026-09-03', semester),
  'The end date must be on or after the start date.',
);
assert.equal(
  validateAvailabilityWindow('', '2026-09-03', semester),
  'Start and end dates are required.',
);

assert.equal(
  capacityConflictMessage(new ApiError('The plan changed after it was loaded.', 409)),
  'The plan changed after it was loaded. Refresh and review the latest policy.',
);
assert.equal(
  capacityConflictMessage(new Error('Network unavailable')),
  'Network unavailable',
);

console.log('lecturer capacity utility tests passed');
