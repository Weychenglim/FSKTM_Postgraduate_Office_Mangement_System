import assert from 'node:assert/strict';
import test from 'node:test';
import * as presentation from './workflowReconciliation';
import type { ReconciliationIssue } from '../types';
import { APP_ROUTES } from '../constants/routes';

const issue = (overrides: Partial<ReconciliationIssue> = {}): ReconciliationIssue => ({
  issueId: 'capacity.3', module: 'WORKFLOW_TRACKING', issueType: 'CAPACITY_LEGACY_LIMIT_DIVERGENCE',
  severity: 'WARNING', repairability: 'REVIEW_REQUIRED', title: 'Semester capacity differs from the legacy profile limit',
  summary: 'The semester policy is authoritative.', recordType: 'CAPACITY_ENTRY', recordId: '3',
  studentId: null, programme: null, currentState: {
    lecturerName: 'Dr Lee', staffNo: 'L001', semesterLabel: 'Semester I 2026/2027', planVersion: 5,
    supervisorLimit: 1, legacySupervisorLimit: 5, panelLimit: 10, legacyPanelLimit: 10,
  }, suggestion: {}, dependencies: [], navigation: {}, fingerprint: 'a'.repeat(64), ...overrides,
});

test('legacy differences explain authority without claiming capacity is invalid', () => {
  assert.equal(typeof presentation.reconciliationExplanation, 'function');
  const result = presentation.reconciliationExplanation(issue());
  assert.match(result.why, /Supervisor: 1.*5/);
  assert.doesNotMatch(result.why, /Panel:/);
  assert.match(result.effect, /semester.*remain.*in force/i);
  assert.match(result.next, /intentional/i);
  assert.equal(result.actionLabel, 'Review capacity limits');
  assert.deepEqual(presentation.reconciliationIdentity(issue()), {
    name: 'Dr Lee', context: 'L001 · Semester I 2026/2027 · Version 5',
  });
});

test('missing semester explains why automatic assignment is withheld', () => {
  const result = presentation.reconciliationExplanation(issue({
    issueType: 'SEMESTER_UNASSIGNED', currentState: { academicSemesterId: null, matchingSemesterCount: 0 },
  }));
  assert.match(result.why, /not linked/i);
  assert.match(result.next, /no single.*match/i);
  assert.doesNotMatch(result.effect, /blocked/i);
  assert.deepEqual(presentation.reconciliationIdentity(issue({
    issueType: 'SEMESTER_UNASSIGNED', recordType: 'SEMESTER_TIMELINE',
    currentState: { recordedSemester: 'Semester I 2024/2025' },
  })), { name: 'Semester I 2024/2025', context: 'Semester timeline #3' });
});

test('missing capacity repair describes a draft copy rather than publishing', () => {
  const result = presentation.reconciliationExplanation(issue({
    issueType: 'CAPACITY_PLAN_MISSING', repairability: 'REPAIRABLE',
    currentState: { semesterLabel: 'Semester I 2027/2028', lifecycleStatus: 'DRAFT' },
  }));
  assert.match(result.next, /draft.*review.*publish/i);
  assert.match(result.effect, /activation/i);
});

test('unknown checks preserve server explanation and do not invent a repair', () => {
  const result = presentation.reconciliationExplanation(issue({ issueType: 'FUTURE_CHECK', summary: 'Verified server evidence.' }));
  assert.equal(result.why, 'Verified server evidence.');
  assert.match(result.next, /source record/i);
  assert.deepEqual(presentation.reconciliationIdentity(issue({ currentState: {}, studentId: 'S001' })), {
    name: 'S001', context: 'Capacity entry #3',
  });
});

test('repair details identify exact semester, source version and managed programme', () => {
  assert.deepEqual(presentation.reconciliationRepairDetails(issue({
    suggestion: { semesterLabel: 'Semester II 2026/2027', semesterCode: '2026-2027-S2' },
  }), { action: 'ASSIGN_SEMESTER', semesterId: 2, label: 'Assign semester' }), [
    { label: 'Assign to semester', value: 'Semester II 2026/2027 · 2026-2027-S2' },
  ]);
  assert.deepEqual(presentation.reconciliationRepairDetails(issue({
    currentState: { semesterLabel: 'Semester I 2027/2028' },
    suggestion: { sourcePlanId: 5, sourcePlanVersion: 3, sourceSemesterLabel: 'Semester I 2026/2027' },
  }), { action: 'COPY_CAPACITY_PLAN', label: 'Copy policy' }), [
    { label: 'Create draft for', value: 'Semester I 2027/2028' },
    { label: 'Copy from', value: 'Semester I 2026/2027 · Version 3' },
  ]);
  assert.deepEqual(presentation.reconciliationRepairDetails(issue(), { action: 'ASSIGN_COORDINATOR_PROGRAMME', label: 'Assign programme', requiresProgramme: true }, 'Master of AI'), [
    { label: 'Managed programme', value: 'Master of AI' },
  ]);
});

test('marks source links open the owning configuration or task workspace', () => {
  assert.equal(presentation.reconciliationRecordRoute('MARKS', 'EVALUATION_PERIOD', '7'), APP_ROUTES.marksConfig);
  assert.equal(presentation.reconciliationRecordRoute('MARKS', 'MARKS_TASK', '8'), APP_ROUTES.marksTasks);
});
