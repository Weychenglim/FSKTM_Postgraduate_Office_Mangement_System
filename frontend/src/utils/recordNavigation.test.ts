import assert from 'node:assert/strict';
import { recordBackSteps, recordReturn, recordNavigationState, shouldBlockRecordNavigation, recordFilterParams } from './recordNavigation';
const fallback = { path: '/supervisor-appointments', label: 'Appointment requests' };
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
