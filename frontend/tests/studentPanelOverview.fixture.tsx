import React, {useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter,useLocation,useNavigate} from 'react-router';
import {StudentPanelAppointment,StudentPanelAppointmentOverview} from '../src/components/StudentPanelAppointment';
import type {StudentPanelAppointmentView,SupervisorApplicationRecord} from '../src/types';
import {StudentSupervisorAppointment} from '../src/components/StudentSupervisorAppointment';
import type {SupervisoryTeam} from '../src/types/coSupervision';

const container=document.getElementById('root')!;
const results:{name:string;error:string|null}[]=[];
const check=(value:unknown,message:string)=>{if(!value)throw Error(message);};
const pause=()=>new Promise(r=>setTimeout(r,0));
const until=async(predicate:()=>unknown)=>{for(let i=0;i<160;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error(`Timed out: ${container.textContent}`);};
let root:Root|null=null;
const appointment:StudentPanelAppointmentView={status:'CONFIRMED',readinessState:'CONFIRMED',studentName:'Aina Sofea Rahman (Demo)',studentId:'DEMO-PG-071',programme:'Master of Data Science (Coursework)',semester:'Semester I 2026/2027',supervisorName:'Dr Nadia Hassan',researchTitle:'Old application title',panelMemberName:'Dr Amir Hakim',panelMemberId:'DEMO-L071',panelMemberDepartment:'Artificial Intelligence',panelMemberEmail:'amir@example.test',appointmentDate:'20 Oct 2026',approvedRequest:{id:71,nominatedBy:'Dr Nadia Hassan',submittedAt:'2026-10-01T04:00:00Z',panelAcceptedAt:'2026-10-10T04:00:00Z',approvedAt:'2026-10-20T04:00:00Z'},researchProfile:{title:'Explainable early-warning models for postgraduate academic support',programme:'Master of Data Science (Coursework)',area:'Explainable artificial intelligence and educational data mining',abstract:'This study investigates explainable machine-learning support for identifying postgraduate students who may benefit from early academic assistance. Synthetic records are used to compare an interpretable baseline and a tree-based model.\n\nTwo explanation layouts will be evaluated using scripted scenarios, focusing on comprehension and perceived usefulness. No real student records will be used.'}};
function Location(){return <output data-location>{useLocation().pathname}</output>;}
async function mount(element:React.ReactNode,entry='/'){root?.unmount();root=createRoot(container);root.render(<MemoryRouter initialEntries={[entry]}>{element}<Location/></MemoryRouter>);await until(()=>!!container.textContent);await pause();}
const button=(text:string)=>[...container.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.trim()===text);
async function click(text:string){const b=button(text);check(b,`Missing ${text}`);b!.click();await pause();}
function geometry(){
  check(document.documentElement.scrollWidth<=innerWidth+1,'Horizontal overflow');
  const cols=container.querySelector('[data-student-appointment-columns]')!;
  const main=cols.children[0].getBoundingClientRect(),aside=cols.children[1].getBoundingClientRect();
  if(innerWidth>=1280)check(aside.left-main.right>=27&&Math.abs(aside.top-main.top)<2,'Desktop aside spacing');
  else check(aside.top-main.bottom>=27,'Stacked spacing');
  for(const dd of container.querySelectorAll('dl dd')){check(getComputedStyle(dd).fontWeight==='400','Bold answer');check(parseFloat(getComputedStyle(dd).fontSize)>=14,'Small answer');}
  for(const b of container.querySelectorAll('button'))check(b.getBoundingClientRect().height>=44,`Small action: ${b.textContent?.trim()} (${b.getBoundingClientRect().height}px)`);
  for(const region of container.querySelectorAll('[role="region"]')){const r=region.getBoundingClientRect();check(r.left>=0&&r.right<=innerWidth+1,'Card overflow');}
}
async function scenario(name:string,run:()=>Promise<void>){try{await run();results.push({name,error:null});}catch(error){results.push({name,error:String(error)});}}
window.fetch=async()=>{throw Error('Unexpected HTTP request');};

await scenario('Confirmed student sees useful context, member and full research without internal staff number',async()=>{
  await mount(<StudentPanelAppointmentOverview appointment={appointment}/>);
  check(container.querySelectorAll('[role="region"]').length===3,'Expected member, research and next-step surfaces');
  for(const text of ['Master of Data Science (Coursework)','Dr Nadia Hassan','Dr Amir Hakim','20 Oct 2026',appointment.researchProfile!.abstract])check(container.textContent?.includes(text),`Missing ${text}`);
  check(!container.textContent?.includes('Old application title'),'Pending request title became current');
  check(!container.textContent?.includes('DEMO-L071')&&!container.textContent?.includes('Staff number'),'Internal staff number displayed');
  check(container.querySelector('a[href="mailto:amir@example.test"]'),'Email action missing');geometry();
});
await scenario('All pending states preserve private Panel details and provide relevant next steps',async()=>{
  for(const state of ['SUPERVISOR_REQUIRED','SUPERVISOR_APPROVAL_PENDING','READY_FOR_PANEL_RECOMMENDATION','FACULTY_PROCESSING'] as const){
    await mount(<StudentPanelAppointmentOverview appointment={{...appointment,status:'PENDING',readinessState:state,waitingDays:state==='FACULTY_PROCESSING'?3:null,waitingOn:state==='FACULTY_PROCESSING'?'FACULTY_PROCESSING':null,researchProfile:null}}/>);
    for(const text of ['Dr Amir Hakim','DEMO-L071','Artificial Intelligence','amir@example.test','20 Oct 2026','Old application title'])check(!container.textContent?.includes(text),`Private field released: ${text}`);
    if(state==='SUPERVISOR_APPROVAL_PENDING')check(container.querySelector('dt')&&container.textContent?.includes('Proposed supervisor'),'Unapproved supervisor is not proposed');
    if(state==='SUPERVISOR_REQUIRED')check(!container.textContent?.includes('Dr Nadia Hassan'),'Unappointed supervisor shown');
    if(state==='FACULTY_PROCESSING')check(container.textContent?.includes('3 days')&&!container.textContent?.includes('Coordinator'),'Internal review disclosed');
    geometry();
  }
});
await scenario('Supervisor prerequisite links navigate to the existing student workspace',async()=>{
  for(const state of ['SUPERVISOR_REQUIRED','SUPERVISOR_APPROVAL_PENDING'] as const){await mount(<StudentPanelAppointmentOverview appointment={{...appointment,status:'PENDING',readinessState:state}}/>);
    const link=container.querySelector<HTMLAnchorElement>('a[href="/supervisor-appointments"]')!;check(link,'Prerequisite link missing');link.click();await pause();check(container.querySelector('[data-location]')?.textContent==='/supervisor-appointments','Wrong prerequisite destination');}
});
await scenario('FAQ remains available without the removed approved-nomination button',async()=>{
  let faq=0;await mount(<StudentPanelAppointmentOverview appointment={appointment} onShowFAQChatbot={()=>faq++}/>);
  await click('Appointment FAQ');check(faq===1&&!button('View approved nomination'),'FAQ changed or removed action remains');
  check(!button('Refresh appointment')&&!container.querySelector('[aria-label="Academic context"]'),'Loose metadata or unmatched control remains');geometry();
});
await scenario('Missing confirmed fields and absent profile stay honest',async()=>{
  await mount(<StudentPanelAppointmentOverview appointment={{...appointment,panelMemberName:null,panelMemberId:null,panelMemberDepartment:null,panelMemberEmail:null,appointmentDate:null,researchProfile:null}}/>);
  check(container.textContent?.includes('Panel member not recorded')&&container.textContent.includes('Not recorded'),'Missing data invented');check(!container.querySelector('[aria-label="Research profile"]')&&!container.querySelector('a[href^="mailto:"]'),'Absent details fabricated');geometry();
});
await scenario('Long names, addresses and research wrap without truncation',async()=>{
  const long={...appointment,studentName:'LongStudentName'.repeat(25),programme:'ProgrammeName'.repeat(30),supervisorName:'SupervisorName'.repeat(30),panelMemberName:'PanelMember'.repeat(35),panelMemberEmail:'longaddress'.repeat(25)+'@example.test',researchProfile:{...appointment.researchProfile!,title:'ResearchTerm'.repeat(90),abstract:'ResearchText'.repeat(180)+'\n\nFinal paragraph remains visible.'}};
  await mount(<StudentPanelAppointmentOverview appointment={long}/>);check(container.textContent?.includes(long.researchProfile.abstract),'Research truncated');geometry();
});
await scenario('Service failure clears the overview and retry restores current data',async()=>{
  let fail=true;window.fetch=async(input,init)=>{check(String(input).endsWith('/appointments/panel/student/')&&(!init?.method||init.method==='GET'),'Unexpected API or academic write');if(fail)throw Error('Panel service temporarily unavailable');return new Response(JSON.stringify(appointment),{status:200,headers:{'Content-Type':'application/json'}});};
  await mount(<StudentPanelAppointment/>);await until(()=>!!container.querySelector('[role="alert"]'));check(!container.querySelector('[data-student-panel-overview]'),'Error kept stale overview');fail=false;await click('Retry');await until(()=>!!container.querySelector('[data-student-panel-overview]'));geometry();
});
await scenario('Return to focus reloads and replaces a former confirmed member with fresh processing data',async()=>{
  let release:((value:Response)=>void)|undefined;window.fetch=async()=>new Promise<Response>(resolve=>{release=resolve;});
  await mount(<StudentPanelAppointment/>);await until(()=>!!release);check(container.textContent?.includes('Loading your panel appointment'),'Loading state absent');release!(new Response(JSON.stringify(appointment)));await until(()=>!!container.querySelector('[data-student-panel-overview]'));
  release=undefined;window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));await until(()=>!!release);check(!container.textContent?.includes('Dr Amir Hakim')&&container.textContent?.includes('Loading your panel appointment'),'Refresh shows stale member');
  release!(new Response(JSON.stringify({...appointment,status:'PENDING',readinessState:'FACULTY_PROCESSING',panelMemberName:null,panelMemberId:null,panelMemberDepartment:null,panelMemberEmail:null,appointmentDate:null})));await until(()=>!!container.querySelector('[data-student-panel-overview]'));check(!container.textContent?.includes('Dr Amir Hakim'),'Fresh processing kept old member');geometry();
});
const currentApplication:SupervisorApplicationRecord={id:42,studentId:'PG071',studentName:'Aina Sofea Rahman',programme:appointment.programme,semester:appointment.semester,proposedSupervisor:'Dr Nadia Hassan',proposedSupervisorId:'INTERNAL-SUPERVISOR-01',researchTitle:'Original approved submission title',researchArea:'Computing',researchAbstract:'The complete abstract submitted with the approved application.',researchProfileReady:true,status:'APPROVED',rejectionReason:'',submittedAt:'2026-10-01T04:00:00Z',workflow:[],documents:[],appointmentLifecycle:{appointmentId:7,status:'ACTIVE',endOutcome:null,endReason:null,endedAt:null,endedBy:null,supersedesAppointmentId:null,replacementAppointmentId:null}};
const currentTeam:SupervisoryTeam={studentId:71,matricNo:'PG071',studentName:'Aina Sofea Rahman',programme:appointment.programme,studentStatus:'ACTIVE',primarySupervisor:{id:10,name:'Dr Nadia Hassan'},primaryAppointmentId:7,research:{title:'Current saved title',area:'Computing',abstract:'Current saved research abstract.'},appointments:[],nominations:[],canNominate:false};
let requirementReads=0;
function supervisorService(applications:SupervisorApplicationRecord[],team:SupervisoryTeam|null=currentTeam){
  requirementReads=0;
  window.fetch=async(input,init)=>{
    check(!init?.method||init.method==='GET','Unexpected academic write');
    const path=new URL(String(input),location.origin).pathname;
    if(path.endsWith('/supervisor/applications/'))return Response.json(applications);
    if(path.endsWith('/co-supervisor/'))return Response.json({teams:team?[team]:[],appointments:[],nominations:[]});
    if(path.includes('document-requirements')){requirementReads++;return Response.json([]);}
    if(path.includes('operational-periods'))return Response.json({activity:'SUPERVISOR_APPLICATION',status:'UNRESTRICTED',canSubmit:true,enforcementEnabled:false,message:'',opensAt:null,closesAt:null,effectiveDueAt:null});
    throw Error('Unexpected API '+path);
  };
}
function SupervisorRoute(){
  const[id,setId]=useState<string>();
  return <StudentSupervisorAppointment initialApplicationId={id} backLabel="Back to My supervisors" onNavigateToApplication={setId} onNavigateToList={()=>setId(undefined)}/>;
}
await scenario('Approved application traces the active appointment despite a newer replacement and older approval',async()=>{
  const replacement={...currentApplication,id:99,status:'PENDING_COORDINATOR' as const,proposedSupervisor:'Dr Proposed Replacement',appointmentLifecycle:null,replacesAppointmentId:7};
  const historical={...currentApplication,id:40,proposedSupervisor:'Dr Previous',appointmentLifecycle:{...currentApplication.appointmentLifecycle!,appointmentId:5,status:'ENDED' as const,endOutcome:'REPLACED' as const}};
  supervisorService([replacement,historical,currentApplication]);
  await mount(<SupervisorRoute/>);await until(()=>!!button('View approved application'));
  const navigation=container.querySelector('nav[aria-label="Supervisor workspace"]')!;check(navigation&&container.querySelectorAll('nav[aria-label="Supervisor workspace"]').length===1,'Workspace tabs absent or duplicated');check(navigation.getBoundingClientRect().bottom<container.querySelector('[data-student-supervision-overview]')!.getBoundingClientRect().top,'Tabs must be above the appointment card');for(const label of ['My supervisors','Applications','Research changes'])check([...navigation.querySelectorAll('a')].some(a=>a.textContent?.trim()===label),'Missing tab '+label);
  const card=container.querySelector('[data-student-appointment-columns]')!.children[0].firstElementChild!;check(card.contains(button('View approved application')!),'Approved request is detached from appointment card');check(card.querySelector('button')!.getBoundingClientRect().top<container.querySelector('[aria-label="Primary supervisor"]')!.getBoundingClientRect().top,'Approved action is not in card header');
  check(container.textContent?.includes('Dr Proposed Replacement'),'Pending replacement disappeared');
  check(!container.textContent?.includes('Documents for a new application')&&requirementReads===0,'Confirmed state requests irrelevant document guidance');geometry();
  await click('View approved application');await until(()=>container.textContent?.includes('Original approved submission title'));
  check(container.textContent?.includes(currentApplication.researchAbstract),'Original submission is not traceable');
  check(!button('Cancel request'),'Approved request permits cancellation');
  await click('Back to My supervisors');await until(()=>!!button('View approved application'));
  check(container.textContent?.includes('Current saved title'),'Back did not restore current profile');geometry();
});
await scenario('A missing or ended original application does not produce a misleading approved link',async()=>{
  for(const rows of [[],[{...currentApplication,appointmentLifecycle:{...currentApplication.appointmentLifecycle!,status:'ENDED' as const}}]]){
    supervisorService(rows);await mount(<SupervisorRoute/>);await until(()=>!!container.querySelector('[data-student-supervision-overview]'));
    check(!button('View approved application'),'Legacy appointment has a fabricated approved application');check(container.textContent?.includes('Dr Nadia Hassan'),'Legacy current supervisor hidden');geometry();
  }
});
await scenario('Pending supervisor application shows progress guidance instead of new-application requirements',async()=>{
  supervisorService([{...currentApplication,id:99,status:'PENDING_COORDINATOR',appointmentLifecycle:null}],null);
  await mount(<SupervisorRoute/>);await until(()=>!!container.querySelector('[data-student-supervision-overview]'));
  check(container.textContent?.includes('Follow your application'),'Missing pending guidance');check(!container.textContent?.includes('Documents for a new application')&&requirementReads===0,'Pending student receives new-application guidance');check(!!button('View request'),'Pending request is not accessible');geometry();
});
await scenario('Supervisor and Panel overviews share reading order, heading scale and guidance placement',async()=>{
  supervisorService([currentApplication]);await mount(<SupervisorRoute/>);await until(()=>!!button('View approved application'));
  const supervisorHeading=[...container.querySelectorAll('h2')].find(e=>e.textContent==='My supervisors')!;
  const scale=getComputedStyle(supervisorHeading).fontSize;check(!container.querySelector('[aria-label="Academic context"]'),'Loose supervisor metadata remains');check(container.textContent?.includes('What happens next'),'Missing shared guidance heading');geometry();
  await mount(<StudentPanelAppointmentOverview appointment={appointment}/>);
  const panelHeading=[...container.querySelectorAll('h2')].find(e=>e.textContent==='My panel')!;
  check(getComputedStyle(panelHeading).fontSize===scale,'Mismatched section scales');geometry();
});

