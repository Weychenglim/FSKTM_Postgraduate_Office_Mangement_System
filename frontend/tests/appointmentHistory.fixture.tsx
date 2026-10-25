import React from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter, useNavigate} from 'react-router';
import {ListState} from '../src/components/ListState';
import {LecturerSuperviseesWorkspace} from '../src/components/LecturerSuperviseesWorkspace';
import {PanelAssignmentsWorkspace} from '../src/components/PanelAssignmentsWorkspace';
import {PanelBrowse} from '../src/components/PanelBrowse';
import {OfficeSupervisorWorkspace} from '../src/components/OfficeSupervisorWorkspace';
import type {PanelPresentation} from '../src/utils/panelPresentation';

const container = document.getElementById('root')!;
let root: Root | null = null;
const results: {name: string; error: string | null}[] = [];
const check = (value: unknown, message: string) => {if (!value) throw new Error(message);};
const pause = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));
const until = async (predicate: () => unknown) => {for (let i = 0; i < 160; i++) {if (predicate()) return; await pause();} throw new Error(`Timed out: ${container.textContent}`);};
const button = (text: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(el => el.textContent?.trim() === text);
const change = (field: HTMLInputElement | HTMLSelectElement, value: string) => {
  Object.getOwnPropertyDescriptor(field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(field, value);
  field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', {bubbles: true}));
};
const search = () => container.querySelector<HTMLInputElement>('input[type="search"]')!;
function BrowserNavigation() {
  const navigate = useNavigate();
  return <div hidden><button data-browser-back onClick={() => navigate(-1)}>Browser Back</button>
    <button data-browser-forward onClick={() => navigate(1)}>Browser Forward</button></div>;
}
async function mount(node: React.ReactNode, past = false) {
  root?.unmount(); root = createRoot(container);
  root.render(<React.StrictMode><MemoryRouter initialEntries={[`/supervisor-appointments/supervisees${past ? '?appointments=past' : ''}`]}>
    <ListState.Provider value={new Map()}><BrowserNavigation/>{node}</ListState.Provider>
  </MemoryRouter></React.StrictMode>);
}
async function scenario(name: string, run: () => Promise<void>) {
  try {await run(); check(document.documentElement.scrollWidth <= innerWidth + 1, 'Page overflows horizontally'); results.push({name, error: null});}
  catch (error) {results.push({name, error: error instanceof Error ? error.message : String(error)});}
}
const primary = {key: 'primary-1', id: 1, kind: 'primary', studentName: 'Former Primary Student', matricNo: 'PG001', programme: 'Computing', supervisorName: 'My Lecturer', appointmentDate: '2025-10-01', endedAt: '2026-10-10T03:00:00Z', outcome: 'REPLACED', applicationId: 1, studentId: 1};
const supporting = {...primary, key: 'supporting-1', kind: 'supporting', studentName: 'Former Supporting Student', matricNo: 'PG002', outcome: 'COMPLETED'};
const rows = [primary, supporting];
const envelope = (results: unknown[], more = {}) => ({results, total: results.length, page: 1, pageSize: 10, pageCount: 1,
  facets: {programmes: ['Computing'], semesters: ['Semester I 2025/2026'], statuses: ['ENDED']}, ...more});
const team = {studentId: 3, matricNo: 'PG003', studentName: 'Current Student', programme: 'Computing', studentStatus: 'ACTIVE', primarySupervisor: {id: 7, name: 'My Lecturer'}, primaryAppointmentId: 4, research: {title: 'Research', area: '', abstract: ''}, appointments: [], nominations: [], canNominate: false};
function mock(history: (url: URL) => Response | Promise<Response> = () => Response.json(envelope(rows))) {
  window.fetch = async input => {
    const url = new URL(String(input), location.origin);
    if (url.pathname.endsWith('/my-appointments/history/')) return history(url);
    if (url.pathname.endsWith('/co-supervisor/')) return Response.json({teams: [team], nominations: [], appointments: []});
    if (url.pathname.endsWith('/office-workspace/teams/')) return Response.json(envelope([{id: 7, name: 'My Lecturer', staffNo: 'L007', primaryCount: 1, supportingCount: 0}]));
    if (url.pathname.endsWith('/office-workspace/appointments/')) return Response.json(envelope(rows));
    throw new Error(`Unexpected API: ${url.pathname}`);
  };
}
const ownRoster = () => <LecturerSuperviseesWorkspace role="Lecturer" lecturerId="7" view="roster" showResearchChanges={false} showRefresh={false} onNavigateToStudent={() => {}}/>;
const activePanel: PanelPresentation = {id: 1, studentId: 'PG010', studentName: 'Current Panel Student', programme: 'Computing', recommendedMember: 'Dr Panel', recommendedMemberId: 'L01', proposedTopic: 'Research', submittedDate: '', status: 'APPROVED', appointmentDate: '2025-10-01',
  appointmentLifecycle: {appointmentId: 1, status: 'ACTIVE', endedAt: null, endedBy: null, endOutcome: null, endReason: null, supersedesAppointmentId: null, replacementAppointmentId: null}};
const pastPanel: PanelPresentation = {...activePanel, id: 2, studentName: 'Past Panel Student', appointmentLifecycle: {...activePanel.appointmentLifecycle!, appointmentId: 2, status: 'ENDED', endOutcome: 'COMPLETED', endedAt: '2026-10-10'}};

await scenario('Office Panel history is visible in the heading and survives clear filters and lecturer drilldown', async () => {
  mock(); await mount(<PanelAssignmentsWorkspace role="office" records={[activePanel, pastPanel]} onOpen={() => {}}/>);
  await until(() => button('Past'));
  check(button('Past')!.closest('header'), 'Switch must sit beside the section heading');
  check(!container.querySelector('select[aria-label="Appointments"]'), 'Old duplicate appointment dropdown remains');
  button('Past')!.click(); await until(() => button('Past')?.getAttribute('aria-pressed') === 'true');
  button('Clear filters')!.click(); await pause();
  check(button('Past')!.getAttribute('aria-pressed') === 'true', 'Clearing filters unexpectedly exits Past');
  button('View students')!.click(); await until(() => container.textContent?.includes('Past Panel Student'));
  check(!container.textContent?.includes('Current Panel Student'), 'Current assignment leaked into Past');
  check(container.textContent?.includes('Completed'), 'Past outcome missing');
});

await scenario('Lecturer Panel uses the shared switch and keeps active older-semester assignments current', async () => {
  mock(); await mount(<PanelBrowse scope="my-history-test" title="My Panel students" appointments records={[activePanel, pastPanel]} onOpen={() => {}}/>);
  await until(() => container.textContent?.includes('Current Panel Student'));
  button('Past')!.click(); await until(() => container.textContent?.includes('Past Panel Student'));
  check(!container.textContent?.includes('Current Panel Student'), 'Active Panel appointment is in Past');
  check(container.textContent?.includes('Ended on'), 'Missing past ending date');
  button('Current')!.click(); await until(() => container.textContent?.includes('Current Panel Student'));
});

await scenario('Office supervision switch stays in each list header', async () => {
  mock(); await mount(<OfficeSupervisorWorkspace routeView="teams"/>);
  await until(() => button('Past'));
  check(button('Past')!.closest('header'), 'Current Office supervision switch is outside its card header');
  button('Past')!.focus(); button('Past')!.click(); await until(() => container.textContent?.includes('Former Primary Student'));
  check(document.activeElement === button('Past'), 'Office switch lost keyboard focus');
  check(button('Current')!.closest('header'), 'Past Office supervision switch is outside its card header');
  check(container.textContent?.includes('Former Supporting Student'), 'Office supporting history lost');
});

await scenario('Lecturer can find both past roles and inspect a read-only appointment without opening the current team', async () => {
  mock(); await mount(ownRoster()); await until(() => container.textContent?.includes('Current Student'));
  check(button('Past')?.closest('header'), 'Lecturer switch missing from current heading');
  button('Past')!.focus(); button('Past')!.click(); await until(() => container.textContent?.includes('Former Supporting Student'));
  check(document.activeElement === button('Past'), 'Lecturer switch lost keyboard focus');
  check(!container.textContent?.includes('Current Student'), 'Active student leaked into Past');
  check(container.textContent?.includes('Replaced') && container.textContent?.includes('Completed'), 'Missing historical outcomes');
  button('View appointment')!.focus(); button('View appointment')!.click(); await until(() => container.textContent?.includes('Past supervision appointment'));
  check(container.textContent?.includes('Primary supervisor'), 'Past role missing');
  check(!button('View supervision') && !button('End appointment') && !button('View student record'), 'History exposes live-team actions');
  button('Back to Past supervisees')!.click(); await until(() => !container.querySelector('[data-record-page]'));
  await until(() => document.activeElement === button('View appointment'));
  check(button('Past')!.getAttribute('aria-pressed') === 'true', 'Back lost Past selection');
  button('Current')!.click(); await until(() => container.textContent?.includes('Current Student'));
});

await scenario('History failures show Retry and recover without an incorrect empty state', async () => {
  let fail = true; mock(() => fail ? Response.json({detail: 'History temporarily unavailable'}, {status: 503}) : Response.json(envelope(rows)));
  await mount(ownRoster(), true); await until(() => button('Retry'));
  check(!container.textContent?.includes('No past supervision appointments'), 'Failure incorrectly described as empty');
  fail = false; button('Retry')!.click(); await until(() => container.textContent?.includes('Former Supporting Student'));
});

await scenario('Search resets server pagination and late history results cannot overwrite newer filters', async () => {
  let release: (() => void) | undefined;
  mock(url => {
    const q = url.searchParams.get('q');
    if (q === 'slow') return new Promise<Response>(resolve => {release = () => resolve(Response.json(envelope([{...primary, studentName: 'Stale Student'}])));});
    if (q === 'missing') return Response.json(envelope([]));
    if (url.searchParams.get('page') === '2') return Response.json(envelope([supporting], {total: 11, page: 2, pageCount: 2}));
    return Response.json(envelope([primary], {total: 11, pageCount: 2}));
  });
  await mount(ownRoster(), true); await until(() => button('Next'));
  button('Next')!.click(); await until(() => container.textContent?.includes('Page 2 of 2'));
  change(search(), 'slow'); await until(() => release);
  check(!container.querySelector('table[aria-label="Past supervisee appointments"]'), 'Old actionable rows remain under new pending filters');
  check(container.textContent?.includes('Loading past appointments'), 'Pending filters have no loading indication');
  change(search(), 'missing'); await until(() => container.textContent?.includes('No past appointments match these filters'));
  release!(); await pause(200);
  check(!container.textContent?.includes('Stale Student'), 'Late response overwrote newer filter');
  button('Clear filters')!.click(); await until(() => container.textContent?.includes('Former Primary Student'));
  check(container.textContent?.includes('Page 1 of 2'), 'Filtering did not reset to the first page');
});

await scenario('Browser Back and Forward retain the selected past appointment and list filters', async () => {
  mock(); await mount(ownRoster(), true);
  await until(() => button('View appointment'));
  change(search(), 'Former'); await pause(200); await until(() => button('View appointment'));
  button('View appointment')!.focus(); button('View appointment')!.click();
  await until(() => container.textContent?.includes('Past supervision appointment'));
  container.querySelector<HTMLButtonElement>('[data-browser-back]')!.click();
  await until(() => !container.querySelector('[data-record-page]') && button('Past')?.getAttribute('aria-pressed') === 'true');
  check(search().value === 'Former', 'Browser Back lost list filters');
  container.querySelector<HTMLButtonElement>('[data-browser-forward]')!.click();
  await until(() => container.textContent?.includes('Past supervision appointment'));
  check(container.textContent?.includes('Former Primary Student'), 'Forward reopened a different appointment');
  button('Back to Past supervisees')!.click();
  await until(() => !container.querySelector('[data-record-page]') && button('Past')?.getAttribute('aria-pressed') === 'true');
  check(search().value === 'Former', 'Returning from Forward lost filters');
});

const preview = new URL(parent.location.href).searchParams.get('preview');
if (preview) {
  mock(); await mount(ownRoster(), preview === 'past');
  await until(() => container.textContent?.includes(preview === 'past' ? 'Former Supporting Student' : 'Current Student'));
}
parent.postMessage({type: 'appointment-history-results', results}, location.origin);
