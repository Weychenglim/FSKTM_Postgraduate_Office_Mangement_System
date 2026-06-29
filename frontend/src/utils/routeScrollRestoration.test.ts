import assert from 'node:assert/strict';
import { shouldResetWindowScroll } from './routeScrollRestoration';

assert.equal(
  shouldResetWindowScroll(null, { pathname: '/dashboard', search: '', hash: '' }),
  true,
);

assert.equal(
  shouldResetWindowScroll(
    { pathname: '/panel-appointments', search: '', hash: '' },
    { pathname: '/panel-appointments/records/PANEL-001', search: '', hash: '' },
  ),
  true,
);

assert.equal(
  shouldResetWindowScroll(
    { pathname: '/marks/records', search: '?status=all', hash: '' },
    { pathname: '/marks/records', search: '?status=pending', hash: '' },
  ),
  true,
);

assert.equal(
  shouldResetWindowScroll(
    { pathname: '/dashboard', search: '', hash: '#timeline' },
    { pathname: '/dashboard', search: '', hash: '#tasks' },
  ),
  false,
);

console.log('route scroll restoration tests passed');