await scenario('Panel opens its own approved nomination and returns to the unchanged overview',async()=>{
  window.fetch=async(input,init)=>{check(String(input).endsWith('/appointments/panel/student/')&&(!init?.method||init.method==='GET'),'Unexpected private endpoint or academic write');return Response.json(appointment);};
  await mount(<StudentPanelAppointment/>,'/?panelRequest=71');
  await until(()=>container.textContent?.includes('PN-71'));check(container.textContent?.includes('Dr Nadia Hassan')&&container.textContent?.includes('Coordinator approved'),'Incomplete public source record');
  check(!container.textContent?.includes('DEMO-L071')&&!container.textContent?.includes('Audit history'),'Private staff details in source record');
  await click('Back to My panel');await until(()=>!!container.querySelector('[data-student-panel-overview]'));geometry();
});
await scenario('A foreign nomination reference cannot display the current approved record and retains a back action',async()=>{
  window.fetch=async()=>Response.json(appointment);
  function WrongRecord(){const navigate=useNavigate();React.useEffect(()=>{navigate('/?panelRequest=999');},[]);return <StudentPanelAppointment/>;}
  await mount(<WrongRecord/>);await until(()=>container.textContent?.includes('Approved nomination not available'));
  check(!container.textContent?.includes('PN-71'),'Foreign reference silently opened a different record');await click('Back to My panel');await until(()=>!!container.querySelector('[data-student-panel-overview]'));geometry();
});

await mount(<StudentPanelAppointmentOverview appointment={appointment} onShowFAQChatbot={()=>{}}/>);
parent.postMessage({type:'student-panel-overview-results',width:innerWidth,results},location.origin);
