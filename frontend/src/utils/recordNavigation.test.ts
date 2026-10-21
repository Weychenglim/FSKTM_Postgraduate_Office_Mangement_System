import assert from 'node:assert/strict';
import { recordBackSteps, recordReturn, recordNavigationState, shouldBlockRecordNavigation, recordFilterParams, recordSourceLabel } from './recordNavigation';
const fallback = { path: '/supervisor-appointments', label: 'Appointment requests' };
assert.equal(recordSourceLabel('/supervisor-appointments/student-PG1'), 'Supervisor appointment overview');
assert.equal(recordSourceLabel('/panel-appointments/records/profile-12'), 'Panel appointment overview');
assert.equal(recordSourceLabel('/panel-appointments', '?panelSection=appointments'), 'Panel assignments');
assert.equal(recordSourceLabel('/panel-appointments', '?panelSection=appointments&panelLecturer=staff%3Al001'), 'Panel students');
assert.equal(recordSourceLabel('/panel-appointments', '?panelSection=requests&panelLecturer=staff%3Al001'), 'Panel Appointments');
assert.deepEqual(recordReturn({path:'/supervisor-appointments/student-PG1?programme=Computing',label:'Supervisor appointment overview',historyIndex:2},fallback,'/supervisor-appointments'),{path:'/supervisor-appointments/student-PG1?programme=Computing',label:'Supervisor appointment overview',historyIndex:2});
for (const value of [null, {}, { path: 'https://evil.test', label: 'Requests' }, { path: '//evil.test', label: 'Requests' }, { path: '/marks', label: 'Requests' }, { path: '/supervisor-appointments/research-changes/2/extra', label: 'Requests' }, {path:'/supervisor-appointments\\evil',label:'Requests'}]) {
  assert.deepEqual(recordReturn(value, fallback, '/supervisor-appointments'), fallback);
}
assert.deepEqual(recordReturn({ path:'/supervisor-appointments/research-changes?view=history&q=M123&page=3&size=25', label:'Research changes' }, fallback, '/supervisor-appointments'), {path:'/supervisor-appointments/research-changes?view=history&q=M123&page=3&size=25', label:'Research changes'});
assert.deepEqual(recordNavigationState('/supervisor-appointments?type=supporting&page=2', 'Appointment requests'), {recordReturn:{path:'/supervisor-appointments?type=supporting&page=2',label:'Appointment requests'}});
console.log('Record return targets reject external/unknown/other-module paths and retain list context');
assert.equal(recordBackSteps(5, {path:'/supervisor-appointments?view=history',label:'Appointment requests',historyIndex:2}), 3, 'Nested detail/profile navigation returns to the actual originating entry');
for (const historyIndex of [undefined, -1, 6, Number.NaN, 2.5]) assert.equal(recordBackSteps(5, {...fallback,historyIndex}), 0, 'Missing or invalid history context uses explicit owning-list navigation');

assert.equal(shouldBlockRecordNavigation(true, false, false), true, 'Unsaved edits block navigation');
assert.equal(shouldBlockRecordNavigation(false, true, false), true, 'In-flight operations block navigation');
assert.equal(shouldBlockRecordNavigation(true, true, true), false, 'A completed save may redirect before pending state commits');
assert.equal(shouldBlockRecordNavigation(true, true, false, 'editor', 'editor'), false, 'The initial local entry is permitted');
assert.equal(shouldBlockRecordNavigation(true, true, false, 'editor', 'other'), true, 'Other records remain guarded');
const origin = new URLSearchParams('view=history&q=M123&page=3&size=25&student=4');
assert.equal(recordFilterParams(origin, 'profileStudent', '8').toString(), 'view=history&q=M123&page=3&size=25&student=4&profileStudent=8');
assert.equal(recordFilterParams(origin, 'q', 'Demo').toString(), 'view=history&q=Demo&size=25&student=4');
assert.equal(recordFilterParams(origin, 'size', '50').toString(), 'view=history&q=M123&size=50&student=4');

const {recordPathWithSearch}=await import('./recordNavigation');
assert.equal(recordPathWithSearch('/panel-appointments/assignments/PG1?appointment=12','?panelSection=appointments'),'/panel-appointments/assignments/PG1?panelSection=appointments&appointment=12');
assert.equal(recordPathWithSearch('/panel-appointments/assignments/PG1?appointment=12','?appointment=4&q=PG1'),'/panel-appointments/assignments/PG1?appointment=12&q=PG1','The exact destination appointment wins over old list query state');
assert.equal(recordPathWithSearch('/panel-appointments/recommendations/8',''),'/panel-appointments/recommendations/8');

const { studentSupervisorRequestReturn } = await import('./recordNavigation');
assert.equal(typeof studentSupervisorRequestReturn, 'function', 'Student request navigation must capture the actual overview or Applications source');
const applicationFallback = {path: '/supervisor-appointments/applications', label: 'Applications'};
const studentSources = [
  {pathname: '/supervisor-appointments', search: '', state: undefined, index: 2, want: {path: '/supervisor-appointments', label: 'My supervisors', historyIndex: 2}},
  {pathname: '/supervisor-appointments/applications', search: '?view=history&q=M123&page=3&size=25', state: undefined, index: 4, want: {path: '/supervisor-appointments/applications?view=history&q=M123&page=3&size=25', label: 'Applications', historyIndex: 4}},
  {pathname: '/supervisor-appointments/17', search: '', state: undefined, index: 0, want: applicationFallback},
  {pathname: '/supervisor-appointments/17', search: '', state: {path: 'https://evil.test', label: 'Overview'}, index: 3, want: applicationFallback},
  {pathname: '/supervisor-appointments/17', search: '', state: {path: '/marks', label: 'Overview'}, index: 3, want: applicationFallback},
  {pathname: '/supervisor-appointments/17', search: '', state: {}, index: 3, want: applicationFallback},
];
for (const fixture of studentSources) {
  const source = studentSupervisorRequestReturn(fixture.pathname, fixture.search, fixture.state, fixture.index);
  assert.deepEqual(source, fixture.want);
  assert.deepEqual(studentSupervisorRequestReturn('/supervisor-appointments/17', '', source, (fixture.index ?? 0) + 1), fixture.want, 'Exact request retains its validated source and filters');
}
assert.equal(recordBackSteps(3, studentSources[0].want), 1, 'Overview source uses the actual history entry');
