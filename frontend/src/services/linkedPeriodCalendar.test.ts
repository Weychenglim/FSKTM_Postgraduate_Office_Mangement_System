import assert from 'node:assert/strict';
import {test} from 'node:test';
const api=await import('./linkedPeriodCalendar').catch(()=>assert.fail('Atomic linked calendar creation is required'));
test('creates and links in one write with explicit semester and Malaysia dates',async()=>{
 const calls:{url:string;body:any}[]=[];
 globalThis.fetch=(async(url,init)=>{calls.push({url:String(url),body:JSON.parse(String(init?.body))});return Response.json({id:9});}) as typeof fetch;
 await api.createPeriodCalendarEvent({semesterId:7,kind:'appointment',periodId:3,title:'Application window',level:'P2',targetRoles:['STUDENT'],opensAt:'2026-10-01T18:00:00Z',closesAt:'2026-10-20T09:00:00Z'});
 assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/dashboard/timeline/entries/');
 assert.deepEqual(calls[0].body,{semesterId:7,level:'P2',title:'Application window',detail:'Application window',action:'STUDENT',deadlineStart:'2026-10-02',deadlineEnd:'2026-10-20',targetRoles:['STUDENT'],operationalPeriodId:3,marksPeriodId:null});
 await api.createPeriodCalendarEvent({semesterId:7,kind:'marks',periodId:4,title:'Evaluate',level:'P1',targetRoles:['LECTURER'],opensAt:'2026-10-01T00:00:00Z',closesAt:'2026-10-20T00:00:00Z'});
 assert.equal(calls[1].body.marksPeriodId,4);assert.equal(calls[1].body.operationalPeriodId,null);
 await assert.rejects(()=>api.createPeriodCalendarEvent({semesterId:7,kind:'marks',periodId:4,title:'',level:'P1',targetRoles:[],opensAt:'bad',closesAt:'bad'}));
 assert.equal(calls.length,2);
});
