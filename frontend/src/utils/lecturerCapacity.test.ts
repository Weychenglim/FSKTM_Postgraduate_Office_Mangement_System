import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApiError } from '../services/apiClient';
import type { AcademicSemester } from '../types';
import {
  canMutateSemesterCapacity,
  capacityConflictMessage,
  capacityStateLabel,
  capacityUtilization,
  calendarDateInTimeZone,
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
assert.equal(
  calendarDateInTimeZone(new Date('2026-08-31T16:30:00.000Z')),
  '2026-09-01',
);
assert.equal(canMutateSemesterCapacity('DRAFT'), true);
assert.equal(canMutateSemesterCapacity('ACTIVE'), true);
assert.equal(canMutateSemesterCapacity('CLOSED'), false);
assert.equal(canMutateSemesterCapacity('ARCHIVED'), false);

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

const workspaceSource = readFileSync(
  resolve('src/components/LecturerCapacityManagement.tsx'),
  'utf8',
);
for (const apiName of [
  'getAcademicSemesters',
  'getSemesterCapacityPlans',
  'createSemesterCapacityPlan',
  'updateLecturerCapacityEntry',
  'cloneSemesterCapacityPlan',
  'publishSemesterCapacityPlan',
  'getLecturerAvailabilityWindows',
  'createLecturerAvailabilityWindow',
  'cancelLecturerAvailabilityWindow',
  'getLecturerCapacityAudits',
]) {
  assert.match(workspaceSource, new RegExp(apiName));
}
assert.match(workspaceSource, /RightDrawer/);
assert.match(workspaceSource, /LoadingState/);
assert.match(workspaceSource, /ErrorState/);
assert.match(workspaceSource, /EmptyState/);
assert.match(workspaceSource, /DRAFT/);
assert.match(workspaceSource, /PUBLISHED/);
assert.match(workspaceSource, /SUPERSEDED/);
assert.match(workspaceSource, /SUPERVISOR/);
assert.match(workspaceSource, /PANEL/);
assert.match(workspaceSource, /publishReason/);
assert.match(workspaceSource, /cancelReason/);
assert.match(workspaceSource, /readinessErrors/);

console.log('lecturer capacity utility tests passed');
