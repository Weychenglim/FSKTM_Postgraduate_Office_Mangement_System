import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CoSupervisorNominationCard, CoSupervisorAppointmentCard, SupervisoryTeamTimeline } from './SupervisoryTeamManagement';
import type { CoSupervisorNomination, CoSupervisorAppointment } from '../types/coSupervision';

const nomination: CoSupervisorNomination = {
  id: 1, studentId: 7, matricNo: 'PG007', studentName: 'Research Student',
  candidate: { id: 8, name: 'Dr Supporting' }, nominator: { id: 9, name: 'Dr Primary' },
  status: 'PENDING_COORDINATOR', justification: 'Complementary research expertise', reason: '',
  submittedAt: '2026-09-01T00:00:00Z', waitingDays: 3, responsibleStage: 'PROGRAMME_COORDINATOR',
  replacesAppointmentId: null, allowedActions: ['approve', 'coordinator-reject'], history: [],
};
const html = renderToStaticMarkup(<CoSupervisorNominationCard nomination={nomination} busy={false} onAction={() => {}} />);
assert.match(html, /Dr Supporting/);
assert.match(html, /3 calendar days/);
assert.match(html, /Approve/);
assert.match(html, /Reject/);
assert.doesNotMatch(html, />Accept</);
const readOnly = renderToStaticMarkup(<CoSupervisorNominationCard nomination={{ ...nomination, allowedActions: [] }} busy={false} onAction={() => {}} />);
assert.doesNotMatch(readOnly, />Approve</);
assert.doesNotMatch(readOnly, />Reject</);
const appointment: CoSupervisorAppointment = { id: 2, studentId: 7, matricNo: 'PG007', studentName: 'Research Student', supervisor: nomination.candidate, status: 'ENDED', appointmentDate: '2026-01-01', endOutcome: 'WITHDRAWN', endReason: 'Research changed', endedAt: '2026-09-01T00:00:00Z', supersedesId: null, canEnd: false, history: [] };
const ended = renderToStaticMarkup(<CoSupervisorAppointmentCard appointment={appointment} busy={false} canReplace={false} onEnd={() => {}} onReplace={() => {}} />);
assert.match(ended, /Research changed/);
assert.doesNotMatch(ended, />End appointment</);
assert.doesNotMatch(ended, />Replace</);
console.log('Supervisory team role-specific rendering passed');

const timeline = renderToStaticMarkup(<SupervisoryTeamTimeline entries={[
  { id: 'panel-current-status', title: 'Panel appointment', date: null, status: 'FACULTY_PROCESSING' },
]} />);
assert.match(timeline, /Faculty processing/);
assert.doesNotMatch(timeline, /FACULTY_PROCESSING|Invalid Date|null|undefined/);
const confirmed = renderToStaticMarkup(<SupervisoryTeamTimeline entries={[
  { id: 'panel-current-status', title: 'Panel appointment', date: '2026-09-15', status: 'CONFIRMED' },
]} />);
assert.match(confirmed, /Confirmed/);
assert.match(confirmed, /2026/);
assert.equal(renderToStaticMarkup(<SupervisoryTeamTimeline entries={[]} />), '');
console.log('Student-safe supervisory timeline rendering passed');
