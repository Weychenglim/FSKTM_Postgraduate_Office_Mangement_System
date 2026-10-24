import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as reports from './WorkflowReports';
import * as metrics from '../utils/workflowReports';
import type { WorkflowReport } from '../types';

for (const role of ['Lecturer', 'Programme Coordinator', 'Office Staff/Admin'] as const) {
  const html = renderToStaticMarkup(<reports.WorkflowReports currentUserRole={role} onBack={() => {}} onNavigateToRoute={() => {}} />);
  const controls = html.match(/<input\b[^>]*>|<button\b(?=[^>]*role="combobox")[^>]*>/g) ?? [];
  assert.equal(controls.length, role === 'Office Staff/Admin' ? 4 : 3);
  for (const control of controls) assert.match(control, /class="[^"]*\bform-control\b/, `${role} filters use the shared visible control`);
  assert.match(html, /data-workspace-filter-card/);
  assert.match(html, /Clear filters/);
  assert.doesNotMatch(html, /Apply filters|Reset filters|Filter changes have not been applied/i);
}

const report: WorkflowReport = {
  generatedAt:'2026-10-10T08:00:00Z', scope:{role:'LECTURER',programme:null},
  filters:{startDate:null,endDate:null,programme:null,availableProgrammes:[],semester:'active',selectedSemester:null,availableSemesters:[]},
  overview:{totalRecords:9,pendingApprovals:3,averageWaitingDays:1,longestWaitingDays:2,marksCompletionRate:33,overdueMarks:1,activeTimelineEntries:0},
  supervisor:null,panel:null,timeline:null,participantLifecycle:null,capacity:null,reconciliation:null,attention:[],
  marks:{total:3,statusCounts:{SUBMITTED:1,DRAFT:1,NOT_STARTED:1},deadlineStateCounts:{OVERDUE:1},evaluatorRoleCounts:{},completionRate:33,
    records:['SUBMITTED','DRAFT','NOT_STARTED'].map((status,i)=>({recordType:'MARK_TASK',recordId:String(i),status,reportDate:'2026-10-10'}))},
};
assert.ok('getLecturerReportMetrics' in metrics, 'Lecturer cards describe actionable report work');
const cards = metrics.getLecturerReportMetrics(report);
assert.deepEqual(cards.map(card => [card.id,card.value]), [['waiting',3],['evaluations',2],['overdue',1]]);
assert.equal(metrics.getLecturerReportMetrics({...report,marks:null}).length,1);
const html = renderToStaticMarkup(<reports.LecturerReportSummary report={report} onNavigateToRoute={() => {}} />);
assert.match(html,/href="#workflow-attention"/);
assert.match(html,/Open Marks Entry/);
assert.doesNotMatch(html,/Records in scope|Average waiting|Marks completion/);
console.log('Shared report controls and scoped Lecturer action summaries pass');
