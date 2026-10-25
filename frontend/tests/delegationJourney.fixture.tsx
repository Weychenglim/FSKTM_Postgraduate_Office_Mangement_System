import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { CoordinatorDelegations } from '../src/components/CoordinatorDelegations';
import { CoordinatorRequestsBrowse } from '../src/components/CoordinatorSupervisorWorkspace';
import { SupervisoryTeamManagement } from '../src/components/SupervisoryTeamManagement';
import { RecordPageProvider } from '../src/components/RecordPage';
import { ListState } from '../src/components/ListState';
import { setAuthToken, request, requestBlob } from '../src/services/apiClient';
import { getCoordinatorDelegations } from '../src/services/coordinatorDelegationsApi';
import { getCoordinatorRequests } from '../src/services/coordinatorWorkspaceApi';
import { getSupervisoryWorkspace, nominateCoSupervisor, decideCoSupervisor } from '../src/services/coSupervisionApi';

const checks: string[] = [];
const check = (value: unknown, label: string) => { if (!value) throw Error(label); checks.push(label); };
const pause = () => new Promise(resolve => setTimeout(resolve, 40));
const until = async (condition: () => unknown) => {
  for (let i = 0; i < 750; i++) { if (condition()) return; await pause(); }
  throw Error(`Timed out waiting for delegation UI: ${document.getElementById('root')?.textContent?.slice(-700)}`);
};
const button = (label: string, parent: ParentNode = document) => [...parent.querySelectorAll<HTMLButtonElement>('button')].find(node => !node.closest('[hidden]') && !!node.getClientRects().length && node.textContent?.trim() === label);
const click = async (label: string, parent: ParentNode = document) => {
  const node = button(label, parent);
  if (!node || node.disabled) throw Error(`Missing or disabled delegation action: ${label}`);
  node.click(); await pause();
};
const field = (name: string) => [...document.querySelectorAll('label')].find(node => node.textContent?.trim().startsWith(name))?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!;
const enter = async (node: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  if (!node) throw Error('Missing delegation field');
  Object.getOwnPropertyDescriptor(node instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value')!.set!.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true })); await pause();
};
let root: Root | null = null;
const report = (result: { checks: string[]; viewportWidth?: number; error?: string }) => {
  document.getElementById('journey-results')!.textContent = JSON.stringify(result);
  window.parent.postMessage({ type: 'delegation-results', result }, window.location.origin);
};
try {
  const config = await (await fetch('/journey-config')).json();
  const base = '/accounts/coordinator-delegations/';
  const switchActor = (actor: string) => { root?.unmount(); root = null; setAuthToken(config.tokens[actor]); };
  const mount = async (actor: string, content: React.ReactNode) => {
    switchActor(actor); root = createRoot(document.getElementById('root')!);
    root.render(<MemoryRouter><ListState.Provider value={new Map()}><RecordPageProvider>{content}</RecordPageProvider></ListState.Provider></MemoryRouter>);
    await until(() => !!document.querySelector('section') && !document.getElementById('root')?.textContent?.includes('Loading'));
    await pause();
  };
  const denied = async (path: string, method = 'GET', body?: object) => {
    try { await request(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); return 0; }
    catch (failure) { return (failure as { status: number }).status; }
  };
  const officeRevoke = async (id: number) => {
    // A second Office context makes a real request without changing the mounted
    // Coordinator's in-memory session or loading its stale decision record.
    const response = await fetch(`/api${base}${id}/revoke/`, { method: 'POST', headers: { Authorization: `Bearer ${config.tokens.office}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Delegation acceptance revocation' }) });
    check(response.status === 200, 'A separate Office context revokes acting authority through real HTTP');
  };
  const choose = async (label: string, text: string, partial = false) => {
    const wrapper = [...document.querySelectorAll('label')].find(node => node.textContent?.trim().startsWith(label));
    const control = wrapper?.querySelector<HTMLButtonElement>('[role="combobox"]');
    if (!control) throw Error(`Missing delegation choice: ${label}`);
    control.click();
    const find = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node => partial ? node.textContent?.includes(text) : node.textContent?.trim() === text);
    await until(find); find()!.click(); await pause();
  };
  const queueText = () => document.querySelector('table[aria-label="Appointment request records"] tbody')?.textContent ?? '';
  const mountQueue = async () => {
    await mount('acting', <CoordinatorRequestsBrowse refreshVersion={0} onOpen={() => {}} onCarryover={() => {}} />);
    await until(() => queueText().includes(config.regularMatric));
  };
  const assertScope = async (active: boolean) => {
    const identity = await request<{ effectiveProgrammes: string[] }>('/auth/me/');
    check(identity.effectiveProgrammes.includes(config.regularProgramme), 'Regular programme access is retained');
    check(identity.effectiveProgrammes.includes(config.targetProgramme) === active && identity.effectiveProgrammes.length === (active ? 2 : 1), 'Authenticated effective scope matches the delegation state');
    const queue = await getCoordinatorRequests({ view: 'requests' });
    check(queue.results.some(row => row.matricNo === config.regularMatric) && queue.results.some(row => row.matricNo === config.targetMatric) === active && !queue.results.some(row => row.matricNo === config.foreignMatric), 'Primary request API includes exactly the permitted programme work');
    const panel = await request<{ programmes: string[]; queue: unknown[]; pendingCount?: number }>('/appointments/panel/coordinator-workspace/');
    check(panel.programmes.includes(config.targetProgramme) === active, 'Panel workspace follows the same effective programme scope');
    const data = await request<{ scope: { programmes: string[] }; marks: unknown }>('/dashboard/reports/');
    check(data.scope.programmes.includes(config.targetProgramme) === active && data.marks === null, 'Reports follow delegated scope and hide Marks');
    if (active) {
      const dossier = await request<{ marks: unknown }>(`/dashboard/progress/${config.matricNo}/`);
      check(dossier.marks === null, 'Delegated dossier access does not expose private Marks');
    } else {
      check(await denied(`/dashboard/progress/${config.matricNo}/`) === 404, 'Dossier access is removed without delegated programme authority');
    }
    const blob = await requestBlob('/dashboard/reports/export/');
    check(blob.type.includes('spreadsheetml') && blob.size > 0, 'Role-scoped XLSX export returns real workbook bytes');
    check(await denied('/dashboard/reconciliation/') === 403, 'Acting Coordinator authority does not grant Office reconciliation access');
  };
  const grant = async () => {
    await mount('office', <CoordinatorDelegations office />);
    await click('Grant acting access');
    await choose('Additional programme', config.targetProgramme);
    await choose('Active coordinator', config.actingName, true);
    await enter(field('Start date'), config.today);
    await enter(field('End date'), config.endsOn);
    await enter(field('Justification'), ' ');
    const before = (await getCoordinatorDelegations()).length;
    await click('Create grant');
    await until(() => !!document.body.textContent?.includes('A justification is required.'));
    check((await getCoordinatorDelegations()).length === before && field('End date').value === config.endsOn, 'Blank justification creates no grant and keeps the entered dates');
    await enter(field('Justification'), 'Delegation acceptance cover');
    await click('Create grant');
    await until(() => !button('Create grant') && !document.getElementById('root')?.textContent?.includes('Loading'));
    const row = (await getCoordinatorDelegations()).sort((a, b) => b.id - a.id)[0];
    check(row.status === 'ACTIVE' && row.coordinator.id === config.actingId && row.programme === config.targetProgramme, 'Office UI creates the intended active programme-bound delegation');
    return row;
  };

  if (config.mode === 'revocation') {
    switchActor('student');
    check(await denied(base) === 403, 'Student cannot read staff delegation history');
    switchActor('acting');
    check(await denied(`${base}options/`) === 403 && await denied(base, 'POST', { programme: config.targetProgramme, coordinatorId: config.actingId, startsOn: config.today, endsOn: config.endsOn, justification: 'Unauthorized' }) === 403, 'Coordinator cannot grant their own additional authority');
    await assertScope(false);
    const firstGrant = await grant();
    check(await denied(base, 'POST', { programme: config.targetProgramme, coordinatorId: config.actingId, startsOn: config.today, endsOn: config.endsOn, justification: 'Overlapping cover' }) === 409, 'Overlapping active delegation cannot be created');
    switchActor('acting');
    await assertScope(true);
    const scope = await request<{ effectiveProgrammes: string[] }>('/auth/me/');
    await mount('acting', <CoordinatorDelegations regularProgramme={config.regularProgramme} effectiveProgrammes={scope.effectiveProgrammes} />);
    check(document.body.textContent?.includes(config.targetProgramme) && !button('Grant acting access') && !button('Revoke'), 'Coordinator sees their scope/history without Office management controls');
    await mount('acting', <SupervisoryTeamManagement role="Programme Coordinator" view="requests" showResearchChanges={false} />);
    await click('Approve'); await until(() => !!document.querySelector('dialog[open]'));
    await click('Approve supporting request', document.querySelector('dialog[open]')!);
    await until(() => !document.querySelector('dialog[open]') && !document.getElementById('root')?.textContent?.includes('Loading'));
    check((await getSupervisoryWorkspace()).appointments.some(row => row.status === 'ACTIVE'), 'Acting Coordinator successfully approves delegated supporting work');
    switchActor('primary');
    const nomination = await nominateCoSupervisor({ studentId: config.studentId, candidateId: config.secondCandidateId, justification: 'A second delegated request' });
    switchActor('second'); await decideCoSupervisor(nomination.id, 'accept');
    await mount('acting', <SupervisoryTeamManagement role="Programme Coordinator" view="requests" showResearchChanges={false} />);
    await click('Approve'); await until(() => !!document.querySelector('dialog[open]'));
    await officeRevoke(firstGrant.id);
    await click('Approve supporting request', document.querySelector('dialog[open]')!);
    await until(() => !!button('Review latest record', document.querySelector('dialog[open]')!));
    check(!document.querySelector('dialog[open] button[type="submit"]'), 'Revoked authority blocks the already-open decision without resubmission controls');
    await click('Review latest record');
    await until(() => !document.querySelector('dialog[open]') && !document.getElementById('root')?.textContent?.includes('Loading'));
    check(!button('Approve'), 'Explicit review removes the delegated approval controls');
    await assertScope(false);

    const secondGrant = await grant();
    await mountQueue();
    check(queueText().includes(config.targetMatric), 'Mounted request queue includes delegated programme work while active');
    await officeRevoke(secondGrant.id);
    window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus'));
    await until(() => queueText().includes(config.regularMatric) && !queueText().includes(config.targetMatric));
    check(!queueText().includes(config.targetMatric), 'Returning to focus reloads the production queue and removes revoked programme rows');
    check(document.documentElement.scrollWidth <= window.innerWidth, 'The refreshed Coordinator queue fits the exact viewport');

    const thirdGrant = await grant();
    await click('Revoke'); await enter(field('Revocation reason'), ' ');
    await click('Confirm revocation');
    await until(() => !!document.body.textContent?.includes('A revocation reason is required.'));
    check((await getCoordinatorDelegations()).find(row => row.id === thirdGrant.id)?.status === 'ACTIVE', 'Blank revocation reason leaves authority unchanged');
    await enter(field('Revocation reason'), 'Delegation acceptance revocation');
    await click('Confirm revocation');
    await until(() => !button('Confirm revocation') && !document.getElementById('root')?.textContent?.includes('Loading'));
    check((await getCoordinatorDelegations()).every(row => row.status === 'REVOKED') && !button('Revoke'), 'Office UI revocation preserves all three grants as immutable history');
    check(await denied(`${base}${thirdGrant.id}/revoke/`, 'POST', { reason: 'Rewrite' }) === 409, 'Repeated revocation cannot rewrite the recorded reason');
    switchActor('acting');
    await assertScope(false);
    const rows = await getCoordinatorDelegations();
    check(rows.length === 3 && rows.every(row => row.revocationReason === 'Delegation acceptance revocation' && !row.canRevoke), 'Coordinator retains their own revoked-grant history without editing authority');
    switchActor('regular');
    check((await getCoordinatorDelegations()).length === 0, 'Other Coordinator cannot read another account delegation history');
    check((await request<{ effectiveProgrammes: string[] }>('/auth/me/')).effectiveProgrammes.includes(config.targetProgramme), 'Permanent target-programme Coordinator retains regular authority');
  } else {
    const active = config.mode === 'ACTIVE';
    switchActor('acting');
    const rows = await getCoordinatorDelegations();
    check(rows.length === 1 && rows[0].status === config.mode, 'Grant status matches the controlled Malaysia delegation date');
    await assertScope(active);
    await mountQueue();
    check(queueText().includes(config.targetMatric) === active, 'Rendered queue follows scheduled, inclusive-end and expired scope');
    const workspace = await getSupervisoryWorkspace();
    check(workspace.nominations.some(row => row.allowedActions.includes('approve')) === active, 'Supporting decision availability matches the date-bound authority');
    if (!active) check(await denied(`/appointments/co-supervisor/nominations/${config.supportingIds[0]}/approve/`, 'POST', {}) === 403, 'Scheduled or expired authority cannot approve a pending request');
    await mount('office', <CoordinatorDelegations office />);
    check(document.body.textContent?.includes(config.mode), 'Office history renders the date-derived delegation state');
    check(!!button('Revoke') === (config.mode !== 'EXPIRED'), 'Only scheduled or active grants expose revocation');
    if (config.mode === 'EXPIRED') check(await denied(`${base}${rows[0].id}/revoke/`, 'POST', { reason: 'Too late' }) === 409, 'Expired grant cannot be rewritten as a revocation');
    check(document.documentElement.scrollWidth <= window.innerWidth, 'Delegation history fits the exact viewport');
  }
  report({ checks, viewportWidth: window.innerWidth });
} catch (failure) {
  report({ checks, error: failure instanceof Error ? failure.message : String(failure) });
} finally {
  root?.unmount();
}
