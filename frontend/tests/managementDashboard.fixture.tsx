import React from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {AcademicSemesterManagement} from '../src/components/AcademicSemesterManagement';
import {LecturerCapacityManagement} from '../src/components/LecturerCapacityManagement';
import {SupervisorWorkloadMonitoring} from '../src/components/SupervisorWorkloadMonitoring';
import type {AcademicSemester, LecturerCapacityEntry, SemesterCapacityPlan} from '../src/types';

const container=document.getElementById('root')!;
const results:{name:string;error:string|null}[]=[];
const check=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const text=()=>container.textContent||'';
const until=async(predicate:()=>unknown)=>{for(let n=0;n<200;n++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error(`Timed out: ${text().slice(0,500)}`);};
const button=(label:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent?.trim()===label)!;
const click=async(label:string)=>{check(button(label),`Missing ${label}`);button(label).click();await new Promise(resolve=>setTimeout(resolve,0));};
const setInput=(node:HTMLInputElement,value:string)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));};
const select=(node:HTMLSelectElement,value:string)=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));};
const selectWith=(option:string)=>[...container.querySelectorAll<HTMLSelectElement>('select')].find(node=>[...node.options].some(item=>item.value===option))!;
const target={id:9,code:'2026-S1',label:'Synthetic active semester',academicSession:'2026/2027',term:'SEMESTER_I',startsOn:'2026-10-01',endsOn:'2027-02-28',lifecycleStatus:'ACTIVE',effectiveStatus:'ACTIVE',isActive:true,activatedAt:null,closedAt:null,archivedAt:null} as AcademicSemester;
const prior={...target,id:3,code:'2025-S2',label:'Synthetic prior semester',startsOn:'2026-01-01',endsOn:'2026-09-01',lifecycleStatus:'CLOSED',effectiveStatus:'CLOSED',isActive:false} as AcademicSemester;
const entry={id:1,lecturerId:1,staffNo:'STAFF-01',lecturerName:'Synthetic lecturer',participantLifecycle:'ACTIVE',supervisorLimit:9,panelLimit:4,supervisor:{limit:3,activeLoad:2,reservedLoad:0,state:'AVAILABLE'},panel:{limit:4,activeLoad:1,reservedLoad:1,state:'AVAILABLE'}} as LecturerCapacityEntry;
const plans=Array.from({length:113},(_,index)=>({id:200-index,semesterId:9,semesterCode:target.code,semesterLabel:target.label,version:113-index,lifecycleStatus:index===4?'PUBLISHED':'DRAFT',isCurrentPublished:index===4,origin:'CREATED',isComplete:true,readinessErrors:[],entries:[entry],successorIds:[],supersedesId:null,createdBy:{id:1,name:'Synthetic Office'},createdAt:'2026-10-01T00:00:00Z',publishedAt:null,publishedBy:null,publicationReason:null,contentFingerprint:'fixture'} as SemesterCapacityPlan));
const windows=Array.from({length:117},(_,index)=>({id:index+1,semesterId:9,lecturerName:`Historical lecturer ${index}`,staffNo:`STAFF-${index}`,lecturerId:index+1,role:'SUPERVISOR',startsOn:'2026-10-01',endsOn:'2026-10-02',reason:`Historical reason ${index}`,isCancelled:false,isEffective:false}));
const audits=Array.from({length:137},(_,index)=>({id:index,action:`AUDIT_${index}`,actor:{id:1,name:'Synthetic Office'},createdAt:'2026-10-01T00:00:00Z',reason:`Audit reason ${index}`}));
const workloads=Array.from({length:37},(_,index)=>({lecturerId:`L${index}`,lecturerName:`Synthetic supervisor ${index}`,department:'Computing',currentStudents:2,workloadLimit:index===36?3:0,availability:'Full Load',capacityState:index===36?'FULL':'NOT_CONFIGURED',semesterCode:'2026-S1',capacityPlanVersion:index===36?1:undefined,email:'example@example.test',supervisees:[]}));
let root:Root|null=null;
let requests:string[]=[];
async function mount(component:React.ReactNode){
  root?.unmount();requests=[];
  history.replaceState(null,'','/');
  window.fetch=async(input,init)=>{
    check(!init?.method||init.method==='GET','This mounted fixture permits reads only');
    const url=new URL(String(input),location.origin);requests.push(url.pathname+url.search);
    const page=(rows:unknown[])=>rows.slice(Number(url.searchParams.get('offset')||0),Number(url.searchParams.get('offset')||0)+Number(url.searchParams.get('limit')||100));
    if(url.pathname==='/api/academics/semesters/')return Response.json([target,prior]);
    if(url.pathname.endsWith('/audits/')&&!url.pathname.includes('capacity'))return Response.json([{id:1,action:'ACTIVATED',reason:'Synthetic activation',actor:'Office',createdAt:'2026-10-01T00:00:00Z'}]);
    if(url.pathname==='/api/appointments/supervisor/workload/')return Response.json(workloads);
    if(url.pathname==='/api/academics/semesters/9/capacity-plans/')return Response.json(page(plans));
    if(url.pathname==='/api/academics/semesters/3/capacity-plans/')return Response.json([{...plans[4],id:77,semesterId:3,semesterCode:prior.code,semesterLabel:prior.label,version:1}]);
    if(url.pathname.endsWith('/availability/'))return Response.json(page(windows));
    if(url.pathname.endsWith('/capacity-audits/'))return Response.json(page(audits));
    throw new Error(`Unexpected API: ${url.pathname}`);
  };
  root=createRoot(container);root.render(component);
  await until(()=>!!text()&&!text().includes('Loading'));
}
async function scenario(name:string,run:()=>Promise<void>){try{await run();results.push({name,error:null});}catch(reason){results.push({name,error:reason instanceof Error?reason.message:String(reason)});}}

