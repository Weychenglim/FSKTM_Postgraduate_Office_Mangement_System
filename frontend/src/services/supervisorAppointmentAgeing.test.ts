import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import type {
  SupervisorApplicationRecord,
  SupervisorRecord,
  SupervisorRequest,
} from '../types';

const bundledService = await build({
  entryPoints: [resolve('src/services/appointmentsApi.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  define: {
    'import.meta.env': '{}',
  },
});
const serviceSource = bundledService.outputFiles[0]?.text;
assert.ok(serviceSource, 'The appointments service should bundle for focused tests.');
const appointmentsApi = await import(
  `data:text/javascript;base64,${Buffer.from(serviceSource).toString('base64')}`
) as Record<string, unknown>;

assert.equal(
  typeof appointmentsApi.formatSupervisorWaiting,
  'function',
  'Supervisor waiting text should be exposed at the API mapping boundary.',
);
assert.equal(
  typeof appointmentsApi.orderSupervisorQueueOldestFirst,
  'function',
  'Supervisor pending queues should share a stable oldest-first ordering helper.',
);
assert.equal(
  typeof appointmentsApi.getSupervisorRecordSummary,
  'function',
  'Office Staff monitoring should derive summary counts from persisted records.',
);

const formatSupervisorWaiting = appointmentsApi.formatSupervisorWaiting as (
  record: { status: string; waitingDays?: number | null; waitingOn?: string | null },
) => string;
const orderSupervisorQueueOldestFirst = appointmentsApi.orderSupervisorQueueOldestFirst as <
  T extends { waitingDays?: number | null },
>(records: readonly T[]) => T[];
const getSupervisorRecordSummary = appointmentsApi.getSupervisorRecordSummary as (
  records: readonly SupervisorRecord[],
) => {
  withoutSupervisor: number;
  pending: number;
  approved: number;
  workloadAlerts: number;
  longestWaiting: SupervisorRecord | null;
};
const toStudentSupervisorApplication = appointmentsApi.toStudentSupervisorApplication as (
  record: SupervisorApplicationRecord,
) => ReturnType<typeof import('./appointmentsApi').toStudentSupervisorApplication>;

assert.equal(
  formatSupervisorWaiting({
    status: 'SUBMITTED_TO_SUPERVISOR',
    waitingDays: 6,
    waitingOn: 'SUPERVISOR',
  }),
  'Waiting on Supervisor for 6 days',
);
assert.equal(
  formatSupervisorWaiting({
    status: 'APPROVED',
    waitingDays: 12,
    waitingOn: 'PROGRAMME_COORDINATOR',
  }),
  '-',
  'Terminal workflow records must not render stale waiting metadata.',
);
assert.equal(
  formatSupervisorWaiting({ status: 'Pending' }),
  '-',
  'Mock records without ageing metadata should remain compatible.',
);

const queue: SupervisorRequest[] = [
  {
    studentId: 'DEMO-1',
    studentName: 'Demo One',
    programme: 'Demo Programme',
    proposedTopic: 'Topic One',
    researchArea: 'Area One',
    submittedDate: '20 Jul 2026',
    receivedTime: '09:00',
    status: 'SUBMITTED_TO_SUPERVISOR',
    waitingDays: null,
  },
  {
    studentId: 'DEMO-2',
    studentName: 'Demo Two',
    programme: 'Demo Programme',
    proposedTopic: 'Topic Two',
    researchArea: 'Area Two',
    submittedDate: '18 Jul 2026',
    receivedTime: '09:00',
    status: 'SUBMITTED_TO_SUPERVISOR',
    waitingDays: 5,
  },
  {
    studentId: 'DEMO-3',
    studentName: 'Demo Three',
    programme: 'Demo Programme',
    proposedTopic: 'Topic Three',
    researchArea: 'Area Three',
    submittedDate: '19 Jul 2026',
    receivedTime: '09:00',
    status: 'SUBMITTED_TO_SUPERVISOR',
    waitingDays: 2,
  },
];
const orderedQueue = orderSupervisorQueueOldestFirst(queue);
assert.deepEqual(
  orderedQueue.map((record) => record.studentId),
  ['DEMO-2', 'DEMO-3', 'DEMO-1'],
);
assert.deepEqual(
  queue.map((record) => record.studentId),
  ['DEMO-1', 'DEMO-2', 'DEMO-3'],
  'Queue ordering must not mutate API response arrays.',
);

const officeRecords: SupervisorRecord[] = [
  {
    studentId: 'DEMO-1',
    studentName: 'Demo One',
    programme: 'Demo Programme',
    supervisor: 'Not Assigned',
    status: 'No Supervisor',
    updatedDate: '-',
  },
  {
    studentId: 'DEMO-2',
    studentName: 'Demo Two',
    programme: 'Demo Programme',
    supervisor: 'Demo Supervisor',
    status: 'Pending',
    updatedDate: '20 Jul 2026',
    waitingDays: 3,
    waitingOn: 'SUPERVISOR',
  },
  {
    studentId: 'DEMO-3',
    studentName: 'Demo Three',
    programme: 'Demo Programme',
    supervisor: 'Demo Supervisor',
    status: 'Pending',
    updatedDate: '18 Jul 2026',
    waitingDays: 7,
    waitingOn: 'PROGRAMME_COORDINATOR',
  },
  {
    studentId: 'DEMO-4',
    studentName: 'Demo Four',
    programme: 'Demo Programme',
    supervisor: 'Demo Supervisor',
    status: 'Approved',
    updatedDate: '17 Jul 2026',
  },
  {
    studentId: 'DEMO-5',
    studentName: 'Demo Five',
    programme: 'Demo Programme',
    supervisor: 'Demo Supervisor',
    status: 'Workload Alert',
    updatedDate: '17 Jul 2026',
  },
];
const summary = getSupervisorRecordSummary(officeRecords);
assert.deepEqual(
  {
    withoutSupervisor: summary.withoutSupervisor,
    pending: summary.pending,
    approved: summary.approved,
    workloadAlerts: summary.workloadAlerts,
    longestWaitingStudentId: summary.longestWaiting?.studentId,
  },
  {
    withoutSupervisor: 1,
    pending: 2,
    approved: 1,
    workloadAlerts: 1,
    longestWaitingStudentId: 'DEMO-3',
  },
);

const applicationRecord: SupervisorApplicationRecord = {
  id: 42,
  studentId: 'DEMO-STUDENT-001',
  studentName: 'Demo Student',
  programme: 'Demo Programme',
  semester: 'Semester 1',
  proposedSupervisor: 'Demo Supervisor',
  proposedSupervisorId: 'DEMO-LECT-001',
  researchTitle: 'Demo Research',
  researchArea: 'Software Engineering',
  researchAbstract: 'Demonstration abstract.',
  researchProfileReady: false,
  status: 'PENDING_COORDINATOR',
  rejectionReason: '',
  submittedAt: '2026-07-20T08:00:00Z',
  workflow: [],
  waitingSince: '2026-07-21T08:00:00Z',
  waitingDays: 2,
  waitingOn: 'PROGRAMME_COORDINATOR',
};
const studentApplication = toStudentSupervisorApplication(applicationRecord);
assert.equal(studentApplication.waitingSince, applicationRecord.waitingSince);
assert.equal(studentApplication.waitingDays, applicationRecord.waitingDays);
assert.equal(studentApplication.waitingOn, applicationRecord.waitingOn);

const source = (file: string): string =>
  readFileSync(resolve('src/components', file), 'utf8');
const officeSource = source('SupervisorAppointmentManagement.tsx');
const coordinatorSource = source('CoordinatorSupervisorApprovals.tsx');
const lecturerSource = source('LecturerSupervisorAppointments.tsx');
const studentSource = source('StudentSupervisorAppointment.tsx');

assert.match(officeSource, />Waiting</);
assert.match(officeSource, /Longest waiting/);
assert.doesNotMatch(officeSource, /pending over 7 days/i);
assert.doesNotMatch(officeSource, /4 records in queue/i);
assert.match(officeSource, /formatSupervisorWaiting/);
assert.match(officeSource, /workload alert records/i);
assert.match(coordinatorSource, /orderSupervisorQueueOldestFirst/);
assert.match(coordinatorSource, /formatSupervisorWaiting/);
assert.match(lecturerSource, /orderSupervisorQueueOldestFirst/);
assert.match(lecturerSource, /formatSupervisorWaiting/);
assert.doesNotMatch(lecturerSource, /Requires review within 7 days/i);
assert.match(studentSource, /formatSupervisorWaiting/);

console.log('supervisor appointment ageing frontend tests passed');
