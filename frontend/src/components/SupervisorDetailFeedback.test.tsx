import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {RequestMetadata,RequestAuditHistory} from './RequestDetailPrimitives';
import {SupervisorRequestDetail,toSupervisorRequestPresentation} from './SupervisorRequestDetail';
import {OfficeAppointmentAdministration,officeRequestPresentation} from './SupervisorAppointmentManagement';
import {officeApplicationRecord} from './OfficeSupervisorWorkspace';
import {CoordinatorApplicationLifecycle} from './CoordinatorSupervisorApprovals';
import {RequestedChangesComparison} from './RequestedChangesComparison';
import type {SupervisorApplicationRecord} from '../types';
import {SupervisoryTeamRouteContent} from './SupervisoryTeamManagement';
import type {SupervisoryWorkspace} from '../types/coSupervision';

const header=render(<RequestMetadata reference="SV-REQ-00009" submittedAt="2026-10-13T18:30:00Z" submittedBy="Not recorded" statusLabel="Approved"/>);
assert.doesNotMatch(header,/Reference|SV-REQ|Copy reference|Submitted by|Not recorded|UTC\+08/,'Header contains useful submission context, not references or unknown-actor noise');
assert.match(header,/14 Oct 2026/);
const audit=render(<RequestAuditHistory events={[{id:1,action:'SUBMIT',actorName:'Student One',actorRole:'Student',createdAt:'2026-10-13T18:30:00Z',newStatus:'PENDING_SUPERVISOR',retainTeam:false,reason:'Requested clarification'}]}/>);
assert.match(audit,/Request submitted|Awaiting Supervisor review|Requested clarification/);
assert.doesNotMatch(audit,/PENDING_SUPERVISOR|>SUBMIT<|Not recorded →|Team retention|UTC\+08/,'Readable audit omits raw codes and irrelevant transfer acknowledgement');
const comparison=render(<RequestedChangesComparison before={{programme:'Computing',title:'Old',abstract:'Same'}} after={{programme:'Computing',title:'New',abstract:'Same'}}/>);
assert.doesNotMatch(comparison,/Not applied|Saved values|Only changed fields/);
assert.match(comparison,/Before this request/);
assert.match(comparison,/Proposed title/);

