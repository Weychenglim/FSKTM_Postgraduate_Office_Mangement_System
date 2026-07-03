import assert from 'node:assert/strict';
import { findSupervisorRecordByRouteKey, supervisorRecordRouteKey } from './supervisorAppointmentRoutes';
import { SupervisorRecord } from '../types';

const records: SupervisorRecord[] = [
  {
    appointmentId: 'SV-APP-00042',
    studentId: 'WEA200192',
    studentName: 'Aina Rahman',
    programme: 'MASTER OF SOFTWARE ENGINEERING (COURSEWORK)',
    supervisor: 'Dr. Siti Noor',
    status: 'Approved',
    updatedDate: '12 May 2026',
  },
  {
    studentId: 'MEA2209841',
    studentName: 'Ahmad Luqman',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    supervisor: 'Not Assigned',
    status: 'No Supervisor',
    updatedDate: '-',
  },
];

assert.equal(supervisorRecordRouteKey(records[0]), 'SV-APP-00042');
assert.equal(supervisorRecordRouteKey(records[1]), 'MEA2209841');
assert.equal(findSupervisorRecordByRouteKey(records, 'SV-APP-00042')?.studentId, 'WEA200192');
assert.equal(findSupervisorRecordByRouteKey(records, 'WEA200192')?.appointmentId, 'SV-APP-00042');
assert.equal(findSupervisorRecordByRouteKey(records, 'MEA2209841')?.studentName, 'Ahmad Luqman');
assert.equal(findSupervisorRecordByRouteKey(records, 'missing'), null);

console.log('supervisor appointment route utility tests passed');
