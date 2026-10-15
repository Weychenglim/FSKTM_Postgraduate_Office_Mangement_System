import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { StaffAccountChange, StaffAccountPage, StaffWorkItem } from '../types';
import { SIDEBAR_ITEMS } from '../constants/navigation';
import { APP_ROUTES, isKnownAppPath, routeForStaffAccount, sidebarItemForPath } from '../constants/routes';
import { staffListQuery } from '../services/staffAccountsApi';
import {
  capacityLine,
  capacityNeedsLimit,
  dutyHasWork,
  dutyWorkLine,
  existingAccountPath,
  existingAccountText,
  historyLine,
  initials,
  leftoverLimits,
  programmeName,
  roleLine,
  waitingLine,
  workLabel,
} from './staffAccounts';

const DS = 'MASTER OF DATA SCIENCE (COURSEWORK)';

// the second line under a name says what the person does
assert.equal(roleLine({ role: 'Lecturer', duties: ['Supervisor', 'Panel'], programme: '', department: 'AI' }), 'Supervisor, Panel member');
assert.equal(roleLine({ role: 'Lecturer', duties: [], programme: '', department: 'AI' }), 'No duties yet');
assert.equal(roleLine({ role: 'Programme Coordinator', duties: [], programme: DS, department: 'AI' }), 'Master of Data Science (Coursework)');
assert.equal(roleLine({ role: 'Programme Coordinator', duties: [], programme: '', department: 'AI' }), 'No programme');
assert.equal(roleLine({ role: 'Office Staff/Admin', duties: [], programme: '', department: 'Postgraduate Office' }), 'Postgraduate Office');
assert.equal(programmeName(DS), 'Master of Data Science (Coursework)');
assert.equal(programmeName(''), '');

// open work reads as plain words, one and many
assert.equal(workLabel({ key: 'activeSupervisorAppointments', count: 1 }), '1 active supervisee');
assert.equal(workLabel({ key: 'activeSupervisorAppointments', count: 3 }), '3 active supervisees');
assert.equal(workLabel({ key: 'unfinishedMarksTasks', count: 2 }), '2 marks tasks not submitted');
assert.equal(workLabel({ key: 'managedProgrammes', count: 1 }), 'The programme they coordinate');
assert.equal(workLabel({ key: 'somethingNew', count: 2 }), '2 open items');

// every count the backend can send has its own words
const backend = (path: string) => readFileSync(resolve('..', 'backend', path), 'utf8');
const lifecycle = backend('accounts/participant_lifecycle.py');
const blockerBody = lifecycle.slice(lifecycle.indexOf('def lecturer_blockers'), lifecycle.indexOf('def _audit_row'));
const service = backend('accounts/staff_accounts.py');
const dutyBody = service.slice(service.indexOf('def duty_work'), service.indexOf('def capacity_summary'));
const keys = new Set([...`${blockerBody}${dutyBody}`.matchAll(/"([a-zA-Z]+)":/g)].map(match => match[1]));
assert.ok(keys.size >= 9, `found ${keys.size} work keys`);
for (const key of keys) {
  assert.doesNotMatch(workLabel({ key, count: 2 }), /open items$/, `${key} needs words in utils/staffAccounts.ts`);
}
for (const status of ['ACTIVE', 'NOT_ACTIVATED', 'SIGN_IN_OFF']) assert.match(service, new RegExp(`${status} = "${status}"`));

// the Duties box shows each duty's own work
const work: StaffWorkItem[] = [
  { key: 'activeSupervisorAppointments', count: 3 },
  { key: 'pendingSupervisorApplications', count: 1 },
  { key: 'unfinishedMarksTasks', count: 2 },
];
assert.equal(dutyWorkLine('Supervisor', work), '3 active supervisees, 1 supervisor request waiting');
assert.equal(dutyWorkLine('Panel', work), 'No open work');
assert.equal(dutyHasWork('Supervisor', work), true);
assert.equal(dutyHasWork('Panel', work), false);

