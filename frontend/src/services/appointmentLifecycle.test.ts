import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PanelSuperviseeDetails } from '../components/PanelSuperviseeRoster';

import { buildSupervisorApplicationFormData } from '../utils/supervisorDocuments';


const form = buildSupervisorApplicationFormData(
  {
    proposedSupervisorId: 'NEW-001',
    researchTitle: 'Replacement workflow',
    researchArea: 'Software Engineering',
    researchAbstract: 'Research abstract',
    replacesAppointmentId: 42,
    replacementReason: 'Research alignment changed.',
  },
  new Map(),
);

assert.equal(form.get('replacesAppointmentId'), '42');
assert.equal(form.get('replacementReason'), 'Research alignment changed.');

const serviceSource = readFileSync(
  new URL('./appointmentsApi.ts', import.meta.url),
  'utf8',
);
assert.match(serviceSource, /endSupervisorAppointment/);
assert.match(serviceSource, /supervisor\/appointments\/\$\{appointmentId\}\/end\//);
assert.match(serviceSource, /endPanelAppointment/);
assert.match(serviceSource, /panel\/appointments\/\$\{appointmentId\}\/end\//);
assert.match(serviceSource, /replacesAppointmentId\?: number \| null/);
assert.match(serviceSource, /replacementReason\?: string/);

const studentSource = readFileSync(
  new URL('../components/StudentSupervisorAppointment.tsx', import.meta.url),
  'utf8',
);
assert.doesNotMatch(studentSource, /Change Supervisor|replacementApplication/);

const supervisorFormSource = readFileSync(
  new URL('../components/SupervisorAppointmentApplicationPage.tsx', import.meta.url),
  'utf8',
);
assert.doesNotMatch(supervisorFormSource, /replacementReason|Replacement reason/);

const panelSource = readFileSync(
  new URL('../components/LecturerPanelAppointments.tsx', import.meta.url),
  'utf8',
);
assert.match(panelSource, /replacementAssignment/);
const replacementPanel = renderToStaticMarkup(React.createElement(PanelSuperviseeDetails, {
  student: { studentId:'PG1', studentName:'Student', programme:'Computing', semester:'Semester I', proposedTopic:'Research', researchArea:'Area', abstract:'Abstract', supervisorName:'Supervisor', supervisorId:'L1', supervisorAppointmentId:1, panelAppointmentId:2, currentPanelMember:'Current Panel', currentPanelMemberId:'L2', canRecommend:true },
  onRecommend:()=>{}, onOpenRequest:()=>{},
}));
assert.match(replacementPanel, /Request replacement/);
assert.match(replacementPanel, /Current Panel/);

const officeSupervisorSource = readFileSync(
  new URL('../components/SupervisorAppointmentManagement.tsx', import.meta.url),
  'utf8',
);
assert.match(officeSupervisorSource, /AppointmentEndControl/);
assert.match(officeSupervisorSource, /endSupervisorAppointment/);
assert.match(officeSupervisorSource, /OfficeSupervisorReplacementForm/);
assert.match(officeSupervisorSource, /onChangePrimarySupervisor/);

const officePanelSource = readFileSync(
  new URL('../components/PanelAppointmentDetail.tsx', import.meta.url),
  'utf8',
);
assert.match(officePanelSource, /AppointmentEndControl/);
assert.match(officePanelSource, /endPanelAppointment/);

const endControlSource = readFileSync(
  new URL('../components/AppointmentEndControl.tsx', import.meta.url),
  'utf8',
);
assert.match(endControlSource, /End Appointment/);
assert.match(endControlSource, /WITHDRAWN/);
assert.doesNotMatch(endControlSource, /option value="REPLACED"/);

console.log('Appointment lifecycle frontend contract tests passed.');
