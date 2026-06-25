import assert from 'node:assert/strict';

import { DEMO_CREDENTIALS } from './auth';

assert.equal(DEMO_CREDENTIALS.admin.email, 'admin@siswa.um.edu.my');
assert.equal(DEMO_CREDENTIALS.coordinator.email, 'coordinator@siswa.um.edu.my');
assert.equal(DEMO_CREDENTIALS.lecturer.email, 'lecturer@siswa.um.edu.my');
assert.equal(DEMO_CREDENTIALS.student.email, '200192@siswa.um.edu.my');
assert.equal(DEMO_CREDENTIALS.student.user.studentId, '200192');

console.log('authentication demo credential tests passed');
