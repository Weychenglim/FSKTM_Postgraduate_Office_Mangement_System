import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PanelRecommendationRecordsTable } from './PanelRecommendationRecordsTable';
import { PANEL_RECOMMENDATION_STATUS_LABELS, canCreatePanelRecommendation } from '../utils/panelRecommendationWorkflow';
import { panelRecommendationStatusGroup, filterPanelRecommendationRecords } from '../utils/panelRecommendationRecords';
import { getPanelRecommendations, toStudentSupervisorApplication } from '../services/appointmentsApi';
import { getPanelRecommendationProgressItems } from './LecturerPanelAppointments';
import { buildTimeline } from './RecommendationDetailsDrawer';
import type { SubmittedRecommendation } from '../types';
import type { PanelRecommendationDraft, SupervisorApplicationRecord } from '../types';

const record: PanelRecommendationDraft = { id: 1, studentId: 'SYN-001', studentName: 'Synthetic Student',
  programme: 'AI', proposedTopic: 'Synthetic research', recommendedMember: 'Synthetic Panel', recommendedMemberId: 'P-001',
  submittedDate: '08 Oct 2026', status: 'CANCELLED_BY_OFFICE' as PanelRecommendationDraft['status'],
  cancellationReason: 'Office lifecycle cancellation', selectedPanelDecision: null };
const markup = renderToStaticMarkup(<PanelRecommendationRecordsTable title="Review history" subtitle="" records={[record]} onView={() => {}} />);
assert.match(markup, /Cancelled by Office/);
assert.doesNotMatch(markup, /Awaiting decision/);
assert.equal(panelRecommendationStatusGroup(record.status), 'Cancelled');
assert.equal(PANEL_RECOMMENDATION_STATUS_LABELS[record.status], 'Cancelled by Office');
assert.equal(canCreatePanelRecommendation([{studentId:record.studentId,status:record.status}],record.studentId),true);
assert.deepEqual(filterPanelRecommendationRecords([record], '', 'Pending'), []);
assert.equal(getPanelRecommendationProgressItems(record).find(item => item.id === 'panel')?.status, 'cancelled');

const acceptedRecord = { ...record, selectedPanelDecision: 'ACCEPTED' as const, panelDecisionAt: '2026-10-08T04:00:00Z' };
const progress = getPanelRecommendationProgressItems(acceptedRecord);
assert.equal(progress.find(item => item.id === 'panel')?.status, 'completed');
assert.match(progress.find(item => item.id === 'panel')?.subtext ?? '', /accepted/);
assert.equal(progress.find(item => item.id === 'coordinator')?.status, 'cancelled');
const submitted = { workflowStatus: 'CANCELLED_BY_OFFICE', status: 'Cancelled', date: '08 Oct 2026',
  id: 'REC-0001', studentName: record.studentName, studentId: record.studentId,
  researchTitle: record.proposedTopic, recommendedPanel: record.recommendedMember, semester: '',
  selectedPanelDecision: 'ACCEPTED', panelDecisionAt: acceptedRecord.panelDecisionAt,
  cancellationReason: record.cancellationReason } satisfies SubmittedRecommendation;
const timeline = buildTimeline(submitted);
assert.equal(timeline.find(item => item.id === 'panel')?.state, 'completed');
assert.equal(timeline.find(item => item.id === 'panel')?.label, 'Selected Panel Review');
assert.doesNotMatch(timeline.find(item => item.id === 'coordinator')?.detail ?? '', /Not reached/);
assert.match(timeline.find(item => item.id === 'coordinator')?.detail ?? '', /cancelled/i);
assert.equal(timeline.find(item => item.id === 'coordinator')?.state, 'cancelled');
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = (async () => new Response(JSON.stringify([acceptedRecord]))) as typeof fetch;
  const mapped = (await getPanelRecommendations())[0];
  assert.equal(mapped.selectedPanelDecision, 'ACCEPTED');
  assert.equal(buildTimeline(mapped).find(item => item.id === 'panel')?.state, 'completed');
} finally {
  globalThis.fetch = originalFetch;
}

const supervisorRecord = { id:1, studentId:'SYN-001', status:'CANCELLED_BY_OFFICE', submittedAt:'2026-10-08T04:00:00Z',
  workflow:[], researchTitle:'Synthetic research', proposedSupervisor:'Synthetic Supervisor', researchArea:'Computing',
  cancellationReason:'Office lifecycle cancellation' } as unknown as SupervisorApplicationRecord;
assert.equal(toStudentSupervisorApplication(supervisorRecord).status, 'CANCELLED');
console.log('Office lifecycle cancellation labels, filters and Student history mapping passed');
