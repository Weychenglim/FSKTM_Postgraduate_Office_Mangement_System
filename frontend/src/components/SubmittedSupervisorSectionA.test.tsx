import assert from 'node:assert/strict';
import React from 'react';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SupervisorRequestPresentation } from './SupervisorRequestDetail';
import { ResearchDetailsCard } from './AppointmentRequestSections';

const sectionModule = await import('./SubmittedSupervisorSectionA').catch(() => null);

test('Missing Supervisor course codes remain a visible recorded-data gap', () => {
  const html = renderToStaticMarkup(<ResearchDetailsCard source="submitted" title="Title" area="Area" abstract="Abstract" courseCodes="" showCourseCodes />);
  assert.match(html, /Course code\(s\)/);
  assert.match(html, /Not recorded/);
});

const snapshot = {
  version: 1 as const,
  studentParticulars: { name: 'Name when submitted', studentId: 'PG-OLD', programme: 'Original programme', semester: 'Semester I 2026/2027', identityNumber: 'SYNTHETIC-IDENTITY', identityType: 'PASSPORT' as const, email: 'submitted@example.test', phone: 'SYNTHETIC-PHONE', address: 'Synthetic address\nSecond line' },
  titleOrigin: 'STUDENT' as const,
  noCoursesTaken: false,
  courseResults: [{ courseName: 'Research methods', courseCode: 'TEST7001', semesterSession: 'Semester II 2025/2026', grade: 'A-' }],
  declaration: { text: 'I confirm these submitted particulars.', acceptedAt: '2026-10-17T02:30:00Z', acceptedBy: 12 },
  capturedAt: '2026-10-17T02:30:00Z',
};

test('Exact request summary uses submitted particulars after a profile change', () => {
  assert.ok(sectionModule, 'Submitted Section A renderer must exist');
  const live: SupervisorRequestPresentation = { status: 'APPROVED', studentName: 'Changed name', studentId: 'NEW-ID', programme: 'Changed programme', semester: 'Semester II' };
  const facts = sectionModule.withSubmittedSupervisorParticulars(live, snapshot);
  assert.equal(facts.studentName, 'Name when submitted');
  assert.equal(facts.studentId, 'PG-OLD');
  assert.equal(facts.programme, 'Original programme');
  assert.equal(facts.semester, 'Semester I 2026/2027');
  assert.equal(live.studentName, 'Changed name', 'Display must not mutate the live DTO');
  assert.equal(sectionModule.withSubmittedSupervisorParticulars(live, null), live, 'Legacy records retain honestly sourced fallback facts');
});

test('Submitted particulars and results preserve all Section A evidence', () => {
  assert.ok(sectionModule);
  const particulars = renderToStaticMarkup(<sectionModule.SupervisorSectionAParticulars record={snapshot} loading={false} error={null} onRetry={() => {}} />);
  for (const value of ['PASSPORT', 'SYNTHETIC-IDENTITY', 'submitted@example.test', 'SYNTHETIC-PHONE', 'Synthetic address', 'Second line']) assert.ok(particulars.includes(value), value);
  const evidence = renderToStaticMarkup(<sectionModule.SupervisorSectionAEvidence record={snapshot} />);
  for (const value of ['Results of courses taken', 'Research methods', 'TEST7001', 'Semester II 2025/2026', 'A-', 'Student-proposed', 'I confirm these submitted particulars.', 'Name when submitted']) assert.ok(evidence.includes(value), value);
  assert.match(evidence, /<th[^>]*scope="col"/);
  assert.doesNotMatch(evidence, /Verified results|Signed by hand/);
});

test('No-courses declarations and legacy missing evidence are explicit', () => {
  assert.ok(sectionModule);
  const empty = renderToStaticMarkup(<sectionModule.SupervisorSectionAEvidence record={{ ...snapshot, noCoursesTaken: true, courseResults: [] }} />);
  assert.match(empty, /No completed courses declared/);
  const legacy = renderToStaticMarkup(<sectionModule.SupervisorSectionAParticulars record={null} loading={false} error={null} onRetry={() => {}} />);
  assert.match(legacy, /No submitted Section A/);
  assert.match(legacy, /current profile/);
  assert.doesNotMatch(legacy, /SYNTHETIC-IDENTITY|confirmed accurate/);
  const missing = renderToStaticMarkup(<sectionModule.SupervisorSectionAParticulars record={{ ...snapshot, studentParticulars: { ...snapshot.studentParticulars, phone: '', address: '' } }} loading={false} error={null} onRetry={() => {}} />);
  assert.equal((missing.match(/Not recorded/g) ?? []).length, 2);
});

test('Particulars load failures provide retry without asserting legacy data', () => {
  assert.ok(sectionModule);
  const html = renderToStaticMarkup(<sectionModule.SupervisorSectionAParticulars record={null} loading={false} error="Section A could not be loaded." onRetry={() => {}} />);
  assert.match(html, /Section A could not be loaded/);
  assert.match(html, /Retry/);
  assert.doesNotMatch(html, /No submitted Section A/);
  const loading = renderToStaticMarkup(<sectionModule.SupervisorSectionAParticulars record={null} loading error={null} onRetry={() => {}} />);
  assert.match(loading, /Loading submitted particulars/);
});
