import assert from 'node:assert/strict';
const calls:Array<{url:string;method:string;body:unknown}>=[];
globalThis.fetch=(async(url,init)=>{
  calls.push({url:String(url),method:init?.method??'GET',body:init?.body?JSON.parse(String(init.body)):null});
  return new Response(JSON.stringify({}));
}) as typeof fetch;
const api=await import('./officeSupervisorReplacementApi');
await api.getOfficeSupervisorReplacement(7);
await api.createOfficeSupervisorReplacement(7,{proposedSupervisorId:'SV2',reason:'Exceptional reassignment'});
assert.deepEqual(calls,[
  {url:'/api/appointments/supervisor/appointments/7/replacement/',method:'GET',body:null},
  {url:'/api/appointments/supervisor/appointments/7/replacement/',method:'POST',body:{proposedSupervisorId:'SV2',reason:'Exceptional reassignment'}},
]);
console.log('Office replacement context and creation API contract passes');
