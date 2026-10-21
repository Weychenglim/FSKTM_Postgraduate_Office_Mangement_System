import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResearchAmendmentCard, ResearchRevisionCard } from './ResearchAmendments';

const request: any = {id:2,kind:'RESEARCH',status:'PENDING_SUPERVISOR',studentName:'Research Student',matricNo:'PG007',createdAt:'2026-10-09T08:00:00Z',before:{title:'Same title',abstract:'Old abstract',programme:'Same programme'},after:{title:'Same title',abstract:'Proposed abstract',programme:'Same programme'},reason:'Compare explanatory clarity',stageLabel:'Awaiting primary supervisor',canDecide:true,canCancel:false,events:[{id:1,action:'SUBMITTED',previousStatus:'',newStatus:'PENDING_SUPERVISOR',actorName:'Research Student',createdAt:'2026-10-09T08:00:00Z',reason:'Submitted for endorsement'}],teamSnapshot:null,unfinishedTaskCount:null};
const renderRequest = (value: any) => renderToStaticMarkup(React.createElement(ResearchAmendmentCard, {row:value,busy:false,onAction:()=>{},lecturerView:true} as any));
const lecturerRequest = renderRequest(request);
assert.match(lecturerRequest, /<details><summary[^>]*>View details<\/summary>/);
for (const text of ['Abstract change','Research Student','PG007','Old abstract','Proposed abstract','Approve request','Reject request','Approval progress']) assert.ok(lecturerRequest.includes(text), `Missing Lecturer research data: ${text}`);
assert.doesNotMatch(lecturerRequest, /Same title|>Cancel request</);
assert.equal((lecturerRequest.match(/Same programme/g) ?? []).length, 1, 'The request summary retains Programme without repeating an unchanged field in the comparison');
assert.doesNotMatch(renderRequest({...request,canDecide:false}), />Endorse request<|>Reject request</);
const initial: any = {id:1,revision:0,kind:'BASELINE',before:{programme:'',title:'',abstract:''},after:{programme:'Original programme',title:'Original title',abstract:'Original abstract'},actorName:'Office',createdAt:request.createdAt,reason:'Initial profile',requestId:null,studentName:'Research Student'};
const baseline = renderToStaticMarkup(React.createElement(ResearchRevisionCard,{revision:initial,lecturerView:true} as any));
for (const text of ['Initial record','Research Student','Original programme','Original title','Original abstract','Office']) assert.ok(baseline.includes(text), `Missing initial research profile data: ${text}`);
assert.doesNotMatch(baseline, /Previously|>Before<|Not recorded/);
const later = renderToStaticMarkup(React.createElement(ResearchRevisionCard,{revision:{...initial,id:2,revision:1,kind:'RESEARCH',before:initial.after,after:{...initial.after,title:'Approved title'}},lecturerView:true} as any));
for (const text of ['Recorded before this revision','Recorded after revision','Original title','Approved title']) assert.ok(later.includes(text), `Missing changed-field comparison: ${text}`);
assert.doesNotMatch(later,/Original programme|Original abstract/);
console.log('Lecturer research cards preserve authority and audit data with compact comparisons and a single initial profile');

import { AppointmentSummaryCard } from './AppointmentPrimitives';
import { LecturerAppointmentGuidance } from './LecturerAppointmentGuidance';
import { PanelSuperviseeDetails } from './PanelSuperviseeRoster';
const summary = renderToStaticMarkup(<AppointmentSummaryCard title="Panel Workload" value={2} progress={{current:2,max:5}} badge="Available" description="Current semester" />);
assert.match(summary, /card-label|card-metric|card-description|Available|Current semester/);
for (const module of ['supervisor','panel'] as const) {
  const guidance = renderToStaticMarkup(<LecturerAppointmentGuidance module={module} />);
  assert.match(guidance, /aria-label="Appointment guidance"/);
  assert.doesNotMatch(guidance, /<details|Need Assistance|Approval process|turnaround/);
  assert.equal((guidance.match(/<article/g) ?? []).length,2);
}
const panelStudent = {studentId:'PG007',studentName:'Research Student',programme:'Programme',semester:'Semester',supervisorName:'Supervisor',supervisorId:'L1',supervisorAppointmentId:1,proposedTopic:'Current title',researchArea:'Area',abstract:'Abstract',currentPanelMember:'Current Panel',currentPanelMemberId:'L2',panelAppointmentId:2,canRecommend:true};
const panelCard = (canRecommend:boolean,replacement:boolean) => renderToStaticMarkup(<PanelSuperviseeDetails student={{...panelStudent,canRecommend,panelAppointmentId:replacement?2:null}} onRecommend={()=>{}} onOpenRequest={()=>{}} />);
assert.match(panelCard(true,true),/Request replacement/);
assert.match(panelCard(true,false),/Nominate panel member/);
assert.doesNotMatch(panelCard(false,false),/>Request replacement<|>Nominate panel member</);
assert.match(panelCard(true,true),/Current research title|Current title|PG007|Programme|Semester/);
assert.doesNotMatch(panelCard(true,true),/Select another supervisee/);
console.log('Lecturer shared metrics, visible guidance and permission-aware Panel nomination cards pass');

import {PanelSubmittedRecommendations} from './LecturerPanelAppointments';
const outgoing=renderToStaticMarkup(<PanelSubmittedRecommendations records={[{id:9,studentId:'PG-OLD',studentName:'Former supervisee',programme:'Computing',proposedTopic:'Research',recommendedMember:'Panel candidate',recommendedMemberId:'P1',submittedDate:'2026-10-18',status:'PENDING_COORDINATOR'}]} onOpen={()=>{}}/>);
assert.match(outgoing,/Submitted recommendations/);
assert.match(outgoing,/Former supervisee/);
assert.match(outgoing,/Awaiting Coordinator/);
assert.match(outgoing,/aria-label="Request views"/);
assert.doesNotMatch(outgoing,/<details|<summary/);
const incomingGuide=renderToStaticMarkup(<LecturerAppointmentGuidance module="panel" panelContext="reviews"/>);
assert.match(incomingGuide,/Accepting a nomination/);
assert.doesNotMatch(incomingGuide,/Replacing a Panel member|Panel candidate eligibility/);
const assignmentGuide=renderToStaticMarkup(<LecturerAppointmentGuidance module="panel" panelContext="appointments"/>);
assert.match(assignmentGuide,/Current and past appointments/);
assert.doesNotMatch(assignmentGuide,/Replacing a Panel member/);
