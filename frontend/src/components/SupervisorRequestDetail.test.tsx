import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { toStudentSupervisorApplication } from '../services/appointmentsApi';
import type { SupervisorApplicationRecord } from '../types';

const detailModule = await import('./SupervisorRequestDetail').catch(() => null);
assert.ok(detailModule, 'Primary requests need a shared, role-neutral detail renderer');
const { SupervisorRequestDetail, supervisorRequestMetadata, toSupervisorRequestPresentation, toStudentSupervisorRequestPresentation } = detailModule;
const record: SupervisorApplicationRecord = {
  id: 127, studentId: 'PG001', studentName: 'Actual applicant', programme: 'MSc Computing', semester: 'Semester I',
  proposedSupervisor: 'Dr Selected', proposedSupervisorId: 'L001', researchTitle: 'Immutable submitted title',
  researchArea: 'Networks', researchAbstract: 'Recorded abstract', projectCourseCodes: 'CSE500',
  researchProfileReady: false, status: 'PENDING_COORDINATOR', rejectionReason: '', submittedAt: '2026-10-13T18:30:00Z',
  waitingDays: 3, waitingOn: 'COORDINATOR', workflow: [{id: 9, action: 'ACCEPT', actorName: 'Dr Selected', actorRole: 'Lecturer', previousStatus: 'SUBMITTED_TO_SUPERVISOR', newStatus: 'PENDING_COORDINATOR', reason: 'Recorded reason', createdAt: '2026-10-14T00:00:00Z'}],
  replacementReason: 'Original appointment ended', documents: [{id: 54, requirementCode: 'PROPOSAL', requirementLabel: 'Proposal', name: 'proposal.pdf', contentType: 'application/pdf', size: 12, checksum: null, availability: 'AVAILABLE', uploadedAt: '2026-10-13T18:30:00Z'}],
};
const request = toSupervisorRequestPresentation(record);
assert.equal(supervisorRequestMetadata(request).submittedBy,'','Missing submission events cannot invent an actor');
record.workflow.unshift({id:8,action:'SUBMIT',actorName:'Actual applicant',actorRole:'Student',previousStatus:'',newStatus:'SUBMITTED_TO_SUPERVISOR',reason:'Submitted by applicant',createdAt:record.submittedAt});
request.submittedBy=toSupervisorRequestPresentation(record).submittedBy;
assert.equal(request.applicationId, 127, 'Downloads retain the exact application identity');
assert.equal(supervisorRequestMetadata(request).submittedBy, 'Actual applicant');
assert.equal(supervisorRequestMetadata(request).submittedAt, record.submittedAt, 'Header dates retain the raw timestamp for Malaysia formatting');
const render = (value = request, actions?: React.ReactNode) => renderToStaticMarkup(<SupervisorRequestDetail request={value} actions={actions} administration={<p>Lifecycle record</p>} />);
const html = render(request, <button>Authorized decision</button>);
for (const text of ['Actual applicant', 'PG001', 'MSc Computing', 'Semester I', 'Dr Selected', 'Immutable submitted title', 'Networks', 'Recorded abstract', 'CSE500', 'Original appointment ended', 'proposal.pdf', 'Authorized decision', 'Lifecycle record', 'Recorded reason', 'Lecturer']) assert.ok(html.includes(text), `Details preserve ${text}`);
assert.doesNotMatch(html, /SV-REQ-00127|Copy reference/, 'Reference belongs in the RecordPage metadata slot');
assert.ok(html.indexOf('Research details') >= 0 && html.indexOf('Research details') < html.indexOf('Documents'));
assert.ok(html.indexOf('Documents') < html.indexOf('Approval progress'));
assert.ok(html.indexOf('Approval progress') < html.indexOf('Authorized decision'));
assert.match(html, /<details/);
assert.doesNotMatch(html, /<details[^>]*open/);
assert.doesNotMatch(render(), />Approve<|>Reject<|>Cancel Request</, 'The renderer never grants decision capabilities');
assert.doesNotMatch(renderToStaticMarkup(<SupervisorRequestDetail request={request} showApproval={false} />), /Approval progress/, 'Records without an application do not invent an approval process');
const cancelled = render({...request, status: 'CANCELLED_BY_OFFICE', cancellationReason: 'Recorded cancellation', events: []});
assert.match(cancelled,/Recorded cancellation/);
assert.doesNotMatch(cancelled,/Audit history/,'Missing audit data adds no empty disclosure');
assert.match(cancelled, /Cancelled/);
assert.match(render({...request, status: 'REJECTED_BY_SUPERVISOR', rejectionReason: 'Recorded rejection', events: []}), /Recorded rejection/);
const rejected = render({...request, status: 'REJECTED_BY_SUPERVISOR', rejectionReason: 'Exact decision reason', events: [{id: 11, action: 'REJECT', actorName: 'Dr Selected', actorRole: 'Lecturer', previousStatus: 'SUBMITTED_TO_SUPERVISOR', newStatus: 'REJECTED_BY_SUPERVISOR', reason: 'Exact decision reason', createdAt: '2026-10-14T01:00:00Z'}]});
assert.equal((rejected.split('<details')[0].match(/Exact decision reason/g) ?? []).length, 1, 'Visible decision reason is not duplicated in derived progress');
assert.match(rejected.split('<details')[1], /Exact decision reason/, 'The complete audit keeps the persisted reason');
assert.match(render({...request, programme: undefined, researchAbstract: undefined}), /Not recorded/);
const unavailable = render({...request,unavailableUntil:'2026-10-20'});
assert.match(unavailable,/20 Oct 2026/,'Student-safe availability date remains visible in the shared detail');
const student = toStudentSupervisorApplication(record);
assert.equal(student.studentName, record.studentName);
assert.equal(student.studentId, record.studentId);
assert.equal(student.programme, record.programme);
assert.equal(student.semester, record.semester);
assert.equal(student.researchAbstract, record.researchAbstract);
assert.equal(student.submittedAt, record.submittedAt);
const studentRequest = toStudentSupervisorRequestPresentation(student);
assert.equal(studentRequest.status, record.status);
assert.equal(studentRequest.applicationId, record.id);
assert.equal(studentRequest.researchAbstract, record.researchAbstract);
assert.equal(supervisorRequestMetadata(studentRequest).submittedBy, record.studentName);
assert.equal(toStudentSupervisorRequestPresentation({...student, workflowStatus: undefined}).status, 'UNKNOWN', 'Display status must not invent a historical workflow stage');
const officeRecord={...record,initiatedByOffice:true,workflow:[{...record.workflow[0],actorName:'Office Staff',actorRole:'Office Staff/Admin'}]};
const officeRequest=toSupervisorRequestPresentation(officeRecord);
assert.equal(officeRequest.initiatedByOffice,true);
const officeStudent=toStudentSupervisorApplication(officeRecord);
assert.equal(officeStudent.initiatedByOffice,true);
assert.equal(toStudentSupervisorRequestPresentation(officeStudent).initiatedByOffice,true);
const officeHtml=render(officeRequest);
assert.match(officeHtml,/Office-initiated replacement/);
assert.doesNotMatch(officeHtml,/Loading submitted particulars|No submitted Section A|Student declaration|Confirmed by/);
console.log('Shared primary request detail, metadata, audit, documents and capability neutrality passed');
