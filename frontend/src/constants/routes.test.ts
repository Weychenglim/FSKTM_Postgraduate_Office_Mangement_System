import assert from 'node:assert/strict';
import { SIDEBAR_ITEMS } from './navigation';
import {
  APP_ROUTES,
  isKnownAppPath,
  routeForNotificationTarget,
  routeForSidebarItem,
  sidebarItemForPath,
} from './routes';

assert.equal(routeForSidebarItem(SIDEBAR_ITEMS.DASHBOARD), APP_ROUTES.dashboard);
assert.equal(routeForSidebarItem(SIDEBAR_ITEMS.MARKS_ENTRY), APP_ROUTES.marks);
assert.equal(routeForSidebarItem(SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS), APP_ROUTES.supervisorAppointments);

assert.equal(sidebarItemForPath('/marks/records/MARK-001'), SIDEBAR_ITEMS.MARKS_ENTRY);
assert.equal(sidebarItemForPath('/dashboard/timeline'), SIDEBAR_ITEMS.DASHBOARD);
assert.equal(sidebarItemForPath('/panel-appointments/recommendations/7'), SIDEBAR_ITEMS.PANEL_APPOINTMENTS);
assert.equal(isKnownAppPath('/marks/records/MARK-001'), true);
assert.equal(isKnownAppPath('/not-a-real-route'), false);

assert.equal(
  routeForNotificationTarget({
    targetModule: 'SUPERVISOR_APPOINTMENTS',
    recordType: 'SUPERVISOR_APPLICATION',
    recordId: '42',
  }),
  '/supervisor-appointments/42',
);

assert.equal(
  routeForNotificationTarget({
    targetModule: 'PANEL_APPOINTMENTS',
    recordType: 'PANEL_RECOMMENDATION',
    recordId: '7',
  }),
  '/panel-appointments/recommendations/7',
);

assert.equal(routeForNotificationTarget({ targetModule: 'UNKNOWN' }), APP_ROUTES.notifications);

console.log('routes tests passed');
