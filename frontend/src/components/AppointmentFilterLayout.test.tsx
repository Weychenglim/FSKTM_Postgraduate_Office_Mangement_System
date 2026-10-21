import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router';
import {ListState} from './ListState';
import {CoordinatorFiltersBar, useCoordinatorFilters} from './CoordinatorBrowsePrimitives';
import {PanelAssignmentsWorkspace} from './PanelAssignmentsWorkspace';
import {RequestFilters} from './RequestWorkspacePrimitives';
import {PanelBrowse} from './PanelBrowse';
import type {PanelPresentation} from '../utils/panelPresentation';

const row: PanelPresentation = {studentId:'PG1',studentName:'Student One',programme:'Computing',semester:'S1',recommendedMember:'Dr Panel',recommendedMemberId:'L1',proposedTopic:'Research',submittedDate:'2026-10-01',status:'APPROVED',appointmentDate:'2026-10-02',appointmentLifecycle:{appointmentId:1,status:'ACTIVE',endOutcome:null,endReason:null,endedAt:null,endedBy:null,supersedesAppointmentId:null,replacementAppointmentId:null}};
const render = (node:React.ReactNode, memory=new Map<string,unknown>()) => renderToStaticMarkup(<MemoryRouter><ListState.Provider value={memory}>{node}</ListState.Provider></MemoryRouter>);
function Bar({single=false}:{single?:boolean}) {
  const filters=useCoordinatorFilters('filter-test');
  return <CoordinatorFiltersBar filters={filters} requests facets={{programmes:['Computing'],semesters:['S1'],statuses:['PENDING_COORDINATOR']}} includeEndDate={false} sortOptions={single?[['name','Student name']]:undefined}/>;
}
const bar=render(<Bar/>);
assert.doesNotMatch(bar,/Record results|sm:col-span-2/,'Keep the original compact grid');
assert.match(bar,/Submitted on or after/);
assert.match(bar,/Sort by/);
assert.doesNotMatch(bar,/on or before/);
assert.doesNotMatch(render(<Bar single/>),/Sort by/,'Single-option sorting is removed');
for(const role of ['office','coordinator'] as const) {
  const html=render(<PanelAssignmentsWorkspace role={role} records={[row]} onOpen={()=>{}}/>,new Map([[`PanelAssignments:${role}:status`,'ENDED'],[`PanelAssignments:${role}:to`,'2020-01-01']]));
  assert.match(html,/Student One|View students/,'A removed current-status control cannot leave a hidden stale filter');
  assert.doesNotMatch(html,/>Status<|>Appointment status<\/label>/);
  assert.match(html,/Active students/);
  assert.match(html,/Started on or after/);
  assert.doesNotMatch(html,/on or before/);
  assert.match(html,/data-workspace-filter-card/);
  const past=render(<PanelAssignmentsWorkspace role={role} records={[{...row,appointmentLifecycle:{...row.appointmentLifecycle!,status:'ENDED'}}]} onOpen={()=>{}}/>,new Map([[`PanelAssignments:${role}:view`,'past']]));
  assert.match(past,/Appointment status/,'Past Panel lifecycle choices remain available');
}
const panel=render(<PanelBrowse scope="filter-layout" title="Requests" records={[row]} onOpen={()=>{}}/>);
assert.match(panel,/Status/);
assert.doesNotMatch(panel,/on or before/);
assert.match(panel,/data-workspace-filter-card/);
const personal=render(<RequestFilters search="" onSearch={()=>{}}/>);
assert.match(personal,/Clear filters/,'Lecturer/Student search-only cards always offer Clear filters');
assert.match(personal,/data-workspace-filter-card/);
assert.doesNotMatch(panel,/Record results|sm:col-span-2/,'Preserve existing filter layout');
console.log('Redundant dropdowns removed without changing the existing filter layout; stale current status ignored');

const resets: Record<string,string>={};
const personalControls=RequestFilters({search:'x',onSearch:value=>{resets.q=value;},onType:value=>{resets.type=value;},onStatus:value=>{resets.status=value;},onSemester:value=>{resets.semester=value;},onFrom:value=>{resets.from=value;}});
personalControls.props.onReset();
assert.deepEqual(resets,{q:'',type:'all',status:'',semester:'',from:''});
