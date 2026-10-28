import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { CapacityReassessments } from '../src/components/CapacityReassessments';
import { SemesterActivationSection } from '../src/components/SemesterActivationSection';
import { RecordPageProvider } from '../src/components/RecordPage';
import { ListState } from '../src/components/ListState';
import { setAuthToken, request } from '../src/services/apiClient';
import { getCapacityReassessments, authorizeCapacityReassessment } from '../src/services/capacityReassessmentsApi';
import { getAcademicSemesters, getActiveAcademicSemester } from '../src/services/academicSemestersApi';
import { getClosurePreview } from '../src/services/marksCompletionApi';
import type { CapacityRequestKind, CapacityReassessment } from '../src/types/capacityReassessment';
import type { AcademicSemester } from '../src/types/academicSemester';

const checks: string[] = [];
const check = (value: unknown, label: string) => { if (!value) throw Error(label); checks.push(label); };
const pause = () => new Promise(resolve => setTimeout(resolve, 40));
const until = async (condition: () => unknown) => {
  for (let i = 0; i < 750; i++) { if (condition()) return; await pause(); }
  throw Error(`Timed out waiting for carryover UI: ${document.getElementById('root')?.textContent?.slice(-800)}`);
};
const button = (label: string, parent: ParentNode = document) => [...parent.querySelectorAll<HTMLButtonElement>('button')].find(node => !!node.getClientRects().length && node.textContent?.trim() === label);
const click = async (label: string, parent: ParentNode = document) => {
  const node = button(label, parent);
  if (!node || node.disabled) throw Error(`Missing or disabled carryover action: ${label}`);
  node.click(); await pause();
};
const enter = async (value: string) => {
  const node = document.querySelector<HTMLTextAreaElement>('dialog[open] textarea');
  if (!node) throw Error('Missing decision reason');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true })); await pause();
};
const dialog = () => document.querySelector<HTMLDialogElement>('dialog[open]')!;
let root: Root | null = null;
const report = (result: { checks: string[]; viewportWidth?: number; error?: string }) => {
  document.getElementById('journey-results')!.textContent = JSON.stringify(result);
  window.parent.postMessage({ type: 'carryover-results', result }, window.location.origin);
};
try {
  const config = await (await fetch('/journey-config')).json();
  const switchActor = (actor: string) => { root?.unmount(); root = null; setAuthToken(config.tokens[actor]); };
  const mount = async (actor: string, content: React.ReactNode) => {
    switchActor(actor); root = createRoot(document.getElementById('root')!);
    root.render(<MemoryRouter><ListState.Provider value={new Map()}><RecordPageProvider>{content}</RecordPageProvider></ListState.Provider></MemoryRouter>);
    await until(() => !!document.getElementById('root')?.children.length && !document.getElementById('root')?.textContent?.includes('Loading'));
    await pause();
  };
  const denied = async (path: string, method = 'GET', body?: object) => {
    try { await request(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); return 0; }
    catch (failure) { return (failure as { status: number }).status; }
  };
  const base = '/appointments/capacity-reassessments/';
  if (config.mode !== 'HANDOVER') {
    const kind = config.mode as CapacityRequestKind;
    const getRow = async () => (await getCapacityReassessments()).requests.find(row => row.kind === kind && row.id === config.requestId)!;
    const input = (row: CapacityReassessment, reason: string) => ({ reason, expectedStatus: row.status, expectedActiveSemesterId: config.activeId, expectedAuthorizationId: row.authorization?.id ?? null, expectedEventId: row.latestEventId });
    const officeMount = () => mount('office', <CapacityReassessments role="Office Staff/Admin" />);
    const decide = async (action: 'Authorize reassessment' | 'Revoke authorization', reason: string) => {
      await click(action); await until(dialog); await enter(reason);
      await click(action, dialog()); await until(() => !dialog());
      return getRow();
    };
    switchActor('student');
    check(await denied(base) === 403, 'Student cannot read internal reassessment history');
    switchActor('primary');
    check(await denied(base) === 403, 'Lecturer cannot read Office reassessment history');
    switchActor('acting');
    check((await getCapacityReassessments()).requests.length === 0, 'Unrelated Coordinator sees no carryover records');
    switchActor('coordinator');
    let row = await getRow();
    check(!!row && !row.canAuthorize && !row.canRevoke, 'Programme Coordinator reads the pending record without Office authority');
    check(await denied(`${base}${kind}/${row.id}/authorize/`, 'POST', input(row, 'Unauthorized')) === 403, 'Coordinator cannot grant reassessment authority');
    await mount('coordinator', <CapacityReassessments role="Programme Coordinator" />);
    check(document.body.textContent?.includes(config.sourceLabel) && !button('Authorize reassessment'), 'Coordinator UI renders original/current policy as read-only');
    switchActor('coordinator');
    check(await denied(config.approvePath, 'POST', {}) === 409, 'Original-semester unavailability blocks approval before authorization');
    await officeMount(); row = await getRow();
    check(row.originalSemester?.id === config.sourceId && row.originalSemester.lifecycleStatus === 'CLOSED' && row.currentCapacity?.semesterId === config.activeId && !!row.originalCapacity?.unavailableUntil && !!row.currentCapacity?.planId, 'Original Closed policy and current Published policy remain distinct');
    check(row.authorization === null && row.status === 'PENDING_COORDINATOR', 'Reassessment starts without changing the pending approval stage');
    const beforeCapacity = row.currentCapacity!;
    await click('Authorize reassessment'); await until(dialog); await enter(' ');
    check(!!button('Authorize reassessment', dialog())?.disabled, 'Whitespace reason cannot confirm a reassessment');
    check(await denied(`${base}${kind}/${row.id}/authorize/`, 'POST', input(row, ' ')) === 400 && (await getRow()).history.length === 0, 'Backend blank reason leaves history unchanged');
    await enter('Initial carryover authorization'); await click('Authorize reassessment', dialog()); await until(() => !dialog());
    row = await getRow();
    check(row.history.length === 1 && row.authorization?.state === 'ACTIVE' && row.status === 'PENDING_COORDINATOR', 'Office UI authorizes capacity without approving the appointment');
    row = await decide('Authorize reassessment', 'Replace carryover authorization');
    check(row.history.length === 2 && row.history[1].action === 'REPLACED', 'Replacement retains the earlier authorization history');
    await click('Revoke authorization'); await until(dialog); await enter(' ');
    check(!!button('Revoke authorization', dialog())?.disabled, 'Whitespace reason cannot revoke an authorization');
    await enter('Revoke unused carryover authorization'); await click('Revoke authorization', dialog()); await until(() => !dialog());
    row = await getRow();
    check(row.authorization?.state === 'REVOKED' && row.history.length === 3 && row.status === 'PENDING_COORDINATOR', 'Revocation keeps the request pending and all recorded history');
    switchActor('coordinator');
    check(await denied(config.approvePath, 'POST', {}) === 409, 'Revocation restores original-semester capacity enforcement');
    await officeMount(); row = await decide('Authorize reassessment', 'Authorize carryover again');
    check(row.history.length === 4 && row.history[3].action === 'GRANTED', 'A new grant after revocation retains the revoked attempt');
    await click('Authorize reassessment'); await until(dialog); await enter('Stale dialog authorization');
    const saved = await authorizeCapacityReassessment(kind, row.id, input(row, 'Concurrent reviewed replacement'));
    check(saved.history.length === 5, 'Separate real HTTP decision commits a replacement during dialog review');
    await click('Authorize reassessment', dialog()); await until(() => !!button('Review latest record', dialog()));
    check(!dialog().querySelector('button[type="submit"]'), 'Stale reassessment is blocked without replay controls');
    await click('Review latest record'); await until(() => !dialog()); row = await getRow();
    check(row.history.length === 5, 'Explicit latest-record review adds no duplicate history');
    check(row.currentCapacity?.activeLoad === beforeCapacity.activeLoad && row.currentCapacity?.reservedLoad === beforeCapacity.reservedLoad, 'Authorization and revocation create no workload or reservation');
    switchActor('coordinator');
    await request(config.approvePath, { method: 'POST', body: '{}' });
    check((await getRow()).status === 'APPROVED', 'Existing Coordinator approval succeeds using authorized current capacity');
    row = await getRow();
    check(row.authorization?.state === 'CONSUMED' && row.history.length === 6 && !row.canAuthorize && !row.canRevoke, 'Successful approval consumes authority exactly once');
    const replay = await denied(config.approvePath, 'POST', {});
    const expectedReplay = { SUPERVISOR: 0, CO_SUPERVISOR: 409, PANEL: 400 }[kind];
    check(replay === expectedReplay && (await getRow()).history.length === 6, 'Existing replay behavior creates no second approval or capacity consumption');
    check(row.originalSemester?.id === config.sourceId && row.originalSemester.lifecycleStatus === 'CLOSED', 'Final approval retains the original request semester');
    const dossier = await request<{ marks: unknown }>(`/dashboard/progress/${config.matricNo}/`);
    check(dossier.marks === null, 'Coordinator dossier continues to hide private Marks');
    switchActor('student'); check(await denied(base) === 403, 'Student still cannot inspect authorization history after approval');
    await officeMount(); row = await getRow();
    check(row.history.at(-1)?.policy?.planId === row.currentCapacity?.planId && row.history.at(-1)?.policy?.semesterId === config.activeId && !button('Authorize reassessment') && !button('Revoke authorization'), 'Read-only consumed history records the actual Published policy checked');
    check(!document.body.textContent?.includes('Private original-semester unavailability'), 'Capacity cards do not disclose private availability reasons');
    check(document.documentElement.scrollWidth <= window.innerWidth, 'Reassessment history fits the exact viewport');
  } else {
    const targetBase = `/academics/semesters/${config.activeId}`;
    switchActor('coordinator');
    check(await denied(`${targetBase}/activation-readiness/`) === 403, 'Coordinator cannot perform Office semester activation checks');
    switchActor('office');
    const target = (await getAcademicSemesters()).find(row => row.id === config.activeId)!;
    let activated: AcademicSemester | null = null;
    await mount('office', <SemesterActivationSection semester={target} dirty={false} busy={false} onArchive={() => {}} onActivated={async saved => { activated = saved; }} />);
    await until(() => !!button('Review activation') && !button('Review activation')?.disabled);
    check(document.body.textContent?.includes(config.sourceLabel), 'Ready activation names the semester that will be closed');
    const preview = await getClosurePreview('handover', config.activeId);
    check(preview.totals.submitted === 1 && preview.totals.draft === 1 && preview.totals.unfinished === 1 && preview.totals.activeWindows === 1, 'Real handover preview reconciles submitted, draft and active-window counts');
    check(await denied(`${targetBase}/activate/`, 'POST', { reason: 'No review' }) === 409, 'Direct activation cannot bypass unfinished-work review');
    check(await denied(`${targetBase}/activate/`, 'POST', { reason: 'Invalid preview', previewToken: 'invalid', acknowledgeUnfinished: true }) === 409, 'Forged preview cannot authorize semester handover');
    check(await denied(`${targetBase}/activate/`, 'POST', { reason: 'No acknowledgement', previewToken: preview.previewToken }) === 409, 'Valid preview still requires explicit unfinished-work acknowledgement');
    await click('Review activation'); await until(() => !!dialog()?.querySelector('input[type="checkbox"]'));
    await enter(' ');
    check(!!button('Activate semester', dialog())?.disabled, 'Blank activation reason cannot confirm');
    check(dialog().textContent?.includes(config.sourceLabel) && dialog().textContent?.includes('1 evaluations need attention'), 'Production activation review explains closure and unfinished work');
    await enter('Semester acceptance handover');
    check(!!button('Activate semester', dialog())?.disabled, 'A valid reason does not bypass the acknowledgement checkbox');
    dialog().querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(); await pause();
    check(!button('Activate semester', dialog())?.disabled, 'Reviewed reason and acknowledgement enable confirmation');
    check(document.documentElement.scrollWidth <= window.innerWidth, 'Activation review fits the exact viewport');
    await click('Activate semester', dialog()); await until(() => !dialog() && !!activated);
    const semesters = await getAcademicSemesters();
    check(activated!.lifecycleStatus === 'ACTIVE' && semesters.find(row => row.id === config.sourceId)?.lifecycleStatus === 'CLOSED', 'UI confirmation activates the target and closes the source atomically');
    check((await getActiveAcademicSemester()).semester?.id === config.activeId, 'Current-semester endpoint resolves the newly active target');
    const periods = await request<{ id: number; lifecycleStatus: string }[]>('/marks/periods/');
    check(periods.find(row => row.id === config.periodId)?.lifecycleStatus === 'CLOSED', 'Handover closes the old Published Marks period');
    check(await denied(`/academics/semesters/${config.sourceId}/archive/`, 'POST', { reason: 'Premature archival' }) === 409, 'Active unfinished completion window blocks source archival');
    switchActor('panel');
    const tasks = await request<{ id: number; canEdit: boolean; completionWindow: { id: number } }[]>('/marks/my-evaluation-tasks/');
    const task = tasks.find(row => row.id === config.draftTaskId);
    check(task?.canEdit && task.completionWindow?.id === config.windowId, 'Eligible historical draft remains editable through its retained completion window');
    switchActor('coordinator');
    check((await request<{ marks: unknown }>('/dashboard/reports/')).marks === null, 'Semester handover preserves Coordinator report privacy');
  }
  report({ checks, viewportWidth: window.innerWidth });
} catch (failure) {
  report({ checks, error: failure instanceof Error ? failure.message : String(failure) });
} finally {
  root?.unmount();
}
