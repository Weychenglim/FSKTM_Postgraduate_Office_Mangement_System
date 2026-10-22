import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SupervisorRequestDetail } from './SupervisorRequestDetail';
import { PanelRecommendationDetail } from './PanelRecordDetails';
import { requestStatusLabel } from '../utils/lecturerRequests';
import { panelStatusLabel, buildPanelApprovalSteps } from '../utils/panelPresentation';
import { buildSupervisorApprovalProcess } from '../utils/approvalProcess';
import type { PanelRecommendationDraft } from '../types';
import { ResearchDetailsCard } from './AppointmentRequestSections';
import { StudentResearchProfileSection } from './StudentResearchProfileSection';

const panel: PanelRecommendationDraft = {
  id: 8, studentId: 'PG8', studentName: 'Student Eight', programme: 'Computing', semester: 'S1',
  proposedTopic: 'Current profile title', researchArea: 'Networks', abstract: 'First paragraph.\n\nSecond paragraph.',
  recommendedMember: 'Dr Panel', recommendedMemberId: 'L8', supervisorName: 'Dr Supervisor',
  status: 'APPROVED', submittedDate: '16 Oct 2026', submittedAt: '2026-10-16T00:00:00Z',
  panelDecisionAt: '2026-10-16T01:00:00Z', coordinatorDecisionAt: '2026-10-16T02:00:00Z',
  justification: 'Relevant expertise', studentEmail: 'student@example.test', panelMemberEmail: 'panel@example.test',
};

test('Supervisor and Panel requests use the same status vocabulary across review capabilities', () => {
  assert.equal(panelStatusLabel('APPROVED'), 'Approved');
  assert.equal(panelStatusLabel('PENDING_COORDINATOR'), requestStatusLabel('PENDING_COORDINATOR'));
  assert.equal(panelStatusLabel('SUBMITTED_TO_PANEL'), 'Awaiting Panel review');
  assert.equal(requestStatusLabel('SUBMITTED_TO_SUPERVISOR', true), 'Awaiting Supervisor review');
  for (const status of ['REJECTED_BY_COORDINATOR', 'CANCELLED_BY_OFFICE']) assert.equal(panelStatusLabel(status), requestStatusLabel(status));
  assert.equal(panelStatusLabel('ACTIVE'), 'Active');
  assert.equal(panelStatusLabel('ENDED'), 'Ended');
});

test('Both request types render the shared summary and research cards with navigation before research', () => {
  const supervisor = renderToStaticMarkup(<SupervisorRequestDetail request={{ studentId: 'PG8', studentName: 'Student Eight', programme: 'Computing', semester: 'S1', proposedSupervisor: 'Dr Supervisor', status: 'APPROVED', researchTitle: 'Immutable submitted title', researchArea: 'Networks', researchAbstract: panel.abstract }} contextAction={<button>View student record</button>} />);
  const recommendation = renderToStaticMarkup(<PanelRecommendationDetail record={panel} contextAction={<button>View student record</button>} />);
  for (const html of [supervisor, recommendation]) {
    assert.match(html, /data-request-summary/);
    assert.match(html, /data-research-details/);
    assert.ok(html.indexOf('View student record') < html.indexOf('data-research-details'));
    assert.match(html, /First paragraph\.\n\nSecond paragraph\./);
    assert.doesNotMatch(html, /line-clamp/);
  }
  assert.match(supervisor, /Research submitted with this request/);
  assert.match(supervisor, /Immutable submitted title/);
  assert.match(recommendation, /Current saved student research profile/);
  const summary = recommendation.split('data-research-details')[0];
  assert.match(summary, /<details[^>]*>[\s\S]*Contact details/);
  assert.ok(summary.indexOf('student@example.test') > summary.indexOf('<details'));
  assert.doesNotMatch(summary, /<details[^>]*open/);
  assert.ok(recommendation.indexOf('Relevant expertise') > recommendation.indexOf('Second paragraph.'));
});

test('Timeline labels describe recorded actions, pending stages and unknown history consistently', () => {
  const complete = buildPanelApprovalSteps(panel);
  assert.equal(complete[0].label, 'Request submitted');
  assert.equal(complete[1].label, 'Panel accepted');
  assert.equal(complete[2].label, 'Coordinator approved');
  const pending = buildPanelApprovalSteps({ ...panel, status: 'SUBMITTED_TO_PANEL', panelDecisionAt: null, coordinatorDecisionAt: null });
  assert.equal(pending[1].label, 'Awaiting Panel review');
  assert.doesNotMatch(JSON.stringify(pending), /selected Panel|Selected Panel|Coordinator confirmation/);
  const unknown = buildPanelApprovalSteps({ ...panel, panelDecisionAt: null, coordinatorDecisionAt: null });
  assert.equal(unknown[1].state, 'unknown');
  assert.notEqual(unknown[1].label, 'Panel accepted');
  const supervisor = buildSupervisorApprovalProcess({ kind: 'primary', status: 'APPROVED', events: [
    { id: 1, action: 'ACCEPT', actorName: 'Dr Supervisor', previousStatus: 'SUBMITTED_TO_SUPERVISOR', newStatus: 'PENDING_COORDINATOR', createdAt: panel.panelDecisionAt! },
    { id: 2, action: 'APPROVE', actorName: 'Dr Coordinator', previousStatus: 'PENDING_COORDINATOR', newStatus: 'APPROVED', createdAt: panel.coordinatorDecisionAt! },
  ] });
  assert.equal(supervisor[0].label, 'Request submitted');
  assert.equal(supervisor[1].label, 'Supervisor accepted');
  assert.equal(supervisor[2].label, 'Coordinator approved');
});

test('Request and saved profile abstracts share an unabridged reading area', () => {
  const abstract = `First paragraph.\n\nSecond paragraph with a saved line break.\n${'UnbrokenResearchTerm'.repeat(30)}`;
  for (const html of [
    renderToStaticMarkup(<ResearchDetailsCard abstract={abstract} source="submitted" />),
    renderToStaticMarkup(<StudentResearchProfileSection profile={{ title: 'Saved title', area: 'Networks', programme: 'Computing', abstract }} />),
  ]) {
    assert.match(html, /data-research-abstract/);
    assert.ok(html.includes(abstract), 'Saved paragraphs, line breaks and long terms remain intact');
    assert.doesNotMatch(html, /line-clamp|truncate|max-h-|overflow-y-auto/, 'Abstracts are not clipped or given a nested scrollbar');
  }
});
