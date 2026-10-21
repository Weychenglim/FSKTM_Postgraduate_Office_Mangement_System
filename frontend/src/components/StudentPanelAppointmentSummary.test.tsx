import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StudentPanelAppointmentSummary} from './StudentProgressDossier';
import type {PanelDossierRecord} from '../types';

const pending:PanelDossierRecord={
  status:'FACULTY_PROCESSING',targetModule:'PANEL_APPOINTMENTS',recordType:'PANEL_APPOINTMENT',
  waitingSince:null,waitingDays:null,appointment:null,
  recommendedMember:'Private proposed lecturer',rejectionReason:'Private rejected reason',
  cancellationReason:'Private cancelled reason',submittedAt:'2026-10-01T00:00:00Z',
};
const appointed:PanelDossierRecord={...pending,status:'CONFIRMED',appointment:{
  status:'ACTIVE',panelMember:'Dr Confirmed',appointmentDate:'2026-10-02',
  endReason:'Private end reason',lifecycle:[{action:'END',reason:'Private staff audit'} as never],
}};
const render=(records:PanelDossierRecord[])=>renderToStaticMarkup(<StudentPanelAppointmentSummary records={records}/>);

test('Student confirmed result omits nomination details and staff workflow fields',()=>{
  const html=render([appointed]);
  assert.match(html,/Dr Confirmed/);
  assert.match(html,/>Confirmed</);
  assert.match(html,/02 Oct 2026/);
  assert.doesNotMatch(html,/Private|Submitted:|Waiting:|Decision:|Not recorded|View record|Audit/);
});

test('Student pending state publishes only a generic processing message',()=>{
  const html=render([pending]);
  assert.match(html,/>Processing</);
  assert.match(html,/Your Panel appointment is being processed/);
  assert.doesNotMatch(html,/Private|Submitted:|Waiting:|Decision:|Not recorded/);
});

test('active Panel stays visible while replacement processing is hidden',()=>{
  const html=render([pending,appointed]);
  assert.match(html,/Dr Confirmed/);
  assert.doesNotMatch(html,/Processing|being processed|Private/);
});

test('previous appointments remain distinct from current results',()=>{
  const html=render([appointed,{...appointed,status:'ENDED',appointment:{...appointed.appointment!,status:'ENDED',panelMember:'Dr Previous',endedAt:'2026-10-03T00:00:00Z'}}]);
  assert.ok(html.indexOf('Dr Confirmed')<html.indexOf('Previous Panel appointments'));
  for(const value of ['Dr Previous','Ended','03 Oct 2026']) assert.ok(html.includes(value));
  assert.doesNotMatch(html,/Private/);
});

test('failed nominations and an approval without an appointment never become Student history',()=>{
  const html=render(['REJECTED','CANCELLED','REJECTED_BY_PANEL','APPROVED'].map(status=>({...pending,status})));
  assert.match(html,/No Panel appointment yet/);
  assert.doesNotMatch(html,/Private|Rejected|Cancelled|Approved|Previous Panel appointments|being processed/);
});

test('history alone does not imply a current appointment',()=>{
  const html=render([{...appointed,status:'COMPLETED',appointment:{...appointed.appointment!,status:'COMPLETED',panelMember:'Dr Previous'}}]);
  for(const value of ['No Panel appointment yet','Previous Panel appointments','Dr Previous','Completed']) assert.ok(html.includes(value));
  assert.doesNotMatch(html,/>Confirmed<|Private/);
});
