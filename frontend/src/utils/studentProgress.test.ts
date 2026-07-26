import assert from 'node:assert/strict';

import {
  formatProgressStatus,
  resolveStudentProgressRecordRoute,
  visibleProgressTabs,
} from './studentProgress';
import {
  APP_ROUTES,
  routeForStudentProgress,
} from '../constants/routes';
import type { StudentProgressDossier } from '../types';

assert.equal(
  routeForStudentProgress('DOSSIER / 001'),
  '/dashboard/progress/DOSSIER%20%2F%20001',
);
assert.equal(routeForStudentProgress(), APP_ROUTES.dashboardProgress);
assert.equal(formatProgressStatus('FACULTY_PROCESSING'), 'Faculty Processing');
assert.equal(formatProgressStatus(null), '—');

assert.equal(
  resolveStudentProgressRecordRoute({
    targetModule: 'SUPERVISOR_APPOINTMENTS',
    recordType: 'SUPERVISOR_APPLICATION',
    recordId: '17',
  }),
  '/supervisor-appointments/17',
);
assert.equal(
  resolveStudentProgressRecordRoute({
    targetModule: 'PANEL_APPOINTMENTS',
    recordType: 'PANEL_RECOMMENDATION',
    recordId: null,
  }),
  APP_ROUTES.panelAppointments,
);
assert.equal(
  resolveStudentProgressRecordRoute({
    targetModule: 'MARKS',
    recordType: 'MARK_TASK',
    recordId: '9',
  }),
  APP_ROUTES.marks,
);

const sections = [
  'SUPERVISOR',
  'PANEL',
  'TIMELINE',
] satisfies StudentProgressDossier['visibleSections'];
assert.deepEqual(
  visibleProgressTabs(sections),
  ['OVERVIEW', 'SUPERVISOR', 'PANEL', 'TIMELINE'],
);

console.log('studentProgress tests passed');
