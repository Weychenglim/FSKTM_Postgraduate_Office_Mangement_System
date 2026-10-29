import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ResearchAmendmentCard} from './ResearchAmendments';
import type {ResearchAmendment} from '../services/researchAmendmentsApi';

const request:ResearchAmendment={id:12,kind:'RESEARCH',status:'PENDING_SUPERVISOR',studentId:7,studentName:'Student One',matricNo:'PG007',sourceProgramme:'Computing',destinationProgramme:'',
  before:{programme:'Computing',title:'Saved title',abstract:'Saved abstract'},after:{programme:'Computing',title:'Proposed title text',abstract:'Saved abstract'},reason:'Clarify the study population.',createdAt:'2026-10-09T08:00:00Z',updatedAt:'2026-10-09T08:00:00Z',stageLabel:'Awaiting Supervisor review',canDecide:true,canCancel:false,requiresTeamAcknowledgement:false,teamSnapshot:{primary:null,coSupervisors:[],panel:[]},unfinishedTaskCount:null,events:[]};
const render=(row=request,studentView=false)=>renderToStaticMarkup(<ResearchAmendmentCard row={row} presentation="detail" studentView={studentView} busy={false} onAction={()=>{}}/>);

test('Research request separates identity, saved comparison and decision surfaces',()=>{
  const html=render();
  for(const heading of ['Request overview','Requested changes','Review and outcome'])assert.ok(html.includes(`>${heading}</h2>`),heading);
  assert.match(html,/data-research-request-columns/);
  assert.ok(html.indexOf('Clarify the study population.')>html.indexOf('Requested changes'));
  assert.ok(html.indexOf('Clarify the study population.')<html.indexOf('Before this request'));
  assert.match(html,/data-detail-actions/);
  assert.doesNotMatch(html,/Saved abstract/,'Unchanged fields remain omitted');
});

test('Request comparison labels reflect saved proposals and approved values without rewriting history',()=>{
  assert.match(render(),/Before this request/);
  assert.match(render(),/>Proposed title</);
  const approved=render({...request,status:'APPROVED',canDecide:false});
  assert.match(approved,/>Approved title</);
  assert.match(approved,/Saved title|Proposed title text/);
  assert.doesNotMatch(approved,/>Proposed title</);
  for(const status of ['REJECTED','CANCELLED'] as const){
    const html=render({...request,status,canDecide:false});
    assert.match(html,/>Proposed title</);assert.doesNotMatch(html,/>Approved title</);
  }
});

test('New review surfaces preserve read-only capabilities, Student privacy and busy actions',()=>{
  const student=render({...request,canCancel:true},true);
  assert.match(student,/>Cancel request</);assert.doesNotMatch(student,/>Approve request<|>Reject request</);
  const readonly=render({...request,canDecide:false});
  assert.doesNotMatch(readonly,/data-detail-actions/);
  const busy=renderToStaticMarkup(<ResearchAmendmentCard row={request} presentation="detail" busy onAction={()=>{}} onViewProfile={()=>{}}/>);
  assert.equal((busy.match(/disabled=""/g)||[]).length,3,'Profile navigation and both decisions remain disabled while busy');
});
