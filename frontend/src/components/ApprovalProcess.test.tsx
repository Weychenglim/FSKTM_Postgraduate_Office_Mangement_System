import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApprovalProcess } from './ApprovalProcess';
import type { ApprovalStep } from '../utils/approvalProcess';

const states: ApprovalStep['state'][] = ['completed', 'current', 'upcoming', 'rejected', 'cancelled', 'not_reached', 'unknown'];
const markup = renderToStaticMarkup(<ApprovalProcess title="Request approval" steps={states.map((state, index) => ({ id: String(index), label: `Stage ${index}`, state,
  ...(index === 0 ? { actorName: 'Dr Actual', actorRole: 'Lecturer', occurredAt: '2026-10-14T02:30:00Z' } : {}),
  ...(index === 3 ? { reason: 'Scope & eligibility' } : {}),
}))} />);
assert.match(markup, /<ol/);
assert.match(markup, /Request approval/);
assert.equal((markup.match(/aria-current="step"/g) || []).length, 1);
for (const label of ['Completed', 'Current stage', 'Upcoming', 'Rejected', 'Cancelled', 'Not reached', 'Not recorded']) assert.ok(markup.includes(label), label);
assert.match(markup, /Dr Actual.*Lecturer/);
assert.match(markup, /14 Oct 2026.*10:30.*Malaysia/);
assert.match(markup, /Scope &amp; eligibility/);
assert.doesNotMatch(markup, /animate-|motion|Invalid date|Not configured/);
const invalid = renderToStaticMarkup(<ApprovalProcess steps={[{ id: 'bad', label: 'Decision', state: 'completed', occurredAt: 'nonsense' }]} />);
assert.match(invalid, /historical review details are unavailable/);
assert.doesNotMatch(invalid, /Invalid date|NaN/);
const missingHistory = renderToStaticMarkup(<ApprovalProcess steps={[{ id: 'missing', label: 'Historical decision', state: 'completed', actorName: 'Known reviewer' }]} />);
assert.match(missingHistory, /Known reviewer/);
assert.doesNotMatch(missingHistory, /Time:|>Not recorded</);
assert.match(missingHistory,/Some historical review details are unavailable/);
const missingActor = renderToStaticMarkup(<ApprovalProcess steps={[{ id: 'missing', label: 'Historical decision', state: 'completed', occurredAt: '2026-10-14' }]} />);
assert.doesNotMatch(missingActor, /Actor:|>Not recorded</);
assert.match(missingActor,/Some historical review details are unavailable/);
const empty = renderToStaticMarkup(<ApprovalProcess steps={[]} />);
assert.match(empty, /Approval progress.*Approval history is unavailable/);
console.log('Approval process accessible states and safe Malaysia timestamps passed');
