import assert from 'node:assert/strict';

import {
  buildWorkflowReportQuery,
  canAccessWorkflowReports,
  formatReportMetric,
  resolveWorkflowReportRecordRoute,
} from './workflowReports';

assert.equal(
  buildWorkflowReportQuery({
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    programme: 'Master of AI',
  }),
  '?startDate=2026-07-01&endDate=2026-07-31&programme=Master+of+AI',
);
assert.equal(buildWorkflowReportQuery({ startDate: '', endDate: '', programme: '' }), '');

assert.equal(formatReportMetric(null), '—');
assert.equal(formatReportMetric(0), '0');
assert.equal(formatReportMetric(62.5, '%'), '62.5%');

assert.equal(canAccessWorkflowReports('Office Staff/Admin'), true);
assert.equal(canAccessWorkflowReports('Programme Coordinator'), true);
assert.equal(canAccessWorkflowReports('Lecturer'), true);
assert.equal(canAccessWorkflowReports('Student'), false);

assert.equal(
  resolveWorkflowReportRecordRoute({
    recordType: 'SUPERVISOR_APPLICATION',
    recordId: '15',
  }),
  '/supervisor-appointments/15',
);
assert.equal(
  resolveWorkflowReportRecordRoute({
    recordType: 'PANEL_RECOMMENDATION',
    recordId: '21',
  }),
  '/panel-appointments/recommendations/21',
);
assert.equal(
  resolveWorkflowReportRecordRoute({ recordType: 'MARK_TASK', recordId: '8' }),
  '/marks',
);
assert.equal(
  resolveWorkflowReportRecordRoute({
    recordType: 'TIMELINE_ENTRY',
    recordId: '4',
  }),
  '/dashboard/timeline',
);
assert.equal(
  resolveWorkflowReportRecordRoute({
    recordType: 'LECTURER_PARTICIPANT',
    recordId: 'DEMO-LECT-001',
  }),
  '/dashboard/participant-lifecycle',
);

console.log('workflowReports tests passed');
