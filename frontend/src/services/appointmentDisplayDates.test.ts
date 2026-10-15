import assert from 'node:assert/strict';
import { toStudentSupervisorApplication } from './appointmentsApi';
import type { SupervisorApplicationRecord } from '../types';

const record = {
  id: 1, status: 'SUBMITTED_TO_SUPERVISOR', submittedAt: '2026-10-04T16:40:08Z',
  researchTitle: 'Synthetic timezone boundary', proposedSupervisor: 'Synthetic lecturer',
  projectCourseCodes: 'ABC1234, XYZ9000',
} as SupervisorApplicationRecord;
assert.equal(toStudentSupervisorApplication(record).date, '05 Oct 2026');
assert.equal(toStudentSupervisorApplication(record).projectCourseCodes, 'ABC1234, XYZ9000');
assert.equal(toStudentSupervisorApplication({ ...record, projectCourseCodes: undefined }).projectCourseCodes, undefined);
console.log(`Appointment timestamp display passed (TZ=${process.env.TZ})`);
