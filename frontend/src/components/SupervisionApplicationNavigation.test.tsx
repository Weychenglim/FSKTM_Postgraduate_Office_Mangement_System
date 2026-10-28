import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SupervisoryTeamRouteContent} from './SupervisoryTeamManagement';
import type {SupervisoryTeam} from '../types/coSupervision';

const team:SupervisoryTeam={studentId:7,matricNo:'P007',studentName:'Current student',programme:'Computing',studentStatus:'ACTIVE',primarySupervisor:{id:9,name:'Dr Primary'},primaryAppointmentId:4,research:{title:'Current approved research',area:'Computing',abstract:'Current approved abstract'},appointments:[],nominations:[],canNominate:false};
const noop=()=>{};
const render=(extra:Record<string,unknown>={})=>renderToStaticMarkup(<SupervisoryTeamRouteContent workspace={{teams:[team],appointments:[],nominations:[]}} role="Lecturer" view="detail" routeStudentId="P007" busy={false} search="" page={1} onSearch={noop} onPage={noop} onNominate={noop} onEnd={noop} onReplace={noop} onNominationAction={noop} {...extra}/>);

test('Authorized staff get a clear approved-application action without duplicating submitted evidence',()=>{
  for(const role of ['Lecturer','Programme Coordinator','Office Staff/Admin']){
    const html=render({role,onNavigateToApplication:noop,workspace:{teams:[{...team,approvedApplicationId:12}],appointments:[],nominations:[]}});
    assert.match(html,/>View approved application</);
    assert.equal((html.match(/>View approved application</g)??[]).length,1);
    assert.doesNotMatch(html,/data-supervisor-appointment-record/);
    assert.match(html,/Current approved research/);
    assert.doesNotMatch(html,/Research Intent|Submitted declaration|Course results/);
  }
});

test('Missing capability, missing navigation or an unmatched student does not produce an unusable application action',()=>{
  assert.doesNotMatch(render({onNavigateToApplication:noop}),/View approved application/);
  const workspace={teams:[{...team,approvedApplicationId:12}],appointments:[],nominations:[]};
  assert.doesNotMatch(render({workspace}),/View approved application/);
  assert.doesNotMatch(render({workspace,onNavigateToApplication:noop,routeStudentId:'OTHER'}),/View approved application/);
});
