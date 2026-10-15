import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CoSupervisorNominationCard, StudentSupervisorsOverview } from './SupervisoryTeamManagement';
import type { CoSupervisorNomination, SupervisoryWorkspace } from '../types/coSupervision';

const nomination: CoSupervisorNomination = {
  id: 14, studentId: 20, matricNo: 'PG020', studentName: 'Student Twenty', programme: 'Computing', semester: 'Semester I',
  candidate: {id:30,name:'Dr Supporting'}, nominator:{id:40,name:'Dr Primary'}, status:'PENDING_COORDINATOR',
  justification:'Requested expertise', reason:'', submittedAt:'2026-10-09T12:59:00Z', waitingDays:5,
  allowedActions:[], replacesAppointmentId:null,
  history:[{id:1,action:'SUBMIT',actor:'Dr Primary',createdAt:'2026-10-09T12:59:00Z',previousStatus:'',newStatus:'SUBMITTED_TO_CO_SUPERVISOR'},
    {id:2,action:'ACCEPT',actor:'Dr Supporting',createdAt:'2026-10-10T12:59:00Z',previousStatus:'SUBMITTED_TO_CO_SUPERVISOR',newStatus:'PENDING_COORDINATOR'}],
};
const render = (row=nomination) => renderToStaticMarkup(<CoSupervisorNominationCard nomination={row} busy={false} onAction={()=>{}}/>);
const ongoing = render();
assert.match(ongoing,/Approval progress/);
assert.match(ongoing,/Coordinator approval/);
assert.match(ongoing,/5 calendar days/);
assert.match(ongoing,/Audit history/);
assert.doesNotMatch(ongoing,/Supporting request #14|Copy reference/);
assert.match(ongoing,/Malaysia/);
assert.doesNotMatch(ongoing,/>Approve request</);
const cancelled = render({...nomination,status:'CANCELLED',reason:'No longer needed',waitingDays:99});
assert.match(cancelled,/Cancelled/);
assert.match(cancelled,/No longer needed/);
assert.doesNotMatch(cancelled,/99 calendar days/);
const workspace: SupervisoryWorkspace = {teams:[{studentId:20,matricNo:'PG020',studentName:'Student Twenty',programme:'Computing',studentStatus:'ACTIVE',primarySupervisor:{id:40,name:'Dr Primary'},primaryAppointmentId:2,research:{title:'Current title',area:'Computing',abstract:'Abstract'},appointments:[],nominations:[nomination],canNominate:false}],appointments:[],nominations:[nomination]};
const ownTeam = renderToStaticMarkup(<StudentSupervisorsOverview workspace={workspace}/>);
assert.doesNotMatch(ownTeam,/Requested expertise|Dr Supporting|Supporting request #14|Approval progress/,'Shared team styling must not expose staff nominations to Student');
console.log('Supporting requests share factual progress and metadata while Student nomination privacy remains intact');
