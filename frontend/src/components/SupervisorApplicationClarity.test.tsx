import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as form from './SupervisorAppointmentApplicationPage';
import type { SupervisorCandidate } from '../types';

const html = renderToStaticMarkup(<form.SupervisorAppointmentApplicationPage onBack={() => {}} onSuccess={() => {}} />);
assert.match(html, /aria-label="Application sections"/);
for (const id of ['project-details','supervisor-selection','supporting-documents']) {
  assert.ok(html.includes(`href="#${id}"`) && html.includes(`id="${id}"`), `Section link and destination: ${id}`);
}
assert.match(html, /aria-label="Appointment guidance"/);
assert.match(html, /One pending request at a time/);
assert.match(html, /Programme Coordinator/);
assert.doesNotMatch(html, /No formal turnaround target|Need Assistance\?|Submission prerequisites/);
assert.ok('SupervisorCandidateOption' in form, 'Candidate selection is a renderable control');
assert.ok('SupervisorSelectionSummary' in form, 'Selected Supervisor has a visible summary');
const candidate: SupervisorCandidate = {id:'SV001',name:'Dr Test',domain:'Synthetic research',filled:1,total:5,initials:'DT',selectable:true};
const option = form.SupervisorCandidateOption;
const summary = form.SupervisorSelectionSummary;
const renderOption = (selected:boolean, value=candidate) => renderToStaticMarkup(React.createElement(option,{candidate:value,selected,onToggle:()=>{}}));
assert.match(renderOption(true), /aria-pressed="true"/);
assert.match(renderOption(true), /Selected/);
assert.match(renderOption(false), /aria-pressed="false"/);
assert.doesNotMatch(renderOption(false), />Selected</);
assert.match(renderOption(false,{...candidate,selectable:false}), /disabled=""/);
const selectedSummary = renderToStaticMarkup(React.createElement(summary,{candidate,onClear:()=>{}}));
assert.match(selectedSummary,/Selected supervisor/);
assert.match(selectedSummary,/Dr Test/);
assert.match(selectedSummary,/Clear selection/);
assert.match(renderToStaticMarkup(React.createElement(summary,{candidate:null,onClear:()=>{}})),/No supervisor selected/);
console.log('Application section links, explicit selectable controls, clear selection and useful shared guidance pass');
