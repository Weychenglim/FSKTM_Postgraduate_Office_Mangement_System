import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {PanelPresentation} from './panelPresentation';

const module = await import('./panelAssignments').catch(() => null);
assert.ok(module, 'Staff Panel assignments need shared confirmed-record filtering and lecturer grouping');
const {filterPanelAssignments, groupPanelAssignments} = module;
const active: PanelPresentation = {id:1, studentId:'PG001', studentName:'Aisha', programme:'Cyber Security', semester:'S1',
  proposedTopic:'Security', recommendedMember:'Dr Same Name', recommendedMemberId:'L001', status:'APPROVED', submittedDate:'',
  appointmentDate:'2026-10-02', appointmentLifecycle:{appointmentId:11,status:'ACTIVE',endOutcome:null,endReason:null,endedAt:null,endedBy:null,supersedesAppointmentId:null,replacementAppointmentId:null}};
const second: PanelPresentation = {...active,id:2,studentId:'PG002',studentName:'Ben',appointmentLifecycle:{...active.appointmentLifecycle!,appointmentId:12}};
const other: PanelPresentation = {...active,id:3,studentId:'PG003',programme:'Data Science',recommendedMemberId:'L002',appointmentLifecycle:{...active.appointmentLifecycle!,appointmentId:13}};
const past: PanelPresentation = {...active,id:4,appointmentLifecycle:{...active.appointmentLifecycle!,appointmentId:14,status:'ENDED',endOutcome:'REPLACED',endedAt:'2026-10-18T08:00:00Z'}};
const pending: PanelPresentation = {...active,id:5,status:'PENDING_COORDINATOR',appointmentLifecycle:null};
const rejected: PanelPresentation = {...active,id:6,status:'REJECTED_BY_PANEL',appointmentLifecycle:null};

test('assignment lifecycles exclude requests and deduplicate immutable appointment identities', () => {
  const rows=[active,second,other,past,pending,rejected,{...active}];
  assert.deepEqual(filterPanelAssignments(rows,{view:'current'}).map(row=>row.appointmentLifecycle!.appointmentId).sort(),[11,12,13]);
  assert.deepEqual(filterPanelAssignments(rows,{view:'past'}).map(row=>row.id),[4]);
  assert.equal(rows.length,7,'Filtering must not mutate authorised input');
});
test('same-name lecturers stay separate and student counts differ from historical assignment counts', () => {
  const groups=groupPanelAssignments([active,second,other]);
  assert.equal(groups.length,2);
  assert.equal(groups.find(group=>group.staffNo==='L001')!.studentCount,2);
  const repeated={...past,id:7,appointmentLifecycle:{...past.appointmentLifecycle!,appointmentId:15}};
  const historical=groupPanelAssignments([past,repeated])[0];
  assert.equal(historical.studentCount,1);assert.equal(historical.assignmentCount,2);
});
test('search, programme, lecturer identity and appointment dates filter before grouping', () => {
  assert.equal(groupPanelAssignments(filterPanelAssignments([active,second,other],{q:'PG002'}))[0].studentCount,1);
  assert.equal(filterPanelAssignments([active,second,other],{programme:'Cyber Security'}).length,2);
  assert.equal(filterPanelAssignments([active,other],{q:'l002'})[0].id,3);
  assert.equal(filterPanelAssignments([active,other],{lecturer:'staff:l002'})[0].id,3);
  assert.equal(filterPanelAssignments([active],{from:'2026-10-03'}).length,0);
  assert.equal(filterPanelAssignments([active],{to:'2026-10-02'}).length,1);
});
test('missing lecturer identifiers cannot merge unrelated people with matching names', () => {
  const groups=groupPanelAssignments([{...active,recommendedMemberId:''},{...second,recommendedMemberId:''}]);
  assert.equal(groups.length,2);
  assert.notEqual(groups[0].key,groups[1].key);
});
