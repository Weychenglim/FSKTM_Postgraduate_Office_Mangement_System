import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LecturerPrimaryRequestActions} from './LecturerAppointmentRequests';
import * as coordinator from './CoordinatorSupervisorApprovals';
import type {SupervisorApplicationRecord} from '../types';

const record={status:'SUBMITTED_TO_SUPERVISOR',participantEligible:true} as SupervisorApplicationRecord;
const noop=()=>{};
const lecturer=(busy=false)=>renderToStaticMarkup(<LecturerPrimaryRequestActions record={record} busy={busy} onAction={noop}/>);

test('Primary Supervisor and Coordinator decisions share icons, markup and full request labels',()=>{
  assert.equal(typeof coordinator.CoordinatorPrimaryRequestActions,'function');
  const html=renderToStaticMarkup(<coordinator.CoordinatorPrimaryRequestActions record={{...record,status:'PENDING_COORDINATOR'}} pending busy={false} isRejecting={false} onAction={noop}/>);
  assert.equal(html.replace('Approve request','Accept request'),lecturer());
});

test('Coordinator action extraction preserves pending, eligibility and busy guards',()=>{
  const Component=coordinator.CoordinatorPrimaryRequestActions;
  assert.equal(typeof Component,'function');
  const render=(extra:Partial<React.ComponentProps<typeof Component>>={})=>renderToStaticMarkup(<Component record={record} pending busy={false} isRejecting={false} onAction={noop} {...extra}/>);
  assert.doesNotMatch(render({pending:false}),/<button/);
  const ineligible=render({record:{...record,participantEligible:false,participantLifecycleStatus:'Deferred'}});
  assert.equal((ineligible.match(/disabled=""/g)??[]).length,2);
  assert.match(ineligible,/non-actionable until eligible/);
  assert.equal((render({busy:true}).match(/disabled=""/g)??[]).length,2);
  assert.match(render({isRejecting:true}),/disabled=""/);
  assert.match(render({isRejecting:true}),/>Reject request</);
  assert.doesNotMatch(render({isRejecting:true}),/>Cancel</,'Opening the rejection dialog does not turn its trigger into a misleading Cancel action');
});
