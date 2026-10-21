import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {OfficeSupervisorReplacementFields, PrimarySupervisorReplacementActions} from './OfficeSupervisorReplacementForm';
import type {OfficeSupervisorReplacementContext} from '../services/officeSupervisorReplacementApi';
import type {SupervisoryTeam} from '../types/coSupervision';
import {SupervisorAppointmentGuidanceView} from './StudentAppointmentGuidance';

const context:OfficeSupervisorReplacementContext = {
  appointmentId:7,studentId:'PG001',studentName:'Student One',programme:'Computing',currentSupervisor:'Dr Current',
  researchTitle:'Saved research title',researchArea:'Networks',researchAbstract:'Saved abstract',projectCourseCodes:'ABC123',
  candidates:[{id:'SV2',name:'Dr Available',domain:'Networks',initials:'DA',filled:1,total:3,selectable:true},
    {id:'SV3',name:'Dr Full',domain:'Networks',initials:'DF',filled:3,total:3,selectable:false}],
  canSubmit:true,blockedReason:null,pendingApplicationId:null,
};
const fields = (overrides={}) => renderToStaticMarkup(<OfficeSupervisorReplacementFields context={context} selectedId="" reason="" busy={false} onCandidateChange={()=>{}} onReasonChange={()=>{}} {...overrides}/>);

test('Office form needs an explicit available candidate and reason without a Student declaration',()=>{
  const initial=fields();
  assert.match(initial,/Choose a supervisor/);
  assert.match(initial,/Reason for change/);
  assert.match(initial, /disabled=""[^>]*><span>Send for review/);
  assert.match(initial, /value="SV3"[^>]*disabled=""|disabled=""[^>]*value="SV3"/);
  assert.doesNotMatch(initial,/Student declaration|I declare|Research title.*<input/);
  assert.doesNotMatch(fields({selectedId:'SV2',reason:'Exceptional reassignment'}), /disabled=""[^>]*><span>Send for review/);
  assert.match(fields({selectedId:'SV3',reason:'Exceptional reassignment'}), /disabled=""[^>]*><span>Send for review/);
});

test('blocked or busy form cannot submit and explains the block',()=>{
  const blocked=fields({context:{...context,canSubmit:false,blockedReason:'A replacement is already awaiting review.'},selectedId:'SV2',reason:'A reason'});
  assert.match(blocked,/A replacement is already awaiting review/);
  assert.match(blocked,/disabled=""[^>]*><span>Send for review/);
  assert.match(fields({busy:true,selectedId:'SV2',reason:'A reason'}),/<fieldset disabled=""/);
});

const team = {studentId:1,matricNo:'PG001',primaryAppointmentId:7,canChangePrimarySupervisor:true} as SupervisoryTeam;
const actions=(role='Office Staff/Admin',overrides={})=>renderToStaticMarkup(<PrimarySupervisorReplacementActions role={role as 'Office Staff/Admin'} team={team} active busy={false} onChange={()=>{}} {...overrides}/>);

test('only Office sees the action for an active server-authorized appointment',()=>{
  assert.match(actions(),/>Change supervisor</);
  for(const role of ['Student','Lecturer','Programme Coordinator']) assert.doesNotMatch(actions(role),/>Change supervisor</);
  assert.doesNotMatch(actions('Office Staff/Admin',{active:false}),/>Change supervisor</);
  assert.doesNotMatch(actions('Office Staff/Admin',{team:{...team,canChangePrimarySupervisor:false}}),/>Change supervisor</);
});

test('pending replacement shows its stage instead of a second creation action',()=>{
  const html=actions('Office Staff/Admin',{team:{...team,pendingPrimaryReplacement:{applicationId:20,status:'PENDING_COORDINATOR',supervisorName:'Dr Proposed'}}});
  assert.match(html,/Dr Proposed/);
  assert.match(html,/Awaiting Coordinator approval/);
  assert.doesNotMatch(html,/>Change supervisor</);
});

test('Student guidance directs exceptional changes to Office without inviting replacement submission',()=>{
  const html=renderToStaticMarkup(<SupervisorAppointmentGuidanceView requirements={[]} loading={false} error={null} onRetry={()=>{}} hasSupervisor/>);
  assert.match(html,/Contact the Postgraduate Office/);
  assert.doesNotMatch(html,/Provide a replacement reason|fresh supporting documents/);
});
