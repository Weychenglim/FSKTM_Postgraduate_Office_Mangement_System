import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { LecturerMarksEntry } from '../src/components/LecturerMarksEntry';
import { MarkEntryRecords } from '../src/components/MarkEntryRecords';
import { RecordPageProvider } from '../src/components/RecordPage';
import { ListState } from '../src/components/ListState';
import { setAuthToken, request } from '../src/services/apiClient';
import { createRubricVersion, createRubricComponent, getRubricVersion, createEvaluationPeriod, publishEvaluationPeriod, generateEvaluationTasks, getEvaluationTasks, getSubmittedEvaluations, getMarkRecords, getMarkRecordById } from '../src/services/marksApi';

// Real API requests only. Credentials are ephemeral test-user tokens held in memory.
const checks: string[] = [];
const check = (value: unknown, message: string) => { if (!value) throw Error(message); checks.push(message); };
const pause = () => new Promise(resolve => setTimeout(resolve, 40));
const until = async (condition: () => unknown) => { for (let i = 0; i < 500; i++) { if (condition()) return; await pause(); } throw Error('Timed out waiting for the marking UI'); };
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.trim() === label && !node.closest('[hidden]'));
const click = async (label: string) => { const node = button(label); if (!node) throw Error(`Missing action: ${label}`); node.click(); await pause(); };
const roleButton = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Marking responsibility"] button')].find(node => node.textContent?.includes(label))!;
const enter = async (node: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  if (!node) throw Error('Missing mark field');
  Object.getOwnPropertyDescriptor(node instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value')!.set!.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true })); await pause();
};
let root: Root | null = null;
const mount = (content: React.ReactNode) => {
  root?.unmount(); root = createRoot(document.getElementById('root')!);
  root.render(<MemoryRouter><ListState.Provider value={new Map()}><RecordPageProvider>{content}</RecordPageProvider></ListState.Provider></MemoryRouter>);
};
try {
  const config = await (await fetch('/journey-config')).json();
  setAuthToken(config.officeToken);
  const rubric = await createRubricVersion({ familyCode: 'journey-rubric', name: 'Journey assessment', description: 'Disposable browser acceptance data', targetMark: '100' });
  const problem = await createRubricComponent(rubric.id, { code: 'problem_definition', name: 'Problem definition', description: 'Research clarity', maxMarks: '40', required: true, isActive: true, displayOrder: 1 });
  const method = await createRubricComponent(rubric.id, { code: 'methodology', name: 'Methodology', description: 'Research methods', maxMarks: '60', required: true, isActive: true, displayOrder: 2 });
  check((await getRubricVersion(rubric.id)).isReady, 'Office creates a ready rubric through real APIs');
  const period = await createEvaluationPeriod({ name: 'Journey evaluation', semesterId: config.semesterId, rubricId: rubric.id, programmeScope: 'ALL', programmes: [], evaluatorRoles: ['SUPERVISOR', 'PANEL'], opensAt: new Date(Date.now() - 3600000).toISOString(), closesAt: new Date(Date.now() + 86400000).toISOString() });
  check((await publishEvaluationPeriod(period.id)).effectiveStatus === 'OPEN', 'Office publishes an open evaluation period');
  check((await generateEvaluationTasks(period.id)).totalCount === 4, 'Official appointments generate four distinct role assignments');
  await generateEvaluationTasks(period.id);
  check((await getMarkRecords()).length === 4, 'Repeated generation does not duplicate assignments');

  setAuthToken(config.lecturerToken);
  const tasks = await getEvaluationTasks();
  check(tasks.length === 2 && tasks.some(task => task.evaluatorRole === 'SUPERVISOR') && tasks.some(task => task.evaluatorRole === 'PANEL'), 'One lecturer receives only their Supervisor and Panel tasks');
  check((await getSubmittedEvaluations()).length === 0, 'Unsubmitted tasks do not appear in history');
  mount(<LecturerMarksEntry />);
  await until(() => !!document.querySelector('#mark-entry-tasks-list-block > p[role="status"]'));
  const rows = () => document.querySelector('#mark-entry-tasks-list-block tbody')?.textContent || '';
  check(rows().includes('JOURNEY-SUPERVISEE') && !rows().includes('JOURNEY-PANEL'), 'Supervisee workspace excludes panel students');
  await click('Start marking'); await until(() => !!document.querySelector('#mark-entry-detail-page'));
  const mark = (name: string) => document.querySelector<HTMLInputElement>(`input[aria-label$="for ${name}"]`)!;
  await enter(mark('Problem definition'), '30'); await enter(mark('Methodology'), '45');
  await enter(document.querySelector('textarea')!, 'First draft feedback');
  await enter(document.querySelector('textarea[id^="marks-comments-"]')!, 'First draft comments');
  await click('Save draft'); await until(() => !document.body.textContent?.includes('Unsaved changes'));
  check((await getEvaluationTasks()).find(task => task.evaluatorRole === 'SUPERVISOR')?.totalMark === '75.00', 'First UI draft persists its real scores');
  await enter(mark('Problem definition'), '35'); await enter(mark('Methodology'), '50');
  await enter(document.querySelector('textarea')!, 'Revised supervisor feedback');
  await enter(document.querySelector('textarea[id^="marks-comments-"]')!, 'Revised supervisor comments');
  await click('Save draft'); await until(() => !document.body.textContent?.includes('Unsaved changes'));
  const revised = (await getEvaluationTasks()).find(task => task.evaluatorRole === 'SUPERVISOR')!;
  check(revised.totalMark === '85.00' && revised.components?.[0].feedback === 'Revised supervisor feedback', 'A second save persists edited scores and feedback instead of legacy values');
  await click('Back to Marks Entry'); await until(() => !document.querySelector('#mark-entry-detail-page'));
  await click('Continue marking'); await until(() => !!mark('Problem definition'));
  check(Number(mark('Problem definition').value) === 35 && Number(mark('Methodology').value) === 50, 'Reopening a draft restores its saved component scores');
  await click('Submit marks'); await click('Submit and lock marks');
  await until(() => !document.querySelector('dialog[open]') && !button('Save draft'));
  check(mark('Problem definition').disabled, 'Successful submission locks the actual editor');
  await click('Back to Marks Entry'); await until(() => !document.querySelector('#mark-entry-detail-page'));
  roleButton('My panel students').click(); await pause();
  check(rows().includes('JOURNEY-PANEL') && !rows().includes('JOURNEY-SUPERVISEE'), 'Panel workspace excludes supervisees');
  await click('Start marking'); await until(() => !!mark('Problem definition'));
  await enter(mark('Problem definition'), '20'); await enter(mark('Methodology'), '40');
  await enter(document.querySelector('textarea[id^="marks-comments-"]')!, 'Panel assessment comments');
  await click('Submit marks'); await click('Submit and lock marks');
  await until(() => !document.querySelector('dialog[open]') && !button('Save draft'));
  await click('Back to Marks Entry'); await until(() => !document.querySelector('#mark-entry-detail-page'));
  await click('View submission history'); await until(() => !!document.querySelector('#marks-entry-history p[role="status"]'));
  check(document.querySelector('#marks-entry-history tbody')?.textContent?.includes('JOURNEY-PANEL'), 'Panel submission appears in the selected history responsibility');
  await click('View submission'); await until(() => !!document.querySelector('[data-record-page]'));
  check(document.querySelector('[data-record-page]')?.textContent?.includes('60.00') && !document.querySelector('[data-record-page] input, [data-record-page] textarea'), 'History opens the submitted Panel scores read-only');
  await click('Back to Marks Entry History'); await until(() => !document.querySelector('[data-record-page]'));
  roleButton('My supervisees').click(); await pause();
  check(document.querySelector('#marks-entry-history tbody')?.textContent?.includes('85.00'), 'Supervisor history retains the revised submitted total');
  const history = await getSubmittedEvaluations();
  check(history.length === 2 && history.every(task => task.canEdit === false && task.canSubmit === false), 'Real history API contains both own submissions with read-only rights');
  let locked = false;
  try { await request(`/marks/tasks/${revised.id}/draft/`, { method: 'PUT', body: JSON.stringify({ scores: [{ componentId: problem.id, marksAwarded: 1 }, { componentId: method.id, marksAwarded: 1 }] }) }); } catch (failure) { locked = (failure as { status: number }).status === 409; }
  check(locked, 'Backend rejects edits to submitted marks');

  root?.unmount(); root = null;
  setAuthToken(config.officeToken);
  const records = (await getMarkRecords()).filter(record => record.status === 'Submitted');
  check(records.length === 2 && records.some(record => record.evaluatorRole === 'SUPERVISOR' && Number(record.totalMark) === 85) && records.some(record => record.evaluatorRole === 'PANEL' && Number(record.totalMark) === 60), 'Office results agree with both submitted lecturer totals and roles');
  const detail = await getMarkRecordById(records.find(record => record.evaluatorRole === 'SUPERVISOR')!.id);
  check(detail.entry.comments === 'Revised supervisor comments' && detail.rubric.components[0].feedback === 'Revised supervisor feedback', 'Office detail retains revised comments and component feedback');
  mount(<MarkEntryRecords onBack={() => {}} onViewRecordDetail={() => {}} initialStatusTab="Submitted" />);
  await until(() => document.querySelectorAll('#mark-records-table-container tbody tr').length === 2);
  const officeRows = document.querySelector('#mark-records-table-container tbody')?.textContent || '';
  check(officeRows.includes('JOURNEY-SUPERVISEE') && officeRows.includes('JOURNEY-PANEL') && officeRows.includes('85') && officeRows.includes('60'), 'Office record workspace renders both real submitted results');
  document.getElementById('journey-results')!.textContent = JSON.stringify({ checks });
} catch (failure) {
  document.getElementById('journey-results')!.textContent = JSON.stringify({ checks, error: failure instanceof Error ? failure.message : String(failure) });
}