// the capacity line follows Lecturer capacity
const capacity = (duties: NonNullable<StaffAccountPage['capacity']>['duties']): StaffAccountPage['capacity'] => ({ semester: 'Semester I 2026/2027', duties });
assert.equal(
  capacityLine(capacity([{ duty: 'Supervisor', state: 'AVAILABLE', limit: 5, load: 3 }, { duty: 'Panel', state: 'FULL', limit: 4, load: 4 }])),
  'Supervisor 3 of 5 · Panel member 4 of 4',
);
assert.equal(capacityLine(capacity([{ duty: 'Supervisor', state: 'NOT_CONFIGURED', limit: null, load: 0 }])), 'Supervisor: no limit set yet');
assert.equal(capacityLine(capacity([{ duty: 'Supervisor', state: 'TEMPORARILY_UNAVAILABLE', limit: 5, load: 1 }])), 'Supervisor 1 of 5 (away)');
assert.equal(capacityLine({ semester: null, duties: [] }), '');
assert.equal(capacityLine(null), '');
assert.equal(capacityNeedsLimit(capacity([{ duty: 'Panel', state: 'NOT_CONFIGURED' }])), true);
assert.equal(capacityNeedsLimit(capacity([{ duty: 'Panel', state: 'AVAILABLE', limit: 2, load: 0 }])), false);
const leftover = capacity([{ duty: 'Supervisor', state: 'AVAILABLE', limit: 5, load: 0 }, { duty: 'Panel', state: 'LIMIT_WITHOUT_DUTY' }]);
assert.deepEqual(leftoverLimits(leftover), ['Panel']);
assert.equal(capacityLine(leftover), 'Supervisor 0 of 5');

// history rows read as sentences
const change = (action: string, details: Record<string, unknown> = {}): StaffAccountChange => ({ id: 1, action, actor: 'Siti', at: '2026-10-15T02:00:00Z', details });
assert.deepEqual(historyLine(change('CREATED', { role: 'Lecturer', duties: ['Supervisor'] })), { title: 'Account created', detail: 'as Lecturer (Supervisor)' });
assert.deepEqual(historyLine(change('CREATED', { role: 'Programme Coordinator', programme: DS })), { title: 'Account created', detail: 'as Programme coordinator (Master of Data Science (Coursework))' });
assert.deepEqual(historyLine(change('CREATED', { role: 'Office Staff/Admin' })), { title: 'Account created', detail: 'as Office staff' });
assert.deepEqual(historyLine(change('DETAILS_EDITED', { changes: [{ field: 'phone' }, { field: 'researchArea' }] })), { title: 'Details changed', detail: 'Phone, Research area' });
assert.deepEqual(historyLine(change('EMAIL_CHANGED', { from: 'a@x.my', to: 'b@x.my' })), { title: 'Email changed', detail: 'from a@x.my to b@x.my' });
assert.deepEqual(historyLine(change('DUTIES_CHANGED', { from: ['Supervisor'], to: [] })), { title: 'Duties changed', detail: 'now none' });
assert.deepEqual(historyLine(change('DUTIES_CHANGED', { to: ['Supervisor', 'Panel'] })), { title: 'Duties changed', detail: 'now Supervisor, Panel member' });
assert.deepEqual(historyLine(change('PROGRAMME_CHANGED', { from: DS, to: '' })), { title: 'Programme changed', detail: 'now no programme' });
assert.deepEqual(historyLine(change('SIGN_IN_OFF', { reason: 'Study leave' })), { title: 'Sign-in turned off', detail: '"Study leave"' });
assert.deepEqual(historyLine(change('SIGN_IN_ON')), { title: 'Sign-in turned back on', detail: '' });
assert.deepEqual(historyLine(change('LINK_SENT', { kind: 'activation', sent: true })), { title: 'Activation email sent', detail: '' });
assert.deepEqual(historyLine(change('LINK_SENT', { kind: 'reset', sent: false })), { title: 'Password reset link could not be sent', detail: '' });
assert.deepEqual(historyLine(change('LINK_COPIED')), { title: 'Activation link copied', detail: '' });
assert.deepEqual(historyLine(change('DELETED')), { title: 'Account deleted', detail: '' });
const models = backend('accounts/models.py');
const actions = models.slice(models.indexOf('class AccountChange(models.Model)'));
const actionNames = [...actions.slice(0, actions.indexOf('account = models')).matchAll(/([A-Z_]+) = "\1"/g)].map(match => match[1]);
assert.equal(actionNames.length, 10);
for (const action of actionNames) {
  assert.notEqual(historyLine(change(action)).title, action, `${action} needs words in historyLine`);
}

