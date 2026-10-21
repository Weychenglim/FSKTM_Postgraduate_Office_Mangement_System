import React from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {OfficeSupervisorReplacementForm} from '../src/components/OfficeSupervisorReplacementForm';
import type {OfficeSupervisorReplacementContext} from '../src/services/officeSupervisorReplacementApi';

const initial:OfficeSupervisorReplacementContext={
  appointmentId:7,studentId:'PG001',studentName:'Fixture Student',programme:'Computing',currentSupervisor:'Dr Current',
  researchTitle:'Fixture research',researchArea:'Networks',researchAbstract:'Fixture abstract',projectCourseCodes:'ABC123',
  candidates:[{id:'SV2',name:'Dr Available',domain:'Networks',initials:'DA',filled:1,total:3,selectable:true}],
  canSubmit:true,blockedReason:null,pendingApplicationId:null,
};
const container=document.getElementById('root')!;
const results:{name:string;error:string|null}[]=[];
let root:Root|null=null;
let context:OfficeSupervisorReplacementContext;
let gets=0,posts=0,submissions=0;
let getResponse:()=>Promise<Response>;
let postResponse:()=>Promise<Response>;
const check=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const until=async(predicate:()=>unknown)=>{
  for(let attempt=0;attempt<100;attempt++) {
    if(predicate())return;
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  throw new Error(`Timed out. Page: ${container.textContent}`);
};
const button=(label:string)=>Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(row=>row.textContent?.trim()===label);
const reason=()=>container.querySelector<HTMLTextAreaElement>('textarea')!;
const candidate=()=>container.querySelector<HTMLSelectElement>('select')!;
const sendDisabled=()=>!button('Send for review')||button('Send for review')!.matches(':disabled');
async function mount(overrides:Partial<OfficeSupervisorReplacementContext>={}) {
  root?.unmount();context=structuredClone({...initial,...overrides});gets=0;posts=0;submissions=0;
  getResponse=async()=>Response.json(context);
  postResponse=async()=>Response.json({detail:'Unexpected test POST'},{status:500});
  window.fetch=async(input,options)=>{
    check(String(input)==='/api/appointments/supervisor/appointments/7/replacement/','Unexpected API route');
    if(options?.method==='POST') {
      posts++;
      const body=JSON.parse(String(options.body));
      check(body.proposedSupervisorId==='SV2'&&body.reason==='Keep this Office reason','Incorrect replacement payload');
      return postResponse();
    }
    gets++;return getResponse();
  };
  root=createRoot(container);
  root.render(<OfficeSupervisorReplacementForm appointmentId={7} onBack={()=>{}} onSubmitted={()=>{submissions++;}}/>);
  await until(()=>reason());
}
async function draft() {
  candidate().value='SV2';candidate().dispatchEvent(new Event('change',{bubbles:true}));
  const field=reason();
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(field,'Keep this Office reason');
  field.dispatchEvent(new Event('input',{bubbles:true}));
  await until(()=>candidate().value==='SV2'&&reason().value==='Keep this Office reason');
}
async function scenario(name:string,run:()=>Promise<void>) {
  try {await run();results.push({name,error:null});}
  catch(failure) {results.push({name,error:failure instanceof Error?failure.message:String(failure)});}
}
const pendingContext=()=>{context={...context,canSubmit:false,blockedReason:'An active Supervisor application already exists.',pendingApplicationId:20};};
const conflict=()=>Response.json({detail:'An active Supervisor application already exists.'},{status:409});
async function submitDraft() {
  await draft();await until(()=>!sendDisabled());button('Send for review')!.click();
}

await scenario('blocked availability recheck preserves the Office draft',async()=>{
  await mount({canSubmit:false,blockedReason:'The application intake is closed.'});await draft();
  check(sendDisabled(),'Closed intake must block submission');
  context={...context,canSubmit:true,blockedReason:null};
  check(button('Check availability'),'Blocked form needs a contextual availability action');
  button('Check availability')!.click();
  await until(()=>gets===2&&!sendDisabled());
  check(candidate().value==='SV2'&&reason().value==='Keep this Office reason','Recheck discarded the draft');
  check(!button('Check availability'),'Open form should not retain a routine recheck button');
  check(posts===0,'Availability check must not submit a replacement');
});

await scenario('conflicting pending request refreshes the block before another submission',async()=>{
  await mount();
  postResponse=async()=>{pendingContext();return conflict();};
  await submitDraft();
  await until(()=>gets===2&&!!button('Check availability'));
  check(sendDisabled(),'Pending request must disable repeat submission');
  check(posts===1&&submissions===0,'Conflict must not report success or repeat the POST');
  check(candidate().value==='SV2'&&reason().value==='Keep this Office reason','Conflict discarded the draft');
});

await scenario('unreadable committed response reconciles the pending request',async()=>{
  await mount();
  postResponse=async()=>{pendingContext();return new Response('<html>Unreadable result</html>',{status:201});};
  await submitDraft();
  await until(()=>gets===2&&!!button('Check availability'));
  check(sendDisabled()&&posts===1,'Uncertain success must not invite a duplicate POST');
  check(submissions===0,'Unreadable response must not fabricate a successful application');
});

await scenario('capacity conflict refreshes the candidate availability',async()=>{
  await mount();
  postResponse=async()=>{
    context={...context,candidates:[{...context.candidates[0],filled:3,selectable:false}]};
    return Response.json({detail:'The proposed Supervisor has no remaining capacity.'},{status:409});
  };
  await submitDraft();
  await until(()=>gets===2&&!!reason()&&sendDisabled());
  check(candidate().selectedOptions[0].disabled,'Full candidate should become unavailable');
  check(reason().value==='Keep this Office reason','Capacity refresh lost the reason');
});

await scenario('failed reconciliation requires a successful Retry and preserves the draft',async()=>{
  await mount();
  postResponse=async()=>{
    getResponse=async()=>Response.json({detail:'Availability could not be checked.'},{status:503});
    return Response.json({detail:'Temporary submission failure.'},{status:503});
  };
  await submitDraft();await until(()=>!!button('Retry'));
  check(sendDisabled()&&posts===1,'Failed context read must remove stale submission controls');
  check(container.textContent?.includes('Temporary submission failure.'),'Keep the original submission error visible');
  getResponse=async()=>Response.json(context);
  button('Retry')!.click();
  await until(()=>gets===3&&!sendDisabled());
  check(candidate().value==='SV2'&&reason().value==='Keep this Office reason','Retry discarded the draft');
  check(posts===1,'Retrying a read must not repeat the mutation');
});

await scenario('reconciliation keeps navigation and repeat submission blocked until the read finishes',async()=>{
  await mount();
  let release:(response:Response)=>void=()=>{};
  postResponse=async()=>{
    getResponse=()=>new Promise(resolve=>{release=resolve;});
    return conflict();
  };
  await submitDraft();await until(()=>gets===2);
  check(sendDisabled(),'Submission cannot continue while availability is loading');
  check(button('Back to supervision')?.matches(':disabled'),'Wait for reconciliation before leaving');
  release(Response.json(context));
  await until(()=>!sendDisabled());
  check(posts===1,'Reconciliation must not repeat the mutation');
});

await scenario('successful response reports once without a reconciliation read',async()=>{
  await mount();postResponse=async()=>Response.json({id:20,status:'SUBMITTED_TO_SUPERVISOR'});
  await submitDraft();await until(()=>submissions===1);
  button('Send for review')!.click();
  await new Promise(resolve=>setTimeout(resolve,20));
  check(posts===1&&gets===1&&submissions===1,'Confirmed success must not submit or reconcile twice');
});

root?.unmount();
document.getElementById('test-results')!.textContent=JSON.stringify(results);
