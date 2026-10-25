import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as reports from './WorkflowReports';
import * as reconciliation from './WorkflowReconciliationCentre';
import type { WorkflowReport, WorkflowReportAttentionItem, ReconciliationIssue } from '../types';
import { APP_ROUTES } from '../constants/routes';
import { ListState } from './ListState';

assert.equal(typeof reports.getOfficeReportAttentionPage, 'function', 'Report attention stays bounded while preserving access to every row');
const rows = Array.from({length:23}, (_,index) => ({recordId:String(index)} as WorkflowReportAttentionItem));
assert.deepEqual(reports.getOfficeReportAttentionPage(rows, 1).rows.map(row=>row.recordId), ['0','1','2','3','4','5','6','7','8','9']);
assert.deepEqual(reports.getOfficeReportAttentionPage(rows, 3).rows.map(row=>row.recordId), ['20','21','22']);
assert.equal(reports.getOfficeReportAttentionPage(rows, 99).page, 3);
assert.equal(reports.getOfficeReportAttentionPage(rows, -1).page, 1);
assert.equal(reports.getOfficeReportAttentionPage(rows, Number.NaN).page, 1);
assert.equal(reports.getOfficeReportAttentionPage([], 5).page, 1);

const capacity = {semesterId:4, semesterCode:'2026-1', supervisor:{AVAILABLE:2,NOT_CONFIGURED:1},panel:{AVAILABLE:1,OVER_CAPACITY:1}};
const html = renderToStaticMarkup(<reports.OfficeReportBreakdown report={{capacity} as WorkflowReport} section="capacity" onNavigate={()=>{}} />);
assert.match(html,/Faculty-wide lecturer role entries for 2026-1/);
assert.match(html,/Programme and report date filters do not narrow/);
assert.match(html,/Not Configured/);
assert.match(html,/Over Capacity/);
assert.doesNotMatch(html,/Overdue/);
assert.match(renderToStaticMarkup(<reports.OfficeReportBreakdown report={{capacity:null} as WorkflowReport} section="capacity" onNavigate={()=>{}} />),/Choose a specific semester/);

assert.equal(typeof reconciliation.humanizeReconciliationLabel, 'function', 'Reconciliation camelCase keys remain readable');
assert.equal(reconciliation.humanizeReconciliationLabel('capacityPlanId'),'Capacity Plan ID');
assert.equal(reconciliation.humanizeReconciliationLabel('hasSupervisorRole'),'Has Supervisor Role');
assert.equal(reconciliation.humanizeReconciliationLabel('CAPACITY_PLAN_MISSING'),'Capacity Plan Missing');
assert.equal(typeof reconciliation.reconciliationOwningRoute, 'function', 'Known capacity review cases have a safe owning destination');
const issue = {issueType:'CAPACITY_PLAN_INCOMPLETE', navigation:{targetModule:'DASHBOARD',recordType:'CAPACITY_PLAN',recordId:'9'}} as ReconciliationIssue;
assert.equal(reconciliation.reconciliationOwningRoute(issue), APP_ROUTES.dashboardLecturerCapacity);
assert.equal(reconciliation.reconciliationOwningRoute({...issue,issueType:'UNRECOGNISED'}),null);
assert.equal(reconciliation.reconciliationOwningRoute({...issue,issueType:'OTHER',navigation:{targetModule:'MARKS',recordType:'MARK_TASK',recordId:'7'}}),APP_ROUTES.marks);
assert.equal(reconciliation.reconciliationOwningRoute({...issue,currentState:{semesterId:4}}),`${APP_ROUTES.dashboardLecturerCapacity}?semester=4`,'Review capacity retains a known semester');

const memory = new Map<string, unknown>([
  ['OfficeWorkflowReports:filters',{semester:'all',startDate:'2026-09-01'}],
  ['OfficeWorkflowReports:draftFilters',{semester:'all',startDate:'2026-10-01'}],
]);
const reportView = (role:'Office Staff/Admin'|'Lecturer') => renderToStaticMarkup(<ListState.Provider value={memory}><reports.WorkflowReports currentUserRole={role} onBack={()=>{}} onNavigateToRoute={()=>{}} /></ListState.Provider>);
assert.match(reportView('Office Staff/Admin'),/value="2026-09-01"/,'Returning Office report restores the latest filter selection');
assert.doesNotMatch(reportView('Office Staff/Admin'),/Apply filters|Filter changes have not been applied/);
assert.doesNotMatch(reportView('Lecturer'),/2026-09-01|2026-10-01/,'Other roles do not read Office report state');
console.log('Office report bounds, capacity scope, return filters, reconciliation labels and owning destinations pass');
