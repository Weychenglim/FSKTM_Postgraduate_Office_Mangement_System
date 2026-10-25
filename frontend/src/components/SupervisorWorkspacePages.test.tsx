import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { SupervisorWorkspaceNavigation } from './SupervisorWorkspaceNavigation';
import { StudentSupervisorApplications } from './StudentSupervisorApplications';
import { LecturerSupervisorAppointments } from './LecturerSupervisorAppointments';
import { StudentSupervisorAppointment } from './StudentSupervisorAppointment';
import * as routes from '../constants/routes';
import * as workspace from '../utils/supervisorWorkspace';
import type { StudentSupervisorApplication } from '../types';

assert.equal(routes.APP_ROUTES.supervisorAppointmentApplications, '/supervisor-appointments/applications');
assert.equal(routes.routeForSupervisorResearchRequest('42'), '/supervisor-appointments/research-changes/42');
for (const path of ['/supervisor-appointments/supervisees', '/supervisor-appointments/research-changes', '/supervisor-appointments/research-changes/42', '/supervisor-appointments/research-changes/profile', '/supervisor-appointments/research-changes/new']) {
  assert.ok(routes.isKnownAppPath(path), `Known workspace route: ${path}`);
}
assert.equal(routes.isKnownAppPath('/supervisor-appointments/research-changes/42/extra'), false);
assert.equal(workspace.supervisorWorkspaceSection('Student', '/supervisor-appointments/8'), 'applications');
assert.equal(workspace.supervisorWorkspaceSection('Lecturer', '/supervisor-appointments/supervisees/DEMO-001'), 'supervisees');
assert.equal(workspace.supervisorWorkspaceSection('Lecturer', '/supervisor-appointments/research-changes/42'), 'research');
assert.equal(workspace.supervisorWorkspaceSection('Student', '/supervisor-appointments/research-changes-old'), 'applications');
assert.equal(routes.routeForNotificationTarget({ targetModule: 'SUPERVISOR_APPOINTMENTS', recordType: 'RESEARCH_AMENDMENT', recordId: '42' }), '/supervisor-appointments/research-changes/42');
assert.equal(routes.routeForNotificationTarget({ targetModule: 'SUPERVISOR_APPOINTMENTS', recordType: 'CO_SUPERVISOR_APPOINTMENT', recordId: '42' }), '/supervisor-appointments', 'Supporting appointment notifications open Student My supervisors');
const records = [
  {id:'SV-1', workflowStatus:'SUBMITTED_TO_SUPERVISOR'},
  {id:'SV-2', workflowStatus:'PENDING_COORDINATOR'},
  {id:'SV-3', workflowStatus:'APPROVED'},
  {id:'SV-4', workflowStatus:'CANCELLED_BY_STUDENT'},
] as { id: string; workflowStatus: StudentSupervisorApplication['workflowStatus'] }[];
assert.deepEqual(workspace.partitionSupervisorApplications(records).pending.map(row=>row.id), ['SV-1','SV-2']);
assert.deepEqual(workspace.partitionSupervisorApplications(records).completed.map(row=>row.id), ['SV-3','SV-4']);
console.log('Supervisor workspace deep links, active sections and pending/history partition pass');

