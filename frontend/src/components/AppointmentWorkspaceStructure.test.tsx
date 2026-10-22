import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router';
import {ListState} from './ListState';
import {PanelAssignmentsWorkspace} from './PanelAssignmentsWorkspace';
import {CoordinatorTeamViewSwitch} from './CoordinatorSupervisorWorkspace';
import type {PanelPresentation} from '../utils/panelPresentation';

const record: PanelPresentation = {studentId:'PG001',studentName:'Student One',programme:'Cyber Security',recommendedMember:'Dr Panel',
  recommendedMemberId:'L001',proposedTopic:'Research',submittedDate:'',status:'APPROVED',appointmentDate:'2026-10-02',
  appointmentLifecycle:{appointmentId:11,status:'ACTIVE',endOutcome:null,endReason:null,endedAt:null,endedBy:null,supersedesAppointmentId:null,replacementAppointmentId:null}};
for (const role of ['office','coordinator'] as const) {
  const memory = new Map<string, unknown>([[`PanelAssignments:${role}:grouping`,'student']]);
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/panel-appointments?panelSection=appointments']}>
    <ListState.Provider value={memory}><PanelAssignmentsWorkspace role={role} records={[record]} onOpen={()=>{}}/></ListState.Provider>
  </MemoryRouter>);
  assert.doesNotMatch(html,/By lecturer|By student|Browse assignments by/,'Staff should not choose a browsing mode');
  assert.match(html,/Panel lecturers and their students/,'Obsolete student-mode memory must not bypass lecturer grouping');
  assert.doesNotMatch(html,/Panel student assignments/,'Student rows belong inside a selected lecturer');
  for (const text of ['Current assignments','Past assignments','View students','Find a student or Panel lecturer','Export Excel']) assert.ok(html.includes(text),text);
  assert.match(html,/aria-label="Appointments"/);
  assert.match(html,/<option value="current" selected="">Current assignments<\/option>/);
  assert.doesNotMatch(html,/aria-label="Assignment period"|aria-pressed=/);
}
const supervisor = renderToStaticMarkup(<CoordinatorTeamViewSwitch view="requests" onChange={()=>{}}/>);
assert.match(supervisor,/Current teams/);assert.match(supervisor,/Past appointments/);
assert.match(supervisor,/aria-label="Supervision views"/);assert.match(supervisor,/aria-pressed="true"/);
assert.doesNotMatch(supervisor,/By student|By lecturer|<select/);
console.log('Panel appointments use a Current/Past filter; Supervisor retains its switch and neither has grouping modes');
