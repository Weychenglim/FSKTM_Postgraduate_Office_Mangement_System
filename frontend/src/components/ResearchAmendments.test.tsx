import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as research from './ResearchAmendments';
const { ResearchAmendmentCard, ResearchAmendmentForm, ResearchRevisionCard } = research;
const row: any = { id: 1, kind: 'TRANSFER', status: 'PENDING_SOURCE_COORDINATOR', studentName: 'Student One', matricNo: 'M123', sourceProgramme: 'Old programme', destinationProgramme: 'New programme', before: {title:'Old title',abstract:'Old abstract',programme:'Old programme'}, after: {title:'New title',abstract:'New abstract',programme:'New programme'}, reason:'Changed research focus', stageLabel:'Source coordinator review', canDecide:false, canCancel:false, teamSnapshot:[], unfinishedTaskCount:2, events:[] };
const render = (value: any) => renderToStaticMarkup(<ResearchAmendmentCard row={value} busy={false} onAction={() => {}} />);
const readonly = render(row);
assert.match(readonly, /Old title/);
assert.match(readonly, /New title/);
assert.match(readonly, /Source coordinator review/);
assert.match(readonly, /2 unfinished/);
assert.doesNotMatch(readonly, />Approve</);
assert.doesNotMatch(readonly, />Cancel request</);
assert.match(render({...row,canDecide:true}), />Approve</);
assert.match(render({...row,canCancel:true}), />Cancel request</);
console.log('Research amendment capability rendering passed');

const studentRow = { ...row, kind: 'RESEARCH', createdAt: '2026-10-09T08:00:00Z', before: {title:'Same title',abstract:'Old abstract',programme:'Same programme'}, after: {title:'Same title',abstract:'New abstract',programme:'Same programme'}, canDecide:true, canCancel:true };
const student = renderToStaticMarkup(<ResearchAmendmentCard row={studentRow} busy={false} studentView onAction={() => {}} />);
assert.match(student, /Abstract change/);
assert.match(student, /<details><summary[^>]*>View details<\/summary>/);
assert.match(student, /Old abstract/);
assert.match(student, /New abstract/);
assert.doesNotMatch(student, /Same title|Same programme|>Approve<|>Reject<|unfinished evaluation/);
assert.match(student, />Cancel request</);
const studentTransfer = renderToStaticMarkup(<ResearchAmendmentCard row={{...row, createdAt: studentRow.createdAt}} busy={false} studentView onAction={() => {}} />);
assert.doesNotMatch(studentTransfer, /unfinished evaluation|>Approve</);
console.log('Student research requests show changed fields and preserve cancellation without staff controls');

const historyRow = {...studentRow, canCancel:false, events:[{id:3,action:'SUBMITTED',actorName:'Student One',actorRole:'Student',previousStatus:'',newStatus:'PENDING_SUPERVISOR',retainTeam:false,createdAt:studentRow.createdAt,reason:'Submitted explanation'}]};
assert.match(renderToStaticMarkup(<ResearchAmendmentCard row={historyRow} studentView busy={false} onAction={() => {}} />), /Approval history|Submitted explanation|Student One/);
assert.doesNotMatch(renderToStaticMarkup(<ResearchAmendmentCard row={historyRow} studentView busy={false} onAction={() => {}} />), />Cancel request</);
const formOptions = { students:[],programmes:[],profile:{studentId:7,revision:1,title:'Current title',abstract:'Current abstract',programme:'Current programme'},canSubmitResearch:true,canCorrect:false,canTransfer:false };
const studentForm = renderToStaticMarkup(<ResearchAmendmentForm options={formOptions} busy={false} studentView onSave={() => {}} />);
assert.match(studentForm, /Research title|Research abstract|Submit request/);
assert.doesNotMatch(studentForm, /<select|Change type/);
assert.match(renderToStaticMarkup(<ResearchAmendmentForm options={formOptions} busy={false} onSave={() => {}} />), /<select|Change type/);
assert.equal(renderToStaticMarkup(<ResearchAmendmentForm options={{...formOptions,canSubmitResearch:false}} busy={false} studentView onSave={() => {}} />), '');
console.log('Student research form respects submission capability and omits the single-option selector');

const initialRevision = { id: 1, revision: 0, kind: 'BASELINE' as const, before: {programme:'',title:'',abstract:''}, after: {programme:'Original programme',title:'Original title',abstract:'Original abstract'}, actorName:'Initial record',createdAt:'2026-10-09T08:00:00Z',reason:'',requestId:null };
const renderRevision = (revision: typeof initialRevision | (Omit<typeof initialRevision, 'kind'> & {kind:'RESEARCH'}), studentView = true) => renderToStaticMarkup(<ResearchRevisionCard revision={revision} studentView={studentView} />);
const initialHistory = renderRevision(initialRevision);
assert.match(initialHistory, /Initial record|Programme|Title|Abstract|Malaysia/);
assert.doesNotMatch(initialHistory, /Previously|Recorded|Not recorded/);
for (const value of ['Original programme','Original title','Original abstract']) assert.equal(initialHistory.split(value).length - 1, 1);
const revisedHistory = renderRevision({...initialRevision,id:2,revision:1,kind:'RESEARCH',before:initialRevision.after,after:{...initialRevision.after,title:'Approved title'},actorName:'Coordinator',reason:'Clarify scope',requestId:1});
assert.match(revisedHistory, /Revision 1|Previously|Recorded|Original title|Approved title|Coordinator|Clarify scope/);
assert.doesNotMatch(revisedHistory, /Original programme|Original abstract/);
assert.equal(initialHistory.match(/<article class="([^"]+)"/)?.[1],revisedHistory.match(/<article class="([^"]+)"/)?.[1]);
assert.match(renderRevision(initialRevision,false), /Before|Proposed \/ recorded after/);
assert.match(renderRevision({...initialRevision,after:{...initialRevision.after,abstract:''}}), /Not recorded/);
console.log('Initial Student profile appears once; later revisions compare changed fields with consistent cards and preserved staff history');

