import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as reports from './WorkflowReports';
import * as dossier from './StudentProgressDossier';
import type { WorkflowReportAttentionItem } from '../types';

const capacity: WorkflowReportAttentionItem = {
  kind: 'LECTURER_CAPACITY', recordType: 'LECTURER_CAPACITY', recordId: 'L001',
  studentId: null, label: 'Dr Example - Supervisor Not Configured', programme: 'Computing',
  waitingDays: null, waitingOn: null, deadlineState: null, dueAt: null,
  capacityRole: 'SUPERVISOR', capacityState: 'NOT_CONFIGURED',
};
assert.equal(typeof reports.ReportAttentionState, 'function', 'Capacity attention has a typed presentation instead of falling through to Overdue - No date');
const state = (item: WorkflowReportAttentionItem) => renderToStaticMarkup(<reports.ReportAttentionState item={item} />);
assert.match(state(capacity), /Not Configured/i);
assert.doesNotMatch(state(capacity), /Overdue|No date/i);
assert.match(state({...capacity, capacityState:'OVER_CAPACITY'}), /Over Capacity/i);
assert.match(state({...capacity, kind:'DEADLINE', dueAt:'2026-10-01', deadlineState:'OVERDUE'}), /Overdue.*2026-10-01/);
assert.doesNotMatch(state({...capacity, kind:'DEADLINE'}), /Overdue/i, 'Missing deadline metadata cannot invent overdue work');
assert.match(state({...capacity, kind:'WAITING', waitingDays:12, waitingOn:'COORDINATOR'}), /12 days.*Coordinator/);

assert.equal(typeof dossier.DossierCalendarStatus, 'function', 'Office calendar expiry uses a calendar-specific label');
const calendar = (role: 'Office Staff/Admin'|'Lecturer'|'Student', status: string) => renderToStaticMarkup(<dossier.DossierCalendarStatus currentUserRole={role} status={status} />);
assert.match(calendar('Office Staff/Admin','COMPLETED'), />Ended</);
assert.doesNotMatch(calendar('Office Staff/Admin','COMPLETED'), /Completed/);
assert.match(calendar('Lecturer','COMPLETED'), />Completed</);
assert.match(calendar('Student','COMPLETED'), />Completed</);
assert.match(calendar('Office Staff/Admin','ACTIVE'), />Active</);
console.log('Office capacity attention and calendar expiry presentation regressions pass');
