import assert from 'node:assert/strict';

import type { StudentRecord } from '../types';
import { describeBlockers, distinctValues, studentStatusOptions, summariseRegistry } from './registryStatus';

assert.deepEqual(studentStatusOptions('Active'), ['Deferred', 'Graduated', 'Withdrawn']);
assert.deepEqual(studentStatusOptions('Deferred'), ['Active', 'Withdrawn']);
assert.deepEqual(studentStatusOptions('Graduated'), []);
assert.deepEqual(studentStatusOptions('Withdrawn'), []);

assert.deepEqual(
  describeBlockers({
    pendingSupervisorApplications: 2,
    pendingPanelRecommendations: 0,
    unfinishedMarksTasks: 1,
    pendingCoSupervisorNominations: undefined,
  }),
  ['Pending supervisor applications: 2', 'Unfinished marks tasks: 1'],
);
assert.deepEqual(describeBlockers({}), []);

const record = (overrides: Partial<StudentRecord>): StudentRecord => ({
  id: 'WGA1', name: 'Student', avatarText: 'ST', avatarBg: '', programme: '', academicStatus: 'Active',
  accountStatus: 'Verified', semester: '', email: '', phone: '', supervisor: '', intakeDate: '',
  ...overrides,
});

assert.deepEqual(
  summariseRegistry([
    record({ academicStatus: 'Active', activated: false }),
    record({ academicStatus: 'Active', activated: true }),
    record({ academicStatus: 'Deferred' }),
    record({ academicStatus: 'Graduated' }),
    record({ academicStatus: 'Withdrawn', activated: false }),
  ]),
  { total: 5, active: 2, deferred: 1, exited: 2, awaitingActivation: 2 },
);
assert.deepEqual(summariseRegistry([]), { total: 0, active: 0, deferred: 0, exited: 0, awaitingActivation: 0 });
assert.deepEqual(distinctValues(['Dr B', '', ' Dr A ', 'Dr B']), ['Dr A', 'Dr B']);

console.log('Registry status helper tests passed.');