const record:SupervisorApplicationRecord={id:9,studentId:'PG009',studentName:'Student Nine',programme:'Computing',semester:'Semester I',proposedSupervisor:'Dr Nine',proposedSupervisorId:'L009',researchTitle:'Recorded title',researchArea:'Networks',researchAbstract:'Recorded abstract',researchProfileReady:true,status:'APPROVED',rejectionReason:'',submittedAt:'2026-10-13T18:00:00Z',coordinatorDecisionAt:'2026-10-13T18:30:00Z',workflow:[{id:1,action:'COORDINATOR_APPROVE',actorName:'Actual coordinator',actorRole:'Programme Coordinator',previousStatus:'PENDING_COORDINATOR',newStatus:'APPROVED',reason:'',createdAt:'2026-10-13T18:30:00Z'}],appointmentLifecycle:{appointmentId:5,status:'ACTIVE',endOutcome:null,endReason:null,endedAt:null,endedBy:null,supersedesAppointmentId:null,replacementAppointmentId:null,lifecycle:[{id:10,action:'ACTIVATED',actorName:'Actual coordinator',actorRole:'Programme Coordinator',previousStatus:'',newStatus:'ACTIVE',outcome:null,reason:null,createdAt:'2026-10-13T18:30:00Z'}]}};
const office=render(<OfficeAppointmentAdministration record={officeApplicationRecord(record)} onEnd={async()=>{}}/>);
const coordinator=render(<CoordinatorApplicationLifecycle record={record} onEnd={async()=>{}}/>);
const normalized=(html:string)=>html.replace(/(id|aria-labelledby)="_[^"]+_"/g,'$1="generated-id"');
assert.equal(normalized(office),normalized(coordinator),'Equivalent authorized appointment data must render identically for Office and Coordinator');
assert.doesNotMatch(office,/Appointment reference|>ACTIVE<|>ACTIVATED</);
for(const status of ['ACTIVE','ENDED'] as const){
 const endedRecord={...record,appointmentLifecycle:{...record.appointmentLifecycle!,status,endedAt:status==='ENDED'?'2026-10-14T03:00:00Z':null,endOutcome:status==='ENDED'?'COMPLETED' as const:null,endReason:status==='ENDED'?'Research finished':null}};
 assert.equal(normalized(render(<OfficeAppointmentAdministration record={officeApplicationRecord(endedRecord)} onEnd={async()=>{}}/>)),normalized(render(<CoordinatorApplicationLifecycle record={endedRecord} onEnd={async()=>{}}/>)));
}
const legacy=render(<SupervisorRequestDetail request={toSupervisorRequestPresentation({...record,workflow:[]})}/>);
const primaryAbstractClass=legacy.match(/data-research-abstract[^>]*><p class="([^"]+)"/)?.[1];
const requestedAbstract=render(<RequestedChangesComparison before={{programme:'Computing',title:'Same',abstract:'Old'}} after={{programme:'Computing',title:'Same',abstract:'New'}}/>);
const comparisonAbstractClass=requestedAbstract.match(/data-research-abstract[^>]*><p class="([^"]+)"/)?.[1];
assert.ok(primaryAbstractClass?.includes('font-normal') && !primaryAbstractClass.includes('card-value'),'Long research text must not use bold key-fact styling');
for(const token of ['text-sm','font-normal','leading-7','text-slate-700']) {
  assert.ok(primaryAbstractClass?.includes(token) && comparisonAbstractClass?.includes(token),'Primary and research change abstracts retain the same readable text hierarchy');
}
assert.doesNotMatch(legacy,/Submission actor:|Decision details:|Audit history\(0|Coordinator approval/,'Legacy records do not pretend to have a detailed approval history');
assert.doesNotMatch(legacy.slice(legacy.indexOf('Approval progress')),/>Not recorded</,'Missing course codes may be explicit without adding placeholder approval details');
assert.match(legacy,/Detailed approval history is unavailable/);
assert.equal(normalized(render(<SupervisorRequestDetail request={officeRequestPresentation(officeApplicationRecord({...record,workflow:[]}))}/>)),normalized(legacy),'Office and Lecturer show the same legacy request body for the same persisted application');
const workspace:SupervisoryWorkspace={primaryApplication:record,teams:[{studentId:99,matricNo:record.studentId,studentName:record.studentName,programme:record.programme,studentStatus:'ACTIVE',primarySupervisor:{id:9,name:record.proposedSupervisor},primaryAppointmentId:5,research:{title:'Current title',area:'Networks',abstract:'Current abstract'},appointments:[],nominations:[],canNominate:false}],appointments:[],nominations:[]};
const supervision=(role:'Lecturer'|'Office Staff/Admin'|'Programme Coordinator',withEnding=false)=>render(<SupervisoryTeamRouteContent workspace={workspace} view="detail" routeStudentId="PG009" role={role} busy={false} search="" page={1} onSearch={()=>{}} onPage={()=>{}} onNominate={()=>{}} onEnd={()=>{}} onReplace={()=>{}} onNominationAction={()=>{}} onEndPrimary={withEnding?async()=>{}:undefined}/>);
const common=normalized(supervision('Lecturer'));
for(const role of ['Office Staff/Admin','Programme Coordinator'] as const)assert.equal(normalized(supervision(role)),common,`${role} and Lecturer share the exact same student supervision layout for equivalent data`);
assert.doesNotMatch(common,/Appointment reference|Appointment ID|SV-APT-|SV-REQ-|Copy reference/);
assert.doesNotMatch(supervision('Lecturer',true),/>End Appointment</,'A callback cannot grant a Lecturer a staff-only primary ending action');
for(const role of ['Office Staff/Admin','Programme Coordinator'] as const)assert.match(supervision(role,true),/>End Appointment</);
const lecturerContext={appointmentId:5,studentId:record.studentId,studentName:record.studentName,programme:record.programme,semester:record.semester,email:'',researchTitle:record.researchTitle,researchArea:record.researchArea,researchAbstract:record.researchAbstract,supervisorName:record.proposedSupervisor,appointmentDate:'14 Oct 2026',status:'Active'};
const lecturerPayload=(context=lecturerContext)=>render(<SupervisoryTeamRouteContent workspace={{...workspace,primaryApplication:null}} detailContext={context} view="detail" routeStudentId="PG009" role="Lecturer" busy={false} search="" page={1} onSearch={()=>{}} onPage={()=>{}} onNominate={()=>{}} onEnd={()=>{}} onReplace={()=>{}} onNominationAction={()=>{}}/>);
assert.match(lecturerPayload(),/Appointment record/);
assert.doesNotMatch(lecturerPayload(),/Ended on|Date unavailable/,'Lecturer Active DTO represents an active appointment, not an ending');
assert.doesNotMatch(lecturerPayload({...lecturerContext,appointmentId:999}),/Appointment record/,'An old appointment cannot be presented as the current primary appointment');
console.log('Supervisor feedback: clean metadata, human audit, concise comparison and identical staff appointment cards passed');
