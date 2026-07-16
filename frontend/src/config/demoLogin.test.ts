import assert from 'node:assert/strict';

import { createDemoLoginConfig } from './demoLogin';

const completeDevelopmentEnvironment = {
  DEV: true,
  VITE_ENABLE_DEMO_LOGIN: 'true',
  VITE_DEMO_ADMIN_PASSWORD: 'canary-admin',
  VITE_DEMO_COORDINATOR_PASSWORD: 'canary-coordinator',
  VITE_DEMO_LECTURER_PASSWORD: 'canary-lecturer',
  VITE_DEMO_STUDENT_PASSWORD: 'canary-student',
};

assert.equal(
  createDemoLoginConfig({ ...completeDevelopmentEnvironment, DEV: false }),
  null,
);
assert.equal(
  createDemoLoginConfig({
    ...completeDevelopmentEnvironment,
    VITE_ENABLE_DEMO_LOGIN: 'false',
  }),
  null,
);
assert.equal(
  createDemoLoginConfig({
    ...completeDevelopmentEnvironment,
    VITE_DEMO_STUDENT_PASSWORD: '',
  }),
  null,
);

const config = createDemoLoginConfig(completeDevelopmentEnvironment);
assert.ok(config);
assert.equal(config.admin.email, 'demo.office.admin@example.test');
assert.equal(config.coordinator.email, 'demo.coordinator@example.test');
assert.equal(config.lecturer.email, 'demo.supervisor@example.test');
assert.equal(config.student.email, 'demo.student@example.test');
assert.equal(config.student.user.studentId, 'DEMO-STUDENT-001');
assert.equal(config.admin.password, 'canary-admin');

console.log('demo login configuration tests passed');