await scenario('semester browse and active detail keep participant navigation on Dashboard only',async()=>{
  let participants=0;
  await mount(<AcademicSemesterManagement onBack={()=>{}} onManageParticipants={()=>{participants++;}}/>);
  check(!container.querySelector('form'),'Browse opened a create form');
  await click('Open');await until(()=>text().includes('Lifecycle actions'));
  check(!container.querySelector('form'),'Active semester rendered a disabled editing form');
  check(!button('Manage participants')&&participants===0,'Participant shortcut remains in semester details');
  await click('History');await until(()=>text().includes('Synthetic activation'));
  await click('Back to Academic Semesters');await until(()=>text().includes('New semester'));
});
await scenario('semester draft inputs survive guarded return cancellation',async()=>{
  await mount(<AcademicSemesterManagement onBack={()=>{}}/>);
  await click('New semester');await until(()=>!!container.querySelector('form'));
  setInput(container.querySelector<HTMLInputElement>('input[placeholder="2026/2027"]')!,'2027/2028');
  await click('Back to Academic Semesters');await until(()=>document.body.textContent?.includes('Discard unsaved changes?'));
  await click('Keep editing');check(container.querySelector<HTMLInputElement>('input[placeholder="2026/2027"]')?.value==='2027/2028','Guard lost draft input');
  await click('Back to Academic Semesters');await click('Discard changes');await until(()=>text().includes('New semester'));
  check(!container.querySelector('form'),'Discard did not return to browse');
});
await scenario('Supervisor summary filtering pagination and record return agree with capacity state',async()=>{
  await mount(<SupervisorWorkloadMonitoring onBack={()=>{}}/>);
  const summary=()=>container.querySelector('[aria-label="Workload distribution"]')!.textContent!;
  check(summary().includes('Not configured: 36')&&summary().includes('Full: 1'),`Incorrect summary: ${summary()}`);
  select(selectWith('FULL'),'FULL');await until(()=>summary().includes('1 matching of 37'));
  check(!text().includes('Full Load: 37'),'Legacy availability leaked into summary');
  await click('View');await until(()=>text().includes('Supervisor workload details'));
  await click('Back to Supervisor Workload Monitoring');await until(()=>summary().includes('1 matching of 37'));
  await click('Clear filters');select(selectWith('25'),'25');await until(()=>text().includes('Page 1 of 2'));
  await click('Next');await until(()=>text().includes('Page 2 of 2'));
  check(text().includes('Synthetic supervisor 36'),'Second page lost last lecturer');
});
await scenario('capacity Published authority stays distinct from selected limits and all bounded history reads complete',async()=>{
  await mount(<LecturerCapacityManagement onBack={()=>{}}/>);
  check(text().includes('Published operational policyv109'),'Published policy followed selected Draft');
  check(text().includes('Selected version limit: 9')&&text().includes('Published policy limit: 3'),'Version limits were confused with operational policy');
  for(const endpoint of ['capacity-plans','availability','capacity-audits'])check(requests.some(url=>url.includes(`/${endpoint}/`)&&url.includes('offset=100')),`${endpoint} stopped at 100`);
  await click('Version / audit history');await until(()=>text().includes('Capacity versions'));
  check(text().includes('113 versions')&&text().includes('137 audit events'),'History totals incomplete');
  check(!text().includes('Audit reason 136'),'History was rendered without bounds');
  await click('Availability');await until(()=>text().includes('Historical reason 0'));
  check(text().includes('Ended'),'Elapsed availability was called Scheduled');
  await click('Cancel restriction');await until(()=>text().includes('Cancellation reason'));
  check(button('Cancel Restriction').disabled,'Historical cancellation lost reason and acknowledgement guards');
});
await scenario('copy flow previews the single strict prior Published source before any write',async()=>{
  await mount(<LecturerCapacityManagement onBack={()=>{}}/>);
  await click('Copy eligible previous semester');await until(()=>text().includes('Create draft from this source'));
  check(text().includes('Synthetic prior semester')&&text().includes('Copy into Synthetic active semester'),'Copy lacks source/target identity');
  check(requests.some(url=>url.startsWith('/api/academics/semesters/3/capacity-plans/')),'Eligible source was not read');
});
root?.unmount();document.getElementById('test-results')!.textContent=JSON.stringify(results);
