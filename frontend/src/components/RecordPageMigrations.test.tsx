import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecommendPanelMemberDrawer } from './RecommendPanelMemberDrawer';
import { RecommendationDetailsDrawer } from './RecommendationDetailsDrawer';
import { AddTimelineEntryDrawer } from './AddTimelineEntryDrawer';
import { EditTimelineEntryDrawer } from './EditTimelineEntryDrawer';
import { UploadTimelineDrawer } from './UploadTimelineDrawer';

const student = {studentName:'Synthetic student',studentId:'M123',programme:'Computing',intake:'2026-S1',supervisor:'Dr Primary',initials:'SS',proposedTopic:'Research title',area:'Networks',abstract:'Recorded abstract'};
const recommendation: any = {id:'7',recommendationId:7,studentId:'M123',studentName:'Synthetic student',programme:'Computing',semester:'2026-S1',researchTitle:'Research title',researchArea:'Networks',abstract:'Recorded abstract',justification:'Relevant expertise',recommendedPanel:'Dr Panel',recommendedPanelId:'L123',status:'Pending Approval',workflowStatus:'SUBMITTED_TO_PANEL',date:'11 Oct 2026',submittedAt:'2026-10-11T00:00:00Z',workflow:[]};
const cases: [string, React.ReactNode][] = [
  ['Panel nomination', <RecommendPanelMemberDrawer isOpen onClose={() => {}} student={student} candidates={[]} onSubmit={() => {}} />],
  ['Panel tracking', <RecommendationDetailsDrawer isOpen onClose={() => {}} recommendation={recommendation} />],
  ['Timeline creation', <AddTimelineEntryDrawer isOpen onClose={() => {}} onSave={() => {}} timelineLabel="2026-S1" />],
  ['Timeline editing', <EditTimelineEntryDrawer isOpen onClose={() => {}} onSave={() => {}} timelineLabel="2026-S1" entry={{id:'1',event:'Synthetic milestone',category:'Research Project (P1)',startDate:'11 Oct 2026',endDate:'12 Oct 2026',targetRole:['STUDENT']}} />],
  ['Timeline import', <UploadTimelineDrawer isOpen onClose={() => {}} onImportSuccess={() => {}} semesterId={1} semesterLabel="2026-S1" />],
];
for (const [name, component] of cases) {
  const html = renderToStaticMarkup(component);
  if (name === 'Timeline editing') {
    assert.match(html, /<dialog/);
    assert.doesNotMatch(html, /data-record-page|class="back-link/);
    continue;
  }
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${name} is a full page`);
  assert.match(html, /class="back-link/, `${name} has the shared return link`);
  assert.doesNotMatch(html, /fixed inset|role="dialog"|<dialog/, `${name} is not a substantial overlay`);
}
console.log('Record page forms and the timeline edit modal use their intended surfaces');
