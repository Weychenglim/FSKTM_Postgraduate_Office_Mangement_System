import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { SupervisorWorkspaceNavigation } from './SupervisorWorkspaceNavigation';
import { WorkspaceRecordTable } from './RequestWorkspacePrimitives';
import { ResearchAmendmentRouteContent } from './ResearchAmendments';

for (const role of ['Office Staff/Admin', 'Programme Coordinator'] as const) {
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/supervisor-appointments/supervisees']}><SupervisorWorkspaceNavigation role={role} /></MemoryRouter>);
  assert.match(html, /aria-current="page"[^>]*>Supervisory teams/);
  assert.match(html, role === 'Office Staff/Admin' ? /Appointment records/ : /Appointment requests/);
  assert.match(html, /Research changes/);
  assert.doesNotMatch(html, /My supervisees/);
}
const studentTable = renderToStaticMarkup(<WorkspaceRecordTable identityLabel="Supervisor" label="Applications" rows={[{ key:1, studentName:'Dr Example', matricNo:'', status:'Awaiting Supervisor review', waitingDays:2, actionLabel:'View request' }]} />);
assert.match(studentTable, /<th[^>]*>Supervisor<\/th>/);
assert.match(studentTable, /Dr Example/);
assert.match(studentTable, /Waiting at this stage/);

const options:any = {students:[],profile:{title:'Current title',abstract:'Current abstract',programme:'Programme',revision:1},canSubmitResearch:false,canCorrect:false,canTransfer:false};
const row:any = {id:1,kind:'RESEARCH',status:'PENDING_SUPERVISOR',studentName:'Ongoing student',matricNo:'M1',createdAt:'2026-10-10T00:00:00Z',before:{title:'Title',abstract:'Old',programme:'Programme'},after:{title:'Title',abstract:'New',programme:'Programme'},canDecide:false,canCancel:false,events:[]};
for (const role of ['Student','Office Staff/Admin','Programme Coordinator'] as const) {
  const render=(requestView:'requests'|'history')=>renderToStaticMarkup(<ResearchAmendmentRouteContent role={role} routeView="list" options={options} rows={[row,{...row,id:2,status:'REJECTED_BY_COORDINATOR',studentName:'Final student'}]} revisions={[]} busy={false} requestView={requestView} requestPageSize={10} onRequestPageSize={()=>{}} requestForm={null} onAction={()=>{}} />);
  assert.match(render('requests'), /<table/);
  assert.doesNotMatch(render('requests'), /Final student/);
  assert.doesNotMatch(render('history'), /Ongoing student/);
  assert.match(render('history'), /aria-label="Not applicable"/);
  assert.doesNotMatch(render('requests'), /Old|>New<|>Approve</);
}
console.log('All roles share navigation, request tables and terminal research history without comparisons in lists');