const nav = renderToStaticMarkup(<MemoryRouter initialEntries={['/supervisor-appointments/research-changes/42']}><SupervisorWorkspaceNavigation role="Lecturer" /></MemoryRouter>);
// Decorative icons may precede the visible link label.
const selectedLink = nav.match(/<a\b[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/a>/)?.[1];
assert.equal(selectedLink?.replace(/<[^>]*>/g, ""), "Research changes");
assert.match(nav, /My supervisees/);
assert.match(nav, /Appointment requests/);
assert.doesNotMatch(nav, /Applications|My supervisors/);
const applications = records.map((row: any, i: number) => ({ ...row, applicationId: i + 1, supervisor: 'Dr Demo', date: '10 Oct 2026', title: 'Synthetic topic', status: row.workflowStatus, documents: [] }));
const full = renderToStaticMarkup(<MemoryRouter><StudentSupervisorApplications applications={applications} /></MemoryRouter>);
assert.match(full, /Applications/);
assert.match(full, /Requests|History/);
assert.match(full, /Dr Demo/);
assert.doesNotMatch(full, /SV-3|SV-4/);
const compact = renderToStaticMarkup(<StudentSupervisorApplications applications={applications} compact />);
assert.match(compact, /Dr Demo/);
assert.doesNotMatch(compact, /SV-3|SV-4|Completed application history|Synthetic topic/);
console.log('Shared role navigation and compact current-request presentation pass');

const historyPage = renderToStaticMarkup(<MemoryRouter initialEntries={['/supervisor-appointments/history']}><LecturerSupervisorAppointments routeView="history" /></MemoryRouter>);
assert.equal((historyPage.match(/<h1\b/g) ?? []).length, 1, 'Request history has one page heading');
assert.doesNotMatch(historyPage, /Back to Requests/, 'History is a local view, not a nested page');
assert.match(historyPage, /<h1[^>]*>Supervisor Appointments<\/h1>/);
assert.doesNotMatch(historyPage.slice(historyPage.indexOf('<nav')), /Back to Supervisor Appointments/);
for (const role of ['Student', 'Lecturer']) {
  const page = renderToStaticMarkup(<MemoryRouter initialEntries={['/supervisor-appointments/research-changes/2']}>{role === 'Student' ? <StudentSupervisorAppointment routeView="research" researchView="detail" /> : <LecturerSupervisorAppointments routeView="research" researchView="detail" />}</MemoryRouter>);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  if (role === 'Lecturer') {
    assert.match(page, /<h1[^>]*>Research change request<\/h1>/);
    assert.doesNotMatch(page, /<nav/, 'A record screen has no list tab bar');
    assert.ok(page.indexOf('Back to research changes') < page.indexOf('<h1'), 'Back belongs above the record heading');
  } else {
    assert.match(page, /<h1[^>]*>Research change request<\/h1>/);
    assert.doesNotMatch(page, /<nav/, 'Student research detail also leaves the tabbed list');
  }
}
console.log('History stays local; Student and Lecturer research details leave the tabbed list');

assert.equal(routes.routeForSupportingSupervisorRequest('20'), '/supervisor-appointments/supporting-requests/20');
assert.ok(routes.isKnownAppPath('/supervisor-appointments/supporting-requests/20'));
assert.equal(routes.isKnownAppPath('/supervisor-appointments/supporting-requests/20/extra'), false);
for (const detailProps of [{initialApplicationId:'8'}, {initialSupportingId:'20'}, {routeView:'superviseeDetail' as const, routeSuperviseeStudentId:'M123'}]) {
  const page = renderToStaticMarkup(<MemoryRouter><LecturerSupervisorAppointments {...detailProps} onNavigateToList={() => {}} onNavigateToSupervisees={() => {}} /></MemoryRouter>);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1, 'Every routed record, including loading state, has one heading');
  assert.doesNotMatch(page, /<nav|Supervisor Appointments<\/h1>|Request views/, 'Record loading states do not expose the list navigation');
  assert.ok(page.indexOf('Back to ') < page.indexOf('<h1'), 'Return appears before the record heading');
}

for (const routeView of ['list', 'supervisees', 'research'] as const) {
  const page = renderToStaticMarkup(<MemoryRouter><LecturerSupervisorAppointments routeView={routeView} researchView="list" /></MemoryRouter>);
  assert.equal((page.match(/>Refresh</g) ?? []).length, 0, `${routeView} has no manual refresh action`);
  assert.doesNotMatch(page, /Refresh appointments|Refresh teams|Refresh research changes/, 'Lecturer cards do not duplicate the page refresh action');
  if (routeView !== 'supervisees') assert.match(page, /<header\b[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?Request views[\s\S]*?<\/header>/, 'Request views belong in the section header beside its title');
}
