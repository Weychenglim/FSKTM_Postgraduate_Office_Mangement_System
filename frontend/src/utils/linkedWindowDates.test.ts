import assert from 'node:assert/strict';
import test from 'node:test';
import {importEventDays,extensionImpact} from './linkedWindowDates';

test('event days fill the actual schedule without inventing or replacing clock times',()=>{
  assert.deepEqual(importEventDays('2026-10-22','2026-10-29','',''),{opensAt:'2026-10-22T',closesAt:'2026-10-29T'});
  assert.deepEqual(importEventDays('2026-10-22','2026-10-29','2026-10-01T08:30','2026-10-02T17:00'),{opensAt:'2026-10-22T08:30',closesAt:'2026-10-29T17:00'});
});

test('only a valid common extension of an expired enforced published window warns about reopening',()=>{
  const period={lifecycleStatus:'PUBLISHED',opensAt:'2026-10-01T00:00:00Z',closesAt:'2026-10-20T09:00:00Z'};
  const now=new Date('2026-10-21T00:00:00Z').getTime();
  assert.match(extensionImpact(period,true,'everyone','2026-10-22T17:00',now),/reopen submissions/);
  assert.doesNotMatch(extensionImpact(period,false,'everyone','2026-10-22T17:00',now),/reopen submissions/);
  assert.doesNotMatch(extensionImpact({...period,lifecycleStatus:'DRAFT'},true,'everyone','2026-10-22T17:00',now),/reopen submissions/);
  assert.doesNotMatch(extensionImpact(period,true,'everyone','2026-10-19T17:00',now),/reopen submissions/);
  assert.doesNotThrow(()=>extensionImpact(period,true,'everyone','2026-',now));
  assert.match(extensionImpact(period,true,'selected','2026-10-22T17:00',now),/general deadline and linked timeline remain unchanged/);
});
