import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as supervisor from './SupervisorWorkloadMonitoring';
import { getPanelWorkloadPage, PanelWorkloadDetails } from './PanelWorkloadMonitoring';
import type { SupervisorWorkloadRecord, PanelWorkloadRecord } from '../types';

const base: SupervisorWorkloadRecord = { lecturerId: 'L1', lecturerName: 'Dr Example', department: 'Computing', currentStudents: 2, workloadLimit: 0, availability: 'Full Load', capacityState: 'NOT_CONFIGURED', email: 'example@example.test', supervisees: [] };
assert.equal(typeof supervisor.getSupervisorWorkloadPage, 'function', 'Supervisor needs authoritative immediate filtering and bounded paging');
assert.equal(typeof supervisor.SupervisorWorkloadDetails, 'function', 'Supervisor details must distinguish missing policy from zero');
const records = Array.from({length: 7}, (_, index) => ({...base, lecturerId: `L${index}`, capacityState: index === 6 ? 'FULL' : 'NOT_CONFIGURED'} as SupervisorWorkloadRecord));
const all = supervisor.getSupervisorWorkloadPage(records, {search:'', department:'', status:''}, 1, 10);
assert.equal(all.counts.NOT_CONFIGURED, 6, 'Six missing policies must not become Full Load');
assert.equal(all.counts.FULL, 1);
assert.equal(supervisor.getSupervisorWorkloadPage(records, {search:'', department:'', status:'FULL'}, 1, 10).total, 1, 'Filter must agree with authoritative rows');
const many = Array.from({length: 73}, (_, index) => ({...base, lecturerId: `L${index}`}));
for (const size of [10,25,50]) {
  const page = supervisor.getSupervisorWorkloadPage(many, {search:'', department:'', status:''}, 2, size);
  assert.equal(page.size, size); assert.equal(page.filtered.length, 73, 'Export scope must retain all matching pages');
  assert.equal(page.rows[0].lecturerId, `L${size}`);
}
assert.equal(supervisor.getSupervisorWorkloadPage(many, {search:'L72', department:'', status:''}, 8, 25).page, 1);
const missing = renderToStaticMarkup(<supervisor.SupervisorWorkloadDetails record={base} />);
assert.match(missing, /Not configured/);
assert.doesNotMatch(missing, /Capacity utilization: 0%/);
const zero = renderToStaticMarkup(<supervisor.SupervisorWorkloadDetails record={{...base, capacityState:'FULL', semesterCode:'2026-S1', capacityPlanVersion:1, supervisees:[{id:'S1',name:'Synthetic primary',programme:'Computing',status:'ACTIVE',topic:'Research',appointmentDate:'2026-10-01',supervisionRole:'PRIMARY'}, {id:'S2',name:'Synthetic supporting',programme:'Computing',status:'ACTIVE',topic:'Research',appointmentDate:'2026-10-01',supervisionRole:'CO_SUPERVISOR'}]}} />);
assert.match(zero, /Primary appointments/); assert.match(zero, /Supporting appointments/);
assert.doesNotMatch(zero, /Capacity is not configured/);
const panel: PanelWorkloadRecord = {id:'L1',name:'Panel example',department:'Computing',initials:'PE',currentStudents:3,workloadLimit:0,confirmedAppointments:2,pendingNominations:1,availability:'Full Load',capacityState:'NOT_CONFIGURED',workloadItems:[]};
assert.equal(getPanelWorkloadPage([panel], {search:'',department:'',status:'FULL'},1,10).total,0);
assert.match(renderToStaticMarkup(<PanelWorkloadDetails record={panel}/>), /Not configured/);
console.log('Management workload authoritative state, missing policy, role counts and all-filtered paging tests passed');