// a programme move says what waits where
assert.equal(waitingLine({ supervisorRequests: 2, coSupervisorNominations: 0, panelNominations: 1, amendments: 1, total: 4 }), '2 supervisor requests, 1 panel nomination, 1 research change');
assert.equal(waitingLine({ supervisorRequests: 0, coSupervisorNominations: 0, panelNominations: 0, amendments: 0, total: 0 }), 'nothing');

// a duplicate links to the account holding it, if the office can open it here
assert.equal(existingAccountPath({ kind: 'staff', id: '12', name: 'Dr Aziz' }, APP_ROUTES.registryStaff), '/registry/staff/12');
assert.equal(existingAccountPath({ kind: 'student', id: 'S1', name: 'Ali' }, APP_ROUTES.registryStaff), null);
assert.equal(existingAccountText({ kind: 'student', id: 'S1', name: 'Ali' }), 'It belongs to the student Ali (S1).');
assert.equal(existingAccountText({ kind: 'other' }), 'It belongs to an account that is not managed here.');

assert.equal(initials('Assoc. Prof. Dr. Tan Mei Ling'), 'TM');
assert.equal(initials('Siti Khadijah Omar'), 'SK');
assert.equal(initials('Dr.'), 'ST');

// the list asks only for what is set
assert.equal(staffListQuery({ search: '', role: '', status: '', page: 1 }), '');
assert.equal(staffListQuery({ search: ' Aziz ', role: 'LECTURER', status: 'NOT_ACTIVATED', page: 2 }), '?search=Aziz&role=LECTURER&status=NOT_ACTIVATED&page=2');

// each screen has its own address under the Registry
assert.equal(routeForStaffAccount('12'), '/registry/staff/12');
assert.equal(sidebarItemForPath(APP_ROUTES.registryStaff), SIDEBAR_ITEMS.REGISTRY);
assert.equal(sidebarItemForPath('/registry/staff/12'), SIDEBAR_ITEMS.REGISTRY);
assert.equal(isKnownAppPath(APP_ROUTES.registryStaffNew), true);

// only the office reaches the staff screens, and the mock is gone
const app = readFileSync(resolve('src/App.tsx'), 'utf8');
assert.match(app, /const StaffLecturersRegistry = lazyNamed\('StaffLecturersRegistry'/);
assert.match(app, /isStaffRoute && currentUser\.role !== 'Office Staff\/Admin' \? \(\s*<Navigate to=\{APP_ROUTES\.registry\} replace \/>/);
const registry = readFileSync(resolve('src/components/StudentRegistry.tsx'), 'utf8');
assert.doesNotMatch(registry, /StaffLecturersRegistry/);
for (const file of ['StaffLecturersRegistry', 'StaffAccountForm', 'StaffAccountPage', 'StaffAccountDialogs']) {
  const source = readFileSync(resolve(`src/components/${file}.tsx`), 'utf8');
  assert.doesNotMatch(source, /mocks\/|<select\b|MOCK_/, `${file} uses live data and SelectMenu`);
}

// a dropdown inside a dialog (Change programme) opens inside that dialog, so it can be clicked
assert.match(readFileSync(resolve('src/components/SelectMenu.tsx'), 'utf8'), /triggerRef\.current\?\.closest\('dialog'\) \?\? document\.body/);

console.log('staffAccounts.test.ts passed');
