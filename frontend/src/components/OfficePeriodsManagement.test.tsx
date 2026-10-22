import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import type {AcademicSemester} from '../types/academicSemester';
const helpers=await import('./officePeriodHelpers').catch(()=>assert.fail('Semester-scoped period helpers are required'));
const semesters=[{id:1,effectiveStatus:'ACTIVE',lifecycleStatus:'ACTIVE'},{id:2,effectiveStatus:'CLOSED',lifecycleStatus:'CLOSED'},{id:3,effectiveStatus:'ARCHIVED',lifecycleStatus:'ARCHIVED'}] as AcademicSemester[];
test('explicit semester selection never falls back to a different semester',()=>{
  assert.equal(helpers.resolvePeriodSemester(semesters,'?semester=2')?.id,2);
  for(const search of ['?semester=999','?semester=3','?semester=bad','?semester=0','?semester=']) assert.equal(helpers.resolvePeriodSemester(semesters,search),null);
  assert.equal(helpers.resolvePeriodSemester(semesters,'')?.id,1);
});
test('calendar entries are scoped to the selected semester and Closed performs no calendar read',async()=>{
  let requests=0;
  const read=async(id:number)=>{requests++;return {available:true,semesterId:id,levels:[{level:'P1' as const,entries:[]}]};};
  assert.deepEqual(await helpers.loadPeriodCalendarEntries(semesters[1],read),[]);
  assert.equal(requests,0);
  assert.deepEqual(await helpers.loadPeriodCalendarEntries(semesters[0],read),[]);
  assert.equal(requests,1);
  await assert.rejects(()=>helpers.loadPeriodCalendarEntries(semesters[0],async()=>({available:true,semesterId:2,levels:[]})),/selected semester/);
});
test('period anchors select their owning activity without accepting arbitrary fragments',()=>{
  assert.deepEqual(helpers.parsePeriodAnchor('#marks-period-7'),{kind:'marks',id:7});
  assert.deepEqual(helpers.parsePeriodAnchor('#operational-period-8'),{kind:'appointment',id:8});
  assert.equal(helpers.parsePeriodAnchor('#operational-period-NaN'),null);
});
test('period forms use a shared modal while window records and calendar changes keep their own context',()=>{
  const source=readFileSync(new URL('./OperationalPeriodManagement.tsx',import.meta.url),'utf8');
  assert.match(source,/<RecordPage/);
  assert.match(source,/<SubmissionWindowDialog/);
  assert.match(source,/form-control form-control-md/);
  assert.match(source,/<PeriodActivityOverview/);
  assert.doesNotMatch(source,/role="tablist"/);
  assert.doesNotMatch(source,/<DecisionDialog isOpen={createOpen}/);
  assert.doesNotMatch(source,/<h3[^>]*>Informational calendar events/);
});
