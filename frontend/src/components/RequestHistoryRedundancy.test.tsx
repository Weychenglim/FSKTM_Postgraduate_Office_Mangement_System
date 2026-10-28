import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {SupervisorRequestDetail} from './SupervisorRequestDetail';
import {PanelRecommendationDetail,PanelAppointmentRecordCard} from './PanelRecordDetails';
import {SupervisorAppointmentRecordCard} from './SupervisorAppointmentRecordCard';
import type {PanelPresentation} from '../utils/panelPresentation';

const event={id:1,action:'ACCEPT',actorName:'Dr Reviewer',actorRole:'Lecturer',previousStatus:'SUBMITTED_TO_SUPERVISOR',newStatus:'PENDING_COORDINATOR',reason:'Relevant research expertise.',createdAt:'2026-10-20T08:00:00Z'};
const panel:PanelPresentation={id:1,studentId:'PG1',studentName:'Student',programme:'Computing',recommendedMember:'Dr Panel',recommendedMemberId:'L1',proposedTopic:'Research',submittedDate:'20 Oct 2026',status:'PENDING_COORDINATOR',workflow:[{...event,previousStatus:'SUBMITTED_TO_PANEL'}]};
test('Request timelines retain the decision comment once without a second audit disclosure',()=>{
  const supervisor=render(<SupervisorRequestDetail request={{status:'PENDING_COORDINATOR',studentName:'Student',studentId:'PG1',events:[event]}}/>);
  for(const html of [supervisor,render(<PanelRecommendationDetail record={panel}/>)] ){
    assert.match(html,/Approval progress/);
    assert.doesNotMatch(html,/Audit history/);
    assert.equal(html.split(event.reason).length-1,1,'The recorded comment remains visible exactly once');
  }
});
test('Creation-only lifecycle adds no history; ending remains traceable for both appointment types',()=>{
  const activated={...event,action:'ACTIVATED' as const,newStatus:'ACTIVE',outcome:null};
  const ended={...activated,id:2,action:'ENDED' as const,previousStatus:'ACTIVE',newStatus:'ENDED',reason:'Completed project.'};
  for(const events of [[activated],[activated,ended]]){
    const supervisor=render(<SupervisorAppointmentRecordCard compact record={{studentName:'Student',studentId:'PG1',supervisor:'Dr Reviewer',status:'ACTIVE',events}}/>);
    const panelCard=render(<PanelAppointmentRecordCard compact record={{...panel,appointmentLifecycle:{appointmentId:1,status:'ACTIVE',endOutcome:null,endReason:null,endedAt:null,endedBy:null,supersedesAppointmentId:null,replacementAppointmentId:null,lifecycle:events}}}/>);
    for(const html of [supervisor,panelCard]){
      assert.doesNotMatch(html,/Appointment started/);
      assert.equal(html.includes('Appointment changes'),events.length===2);
      if(events.length===2)assert.match(html,/Completed project\./);
    }
  }
});
