import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./LecturerAppointmentRequests.tsx', import.meta.url), 'utf8');
function controller(save: () => Promise<unknown>, refresh: () => Promise<unknown>) {
  const state = { closed: false, action: 'reject', reason: 'Keep this explanation' };
  const body = source.slice(source.indexOf('  const decide = async () => {'), source.indexOf('  const rows = appointmentRequestRows'));
  const scopeRef = { current: 'record' }; const detailVersion = { current: 1 };
  const context = { selected: { kind: 'primary', id: 7 }, action: 'reject', reason: state.reason,
    mutation: { current: false }, decisionSaved: { current: false }, mounted: { current: true }, scopeRef, detailVersion,
    setBusy() {}, setDetailError() {}, acceptSupervisorApplication: save, rejectSupervisorApplication: save,
    decideCoSupervisor: save, load: refresh, onChanged: async () => {},
    closePanel() { state.closed = true; }, navigationComplete: { current: false }, setNotice() {},
    setAction(value: string) { state.action = value; }, setReason() {}, open: refresh,
    completeDecision: async (saveRecord: () => Promise<unknown>, reload: () => Promise<unknown>) => {
      await saveRecord(); try { await reload(); return {}; } catch { return { refreshFailed: true }; }
    },
  };
  const js = ts.transpileModule(body + '\nreturn decide;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return { state, decide: Function(...Object.keys(context), js)(...Object.values(context)) };
}
test('lecturer failed saves reject to the dialog and retain the typed rejection', async () => {
  const error = new Error('Save failed'); const { decide, state } = controller(async () => { throw error; }, async () => {});
  await assert.rejects(decide(), error); assert.equal(state.action, 'reject'); assert.equal(state.closed, false);
});
test('lecturer saved decision stays on the request even when refresh fails', async () => {
  let saves = 0; const { decide, state } = controller(async () => { saves++; }, async () => { throw new Error('Offline'); });
  assert.deepEqual(await decide(), { refreshFailed: true }); assert.equal(saves, 1); assert.equal(state.closed, false);
});

test('lecturer successful saves reload the exact open record without navigation', async () => {
  let reloads = 0;
  const { decide, state } = controller(async () => {}, async () => { reloads++; });
  assert.deepEqual(await decide(), {}); assert.equal(reloads, 2); assert.equal(state.closed, false);
});
test('every Supervisor host uses explicit shared decisions and retains save errors', () => {
  for (const name of ['ResearchAmendments', 'LecturerAppointmentRequests', 'CoordinatorSupervisorApprovals', 'SupervisoryTeamManagement']) {
    const host = readFileSync(new URL(`./${name}.tsx`, import.meta.url), 'utf8');
    assert.match(host, /<DecisionDialog/); assert.match(host, /completeDecision\(/);
    assert.doesNotMatch(host, /Confirm decision/);
    assert.match(host, /Reason \(required\)|Rejection reason \(required\)/);
  }
  assert.match(source, /blocked={!!detailError \|\| decisionSaved.current}/);
  assert.match(source, /allowedActions: \[\]/);
});

function coordinatorEnd(save: () => Promise<unknown>, reload: () => Promise<unknown>) {
  const host = readFileSync(new URL('./CoordinatorSupervisorApprovals.tsx', import.meta.url), 'utf8');
  const body = host.slice(host.indexOf('  const endPrimaryAppointment:'), host.indexOf('  const nextAction ='));
  const context = { endSupervisorAppointment: save, loadRecords: reload, setTeamRefreshVersion() {}, notify() { throw new Error('Duplicate module toast'); }, busyRef: { current: false }, setBusy() {},
    completeDecision: async (saveRecord: () => Promise<unknown>, refresh: () => Promise<unknown>) => { await saveRecord(); try { await refresh(); return {}; } catch { return {refreshFailed: true}; } } };
  const js = ts.transpileModule(body + '\nreturn endPrimaryAppointment;', {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  return Function(...Object.keys(context), js)(...Object.values(context));
}
test('Coordinator primary ending returns saved refresh warning without duplicate toast', async () => {
  let saves = 0;
  const end = coordinatorEnd(async () => { saves++; }, async () => { throw new Error('Offline'); });
  assert.deepEqual(await end({appointmentLifecycle: {appointmentId: 12}}, 'COMPLETED', 'Finished'), {refreshFailed: true});
  assert.equal(saves, 1);
});
test('Coordinator primary ending propagates failed save without reloading', async () => {
  const error = new Error('Save denied'); let reloads = 0;
  const end = coordinatorEnd(async () => { throw error; }, async () => { reloads++; });
  await assert.rejects(end({appointmentLifecycle: {appointmentId: 12}}, 'COMPLETED', 'Finished'), error);
  assert.equal(reloads, 0);
});
