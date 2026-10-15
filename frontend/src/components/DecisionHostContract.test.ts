import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LecturerAppointmentGuidance} from './LecturerAppointmentGuidance';

const source=(name:string)=>readFileSync(new URL(`./${name}.tsx`,import.meta.url),'utf8');
for(const name of ['LecturerPanelAppointments','RecommendationDetailsDrawer','StudentSupervisorAppointment','AppointmentEndControl']) {
  assert.match(source(name),/DecisionDialog/,`${name} uses the shared pending/error/confirmation contract`);
  assert.doesNotMatch(source(name),/PortalConfirmModal/,`${name} must not retain a second decision confirmation pattern`);
}
const panel=source('LecturerPanelAppointments');
assert.doesNotMatch(panel,/setConfirmingAcceptance\(false\);\s*onAccept/,'Panel confirmation cannot dismiss before acceptance resolves');
const marks=source('LecturerMarksEntry');
const submission=marks.slice(marks.indexOf('onSubmit={'),marks.indexOf('\n          />',marks.indexOf('onSubmit={')));
assert.doesNotMatch(submission,/setActiveFormTask\(null\)|triggerToast/,'Final Marks callback keeps its shared decision host mounted and lets it report success/failure');
assert.match(submission,/submitMarkEntry/);
const researchGuidance=renderToStaticMarkup(React.createElement(LecturerAppointmentGuidance,{module:'supervisor',section:'research'}));
assert.doesNotMatch(researchGuidance,/Programme Coordinator makes the final decision/,'Research guidance must not invent the removed Coordinator review stage');
assert.match(researchGuidance,/primary supervisor makes the final/);
console.log('Panel, cancellation, lifecycle and Marks parents retain the shared decision contract');
