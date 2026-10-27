import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SupervisorRequestDetail, type SupervisorRequestPresentation} from './SupervisorRequestDetail';

const request: SupervisorRequestPresentation = {studentName:'Example applicant',studentId:'EXAMPLE-01',programme:'Computing',semester:'Semester I',proposedSupervisor:'Dr Example',status:'SUBMITTED_TO_SUPERVISOR',researchTitle:'Submitted research title',researchArea:'Networks',researchAbstract:'First paragraph.\n\nSecond paragraph.',projectCourseCodes:'TEST7001',events:[]};

test('Reviewers get separate student, research and documents cards with a review column',()=>{
  const html=renderToStaticMarkup(<SupervisorRequestDetail request={request} contextAction={<button>View student record</button>} actions={<button>Authorized review action</button>}/>);
  for(const label of ['Student information','Research details','Supporting documents and declaration','Review and outcome'])assert.ok(html.includes(label),label);
  const positions=['Example applicant','Student information','Research details','Supporting documents and declaration','Review and outcome','Authorized review action'].map(text=>html.indexOf(text));
  assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
  assert.equal((html.match(/bg-white rounded-2xl border/g)||[]).length,4,'Student, research, supporting evidence and review have their own surfaces');
  assert.match(html,/data-request-columns/,'Review can sit beside the research instead of extending a giant card');
  assert.doesNotMatch(html,/>Application details</,'No catch-all application container');
  assert.ok(html.indexOf('View student record')<html.indexOf('Research details'));
  assert.match(html,/First paragraph\.\n\nSecond paragraph\./);
  assert.doesNotMatch(html,/line-clamp/);
});

test('All four role contexts retain only the actions supplied by their caller',()=>{
  for(const [role,action] of [['Student','Cancel my request'],['Lecturer','Review supervisor request'],['Programme Coordinator','Review coordinator request'],['Office Staff/Admin',null]] as const){
    const html=renderToStaticMarkup(<SupervisorRequestDetail request={request} actions={action?<button>{action}</button>:undefined}/>);
    assert.match(html,/Research details/,role);assert.match(html,/Review and outcome/,role);
    for(const candidate of ['Cancel my request','Review supervisor request','Review coordinator request'])assert.equal(html.includes(candidate),candidate===action,`${role}: ${candidate}`);
    assert.doesNotMatch(html,/>Approve<|>Reject</,'Layout does not grant capabilities');
  }
});

test('A supervision record without request history has no invented review process',()=>{
  const html=renderToStaticMarkup(<SupervisorRequestDetail request={request} showApproval={false}/>);
  assert.match(html,/Research details/);
  assert.doesNotMatch(html,/Review and outcome|Approval progress|Research submitted with this request/);
});


test('Approval steps are subordinate to their review section heading',()=>{
  const html=renderToStaticMarkup(<SupervisorRequestDetail request={request}/>);
  assert.match(html,/<h3[^>]*>Approval progress<\/h3>/);
  assert.match(html,/<h4[^>]*>Request submitted<\/h4>/);
});
