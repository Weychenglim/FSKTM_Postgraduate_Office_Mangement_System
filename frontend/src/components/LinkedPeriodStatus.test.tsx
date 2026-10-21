import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LinkedPeriodStatus} from './LinkedPeriodStatus';

test('draft lifecycle remains explicit even while its dates are in progress and activity enforcement is enabled',()=>{
  const html=renderToStaticMarkup(<LinkedPeriodStatus status={{lifecycleStatus:'DRAFT',scheduleStatus:'OPEN',datesEnforced:true}}/>);
  assert.match(html,/DRAFT/);assert.match(html,/Schedule: Open/);assert.match(html,/Dates enforced/);assert.match(html,/Draft dates do not control submissions/);
});
test('Marks rules and closed windows do not imply open submission access',()=>{
  const html=renderToStaticMarkup(<LinkedPeriodStatus status={{lifecycleStatus:'CLOSED',scheduleStatus:'OPEN',datesEnforced:null}}/>);
  assert.match(html,/Evaluation rules apply/);assert.match(html,/This window is closed/);assert.doesNotMatch(html,/Dates enforced/);
});
