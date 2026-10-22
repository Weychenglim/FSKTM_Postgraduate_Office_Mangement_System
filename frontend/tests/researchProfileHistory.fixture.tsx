import React from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {ResearchAmendments} from '../src/components/ResearchAmendments';
import type {UserRole} from '../src/types/auth';
import type {ResearchRevision} from '../src/services/researchAmendmentsApi';

const container=document.getElementById('root')!;
const results:{name:string;error:string|null}[]=[];
const check=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const until=async(predicate:()=>unknown)=>{
  for(let attempt=0;attempt<100;attempt++) {
    if(predicate())return;
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  throw new Error(`Timed out: ${container.textContent}`);
};
const snapshot={programme:'Computing',title:'Current title',abstract:'Current abstract'};
const revisions:ResearchRevision[]=[
  {id:1,revision:0,kind:'BASELINE',before:{programme:'',title:'',abstract:''},after:{...snapshot,title:'Original title'},actorName:'Office',createdAt:'2026-10-01T08:00:00Z',reason:'',requestId:null},
  {id:2,revision:2,kind:'RESEARCH',before:{...snapshot,title:'Original title'},after:snapshot,actorName:'Dr Reviewer',createdAt:'2026-10-18T08:00:00Z',reason:'Approved scope clarification',requestId:5},
];
let root:Root|null=null;
let savedRevisions=revisions;
let missingProfile=false;
let failRead=false;
function render(role:UserRole='Lecturer',studentId=7,routeView:'profile'|'list'='profile') {
  root!.render(<ResearchAmendments role={role} hideHeader routeView={routeView} studentFilter={studentId} onStudentFilter={()=>{}}/>);
}
async function mount(role:UserRole='Lecturer',rows=revisions,missing=false,failed=false,routeView:'profile'|'list'='profile') {
  root?.unmount();savedRevisions=rows;missingProfile=missing;failRead=failed;
  window.fetch=async(input,init)=>{
    check(!init?.method||init.method==='GET','This fixture permits reads only');
    const url=new URL(String(input),location.origin);
    check(url.pathname.startsWith('/api/appointments/research-amendments/'),'Unexpected API route');
    if(failRead)return Response.json({detail:'Fixture read failed'},{status:500});
    const studentId=Number(url.searchParams.get('studentId')||7);
    return Response.json(url.pathname.endsWith('/options/')?{
      students:[],programmes:[],profile:missingProfile?null:{...snapshot,title:`Current title ${studentId}`,studentId,revision:2},
      canSubmitResearch:false,canCorrect:false,canTransfer:false,
    }:{requests:[],revisions:savedRevisions});
  };
  root=createRoot(container);render(role,7,routeView);
  await until(()=>!container.textContent?.includes('Loading research changes')&&!!container.textContent);
}
const history=()=>container.querySelector<HTMLDetailsElement>('details[aria-label="Research history"]');
async function scenario(name:string,run:()=>Promise<void>) {
  try {await run();results.push({name,error:null});}
  catch(error) {results.push({name,error:error instanceof Error?error.message:String(error)});}
}

await scenario('profile history is a separate closed card for every authorised role',async()=>{
  for(const role of ['Student','Lecturer','Programme Coordinator','Office Staff/Admin'] as const) {
    await mount(role);
    const current=container.querySelector('section[aria-label="Current research profile"]');
    const card=history();
    check(current&&card,`${role}: profile and history cards missing`);
    check(current!.nextElementSibling===card,`${role}: history belongs below and outside the current card`);
    check(!card!.open,`${role}: history must start collapsed`);
    check(card!.querySelector('summary')?.textContent?.includes('2 revisions'),'Revision count missing');
    check(current!.textContent?.includes('Current abstract'),'Current abstract should stay visible');
    check(!current!.textContent?.includes('Original title'),'Old revision leaked into current card');
  }
});
await scenario('opening history shows newest summaries first with individual revision details',async()=>{
  await mount();const card=history()!;check(card,'History card missing');
  card.querySelector('summary')!.click();check(card.open,'History did not open');
  const entries=card.querySelectorAll<HTMLDetailsElement>('details');
  check(entries.length===2,'Expected both saved revisions');
  check(entries[0].querySelector('summary')?.textContent?.includes('Revision 2'),'Newest revision must come first');
  check(entries[0].querySelector('summary')?.textContent?.includes('Dr Reviewer'),'Actor missing from summary');
  check(!entries[0].open&&!entries[1].open,'Revision details should start collapsed');
  entries[0].querySelector('summary')!.click();check(entries[0].open,'Revision did not expand');
  check(entries[0].textContent?.includes('Original title')&&entries[0].textContent?.includes('Approved scope clarification'),'Full saved comparison/reason missing');
  check(entries[1].querySelector('summary')?.textContent?.includes('Initial record'),'Baseline summary missing');
  check(revisions[0].revision===0,'Rendering must not mutate API revision order');
});
await scenario('changing the selected student resets expanded history and revisions',async()=>{
  await mount();check(history(),'History card missing');history()!.querySelector('summary')!.click();
  const entry=history()!.querySelector<HTMLDetailsElement>('details')!;entry.querySelector('summary')!.click();
  render('Lecturer',8);await until(()=>container.textContent?.includes('Current title 8'));
  check(history()&&!history()!.open,'New student must start with collapsed history');
  check([...history()!.querySelectorAll<HTMLDetailsElement>('details')].every(row=>!row.open),'New student inherited expanded revision');
});
await scenario('empty, unavailable and list views avoid misleading history cards',async()=>{
  await mount('Student',[]);check(history(),'Empty history card missing');
  check(!history()!.open,'Empty history starts collapsed');history()!.querySelector('summary')!.click();
  check(history()!.textContent?.includes('No saved research revisions'),'Empty history needs a clear message');
  await mount('Lecturer',revisions,true);check(!history(),'No profile should not show history');
  await mount('Lecturer',revisions,false,true);check(!history(),'Failed load should not show stale history');
  await mount('Student',revisions,false,false,'list');check(!history(),'History should not appear in request list');
});
root?.unmount();document.getElementById('test-results')!.textContent=JSON.stringify(results);
