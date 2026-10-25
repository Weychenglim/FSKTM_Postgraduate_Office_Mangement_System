import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { SupervisoryTeamManagement } from '../src/components/SupervisoryTeamManagement';
import { RecordPageProvider } from '../src/components/RecordPage';
import { ListState } from '../src/components/ListState';
import { setAuthToken, request } from '../src/services/apiClient';
import { getSupervisoryWorkspace, getSupervisoryTeam } from '../src/services/coSupervisionApi';
import type { SupervisoryTeamView } from '../src/components/SupervisoryTeamManagement';
import type { UserRole } from '../src/types';

// All academic responses come from the isolated real Django server.
const checks: string[] = [];
const check = (value: unknown, message: string) => { if (!value) throw Error(message); checks.push(message); };
const pause = () => new Promise(resolve => setTimeout(resolve, 40));
const until = async (condition: () => unknown) => {
  for (let i = 0; i < 750; i++) { if (condition()) return; await pause(); }
  throw Error(`Timed out waiting for supporting UI: ${document.getElementById('root')?.textContent?.slice(-700)}`);
};
const visible = (node: Element) => !node.closest('[hidden]') && !!node.getClientRects().length;
const button = (label: string, parent: ParentNode = document) => [...parent.querySelectorAll<HTMLButtonElement>('button')].find(node => visible(node) && node.textContent?.trim() === label);
const click = async (label: string, parent: ParentNode = document) => {
  const node = button(label, parent);
  if (!node || node.disabled) throw Error(`Missing or disabled action: ${label}`);
  node.click(); await pause();
};
const enter = async (node: HTMLTextAreaElement, value: string) => {
  if (!node) throw Error('Missing supporting reason field');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true })); await pause();
};
let root: Root | null = null;
const report = (result: { checks: string[]; viewportWidth?: number; error?: string }) => {
  document.getElementById('journey-results')!.textContent = JSON.stringify(result);
  window.parent.postMessage({ type: 'supporting-results', result }, window.location.origin);
};
try {
  const config = await (await fetch('/journey-config')).json();
  const switchActor = (actor: string) => { root?.unmount(); root = null; setAuthToken(config.tokens[actor]); };
  const mount = async (actor: string, role: UserRole, view: SupervisoryTeamView) => {
    switchActor(actor);
    root = createRoot(document.getElementById('root')!);
    root.render(<MemoryRouter><ListState.Provider value={new Map()}><RecordPageProvider>
      <SupervisoryTeamManagement role={role} view={view} routeStudentId={config.matricNo} showResearchChanges={false} />
    </RecordPageProvider></ListState.Provider></MemoryRouter>);
    await until(() => document.querySelector('#supervisory-team-management') && !document.getElementById('root')?.textContent?.includes('Loading supervisory teams'));
    await pause();
  };
  const denied = async (path: string, method = 'GET', body?: object) => {
    try { await request(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); return 0; }
    catch (failure) { return (failure as { status: number }).status; }
  };
  const nomination = async (name: string, replacement = false) => {
    await mount('primary', 'Lecturer', 'detail');
    await click(replacement ? 'Replace' : 'Nominate co-supervisor');
    await until(() => !!document.querySelector('form [role="combobox"]'));
    check(button('Submit nomination')?.disabled, 'An empty nomination cannot be submitted');
    const select = document.querySelector<HTMLButtonElement>('form [role="combobox"]')!;
    select.click();
    await until(() => [...document.querySelectorAll<HTMLElement>('[role="option"]')].some(option => option.textContent?.includes(name)));
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node => node.textContent?.includes(name))!;
    check(option.getAttribute('aria-disabled') !== 'true', 'Eligible supporting candidate is selectable');
    option.click(); await pause();
    await enter(document.querySelector('form textarea')!, '   ');
    check(button('Submit nomination')?.disabled, 'A selected candidate still requires a nonblank justification');
    await enter(document.querySelector('form textarea')!, 'Private nomination justification');
    await click('Submit nomination');
    await until(() => !button('Submit nomination') && !document.getElementById('root')?.textContent?.includes('Loading supervisory teams'));
    const workspace = await getSupervisoryWorkspace();
    return workspace.nominations[0];
  };
  const decision = async (actor: string, action: 'Accept' | 'Approve' | 'Reject' | 'Cancel nomination', reason?: string) => {
    await mount(actor, actor === 'coordinator' ? 'Programme Coordinator' : 'Lecturer', 'requests');
    await click(action);
    await until(() => !!document.querySelector('dialog[open]'));
    const dialog = document.querySelector('dialog[open]')!;
    const confirm = `${action} supporting request`;
    if (reason) {
      check(button(confirm, dialog)?.disabled, 'A rejection or cancellation requires its reason');
      await enter(dialog.querySelector('textarea')!, reason);
    }
    await click(confirm, dialog);
    await until(() => !document.querySelector('dialog[open]') && !document.getElementById('root')?.textContent?.includes('Loading supervisory teams'));
  };
  const status = async (id: number) => (await getSupervisoryWorkspace()).nominations.find(row => row.id === id)?.status;
  const studentPrivacy = async (pendingName?: string) => {
    await mount('student', 'Student', 'studentOverview');
    const workspace = await getSupervisoryWorkspace();
    check(workspace.nominations.length === 0 && workspace.teams.every(team => team.nominations.length === 0), 'Student response excludes supporting nomination workflow');
    check(!JSON.stringify(workspace).includes('Private '), 'Student response excludes private justification and closure reasons');
    check(workspace.appointments.every(row => row.history.length === 0 && !row.endReason), 'Student appointment results omit staff audit history');
    check(!document.getElementById('root')?.textContent?.includes('Private '), 'Student screen does not render staff-only reasons');
    if (pendingName) check(!document.getElementById('root')?.textContent?.includes(pendingName), 'Student screen hides an unconfirmed supporting candidate');
  };

  switchActor('student');
  check(await denied('/appointments/co-supervisor/nominations/', 'POST', { studentId: config.studentId, candidateId: config.first.id, justification: 'Unauthorized' }) === 403, 'Student cannot nominate a supporting supervisor');
  switchActor('primary');
  check(await denied('/appointments/co-supervisor/nominations/', 'POST', { studentId: config.studentId, candidateId: config.first.id, justification: ' ' }) === 400, 'Backend rejects a supporting nomination with blank justification');

  const rejected = await nomination(config.first.name);
  check(rejected.status === 'SUBMITTED_TO_CO_SUPERVISOR', 'Primary UI nomination reaches the candidate-review stage');
  await studentPrivacy(config.first.name);
  await decision('first', 'Reject', 'Private candidate rejection reason');
  check(await status(rejected.id) === 'REJECTED_BY_CO_SUPERVISOR', 'Candidate rejection is persisted');

  const cancelled = await nomination(config.first.name);
  await decision('primary', 'Cancel nomination', 'Private primary cancellation reason');
  check(await status(cancelled.id) === 'CANCELLED', 'Primary cancellation is persisted and frees the team position');

  const coordinatorRejected = await nomination(config.first.name);
  await decision('first', 'Accept');
  await decision('coordinator', 'Reject', 'Private Coordinator rejection reason');
  check(await status(coordinatorRejected.id) === 'REJECTED_BY_COORDINATOR', 'Coordinator rejection retains the request without activating an appointment');

  const approved = await nomination(config.first.name);
  await decision('first', 'Accept');
  check(await status(approved.id) === 'PENDING_COORDINATOR', 'Candidate acceptance awaits final Coordinator approval');
  switchActor('foreignCoordinator');
  check(await denied(`/appointments/co-supervisor/nominations/${approved.id}/approve/`, 'POST', {}) === 403, 'Out-of-programme Coordinator cannot approve');
  switchActor('primary');
  check(await denied(`/appointments/co-supervisor/nominations/${approved.id}/approve/`, 'POST', {}) === 403, 'Primary nominator cannot perform the Coordinator approval');
  await decision('coordinator', 'Approve');
  check(await status(approved.id) === 'APPROVED', 'Programme Coordinator approval activates the supporting appointment');
  switchActor('first');
  check((await getSupervisoryTeam(config.studentId)).research.title, 'Active supporting supervisor can read current research');
  check(await denied(`/appointments/supervisor/applications/${config.applicationId}/`) === 403, 'Supporting appointment does not grant access to the private primary application');
  check(await denied(`/marks/tasks/${config.taskId}/draft/`, 'PUT', { expectedVersion: 'unauthorized', scores: [] }) === 404, 'Supporting appointment does not grant Marks write access');
  check(!JSON.stringify(await getSupervisoryTeam(config.studentId)).includes('Historical evaluation'), 'Supporting team projection excludes submitted Marks');
  switchActor('primary');
  check(await denied('/appointments/co-supervisor/nominations/', 'POST', { studentId: config.studentId, candidateId: config.panelId, justification: 'Conflicting Panel duty' }) === 409, 'Active Panel membership blocks a conflicting supporting nomination');

  const replacement = await nomination(config.second.name, true);
  switchActor('student');
  let team = await getSupervisoryTeam(config.studentId);
  check(team.appointments.some(row => row.supervisor.id === config.first.id && row.status === 'ACTIVE') && !team.appointments.some(row => row.supervisor.id === config.second.id && row.status === 'ACTIVE'), 'Incumbent remains active while replacement awaits candidate acceptance');
  await studentPrivacy(config.second.name);
  await decision('second', 'Accept');
  switchActor('student');
  team = await getSupervisoryTeam(config.studentId);
  check(team.appointments.some(row => row.supervisor.id === config.first.id && row.status === 'ACTIVE'), 'Incumbent remains active while replacement awaits Coordinator approval');
  await decision('coordinator', 'Approve');
  switchActor('student');
  team = await getSupervisoryTeam(config.studentId);
  const outgoing = team.appointments.find(row => row.supervisor.id === config.first.id)!;
  const incoming = team.appointments.find(row => row.supervisor.id === config.second.id)!;
  check(outgoing.status === 'ENDED' && incoming.status === 'ACTIVE' && incoming.supersedesId === outgoing.id, 'Approved replacement retains lineage and ends only the outgoing appointment');
  switchActor('first');
  check(await denied(`/appointments/co-supervisor/students/${config.studentId}/`) === 403, 'Former supporting supervisor loses current student-detail access');
  check((await getSupervisoryWorkspace()).appointments.some(row => row.id === outgoing.id && row.status === 'ENDED'), 'Former supporting supervisor retains own ended-appointment history');
  await mount('first', 'Lecturer', 'history');
  check(document.getElementById('root')?.textContent?.includes(config.first.name) && !button('Accept') && !button('Approve'), 'Former-member history is visible without decision controls');

  await mount('office', 'Office Staff/Admin', 'detail');
  const incomingCard = [...document.querySelectorAll('article')].find(node => node.querySelector('h4')?.textContent === config.second.name)!;
  await click('End appointment', incomingCard);
  await until(() => !!document.querySelector('dialog[open]'));
  const closure = document.querySelector('dialog[open]')!;
  check(button('End supporting appointment', closure)?.disabled, 'Closure requires a nonblank reason');
  check(await denied(`/appointments/co-supervisor/appointments/${incoming.id}/end/`, 'POST', { outcome: 'COMPLETED', reason: ' ' }) === 400, 'Backend rejects blank closure reasons');
  await enter(closure.querySelector('textarea')!, 'Private supporting closure reason');
  check(document.documentElement.scrollWidth <= window.innerWidth, 'The closure screen and dialog fit the viewport');
  await click('End supporting appointment', closure);
  await until(() => !document.querySelector('dialog[open]') && !document.getElementById('root')?.textContent?.includes('Loading supervisory teams'));
  check((await getSupervisoryTeam(config.studentId)).appointments.every(row => row.status === 'ENDED'), 'Office closure ends the final supporting appointment');
  switchActor('second');
  check(await denied(`/appointments/co-supervisor/students/${config.studentId}/`) === 403, 'Closed supporting appointment revokes current team access');
  check((await getSupervisoryWorkspace()).appointments.some(row => row.id === incoming.id && row.endReason === 'Private supporting closure reason'), 'Closed member retains own appointment outcome and history');
  await studentPrivacy();
  check(document.getElementById('root')?.textContent?.includes('No supporting supervisors assigned.'), 'Student screen shows no active supporting member after closure');
  check(document.documentElement.scrollWidth <= window.innerWidth, 'The Student results screen fits the viewport');
  switchActor('office');
  const record = await request<{ scores: unknown[]; totalMark: string }>(`/marks/records/MRK-${String(config.taskId).padStart(5, '0')}/`);
  check(JSON.stringify(record).includes('85') && JSON.stringify(record).includes('Historical evaluation'), 'Office submitted Marks retain their original total and comments');
  check(await status(replacement.id) === 'APPROVED', 'Closure preserves the approved replacement request');
  report({ checks, viewportWidth: window.innerWidth });
} catch (failure) {
  report({ checks, error: failure instanceof Error ? failure.message : String(failure) });
} finally {
  root?.unmount();
}
