import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentLifecycleSummary } from './StudentLifecycleSummary';

const lifecycle = {
  status: 'DEFERRED', effectiveAt: '2026-10-07T20:30:00Z',
  reason: 'Private latest reason', changedBy: 'Private Office actor',
  audits: [{ previousStatus: 'ACTIVE', newStatus: 'DEFERRED', reason: 'Private earlier reason',
    actor: 'Private audit actor', createdAt: '2026-10-07T20:30:00Z' }],
};
const publicMarkup = renderToStaticMarkup(<StudentLifecycleSummary lifecycle={lifecycle} internal={false} />);
assert.match(publicMarkup, /Deferred/);
assert.match(publicMarkup, /08 Oct 2026.*04:30/);
assert.match(publicMarkup, /Malaysia, UTC\+08:00/);
assert.doesNotMatch(publicMarkup, /Private|audit history|Changed by|Reason:/);
const internalMarkup = renderToStaticMarkup(<StudentLifecycleSummary lifecycle={lifecycle} internal />);
for (const value of ['Private latest reason','Private Office actor','Private earlier reason','Private audit actor','Active to Deferred']) {
  assert.ok(internalMarkup.includes(value), value);
}
assert.match(renderToStaticMarkup(<StudentLifecycleSummary lifecycle={{ status: 'ACTIVE', effectiveAt: null }} internal />), /No lifecycle changes recorded/);
console.log('Student lifecycle dossier public privacy, internal history and Malaysia timestamps passed');
