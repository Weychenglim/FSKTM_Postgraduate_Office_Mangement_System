import assert from 'node:assert/strict';

import { describeBlockers, studentStatusOptions } from './registryStatus';

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

console.log('Registry status helper tests passed.');
