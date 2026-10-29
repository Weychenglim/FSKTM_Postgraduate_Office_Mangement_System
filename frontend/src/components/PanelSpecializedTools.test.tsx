import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as workload from './PanelWorkloadMonitoring';
import { RecommendPanelMemberDrawer } from './RecommendPanelMemberDrawer';
import { appointmentDetailTypography as typography } from './AppointmentPrimitives';
import type { PanelWorkloadRecord } from '../types';
import { ListState } from './ListState';

const lecturer: PanelWorkloadRecord = { id: 'L001', name: 'Dr Panel', department: 'Computing', initials: 'DP', currentStudents: 3, confirmedAppointments: 2, pendingNominations: 1, workloadLimit: 5, capacityState: 'AVAILABLE', semesterCode: '2026/2027-1', capacityPlanVersion: 2, availableSlots: 2, availability: 'Available', workloadItems: [{ type: 'Pending Nomination', studentId: 'PG001', studentName: 'Student One', researchTitle: 'A long research title', date: '2026-10-15' }] };

test('workload tool opens one independent record page with capacity navigation', () => {
  const html = renderToStaticMarkup(<workload.PanelWorkloadMonitoring onBack={() => {}} onOpenCapacity={() => {}} />);
  assert.equal((html.match(/data-record-page/g) ?? []).length, 1);
  assert.match(html, /Manage Capacity/);
  assert.match(html, /Loading panel workload records/);
  const direct = renderToStaticMarkup(<workload.PanelWorkloadMonitoring initialLecturerId="L001" onBack={() => {}} />);
  assert.equal((direct.match(/data-record-page/g) ?? []).length, 1);
  assert.match(direct, /Panel workload details/);
  assert.doesNotMatch(direct, /Find a lecturer|Export Excel/);
  const state = new Map<string, unknown>([['PanelWorkloadMonitoring:search', 'Retained search']]);
  const returned = renderToStaticMarkup(<ListState.Provider value={state}><workload.PanelWorkloadMonitoring onBack={() => {}} /></ListState.Provider>);
  assert.match(returned, /value="Retained search"/);
});

test('workload facts distinguish active and reserved seats and retain missing configuration', () => {
  assert.equal(typeof workload.PanelWorkloadDetails, 'function');
  const html = renderToStaticMarkup(<workload.PanelWorkloadDetails record={lecturer} />);
  for (const fact of ['2026/2027-1', 'Active appointments', 'Pending reservations', 'Active + reserved', 'Student One', 'A long research title']) assert.ok(html.includes(fact), fact);
  assert.match(html, /<h3 class="text-lg font-semibold leading-7[^"]*">Dr Panel<\/h3>/);
  for (const section of ["Lecturer overview", "Capacity usage"]) assert.ok(html.includes(`aria-label="${section}"`), section);
  const unconfigured = renderToStaticMarkup(<workload.PanelWorkloadDetails record={{ ...lecturer, capacityState: 'NOT_CONFIGURED', semesterCode: undefined, capacityPlanVersion: undefined, availableSlots: undefined }} />);
  assert.match(unconfigured, /Not configured/);
  assert.doesNotMatch(unconfigured, /2 available slots|Capacity utilization/);
});

test('workload browse filters authoritative states and clamps retained pagination', () => {
  assert.equal(typeof workload.getPanelWorkloadPage, 'function');
  const records = Array.from({ length: 31 }, (_, index) => ({ ...lecturer, id: `L${index}`, name: `Lecturer ${index}` }));
  const last = workload.getPanelWorkloadPage(records, { search: '', department: '', status: '' }, 9, 25);
  assert.equal(last.page, 2);
  assert.equal(last.rows.length, 6);
  const missing = { ...lecturer, id: 'missing', capacityState: 'NOT_CONFIGURED' as const };
  assert.equal(workload.getPanelWorkloadPage([lecturer, missing], { search: '', department: '', status: 'NOT_CONFIGURED' }, 1, 10).total, 1);
  assert.equal(workload.getPanelWorkloadPage(records, { search: 'L30', department: 'Computing', status: '' }, 3, 10).rows[0].id, 'L30');
  for (const size of [10, 25, 50]) assert.equal(workload.getPanelWorkloadPage(records, { search: '', department: '', status: '' }, 1, size).size, size);
  assert.equal(workload.getPanelWorkloadPage(records, { search: '', department: '', status: '' }, -1, 5).size, 10);
});

test('nomination facts use common detail typography without fictional submitted progress', () => {
  const html = renderToStaticMarkup(<RecommendPanelMemberDrawer isOpen busy student={{ studentName: 'Student One', studentId: 'PG001', programme: 'Programme', intake: 'Semester One', supervisor: 'Dr Supervisor', initials: 'SO', proposedTopic: 'Research Title', area: 'Computing', abstract: 'First line\nSecond line' }} candidates={[]} replacementMember="Current Panel" onClose={() => {}} onSubmit={() => {}} />);
  assert.match(html,/id="summary-student-name" class="text-lg font-semibold/);
  assert.match(html,/id="research-title-text" class="text-lg font-normal/);
  assert.match(html, /whitespace-pre-wrap/);
  assert.match(html, /The current appointment with Current Panel remains active/);
  assert.doesNotMatch(html, /Approval progress/);
  assert.match(html, /id="recommendation-notes-textarea"[^>]*disabled=""/);
  assert.match(html, /id="panel-replacement-reason"[^>]*disabled=""/);
});
