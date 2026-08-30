import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { routeForPanelRecommendationStart } from '../constants/routes';
import { getPanelReadinessCopy } from './panelReadiness';

assert.equal(
  routeForPanelRecommendationStart('DEMO STUDENT/001'),
  '/panel-appointments?student=DEMO%20STUDENT%2F001',
);
assert.match(
  getPanelReadinessCopy('SUPERVISOR_REQUIRED').title,
  /supervisor appointment/i,
);
assert.match(
  getPanelReadinessCopy('SUPERVISOR_APPROVAL_PENDING').detail,
  /approval/i,
);
assert.match(
  getPanelReadinessCopy('READY_FOR_PANEL_RECOMMENDATION').detail,
  /supervisor.*recommend/i,
);
assert.match(
  getPanelReadinessCopy('FACULTY_PROCESSING').detail,
  /faculty/i,
);
assert.match(getPanelReadinessCopy('CONFIRMED').title, /confirmed/i);

const applicationForm = readFileSync(
  resolve('src/components/SupervisorAppointmentApplicationPage.tsx'),
  'utf8',
);
const superviseeDetail = readFileSync(
  resolve('src/components/ActiveSuperviseeDetail.tsx'),
  'utf8',
);
const coordinator = readFileSync(
  resolve('src/components/CoordinatorSupervisorApprovals.tsx'),
  'utf8',
);

assert.match(applicationForm, /research-area-input/);
assert.match(applicationForm, /Provide your research area/);
assert.match(superviseeDetail, /Recommend Panel/);
assert.match(coordinator, /researchProfileReady/);

console.log('research profile handoff tests passed');
