import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readComponent = (name: string) =>
  readFileSync(resolve('src/components', name), 'utf8');

const {filterPanelBrowse,PanelBrowse}=await import('./PanelBrowse');
const React=await import('react');
const {renderToStaticMarkup}=await import('react-dom/server');
const request={id:1,studentId:'PG1',studentName:'Waiting student',programme:'Computing',proposedTopic:'Research',recommendedMember:'Panel member',recommendedMemberId:'L1',submittedDate:'15 Oct 2026',status:'SUBMITTED_TO_PANEL' as const,waitingDays:2};
const older={...request,id:2,studentName:'Older student',waitingDays:9};
assert.equal(filterPanelBrowse([request,older],{view:'requests',sort:'waiting'})[0].id,2,'The longest current stage wait sorts first');
const panelTable=renderToStaticMarkup(React.createElement(PanelBrowse,{scope:'ageing-contract',title:'Panel requests',records:[request,older],onOpen:()=>{}}));
assert.match(panelTable,/Longest waiting at this stage/);
assert.match(panelTable,/Waiting at this stage/);
assert.match(panelTable,/9 calendar days/);
assert.doesNotMatch(panelTable,/Overdue/,'Waiting age does not manufacture an overdue policy');

const studentPanel = readComponent('StudentPanelAppointment.tsx');
assert.match(studentPanel, /formatWaitingText\(appointment\)/);
assert.match(studentPanel, /faculty processing/i);
assert.doesNotMatch(
  studentPanel,
  /Your appointed panel will appear here after the selected panel lecturer/,
);

const studentSupervisor = readComponent('StudentSupervisorAppointment.tsx');
assert.match(studentSupervisor, /StudentSupervisorApplications/);
const studentApplications = readComponent('StudentSupervisorApplications.tsx');
assert.match(studentApplications, /formatSupervisorWaiting\(app\)/);
assert.doesNotMatch(studentApplications, /7-10 working days/);
assert.doesNotMatch(studentSupervisor, /7-10 working days/);
const studentGuidance = readComponent('StudentAppointmentGuidance.tsx');
assert.doesNotMatch(studentGuidance, /7-10 working days|within 7 days|turnaround/i);

const marksMonitoring = readComponent('MarkEntryRecords.tsx');
assert.match(marksMonitoring, /formatDeadlineText\(rec\)/);
assert.match(marksMonitoring, /rec\.deadlineState === 'OVERDUE'/);

const lecturerMarks = readComponent('LecturerMarksEntry.tsx');
assert.match(lecturerMarks, /task\.deadlineState === 'OVERDUE'/);
assert.match(lecturerMarks, /formatDeadlineText\(task\)/);
assert.doesNotMatch(lecturerMarks, /task\.deadline === '10 Dec 2025'/);

console.log('Workflow ageing component integration tests passed');
