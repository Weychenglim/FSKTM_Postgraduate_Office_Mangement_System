import React from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {PanelAssignmentDetail} from '../src/components/PanelAssignmentDetail';
import {PanelAppointmentDetail} from '../src/components/PanelAppointmentDetail';
import {PanelRecommendationReviewDrawer} from '../src/components/LecturerPanelAppointments';
import {PanelSuperviseeDetails} from '../src/components/PanelSuperviseeRoster';
import type {PanelAssignment,PanelRecommendationDraft,PanelRecommendationSupervisee,PanelRecord,AppointmentLifecycle} from '../src/types';

const container=document.getElementById('root')!;
const results:{name:string;error:string|null}[]=[];
const check=(value:unknown,message:string)=>{if(!value)throw Error(message);};
const pause=()=>new Promise(r=>setTimeout(r,0));
const until=async(predicate:()=>unknown)=>{for(let i=0;i<160;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error(`Timed out: ${container.textContent}`);};
let root:Root|null=null;
const lifecycle:AppointmentLifecycle={appointmentId:9,status:'ACTIVE',endOutcome:null,endReason:null,endedAt:null,endedBy:null,supersedesAppointmentId:null,replacementAppointmentId:null,lifecycle:[{id:1,action:'ACTIVATED',actorName:'Programme Coordinator',actorRole:'Programme Coordinator',previousStatus:'',newStatus:'ACTIVE',outcome:null,reason:null,createdAt:'2026-10-20T08:00:00Z'}]};
const recommendation:PanelRecommendationDraft={id:71,studentId:'DEMO-PG-071',studentName:'Aina Sofea Rahman (Demo)',programme:'Master of Data Science (Coursework)',semester:'Semester I 2026/2027',supervisorName:'Dr Nadia Hassan',supervisorEmail:'nadia@example.test',studentEmail:'aina@example.test',recommendedMember:'Dr Amir Hakim',recommendedMemberId:'DEMO-L071',panelMemberEmail:'amir@example.test',panelMemberDepartment:'Artificial Intelligence',proposedTopic:'Explainable early-warning models for postgraduate academic support',researchArea:'Explainable artificial intelligence and educational data mining',abstract:'This study investigates explainable machine-learning support for identifying postgraduate students who may benefit from early academic assistance. Synthetic records are used to compare an interpretable baseline and a tree-based model.\n\nTwo explanation layouts will be evaluated using scripted scenarios, focusing on comprehension and perceived usefulness. No real student records will be used.',status:'APPROVED',submittedAt:'2026-10-18T08:00:00Z',submittedDate:'18 Oct 2026',coordinatorDecisionAt:'2026-10-20T08:00:00Z',justification:'Dr Amir’s expertise in interpretable machine learning and educational analytics complements the project’s evaluation needs.',appointmentLifecycle:lifecycle,workflow:[{id:1,action:'SUBMIT',actorName:'Dr Nadia Hassan',actorRole:'Lecturer',previousStatus:'',newStatus:'SUBMITTED_TO_PANEL',reason:'',createdAt:'2026-10-18T08:00:00Z'}]};
const assignment:PanelAssignment={academicTeam:{primary:{name:"Dr Current Primary",email:"primary@example.test",department:"Computing",appointmentDate:"2026-10-01"},supporting:[{name:"Dr Supporting",email:"supporting@example.test",department:"Data Science",appointmentDate:"2026-10-02"}]},appointmentId:9,studentId:recommendation.studentId,studentName:recommendation.studentName,researchTitle:recommendation.proposedTopic,supervisor:'Dr Nadia Hassan',appointmentDate:'2026-10-20',status:'ACTIVE',recommendation,appointmentLifecycle:lifecycle};
const student:PanelRecommendationSupervisee={studentId:recommendation.studentId,studentName:recommendation.studentName,programme:recommendation.programme,semester:recommendation.semester!,proposedTopic:recommendation.proposedTopic,researchArea:recommendation.researchArea!,abstract:recommendation.abstract!,supervisorName:'Dr Nadia Hassan',supervisorId:'L001',supervisorAppointmentId:2,panelAppointmentId:9,currentPanelMember:'Dr Amir Hakim',currentPanelMemberId:'DEMO-L071',canRecommend:true};
const office=(row=recommendation):PanelRecord=>({recordId:'appointment-9',id:row.studentId,studentName:row.studentName,programme:row.programme,semester:row.semester!,supervisor:row.supervisorName!,panelMember:row.recommendedMember,status:row.appointmentLifecycle?.status==='ACTIVE'?'Approved':'Ended',updatedDate:'20 Oct 2026',recommendation:row,appointmentLifecycle:row.appointmentLifecycle});
const button=(text:string,scope:ParentNode=document)=>[...scope.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.trim().toLowerCase()===text.toLowerCase());
async function mount(element:React.ReactNode){root?.unmount();root=createRoot(container);root.render(element);await until(()=>!!container.textContent);await pause();}
async function click(text:string,scope:ParentNode=document){const b=button(text,scope);check(b,`Missing ${text}`);b!.click();await pause();}
async function setValue(element:HTMLTextAreaElement|HTMLSelectElement,text:string){const proto=element instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLTextAreaElement.prototype;Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(element,text);element.dispatchEvent(new Event(element instanceof HTMLSelectElement?'change':'input',{bubbles:true}));await pause();}
function geometry(){
  check(document.documentElement.scrollWidth<=innerWidth+1,'Horizontal overflow');
  const cols=container.querySelector('[data-panel-assignment-columns],[data-panel-supervisee-columns]')!;
  if(cols.children.length===2){const main=cols.children[0].getBoundingClientRect(),aside=cols.children[1].getBoundingClientRect();if(innerWidth>=1280)check(aside.left-main.right>=27&&Math.abs(aside.top-main.top)<2,'Desktop aside alignment');else if(cols.hasAttribute('data-panel-supervisee-columns'))check(main.top-aside.bottom>=27,'Mobile nomination-first spacing');else check(aside.top-main.bottom>=27,'Mobile spacing');}
  for(const dd of container.querySelectorAll('dl dd')){check(getComputedStyle(dd).fontWeight==='400','Bold answer');check(parseFloat(getComputedStyle(dd).fontSize)>=14,'Small answer');}
  for(const region of container.querySelectorAll<HTMLElement>('[role="region"]')){const r=region.getBoundingClientRect();check(r.left>=-1&&r.right<=innerWidth+1,'Card overflow');}
  for(const b of container.querySelectorAll<HTMLButtonElement>('[data-detail-actions] button'))check(b.getBoundingClientRect().height>=44,'Small lifecycle action');
}
async function scenario(name:string,run:()=>Promise<void>){try{await run();results.push({name,error:null});}catch(error){results.push({name,error:String(error)});}}
window.fetch=async()=>{throw Error('Unexpected HTTP request');};

await scenario('Lecturer assignment presents appointment surfaces and exact student/Marks navigation',async()=>{
  let opened='',marks=0,back=0;await mount(<PanelAssignmentDetail assignment={assignment} onBack={()=>back++} onOpenStudent={id=>opened=id} onOpenMarksEntry={()=>marks++}/>);
  check(container.querySelectorAll('[role="region"]').length===4,'Expected four independent surfaces');
  check(container.querySelectorAll('[data-panel-assignment-detail] h2')[1]?.textContent==='Academic team','Wrong appointment focus');
  for(const value of ['Dr Current Primary','primary@example.test','Dr Supporting','supporting@example.test','Panel member for this assignment','20 Oct 2026'])check(container.textContent?.includes(value),'Missing academic team detail: '+value);
  check(!container.textContent?.includes('Staff number')&&!container.textContent?.includes('DEMO-L071'),'Internal staff identifier in assignment overview');
  check(!button('Nominate co-supervisor')&&!button('Replace Panel'),'Panel reader gained management controls');
  check(!container.querySelector('[data-panel-request-columns]'),'Still using request layout');check(container.textContent?.split(recommendation.studentName).length===2,'Repeated student');
  await click('View student record');await click('Open Marks Entry');check(opened===recommendation.studentId&&marks===1,'Navigation changed');geometry();await click('Back to My Panel students');check(back===1,'Back callback changed');
});
await scenario('Lecturer exact assignment read retries safely and supplies academic-team contacts',async()=>{
  let reads=0;
  window.fetch=async input=>{
    check(String(input).endsWith('/appointments/panel/appointments/9/'),'Unexpected assignment endpoint');
    reads++;
    return reads===1?Response.json({detail:'Assignment temporarily unavailable'},{status:503}):Response.json(assignment);
  };
  await mount(<PanelAssignmentDetail assignment={{...assignment,academicTeam:undefined}} onBack={()=>{}}/>);
  await until(()=>!!button('Retry'));await click('Retry');
  await until(()=>container.textContent?.includes('primary@example.test'));
  check(reads===2,'Retry must repeat the exact read once');geometry();
  window.fetch=async()=>{throw Error('Unexpected HTTP request');};
});
await scenario('Coordinator appointment presentation preserves read-only and lifecycle capabilities',async()=>{
  for(const ended of [false,true]){const row={...recommendation,status:'PENDING_COORDINATOR' as const,canReview:true,canEndAppointment:true,appointmentLifecycle:{...lifecycle,status:ended?'ENDED' as const:'ACTIVE' as const}};
    await mount(<PanelRecommendationReviewDrawer isOpen presentation="appointment" recommendation={row} reviewerRole="PROGRAMME_COORDINATOR" onClose={()=>{}}/>);
    check(!button('Approve request')&&!button('Reject request'),'Appointment became actionable request');check(!!button('End Appointment')===!ended,'Lifecycle capability changed');geometry();}
});
await scenario('Office lifecycle confirmation keeps reason/outcome guards and exact appointment endpoint',async()=>{
  let saved='',refreshes=0;window.fetch=async(input,init)=>{const path=new URL(String(input),location.origin).pathname;check(path==='/api/appointments/panel/appointments/9/end/'&&init?.method==='POST','Wrong lifecycle endpoint');saved=String(init.body);return Response.json({...lifecycle,status:'ENDED'});};
  await mount(<PanelAppointmentDetail appointmentView record={office()} onBack={()=>{}} onLifecycleChanged={()=>{refreshes++;}}/>);
  await click('End Appointment');await until(()=>!!document.querySelector('dialog[open]'));const dialog=document.querySelector('dialog[open]')!;check(button('End appointment',dialog)?.disabled,'Reason not required');check(dialog.textContent?.includes('retires unfinished official Marks tasks'),'Consequences hidden');
  const select=dialog.querySelector<HTMLSelectElement>('select')!;await setValue(select,'WITHDRAWN');await setValue(dialog.querySelector('textarea')!,' Student withdrew from the project. ');await click('End appointment',dialog);await until(()=>refreshes===1);
  check(saved===JSON.stringify({outcome:'WITHDRAWN',reason:'Student withdrew from the project.'}),'Payload changed');await until(()=>!document.querySelector('dialog[open]'));geometry();window.fetch=async()=>{throw Error('Unexpected HTTP request');};
});
await scenario('Ended appointment retains exact dates/outcome/actor and omits ending controls',async()=>{
  const row={...recommendation,appointmentLifecycle:{...lifecycle,status:'ENDED' as const,endOutcome:'REPLACED' as const,endReason:'Specialist expertise requested.',endedAt:'2026-10-23T08:00:00Z',endedBy:'Office administrator'}};
  await mount(<PanelAppointmentDetail appointmentView record={office(row)} onBack={()=>{}}/>);
  const lifecycleCard=container.querySelector('[data-panel-appointment-record]')!;for(const text of ['23 Oct 2026','Replaced','Specialist expertise requested.','Office administrator'])check(lifecycleCard.textContent?.includes(text),text);
  check(!button('End Appointment'),'Ended appointment can end again');check(!lifecycleCard.textContent?.includes(recommendation.studentName),'Repeated student');geometry();
});
await scenario('Nomination evidence and independent lifecycle history stay available on demand',async()=>{
  await mount(<PanelAssignmentDetail assignment={assignment} onBack={()=>{}}/>);const nomination=container.querySelector<HTMLDetailsElement>('[data-panel-nomination-history]')!;check(!nomination.open,'Nomination history starts expanded');nomination.querySelector('summary')!.click();check(nomination.open&&nomination.textContent?.includes(recommendation.justification!),'Nomination reason missing');
  const appointmentHistory=[...container.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent?.startsWith('Appointment history'))!;check(!appointmentHistory.open,'Lifecycle history expanded');appointmentHistory.querySelector('summary')!.click();check(appointmentHistory.open&&appointmentHistory.textContent?.includes('Programme Coordinator'),'Lifecycle actor missing');geometry();
});
await scenario('Supervisor pending replacement is distinct from current member and opens exact nomination',async()=>{
  let opened='',nominated=0;const pending={...recommendation,id:72,status:'PENDING_COORDINATOR' as const,recommendedMember:'Dr Proposed Replacement'};
  await mount(<PanelSuperviseeDetails student={{...student,canRecommend:false}} pendingRequest={pending} onRecommend={()=>nominated++} onOpenRequest={row=>opened=String(row.id)}/>);
  check(container.querySelector('[aria-label="Panel nomination"]')?.textContent?.includes('Dr Proposed Replacement'),'Pending member missing');check(container.textContent?.includes('Dr Amir Hakim')&&container.textContent.includes('remains appointed until final approval'),'Current member replaced prematurely');
  check(!button('Request replacement')&&!button('Nominate panel member'),'Duplicate nomination allowed');await click('View pending request');check(opened==='72'&&nominated===0,'Wrong request');geometry();
});
await scenario('Supervisor unappointed and missing member states retain nomination capabilities',async()=>{
  for(const appointed of [false,true]){let nominated=0;await mount(<PanelSuperviseeDetails student={{...student,panelAppointmentId:appointed?9:null,currentPanelMember:null,currentPanelMemberId:null}} onRecommend={()=>nominated++} onOpenRequest={()=>{}}/>);
    check(container.textContent?.includes(appointed?'Not recorded':'Not appointed'),'Invented member');check(container.querySelector('[aria-label="Panel nomination"]')?.textContent?.includes(appointed?'Request replacement':'Nominate panel member'),'Nomination action missing from sidebar');await click(appointed?'Request replacement':'Nominate panel member');check(nominated===1,'Nomination callback missing');check(container.textContent?.includes(recommendation.abstract!),'Research omitted');geometry();}
});
await scenario('Office attention overview links exact current appointment or pending request',async()=>{
  let opened=0,request='';await mount(<PanelAppointmentDetail overview record={office()} onBack={()=>{}} onViewAppointment={id=>opened=id}/>);await click('View appointment');check(opened===9&&!button('End Appointment'),'Overview gained ending authority');check(!container.textContent?.includes('No ongoing request'),'Active-only payload claimed there are no requests');geometry();
  const pending={...recommendation,id:72,status:'PENDING_COORDINATOR' as const,appointmentLifecycle:null,recommendedMember:'Dr Proposed Replacement'};await mount(<PanelAppointmentDetail overview record={office(pending)} onBack={()=>{}} onViewRequest={id=>request=id}/>);
  check(container.textContent?.includes('No active Panel appointment'),'Nomination became current');await click('View request');check(request==='72'&&!button('View appointment'),'Wrong pending request target');geometry();
});
await scenario('Long current research and historical reasons wrap fully',async()=>{
  const row={...recommendation,studentName:'LongStudent'.repeat(35),recommendedMember:'LongPanelMember'.repeat(30),proposedTopic:'ResearchTerm'.repeat(80),abstract:'LongAbstract'.repeat(200)+'\n\nComplete final paragraph.',appointmentLifecycle:{...lifecycle,status:'ENDED' as const,endReason:'RecordedReason'.repeat(100),endedAt:'2026-10-23'}};
  await mount(<PanelAssignmentDetail assignment={{...assignment,recommendation:row}} onBack={()=>{}}/>);check(container.textContent?.includes(row.abstract),'Abstract truncated');geometry();
});
await scenario('Missing lifecycle and unchanged recommendation presentation remain honest',async()=>{
  await mount(<PanelAssignmentDetail assignment={{...assignment,recommendation:{...recommendation,appointmentLifecycle:null}}} onBack={()=>{}} onOpenMarksEntry={()=>{}}/>);check(container.textContent?.includes('No appointment lifecycle record is available.')&&!button('Open Marks Entry'),'Missing lifecycle gained control');check(container.querySelector('[data-panel-nomination-history]')?.textContent?.includes(recommendation.justification!),'Missing lifecycle hid existing nomination evidence');geometry();
  await mount(<PanelAppointmentDetail record={office()} onBack={()=>{}}/>);check(container.querySelector('[data-panel-request-columns]')&&!container.querySelector('[data-panel-assignment-columns]'),'Recommendation route changed');
});

await mount(<PanelAssignmentDetail assignment={assignment} onBack={()=>{}} onOpenMarksEntry={()=>{}} onOpenStudent={()=>{}}/>);
parent.postMessage({type:'panel-assignment-detail-results',width:innerWidth,results},location.origin);