// A routed list must omit the comparison and audit data entirely, including hidden details.
for (const role of ['Student', 'Lecturer'] as const) {
  const props = { row: historyRow, busy: false, studentView: role === 'Student', lecturerView: role === 'Lecturer', onAction: () => {} };
  const list = renderToStaticMarkup(<ResearchAmendmentCard {...props} presentation="list" onViewRequest={() => {}} />);
  assert.match(list, /View request/);
  assert.doesNotMatch(list, /Old abstract|New abstract|Changed research focus|Submitted explanation|Approval history|<details|Cancel request|>Approve</);
  const detail = renderToStaticMarkup(<ResearchAmendmentCard {...props} presentation="detail" />);
  for (const value of ['Old abstract', 'New abstract', 'Changed research focus', 'Submitted explanation', 'Approval history']) assert.ok(detail.includes(value), `Detail includes ${value}`);
  assert.doesNotMatch(detail, /<summary[^>]*>View details/);
}
console.log('Routed research lists omit comparison and audit content; details render it directly');

assert.ok('ResearchAmendmentRouteContent' in research, 'Routed research content can render loaded requests and profiles');
const renderRoute = (overrides: Partial<React.ComponentProps<typeof research.ResearchAmendmentRouteContent>> = {}) => renderToStaticMarkup(React.createElement(research.ResearchAmendmentRouteContent, {
  routeView: 'list', role: 'Student', options: formOptions, rows: [historyRow, { ...historyRow, id: 2, reason: 'Other request reason' }], revisions: [initialRevision], busy: false, onAction: () => {}, onNavigateToRequest: () => {}, onNavigateToProfile: () => {}, onNavigateToNew: () => {}, requestForm: <p>Permitted request form</p>, ...overrides,
}));
for (const value of ['Current title', 'View research profile', 'Request research change']) assert.ok(renderRoute().includes(value), `List includes ${value}`);
assert.doesNotMatch(renderRoute(), /Current abstract|Original abstract|Old abstract|New abstract|Submitted explanation/);
const requestDetail = renderRoute({ routeView: 'detail', routeRequestId: '1' });
for (const value of ['Old abstract', 'New abstract', 'Approval history', 'Submitted explanation']) assert.ok(requestDetail.includes(value), `Request detail includes ${value}`);
assert.doesNotMatch(requestDetail, /Other request reason|Original abstract|Request research change/);
assert.match(renderRoute({ routeView: 'detail', routeRequestId: '999' }), /Request not found/);
for (const value of ['Current abstract', 'Original abstract', 'Research profile history']) assert.ok(renderRoute({ routeView: 'profile' }).includes(value), `Profile includes ${value}`);
assert.doesNotMatch(renderRoute({ routeView: 'profile' }), /Submitted explanation|Other request reason/);
assert.match(renderRoute({ routeView: 'new' }), /Permitted request form/);
assert.doesNotMatch(renderRoute({ routeView: 'new', options: { ...formOptions, canSubmitResearch: false } }), /Permitted request form/);
assert.doesNotMatch(renderRoute({ routeView: 'new', role: 'Lecturer' }), /Permitted request form/);
assert.match(renderRoute({ routeView: 'profile', role: 'Lecturer', options: { ...formOptions, profile: null, students: [{ id: 7, name: 'Student One', matricNo: 'M123', programme: 'Current programme' }] } }), /Select a student/);
assert.match(renderRoute({ rows: [] }), /No research change requests/);
console.log('Routed research views isolate request detail, current profile history and permitted Student form');

for (const [routeView, title] of [['detail', 'Research change request'], ['profile', 'Research profile'], ['new', 'Request research change']] as const) {
  const shell = renderToStaticMarkup(<research.ResearchAmendments role="Student" routeView={routeView} routeRequestId="1" onNavigateToList={() => {}} />);
  assert.match(shell, new RegExp(`<h2[^>]*>${title}</h2>`));
  assert.match(shell, /Back to research changes/);
}
const staffShell = renderToStaticMarkup(<research.ResearchAmendments role="Office Staff/Admin" />);
assert.match(staffShell, /Research amendments and programme transfers/);
assert.doesNotMatch(staffShell, /Back to research changes/);
assert.equal(renderToStaticMarkup(<research.ResearchAmendments role="Office Staff/Admin" routeView="detail" routeRequestId="1" />), staffShell);
console.log('Routed research shells expose route-specific headings and return navigation while staff remains embedded');
