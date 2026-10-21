import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {buildPanelReviewWorkspace} from './panelReviewWorkspace';
import {PanelBrowse,filterPanelBrowse} from '../components/PanelBrowse';
import {ListState} from '../components/ListState';
import type {PanelRecommendationDraft} from '../types';

const pending:PanelRecommendationDraft={id:1,studentId:'PG1',studentName:'Needs review',programme:'Computing',proposedTopic:'Title',recommendedMember:'Dr Panel',recommendedMemberId:'L1',submittedDate:'2026-10-18',status:'SUBMITTED_TO_PANEL'};
const accepted:PanelRecommendationDraft={...pending,id:2,studentName:'Accepted applicant',status:'PENDING_COORDINATOR',selectedPanelDecision:'ACCEPTED',panelDecisionAt:'2026-10-18T01:00:00Z'};
test('incoming review history follows authenticated history membership, while outgoing stays ongoing',()=>{
  const cancelled:PanelRecommendationDraft={...pending,id:4,status:'CANCELLED_BY_OFFICE'};
  const workspace=buildPanelReviewWorkspace([pending,pending,{...accepted,status:'SUBMITTED_TO_PANEL'}],[accepted,{...pending,id:3,status:'REJECTED_BY_PANEL'},cancelled]);
  assert.equal(workspace.records.length,4);
  assert.equal(workspace.requestViewForRecord(accepted),'history');
  assert.equal(workspace.requestViewForRecord(pending),'requests');
  assert.equal(workspace.reviewCount,1);
  assert.equal(workspace.awaitingCoordinatorCount,1);
  assert.equal(filterPanelBrowse(workspace.records,{view:'history',requestViewForRecord:workspace.requestViewForRecord}).length,3);
  assert.equal(filterPanelBrowse([accepted],{view:'requests'}).length,1);
  assert.equal(filterPanelBrowse([accepted],{view:'requests',appointments:true}).length,0);
  assert.equal(workspace.records.find(r=>r.id===4)?.selectedPanelDecision,undefined);
});
test('explicit incoming History route overrides remembered Requests and shows accepted requests read-only',()=>{
  const workspace=buildPanelReviewWorkspace([pending],[accepted]);
  const memory=new Map<string,unknown>([['PanelBrowse:lecturer-reviews:view','requests'],['PanelBrowse:lecturer-reviews:status','SUBMITTED_TO_PANEL']]);
  const html=render(React.createElement(ListState.Provider,{value:memory},React.createElement(PanelBrowse,{scope:'lecturer-reviews',title:'Appointment requests',records:workspace.records,view:'history',requestViewForRecord:workspace.requestViewForRecord,onOpen:()=>{}})));
  assert.match(html,/Accepted applicant/);
  assert.doesNotMatch(html,/Needs review/);
  assert.match(html,/Awaiting Coordinator/);
  assert.match(html,/>Accepted</);
  assert.match(html,/18 Oct 2026/);
  assert.match(html,/View request/);
  const reverseMemory=new Map<string,unknown>([['PanelBrowse:lecturer-reviews:view','history'],['PanelBrowse:supervisor-nominations:view','history']]);
  const requests=render(React.createElement(ListState.Provider,{value:reverseMemory},React.createElement(PanelBrowse,{scope:'lecturer-reviews',title:'Appointment requests',records:workspace.records,view:'requests',requestViewForRecord:workspace.requestViewForRecord,onOpen:()=>{}})));
  assert.match(requests,/Needs review/);
  assert.doesNotMatch(requests,/Accepted applicant/);
});
test('cancelled incoming History distinguishes acceptance from cancellation before review',()=>{
  const before:PanelRecommendationDraft={...pending,id:5,studentName:'Cancelled before review',status:'CANCELLED_BY_OFFICE',selectedPanelDecision:null};
  const after:PanelRecommendationDraft={...accepted,id:6,studentName:'Cancelled after acceptance',status:'CANCELLED_BY_OFFICE'};
  const workspace=buildPanelReviewWorkspace([],[before,after]);
  const html=render(React.createElement(PanelBrowse,{scope:'cancelled-reviews',title:'Appointment requests',records:workspace.records,view:'history',requestViewForRecord:workspace.requestViewForRecord,onOpen:()=>{}}));
  assert.match(html,/No decision recorded/);
  assert.match(html,/>Accepted</);
  assert.match(html,/Cancelled by Office/);
  assert.doesNotMatch(html,/Review request/);
});
