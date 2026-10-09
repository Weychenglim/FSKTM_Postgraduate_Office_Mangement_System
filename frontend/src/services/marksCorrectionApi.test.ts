import assert from 'node:assert/strict';
import * as api from './marksApi';

assert.equal(typeof api.correctSubmittedMarkRecord, 'function');
assert.equal(typeof api.reopenSubmittedMarkRecord, 'function');
const calls: Array<{url: string; method: string | undefined; body: unknown}> = [];
globalThis.fetch = (async (url, init) => {
  calls.push({url: String(url), method: init?.method, body: JSON.parse(String(init?.body))});
  return new Response(JSON.stringify({recordId: 'MRK-00001', action: 'CORRECT'}));
}) as typeof fetch;
const correction = {expectedVersion: 'reviewed-state', reason: 'Transcription error', scores: [{componentId: 2, marksAwarded: '35.00'}], comments: 'Reviewed'};
await api.correctSubmittedMarkRecord('MRK-00001', correction);
await api.reopenSubmittedMarkRecord('MRK-00001', {expectedVersion: 'new-state', reason: 'Evaluator review'});
assert.deepEqual(calls, [
  {url: '/api/marks/records/MRK-00001/correct/', method: 'POST', body: correction},
  {url: '/api/marks/records/MRK-00001/reopen/', method: 'POST', body: {expectedVersion: 'new-state', reason: 'Evaluator review'}},
]);
console.log('Submitted Marks correction/reopening API contracts passed');
