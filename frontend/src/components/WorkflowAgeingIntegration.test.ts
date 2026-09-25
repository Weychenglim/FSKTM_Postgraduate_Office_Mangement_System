import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readComponent = (name: string) =>
  readFileSync(resolve('src/components', name), 'utf8');

const panelMonitoring = readComponent('PanelAppointmentManagement.tsx');
assert.match(panelMonitoring, />Longest waiting</);
assert.match(panelMonitoring, />Waiting</);
assert.match(panelMonitoring, /header: 'Waiting Since'/);
assert.match(panelMonitoring, /header: 'Waiting Days'/);
assert.match(panelMonitoring, /header: 'Waiting On'/);

const panelApprovals = readComponent('LecturerPanelAppointments.tsx');
assert.match(panelApprovals, /\.sort\(compareLongestWaiting\)/);
assert.match(panelApprovals, /formatWaitingText\(recommendation\)/);

const studentPanel = readComponent('StudentPanelAppointment.tsx');
assert.match(studentPanel, /formatWaitingText\(appointment\)/);
assert.match(studentPanel, /faculty processing/i);
assert.doesNotMatch(
  studentPanel,
  /Your appointed panel will appear here after the selected panel lecturer/,
);

const studentSupervisor = readComponent('StudentSupervisorAppointment.tsx');
assert.match(studentSupervisor, /No formal turnaround target is currently configured/);
assert.doesNotMatch(studentSupervisor, /7-10 working days/);

const marksMonitoring = readComponent('MarkEntryRecords.tsx');
assert.match(marksMonitoring, /formatDeadlineText\(rec\)/);
assert.match(marksMonitoring, /rec\.deadlineState === 'OVERDUE'/);

const lecturerMarks = readComponent('LecturerMarksEntry.tsx');
assert.match(lecturerMarks, /task\.deadlineState === 'OVERDUE'/);
assert.match(lecturerMarks, /formatDeadlineText\(task\)/);
assert.doesNotMatch(lecturerMarks, /task\.deadline === '10 Dec 2025'/);

console.log('Workflow ageing component integration tests passed');
