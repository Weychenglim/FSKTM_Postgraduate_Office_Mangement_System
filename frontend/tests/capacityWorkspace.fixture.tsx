import React from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {LecturerCapacityManagement} from '../src/components/LecturerCapacityManagement';
import {OfficeDashboardLayout} from '../src/components/OfficeDashboardLayout';
import {RecordPageProvider} from '../src/components/RecordPage';
import {createMemoryRouter,RouterProvider} from 'react-router';

const results:{name:string;error?:string}[]=[];
const check=(value:unknown,message:string)=>{if(!value)throw new Error(message);};
const text=()=>document.body.textContent||'';
const until=async(predicate:()=>unknown)=>{for(let i=0;i<400;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error(`Timed out: ${text().slice(-700)}`);};
const buttons=()=>[...document.querySelectorAll<HTMLButtonElement>('button')].filter(node=>!node.closest('[hidden]'));
const click=async(label:string)=>{const node=buttons().find(button=>button.textContent?.trim()===label);check(node,`Missing ${label}`);node!.click();await new Promise(resolve=>setTimeout(resolve,15));};
const choose=async(id:string,label:string)=>{document.getElementById(id)!.click();await until(()=>document.querySelector('[role="listbox"]'));const option=[...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node=>node.textContent?.trim()===label);check(option,`Missing option ${label}`);option!.click();await new Promise(resolve=>setTimeout(resolve,20));};
const newDraft=async(source:string)=>{document.querySelector<HTMLInputElement>('input[name="capacity-preparation-mode"][value="new"]')!.click();await new Promise(resolve=>setTimeout(resolve,20));await choose('capacity-draft-source',source);};
const input=(node:HTMLInputElement,value:string)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));};
const scenario=async(name:string,work:()=>Promise<void>)=>{try{await work();results.push({name});}catch(error){results.push({name,error:String(error)});}};
const semester={id:9,label:'Semester I 2026/2027',code:'2026-S1',startsOn:'2026-09-01',endsOn:'2027-02-28',lifecycleStatus:'ACTIVE',isActive:true};
const role={semesterId:9,planId:1,planVersion:1,limit:5,activeLoad:2,reservedLoad:0,availableSlots:3,state:'AVAILABLE',unavailableUntil:null};
const roster=Array.from({length:27},(_,index)=>({id:index+1,lecturerId:index+1,staffNo:`STAFF-${String(index+1).padStart(2,'0')}`,lecturerName:`Synthetic Lecturer ${String(index+1).padStart(2,'0')}`,participantLifecycle:'ACTIVE',supervisorLimit:5,panelLimit:5,supervisor:role,panel:{...role,activeLoad:1,reservedLoad:1},activeStudentCount:3,primaryStudentCount:1,supportingStudentCount:1,panelStudentCount:1}));
const makePlan=(id:number,status:string,entries:typeof roster)=>({id,semesterId:9,semesterLabel:semester.label,semesterCode:semester.code,version:id,lifecycleStatus:status,isCurrentPublished:status==='PUBLISHED',origin:'CREATED',supersedesId:id>1?1:null,isComplete:entries.length===27,readinessErrors:roster.filter(row=>!entries.some(entry=>entry.lecturerId===row.lecturerId)).map(row=>`${row.staffNo}: capacity entry is required for this Lecturer.`),contentFingerprint:`fingerprint-${id}`,entries,createdAt:'2026-10-01T10:00:00Z',createdBy:{id:99,name:'Synthetic Office'},publicationReason:null});
let holdEntryWrites=false,releaseEntryWrite:(()=>void)|null=null,entryFailure=0;
let plans=[makePlan(2,'DRAFT',roster.slice(0,1)),makePlan(1,'PUBLISHED',roster)],writes:{path:string;body:any}[]=[],failRoster=false,failDiscard=0,failAfterDiscard=false,root:Root|null=null,router:ReturnType<typeof createMemoryRouter>|null=null;
window.fetch=async(inputValue,init)=>{
  const url=new URL(String(inputValue),location.origin),path=url.pathname;
  if(init?.method&&init.method!=='GET'){
    const body=JSON.parse(String(init.body||'{}'));writes.push({path,body});
    if(path.endsWith('/capacity-plans/')){const plan=makePlan(Math.max(...plans.map(row=>row.id))+1,'DRAFT',[]);plans=[plan,...plans];return Response.json(plan,{status:201});}
    const cloneMatch=path.match(/capacity-plans\/(\d+)\/clone\//);
    if(cloneMatch){const source=plans.find(row=>row.id===Number(cloneMatch[1]))!;const plan=makePlan(Math.max(...plans.map(row=>row.id))+1,'DRAFT',source.entries);plans=[plan,...plans];return Response.json(plan,{status:201});}
    const discardMatch=path.match(/capacity-plans\/(\d+)\/discard\//);
    if(discardMatch){if(failDiscard)return Response.json({error:'Synthetic discard failed'},{status:failDiscard});const plan=plans.find(row=>row.id===Number(discardMatch[1]))!;plans=plans.map(row=>row.id===plan.id?{...row,lifecycleStatus:'DISCARDED'}:row);if(failAfterDiscard)failRoster=true;return Response.json(plans.find(row=>row.id===plan.id));}
    const publishMatch=path.match(/capacity-plans\/(\d+)\/publish\//);
    if(publishMatch){const plan=plans.find(row=>row.id===Number(publishMatch[1]))!;plans=plans.map(row=>row.id===plan.id?{...row,lifecycleStatus:'PUBLISHED',isCurrentPublished:true,publicationReason:body.reason}:row.lifecycleStatus==='PUBLISHED'?{...row,lifecycleStatus:'SUPERSEDED',isCurrentPublished:false}:row);return Response.json(plans.find(row=>row.id===plan.id));}
    const match=path.match(/capacity-plans\/(\d+)\/lecturers\/(\d+)\//);
    if(match){if(holdEntryWrites)await new Promise<void>(resolve=>{releaseEntryWrite=resolve;});if(entryFailure)return Response.json({error:'Synthetic entry conflict'},{status:entryFailure});const plan=plans.find(row=>row.id===Number(match[1]))!;const lecturer=roster.find(row=>row.lecturerId===Number(match[2]))!;plan.entries=[...plan.entries.filter(row=>row.lecturerId!==lecturer.lecturerId),{...lecturer,supervisorLimit:body.supervisorLimit,panelLimit:body.panelLimit}];plan.readinessErrors=plan.readinessErrors.filter(message=>!message.startsWith(`${lecturer.staffNo}:`));return Response.json(plan);}
    throw new Error(`Unexpected write ${path}`);
  }
  if(path==='/api/academics/semesters/')return Response.json([semester]);
  if(path.endsWith('/capacity-workspace/'))return failRoster?Response.json({error:'Synthetic roster unavailable'},{status:503}):Response.json({lecturers:roster,baseline:{activeStudents:54,eligibleLecturers:27,studentsPerLecturer:2}});
  if(path.endsWith('/capacity-plans/'))return Response.json(plans);
  if(path.endsWith('/availability/'))return Response.json([]);
  if(path.endsWith('/capacity-audits/'))return Response.json([]);
  throw new Error(`Unexpected read ${path}`);
};
const mount=async()=>{root?.unmount();router?.dispose();document.getElementById('root')!.innerHTML='';root=createRoot(document.getElementById('root')!);router=createMemoryRouter([{path:'/dashboard/lecturer-capacity',element:<OfficeDashboardLayout enabled><LecturerCapacityManagement onBack={()=>{}}/></OfficeDashboardLayout>},{path:'/elsewhere',element:<p>Other workspace</p>}],{initialEntries:['/elsewhere','/dashboard/lecturer-capacity']});root.render(<RouterProvider router={router}/>);await until(()=>document.querySelector('h1'));await until(()=>!text().includes('Loading Lecturer capacity'));};

const preview = new URL(parent.location.href).searchParams.get('preview');
if (!preview) {
await scenario('overview shows published workload, baseline and responsive paginated roster',async()=>{
 await mount();await until(()=>text().includes('Synthetic Lecturer 01'));
 check(document.querySelector('h1')?.textContent==='Lecturer capacity','Missing workload-first page');
 check(document.querySelectorAll('.back-link').length===1&&document.querySelector('.back-link')?.textContent?.includes('Back to Dashboard'),'Overview must have one Dashboard back link');
 check(text().includes('Planning baseline'),'Calculated recommendation missing');check(text().includes('54 active students'),'Baseline numerator missing');check(text().includes('27 eligible lecturers'),'Baseline denominator missing');
 check(document.querySelectorAll('tbody tr').length===10,'Roster must be paginated');check(!text().includes('Version being viewed'),'Old version selector remains');
 check(!buttons().some(button=>button.textContent?.trim()==='Add availability restriction'),'Office still owns lecturer restriction creation');
 check(!document.querySelector('[aria-label="Capacity sections"]'),'Button-style tabs remain');
 const filter=document.querySelector<HTMLInputElement>('input[type="search"]')!;input(filter,'Lecturer 27');await until(()=>document.querySelectorAll('tbody tr').length===1);await click('Clear filters');await until(()=>document.querySelectorAll('tbody tr').length===10);
 check(document.documentElement.scrollWidth<=innerWidth+1,'Page overflows viewport');
 await click('Next');await until(()=>text().includes('Synthetic Lecturer 11'));
});
await scenario('continue draft opens explicit editing view and missing rows remain configurable',async()=>{
 await mount();await until(()=>text().includes('Continue draft v2'));await click('Continue draft v2');await until(()=>text().includes('Editing draft v2'));
 check(text().includes('26 issues prevent publication'),'Readiness summary missing');check(text().includes('Synthetic Lecturer 02'),'Missing draft entries have no edit row');
 check(document.querySelectorAll('.back-link').length===1&&!text().includes('Back to Dashboard')&&!text().includes('Back to capacity overview'),'Draft has duplicate back navigation');check(document.querySelector('.back-link')?.textContent?.includes('Back to Lecturer capacity'),'Draft back destination unclear');check(text().includes('Proposed limits'),'Draft values not labelled');await choose('capacity-roster-show','Lecturers needing attention');await until(()=>!document.querySelector('tbody tr')?.textContent?.includes('Synthetic Lecturer 01'));await click('Back to Lecturer capacity');await until(()=>text().includes('Current limits'));check(document.querySelector('.back-link')?.textContent?.includes('Back to Dashboard'),'Overview back destination not restored');
});
await scenario('missing draft entry accepts zero without changing published limits',async()=>{
 await mount();await click('Continue draft v2');await until(()=>text().includes('Editing draft v2'));await choose('capacity-roster-show','Lecturers needing attention');await click('Edit limits');
 check(document.querySelector('dialog[open] input[type="number"]'),'Edit limits must use a shared modal');check(!document.querySelector('[data-record-page]'),'Edit limits replaced the table');
 await until(()=>document.querySelector('input[type="number"]'));const fields=[...document.querySelectorAll<HTMLInputElement>('input[type="number"]')];input(fields[0],'0');input(fields[1],'4');await new Promise(resolve=>setTimeout(resolve,15));const before=writes.length;check(document.activeElement===fields[0],'Editor did not focus first limit');await click('Save limits');await until(()=>writes.length===before+1);
 check(writes.at(-1)?.body.supervisorLimit===0,'Zero became missing');check(writes.at(-1)?.body.panelLimit===4,'Panel limit wrong');check(writes.at(-1)?.body.expectedFingerprint,'Concurrency fingerprint missing');
 await until(()=>!document.querySelector('input[type="number"]'));check(roster[1].supervisor.limit===5,'Draft edit changed live resolution');
});
await scenario('table attention filter preserves search and role and counts lecturers separately from issues',async()=>{
 const draft=plans.find(plan=>plan.id===2)!;const original=[...draft.readinessErrors];draft.readinessErrors.push('STAFF-03: Panel limit also needs review.');
 try {
  await mount();await click('Continue draft v2');await until(()=>text().includes('Editing draft v2'));
  check(text().includes('26 issues prevent publication'),'Issue count missing');check(!buttons().some(node=>node.textContent?.trim()==='Show affected lecturers'),'Detached warning action remains');
  await choose('capacity-roster-show','Lecturers needing attention');check(document.querySelector('.capacity-result-summary')?.textContent==='Showing 10 of 25 lecturers needing attention','Issue count mistaken for lecturer count');
  const search=document.querySelector<HTMLInputElement>('input[type="search"]')!;input(search,'Lecturer 03');await choose('capacity-roster-role','Panel');
  await until(()=>document.querySelector('.capacity-result-summary')?.textContent==='Showing 1 of 1 lecturer needing attention matching your filters');
  const row=document.querySelector('tbody tr')!;check(row.querySelectorAll('.capacity-row-issue').length===2,'Multiple issues not attached to lecturer');getComputedStyle(row).backgroundColor;row.getAnimations().forEach(animation=>animation.finish());check(getComputedStyle(row).backgroundColor==='rgb(255, 251, 235)','Affected row not highlighted');
  await choose('capacity-roster-show','All lecturers');check(search.value==='Lecturer 03','Show filter cleared search');check(document.getElementById('capacity-roster-role')?.textContent?.includes('Panel'),'Show filter reset role');
  await choose('capacity-roster-show','Lecturers needing attention');input(search,'No matching lecturer');await until(()=>text().includes('No matching lecturers'));check(document.querySelector('.capacity-result-summary')?.textContent==='Showing 0 of 0 lecturers needing attention matching your filters','Empty count unclear');
  await click('Clear filters');await until(()=>document.querySelector('.capacity-result-summary')?.textContent==='Showing 10 of 27 lecturers');
 } finally {draft.readinessErrors=original;}
});
await scenario('preparation uses a draft selector and one action instead of a button list',async()=>{
 await mount();await click('Prepare limits');await until(()=>text().includes('What would you like to do?'));
 check(document.querySelectorAll('.capacity-preparation-form button[type="submit"]').length===1,'Preparation must have one main action');
 check(!buttons().some(node=>node.textContent?.trim()==='Start with a blank draft'),'Button wall remains');
 await click('Continue editing');await until(()=>text().includes('Editing draft v2'));
});
await scenario('blank draft creation opens the created draft immediately',async()=>{
 await mount();await click('Prepare limits');await until(()=>text().includes('What would you like to do?'));await newDraft('Blank draft');const before=writes.length;await click('Create draft');await until(()=>writes.length===before+1);await until(()=>text().includes('Editing draft v3'));check(document.querySelectorAll('tbody tr').length===10,'Blank draft roster missing');
});
await scenario('previous semester source is validated before allowing creation',async()=>{
 await mount();await click('Prepare limits');await until(()=>text().includes('What would you like to do?'));await newDraft('Previous semester');await until(()=>text().includes('No eligible previous published plan'));check(buttons().find(node=>node.textContent?.trim()==='Create draft')?.disabled,'Missing previous source allowed creation');check(document.querySelector('[data-record-page]')?.textContent?.includes('Prepare capacity limits'),'Source choice lost its record page');
});
await scenario('Office lecturer details show counts and read-only availability',async()=>{
 await mount();await until(()=>text().includes('Synthetic Lecturer 01'));await click('View');await until(()=>text().includes('Lecturer details'));
 check(document.querySelector('dialog[open]'),'View must use a shared modal');check(!document.querySelector('[data-record-page]'),'View replaced the table');
 check(text().includes('Supporting supervision'),'Supporting student breakdown missing');check(text().includes('Lecturers manage their own availability'),'Ownership explanation missing');check(!buttons().some(button=>button.textContent?.trim()==='Record Availability'),'Office mutation still present');await click('View availability history');await until(()=>text().includes('Availability history'));check(!document.querySelector('dialog[open]'),'Availability history left modal open');await until(()=>scrollY===0);
});
await scenario('lecturer view modal preserves filters page scroll and trigger focus',async()=>{
 await mount();const search=document.querySelector<HTMLInputElement>('input[type="search"]')!;input(search,'Lecturer');await choose('capacity-roster-role','Panel');await click('Next');await until(()=>document.querySelector('tbody tr')?.textContent?.includes('Lecturer 11'));
 const trigger=buttons().find(node=>node.textContent?.trim()==='View')!;trigger.focus();const top=scrollY;const before=writes.length;await click('View');await until(()=>document.querySelector('dialog[open]'));
 check(document.querySelector('[aria-label="Lecturer capacity roster"]')?.isConnected,'Table unmounted');const dialog=document.querySelector<HTMLDialogElement>('dialog[open]')!;check(dialog.scrollWidth<=dialog.clientWidth+1,'Modal overflows');dialog.dispatchEvent(new Event('cancel',{cancelable:true}));await until(()=>!document.querySelector('dialog[open]'));await until(()=>document.activeElement===trigger);
 check(search.value==='Lecturer','View cleared search');check(document.getElementById('capacity-roster-role')?.textContent?.includes('Panel'),'View reset role');check(document.querySelector('tbody tr')?.textContent?.includes('Lecturer 11'),'View reset page');check(Math.abs(scrollY-top)<=1,'View lost scroll');check(writes.length===before,'Read-only view wrote data');
 await click('View');await until(()=>document.querySelector('dialog[open]'));document.querySelector('dialog[open]')!.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:0,clientY:0}));await until(()=>!document.querySelector('dialog[open]'));
});
await scenario('dirty edit modal protects cancel escape navigation and browser refresh',async()=>{
 await mount();await click('Continue draft v3');await until(()=>text().includes('Editing draft v3'));await click('Edit limits');await until(()=>document.querySelector('dialog[open] input[type="number"]'));const field=document.querySelector<HTMLInputElement>('dialog input[type="number"]')!;input(field,'7');await new Promise(resolve=>setTimeout(resolve,20));const before=writes.length;
 const unload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(unload);check(unload.defaultPrevented,'Dirty edits lack refresh protection');await click('Cancel');await until(()=>document.querySelectorAll('dialog[open]').length===2);await click('Keep editing');await until(()=>document.querySelectorAll('dialog[open]').length===1);check(field.value==='7','Closing confirmation lost edits');
 void router!.navigate(-1);await until(()=>document.querySelectorAll('dialog[open]').length===2);check(router!.state.location.pathname==='/dashboard/lecturer-capacity','Dirty Back navigation escaped guard');await click('Keep editing');await until(()=>document.querySelectorAll('dialog[open]').length===1);
 document.querySelector('dialog[open]')!.dispatchEvent(new Event('cancel',{cancelable:true}));await until(()=>document.querySelectorAll('dialog[open]').length===2);await click('Discard changes');await until(()=>!document.querySelector('dialog[open]'));check(writes.length===before,'Discarding unsaved inputs wrote data');
 await click('Edit limits');await until(()=>document.querySelector('dialog[open] input'));input(document.querySelector<HTMLInputElement>('dialog input[type="number"]')!,'9');await new Promise(resolve=>setTimeout(resolve,20));void router!.navigate('/elsewhere');await until(()=>document.querySelectorAll('dialog[open]').length===2);await click('Discard changes');await until(()=>text().includes('Other workspace'));check(writes.length===before,'Navigation wrote discarded input');
});
await scenario('edit modal retains input and error after conflict and retries safely',async()=>{
 await mount();await click('Continue draft v3');await until(()=>text().includes('Editing draft v3'));await click('Edit limits');await until(()=>document.querySelector('dialog[open] input[type="number"]'));const fields=[...document.querySelectorAll<HTMLInputElement>('dialog input[type="number"]')];input(fields[0],'6');input(fields[1],'7');await new Promise(resolve=>setTimeout(resolve,20));const before=writes.length;
 try {entryFailure=409;await click('Save limits');await until(()=>document.querySelector('dialog[open] [role="alert"]'));await until(()=>!buttons().find(node=>node.textContent?.trim()==='Save limits')?.disabled);check(fields[0].value==='6'&&fields[1].value==='7','Conflict lost inputs');entryFailure=0;await click('Save limits');await until(()=>!document.querySelector('dialog[open]'));check(writes.length===before+2,'Retry request duplicated');check(writes.at(-1)?.body.supervisorLimit===6&&writes.at(-1)?.body.panelLimit===7,'Retry wrote other limits');}
 finally {entryFailure=0;}
});
await scenario('saving edit modal blocks duplicate submission closing and navigation',async()=>{
 await mount();await click('Continue draft v3');await until(()=>text().includes('Editing draft v3'));await click('Edit limits');await until(()=>document.querySelector('dialog[open] input[type="number"]'));const field=document.querySelector<HTMLInputElement>('dialog input[type="number"]')!;input(field,'8');await new Promise(resolve=>setTimeout(resolve,20));const before=writes.length;
 try {holdEntryWrites=true;await click('Save limits');await until(()=>releaseEntryWrite);check(field.matches(':disabled'),'Inputs editable during save');check(document.querySelector<HTMLButtonElement>('[aria-label="Close lecturer dialog"]')?.disabled,'Close available during save');await click('Save limits');await click('Cancel');document.querySelector('dialog[open]')!.dispatchEvent(new Event('cancel',{cancelable:true}));check(document.querySelector('[data-capacity-lecturer-dialog]'),'Save dismissed dialog');check(writes.length===before+1,'Duplicate save request');void router!.navigate('/elsewhere');await until(()=>document.querySelectorAll('dialog[open]').length===2);check(router!.state.location.pathname==='/dashboard/lecturer-capacity','Busy navigation escaped');releaseEntryWrite!();releaseEntryWrite=null;await until(()=>!document.querySelector('dialog[open]'));check(writes.length===before+1,'Guard resubmitted save');}
 finally {holdEntryWrites=false;releaseEntryWrite?.();releaseEntryWrite=null;}
});
await scenario('versions and history retain read-only version inspection',async()=>{
 await mount();await click('Versions and history');await until(()=>text().includes('Capacity versions'));check(document.querySelectorAll('.back-link').length===1&&!text().includes('Back to Dashboard')&&!text().includes('Back to capacity overview'),'History has duplicate back navigation');check(!buttons().some(node=>node.textContent?.trim()==='Tools'),'Tools menu remains');const publishedRow=[...document.querySelectorAll('tbody tr')].find(row=>row.textContent?.includes('PUBLISHED'))!;check(!publishedRow.querySelector('[aria-label^="Discard draft version"]'),'Published version exposes discard');await click('View version');await until(()=>text().includes('Viewing version'));
 check(!buttons().some(button=>button.textContent?.trim()==='Save limits'),'History unexpectedly editable');check(text().includes('Published limits remain in force'),'History/operational distinction missing');check(document.querySelectorAll('.back-link').length===1,'Version has duplicate back navigation');await click('Back to Lecturer capacity');await until(()=>text().includes('Current limits'));
 await click('Versions and history');await until(()=>text().includes('Capacity versions'));check(!buttons().some(node=>node.textContent?.trim()==='Continue editing'),'Long history action label remains');await click('Edit draft');await until(()=>text().includes('Editing draft v3'));check(text().includes('Proposed lecturer limits'),'Edit draft did not open editor');
});
await scenario('publication requires explicit review, reason and consent, then returns to current policy',async()=>{
 plans=[makePlan(4,'DRAFT',roster),...plans];await mount();await click('Continue draft v4');await until(()=>text().includes('Editing draft v4'));const before=writes.length;await click('Review and publish');await until(()=>document.querySelector('textarea'));check(writes.length===before,'Review published without confirmation');
 const publishButton=buttons().find(node=>node.textContent?.trim()==='Publish limits')!;check(publishButton.disabled,'Publish enabled without reason and consent');const field=document.querySelector<HTMLTextAreaElement>('textarea')!;Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(field,'Reviewed staffing plan');field.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();await until(()=>!publishButton.disabled);await click('Publish limits');await until(()=>text().includes('Version 4 is currently in force'));check(writes.at(-1)?.body.reason==='Reviewed staffing plan','Publication reason not saved');check(writes.at(-1)?.body.expectedFingerprint==='fingerprint-4','Publication concurrency guard missing');
});
await scenario('ineligible draft blockers offer a fresh-draft recovery without deleting history',async()=>{
 const stale=makePlan(5,'DRAFT',roster.slice(0,1));stale.readinessErrors=['STAFF-01: entry Lecturer is not currently eligible.'];plans=[stale,...plans];const row=roster[0] as typeof roster[0]&{canConfigure:boolean};row.canConfigure=false;row.participantLifecycle='RETIRED';try{await mount();await click('Continue draft v5');await until(()=>text().includes('Editing draft v5'));await choose('capacity-roster-show','Lecturers needing attention');const edit=buttons().find(node=>node.textContent?.trim()==='Edit limits')!;check(edit.disabled,'Ineligible draft row became editable');await click('Prepare a fresh draft');await until(()=>text().includes('What would you like to do?'));check(plans.some(plan=>plan.id===5),'Recovery removed old draft');}finally{row.canConfigure=true;row.participantLifecycle='ACTIVE';}
});
await scenario('failed roster read has retry and never exposes mutation controls',async()=>{
 failRoster=true;await mount();await until(()=>text().includes('Synthetic roster unavailable'));check(!buttons().some(button=>button.textContent?.trim()==='Edit limits'),'Failed read exposed editing');failRoster=false;await click('Retry');await until(()=>text().includes('Synthetic Lecturer 01'));
});
await scenario('current published starting point clones the policy and opens its draft',async()=>{
 await mount();await click('Prepare limits');await until(()=>text().includes('What would you like to do?'));await newDraft('Current published limits');const before=writes.length;await click('Create draft');await until(()=>writes.length===before+1);check(writes.at(-1)?.path.endsWith('/4/clone/'),'Published source did not use clone');await until(()=>text().includes('Editing draft v6'));
});
const openDiscard=async()=>{await click('Versions and history');await until(()=>document.querySelector('[aria-label="Capacity versions"]'));check(!buttons().some(node=>node.textContent?.trim()==='Tools'),'Discard is still hidden in Tools');await click('Discard');await until(()=>document.querySelector('dialog[open]'));};
const reason=()=>{const field=document.querySelector<HTMLTextAreaElement>('dialog[open] textarea')!;Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(field,'Duplicate planning draft');field.dispatchEvent(new Event('input',{bubbles:true}));};
await scenario('discard needs confirmation and reason, retains history and removes active draft',async()=>{
 await mount();const before=writes.length;await openDiscard();check(text().includes(semester.label),'Semester missing from confirmation');check(writes.length===before,'Opening discard wrote data');check(buttons().find(node=>node.textContent?.trim()==='Discard draft')!.disabled,'Discard lacks reason validation');await click('Cancel');await until(()=>!document.querySelector('dialog[open]'));check(writes.length===before,'Cancel wrote data');
 await click('Discard');await until(()=>document.querySelector('textarea'));reason();await new Promise(resolve=>setTimeout(resolve,20));await click('Discard draft');await until(()=>!document.querySelector('dialog[open]'));check(writes.length===before+1,'Discard duplicated request');check(writes.at(-1)?.body.confirmed===true&&writes.at(-1)?.body.expectedFingerprint==='fingerprint-6','Missing consent or concurrency guard');check(plans.find(row=>row.id===6)?.lifecycleStatus==='DISCARDED','Draft was deleted or not discarded');
 const discarded=[...document.querySelectorAll('tbody tr')].find(row=>row.textContent?.includes('Version 6'))!;check(!discarded.textContent?.includes('Edit draft'),'Discarded draft editable');check(!discarded.querySelector('[aria-label^="Discard draft version"]'),'Discarded version exposes discard');await click('Back to Lecturer capacity');await click('Prepare limits');await until(()=>text().includes('What would you like to do?'));check(!document.querySelector('#capacity-existing-draft')?.textContent?.includes('Version 6'),'Discarded draft remained active');
});
await scenario('discard failure is visible and retry does not discard another version',async()=>{
 await mount();await openDiscard();reason();await new Promise(resolve=>setTimeout(resolve,20));failDiscard=503;await click('Discard draft');await until(()=>text().includes('Synthetic discard failed'));check(plans.find(row=>row.id===5)?.lifecycleStatus==='DRAFT','Failed discard changed status');failDiscard=0;await click('Discard draft');await until(()=>!document.querySelector('dialog[open]'));check(plans.find(row=>row.id===5)?.lifecycleStatus==='DISCARDED','Retry did not discard selected version');
});
await scenario('saved discard followed by reload failure cannot be submitted twice',async()=>{
 await mount();await openDiscard();reason();await new Promise(resolve=>setTimeout(resolve,20));const before=writes.length;failAfterDiscard=true;await click('Discard draft');await until(()=>!document.querySelector('dialog[open]'));check(writes.length===before+1,'Saved discard resubmitted after refresh failure');check(text().includes('could not be loaded'),'Refresh failure omitted');failAfterDiscard=false;failRoster=false;await click('Retry');await until(()=>document.querySelector('[aria-label="Capacity versions"]'));check(document.documentElement.scrollWidth<=innerWidth+1,'History overflows viewport');
});
await scenario('discarded version remains viewable without edit publish or revision controls',async()=>{
 await mount();await click('Versions and history');await until(()=>document.querySelector('[aria-label="Capacity versions"]'));await choose('capacity-history-status','Discarded');check([...document.querySelectorAll('tbody tr')].every(row=>row.textContent?.includes('DISCARDED')),'Discarded status filter includes active policies');const row=[...document.querySelectorAll('tbody tr')].find(node=>node.textContent?.includes('Version 6'))!;row.querySelector<HTMLButtonElement>('button')!.click();await until(()=>text().includes('Viewing version 6'));check(!buttons().some(node=>['Continue editing this draft','Review and publish','Prepare a revision','Save limits'].includes(node.textContent?.trim()||'')),'Discarded version exposes mutation');
});
}
await mount();
if(preview==='details') { await click('View'); await until(()=>document.querySelector('dialog[open]')); }
else if(preview==='edit') { await click('Continue draft v2'); await until(()=>text().includes('Editing draft v2')); await click('Edit limits'); await until(()=>document.querySelector('dialog[open]')); }
else if(preview==='editor') { await click('Continue draft v2'); await until(()=>text().includes('Editing draft v2')); await choose('capacity-roster-show','Lecturers needing attention'); }
else if(preview==='history') { await click('Versions and history'); await until(()=>document.querySelector('[aria-label="Capacity versions"]')); }
else { await click('Prepare limits'); await until(()=>text().includes('What would you like to do?')); }
parent.postMessage({type:'capacity-workspace-results',results},location.origin);
