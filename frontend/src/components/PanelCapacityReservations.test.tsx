import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {PanelRecommendationReviewDrawer} from './LecturerPanelAppointments';
import {PanelLecturerSummaryCards} from './PanelLecturerSummaryCards';
import {panelStatusLabel,buildPanelApprovalSteps} from '../utils/panelPresentation';
import {canCreatePanelRecommendation} from '../utils/panelRecommendationWorkflow';
import type {PanelRecommendationDraft} from '../types';

const row:PanelRecommendationDraft={id:91,studentId:'TEST-91',studentName:'Synthetic Student',programme:'Computing',
  proposedTopic:'Synthetic research',recommendedMember:'Dr Panel',recommendedMemberId:'L1',submittedDate:'',
  status:'SUBMITTED_TO_PANEL',canReview:true,
  acceptanceCapacity:{activeLoad:4,reservedLoad:1,limit:5,availableSlots:0,pendingRequests:2,state:'FULL'}};

test('full panel capacity blocks acceptance while keeping rejection available',()=>{
  const html=render(<PanelRecommendationReviewDrawer isOpen recommendation={row} reviewerRole="SELECTED_PANEL" onClose={()=>{}} onAccept={()=>{}} onReject={()=>{}}/>);
  assert.match(html,/<button[^>]*disabled=""[^>]*>[\s\S]*?Accept request/);
  assert.match(html,/<button(?![^>]* disabled=)[^>]*>[\s\S]*?Reject request/);
  assert.match(html,/No places available/);
  assert.match(html,/4 active/);
  assert.match(html,/1 reserved/);
});

test('one remaining panel place is prominent in workload summary',()=>{
  const html=render(<PanelLecturerSummaryCards workload={{currentStudents:4,workloadCount:4,confirmedAppointments:4,pendingNominations:0,workloadLimit:5,availableSlots:1,capacityState:'AVAILABLE',selectable:true}} reviewCount={2} awaitingCoordinatorCount={0}/>);
  assert.match(html,/1 place remaining/);
  assert.match(html,/4 active appointments/);
  assert.match(html,/0 reserved nominations/);
});

test('capacity closure is neutral, permits a new nomination and never claims panel rejection',()=>{
  assert.equal(panelStatusLabel('CANCELLED_CAPACITY_FULL'),'Capacity full');
  assert.equal(canCreatePanelRecommendation([{studentId:'TEST-91',status:'CANCELLED_CAPACITY_FULL'}],'TEST-91'),true);
  const steps=buildPanelApprovalSteps({...row,status:'CANCELLED_CAPACITY_FULL',workflow:[{id:1,actorName:'System',actorRole:'SYSTEM',action:'SYSTEM_CLOSE_CAPACITY',previousStatus:'SUBMITTED_TO_PANEL',newStatus:'CANCELLED_CAPACITY_FULL',reason:'Capacity full',createdAt:'2026-10-29T00:00:00Z'}]});
  assert.equal(steps.find(s=>s.id==='panel')?.state,'not_reached');
  assert.equal(steps.at(-1)?.state,'cancelled');
});
