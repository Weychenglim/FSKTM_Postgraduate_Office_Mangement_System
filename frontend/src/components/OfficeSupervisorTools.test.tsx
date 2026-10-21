import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OfficeSupervisorTools, officeToolsMenuLeft } from './OfficeSupervisorTools';
import { OfficePanelTools } from './OfficePanelTools';
for (const [left, right, viewport, expected] of [
  [0, 120, 320, 16],
  [200, 320, 320, -152],
  [16, 140, 390, 0],
  [266, 390, 390, -148],
  [30, 154, 1280, -14],
  [1100, 1224, 1280, -132],
  [1156, 1280, 1280, -148],
  [13, 135, 305, 3],
  [0, 120, 270, 16],
] as const) {
  assert.equal(officeToolsMenuLeft(left, right, viewport), expected, `Clamps the menu at viewport ${viewport} for trigger ${left}..${right}`);
}
assert.equal(officeToolsMenuLeft(300, 424, 1280, 180), -56, 'Uses the actual menu width when aligning to the trigger');
const originalFetch = globalThis.fetch;
let fetches = 0;
globalThis.fetch = async () => { fetches += 1; throw new Error('Rendering tools must not fetch records'); };
try {
  const html = renderToStaticMarkup(<OfficeSupervisorTools onResearchRecords={() => {}} onWorkload={() => {}} onRequirements={() => {}} />);
  assert.match(html, /<button[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"/);
  const controlledId = html.match(/aria-controls="([^"]+)"/)![1];
  assert.ok(html.includes(`id="${controlledId}"`), 'The trigger controls the actual tools disclosure');
  assert.match(html, /role="group"[^>]*aria-label="Office supervisor tools"[^>]*hidden=""/);
  for (const label of ['Tools', 'Research records', 'Workload monitoring', 'Document requirements', 'Monitoring', 'Configuration', 'Research profiles, corrections and request history', 'Current supervisory workloads and capacity']) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /Capacity reassessments|Records administration|Export appointment records|More tools/);
  assert.equal(fetches, 0, 'Rendering the secondary tools does not load the full appointment dataset');
  const panel = renderToStaticMarkup(<OfficePanelTools onWorkload={() => { throw new Error('Do not navigate during render'); }} />);
  for (const label of ['Monitoring', 'Workload monitoring', 'Current Panel workloads and capacity']) assert.ok(panel.includes(label), label);
  assert.match(panel, /role="group"[^>]*aria-label="Office Panel tools"[^>]*hidden=""/);
  assert.match(panel, /<button[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"/);
  assert.doesNotMatch(panel, /<summary|Research records|Document requirements|Manage capacity|Configuration/);
  assert.equal(fetches, 0, 'Panel Tools does not fetch records');
} finally {
  globalThis.fetch = originalFetch;
}
console.log('Office tools provide an accessible closed disclosure and preserve secondary tools without eager record loading');
