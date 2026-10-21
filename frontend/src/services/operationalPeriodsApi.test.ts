import assert from 'node:assert/strict';
const api = await import('./operationalPeriodsApi').catch(() => assert.fail('Operational period API adapter is required'));
const calls: Array<{url:string; method:string; body:any}> = [];
globalThis.fetch = (async (url, init) => { calls.push({url:String(url),method:init?.method??'GET',body:init?.body?JSON.parse(String(init.body)):null}); return new Response(JSON.stringify({})); }) as typeof fetch;
await api.getOperationalPeriods(7);
await api.getOperationalAvailability('SUPERVISOR_APPLICATION');
await api.getOperationalAvailability('PANEL_RECOMMENDATION',23);
await api.createOperationalPeriod({semesterId:7,activity:'SUPERVISOR_APPLICATION',name:'Intake',programmeScope:'ALL',programmes:[],opensAt:'2026-10-16T00:00:00Z',closesAt:'2026-10-20T00:00:00Z'});
await api.publishOperationalPeriod(8,2);
await api.extendOperationalPeriod(8,{closesAt:'2026-10-22T00:00:00Z',reason:'Faculty extension',expectedRevision:2});
await api.setOperationalEnforcement({semesterId:7,activity:'PANEL_RECOMMENDATION',enabled:true,reason:'Published and checked'});
await api.getOperationalExceptionCandidates(8);
await api.getOperationalExceptions(8);
await api.grantOperationalException(8,{studentId:23,participantId:14,deadline:'2026-10-23T00:00:00Z',reason:'Approved extra time'});
await api.revokeOperationalException(3,'Cancelled extra time');
await api.extendInformationalTimelineEntry(9,{deadlineEnd:'2026-10-24',expectedDeadlineEnd:'2026-10-20',reason:'Rescheduled'});
await api.updateOperationalPeriod(8,{name:'Revised intake',expectedRevision:2,reason:'Correct draft'});
await api.transitionOperationalPeriod(8,'archive',2,'Superseded');
await api.linkTimelinePeriod(9,'appointment',8);
await api.linkTimelinePeriod(10,'marks',4);
assert.deepEqual(calls.map(c=>c.url),[
'/api/academics/operational-periods/?semesterId=7',
'/api/academics/operational-periods/availability/?activity=SUPERVISOR_APPLICATION',
'/api/academics/operational-periods/availability/?activity=PANEL_RECOMMENDATION&studentId=23',
'/api/academics/operational-periods/','/api/academics/operational-periods/8/publish/',
'/api/academics/operational-periods/8/extend/','/api/academics/operational-periods/enforcement/',
'/api/academics/operational-periods/8/exception-candidates/','/api/academics/operational-periods/8/exceptions/',
'/api/academics/operational-periods/8/exceptions/','/api/academics/operational-exceptions/3/revoke/',
'/api/dashboard/timeline/entries/9/extend/','/api/academics/operational-periods/8/','/api/academics/operational-periods/8/archive/','/api/dashboard/timeline/entries/9/','/api/dashboard/timeline/entries/10/']);
assert.deepEqual(calls[4].body,{expectedRevision:2});
assert.deepEqual(calls[5].body,{closesAt:'2026-10-22T00:00:00Z',reason:'Faculty extension',expectedRevision:2});
assert.equal(calls[6].method,'POST');
assert.equal(calls[9].body.studentId,23);
assert.deepEqual(calls[14].body,{operationalPeriodId:8,marksPeriodId:null});
assert.deepEqual(calls[15].body,{operationalPeriodId:null,marksPeriodId:4});
await api.createOperationalPeriod({semesterId:7,activity:'SUPERVISOR_APPLICATION',name:'Linked intake',programmeScope:'ALL',programmes:[],opensAt:'2026-10-16T00:00:00Z',closesAt:'2026-10-20T00:00:00Z',timelineEntryId:9});
assert.equal(calls.at(-1)?.url,'/api/academics/operational-periods/');
assert.equal(calls.at(-1)?.body.timelineEntryId,9);
console.log('Operational period and contextual availability API contracts pass');
