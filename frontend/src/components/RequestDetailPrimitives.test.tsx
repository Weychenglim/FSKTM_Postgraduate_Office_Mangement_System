import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { RequestAuditHistory, RequestMetadata, RequestDetailCard, RequestSection } from './RequestDetailPrimitives';
import type { ApprovalEvent } from '../utils/approvalProcess';

const events: ApprovalEvent[] = [
  { id: 2, action: 'APPROVE', actorName: 'Historical reviewer', actorRole: 'Coordinator', previousStatus: 'PENDING_COORDINATOR', newStatus: 'APPROVED', reason: 'Recorded approval reason', createdAt: '2026-10-14T04:00:00Z', retainTeam: true },
  { id: 1, action: 'SUBMITTED', actorName: 'Student submitter', actorRole: 'Student', newStatus: 'PENDING_SUPERVISOR', reason: 'Original request reason', createdAt: '2026-10-14T02:00:00Z' },
  { id: 3, action: 'NOTE', actorName: '', previousStatus: 'APPROVED', newStatus: 'APPROVED', reason: '<unsafe>', createdAt: 'bad' },
];
const audit = render(<RequestAuditHistory events={events} />);
assert.match(audit, /<details[^>]*><summary/);
assert.doesNotMatch(audit, /<details[^>]*\sopen(?:=|>)/);
assert.match(audit, /Audit history/);
assert.ok(audit.indexOf('Student submitter') < audit.indexOf('Historical reviewer'));
for (const value of ['Coordinator', 'Recorded approval reason', 'Original request reason', 'Awaiting Coordinator approval', 'Approved', 'Malaysia', '14 Oct 2026', 'Team retention acknowledged']) assert.ok(audit.includes(value), value);
assert.doesNotMatch(audit,/PENDING_COORDINATOR|>APPROVED<|>SUBMITTED<|UTC\+08/);
assert.match(audit, /&lt;unsafe&gt;/);
assert.doesNotMatch(audit, /Invalid date|NaN/);
assert.equal(events[0].id, 2, 'Does not reorder caller data');
assert.equal(render(<RequestAuditHistory events={[]} />),'','An empty audit adds no disclosure or filler');
const metadata = render(<RequestMetadata reference="SUP-17" submittedAt="2026-10-14T02:30:00Z" submittedBy="Office submitter" statusLabel="Approved" statusTone="success" />);
for (const value of ['Office submitter', 'Approved', '14 Oct 2026', 'Malaysia']) assert.ok(metadata.includes(value), value);
assert.doesNotMatch(metadata,/SUP-17|Copy reference|Reference|UTC\+08/);
const dateOnly = render(<RequestMetadata submittedAt="2026-10-14" />);
assert.match(dateOnly, /14 Oct 2026/);
assert.doesNotMatch(dateOnly, /00:00|12:00|am|pm|UTC|Student/);
assert.doesNotMatch(render(<RequestMetadata submittedAt="invalid" />), /Invalid date|NaN/);
assert.doesNotMatch(render(<RequestMetadata submittedAt="2026-02-30" />),/30 Feb|Invalid date|NaN/);
const lifecycleDate = render(<RequestMetadata submittedAt="2026-10-14" dateLabel="Started" />);
assert.match(lifecycleDate, /Started/);
assert.doesNotMatch(lifecycleDate, /Submitted/);
const card = render(<RequestDetailCard progress={<p>Progress slot</p>} actions={<p>Actions slot</p>} audit={<p>Audit slot</p>}><RequestSection title="Summary" description="Recorded information"><p>Summary slot</p></RequestSection><RequestSection title="Documents"><p>Documents slot</p></RequestSection></RequestDetailCard>);
const positions = ['Summary slot', 'Documents slot', 'Progress slot', 'Actions slot', 'Audit slot'].map(value => card.indexOf(value));
assert.ok(positions.every((value, index) => value >= 0 && (!index || value > positions[index - 1])));
assert.equal((card.match(/shadow-/g) || []).length, 1, 'One shared card, unboxed internal sections');
assert.match(card, /<section[^>]*aria-labelledby=/);
assert.match(card, /Recorded information/);
console.log('Request metadata, ordered detail slots and complete collapsed audit passed');
