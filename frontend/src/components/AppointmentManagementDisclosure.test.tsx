import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {AppointmentRecordSection} from './AppointmentSidebar';
test('Management is clearly labelled and collapsed while ordinary record content stays visible',()=>{
  const html=render(<AppointmentRecordSection actions={<button>End panel appointment</button>}><p>Active</p><button>View approved application</button></AppointmentRecordSection>);
  assert.match(html,/Manage appointment/);
  assert.match(html,/<details/);
  assert.doesNotMatch(html,/<details[^>]*open/);
  assert.ok(html.indexOf('View approved application')<html.indexOf('<details'),'Reading the source does not require expanding management');
  assert.ok(html.indexOf('End panel appointment')>html.indexOf('<details'));
});
test('A read-only appointment has no empty management disclosure',()=>{
  const html=render(<AppointmentRecordSection><p>Active</p></AppointmentRecordSection>);
  assert.doesNotMatch(html,/Manage appointment/);
});
