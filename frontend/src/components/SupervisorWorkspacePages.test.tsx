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
assert.match(nav, /aria-current="page"[^>]*>Research changes/);
assert.match(nav, /My supervisees/);
assert.doesNotMatch(nav, /Applications|My supervisors/);
const applications = records.map((row: any, i: number) => ({ ...row, applicationId: i + 1, supervisor: 'Dr Demo', date: '10 Oct 2026', title: 'Synthetic topic', status: row.workflowStatus, documents: [] }));
const full = renderToStaticMarkup(<StudentSupervisorApplications applications={applications} />);
assert.match(full, /Pending applications/);
assert.match(full, /Completed application history/);
const compact = renderToStaticMarkup(<StudentSupervisorApplications applications={applications} compact />);
assert.match(compact, /SV-1|SV-2/);
assert.doesNotMatch(compact, /SV-3|SV-4|Completed application history|Synthetic topic/);
console.log('Shared role navigation and compact current-request presentation pass');

const historyPage = renderToStaticMarkup(<MemoryRouter initialEntries={['/supervisor-appointments/history']}><LecturerSupervisorAppointments routeView="history" /></MemoryRouter>);
assert.equal((historyPage.match(/<h1\b/g) ?? []).length, 1, 'Request history has one page heading');
assert.ok(historyPage.indexOf('Back to Requests') < historyPage.indexOf('<nav'), 'Back precedes workspace navigation');
assert.doesNotMatch(historyPage.slice(historyPage.indexOf('<nav')), /Back to Supervisor Appointments/);
for (const role of ['Student', 'Lecturer']) {
  const page = renderToStaticMarkup(<MemoryRouter initialEntries={['/supervisor-appointments/research-changes/2']}>{role === 'Student' ? <StudentSupervisorAppointment routeView="research" researchView="detail" /> : <LecturerSupervisorAppointments routeView="research" researchView="detail" />}</MemoryRouter>);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.match(page, /<h1[^>]*>Research change request<\/h1>/);
  assert.ok(page.indexOf('Back to research changes') < page.indexOf('<nav'));
  assert.doesNotMatch(page.slice(page.indexOf('<nav')), /Back to research changes/);
}
console.log('History and both-role research pages have a single heading and Back before navigation');
