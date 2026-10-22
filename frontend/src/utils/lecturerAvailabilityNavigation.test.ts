import assert from 'node:assert/strict';
import {APP_ROUTES,isKnownAppPath,sidebarItemForPath} from '../constants/routes';
assert.equal(isKnownAppPath('/dashboard/my-availability'),true);
assert.equal(APP_ROUTES.dashboardMyAvailability,'/dashboard/my-availability');
assert.equal(sidebarItemForPath(APP_ROUTES.dashboardMyAvailability),sidebarItemForPath(APP_ROUTES.dashboard));
console.log('Lecturer self availability route belongs to Dashboard');
