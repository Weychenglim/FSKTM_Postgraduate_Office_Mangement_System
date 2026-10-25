// Isolated visual composition of production components with fictional fixture data.
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import {PageHeader} from '../../frontend/src/components/PortalPrimitives';
import {SupervisorWorkspaceNavigation} from '../../frontend/src/components/SupervisorWorkspaceNavigation';
import {PanelWorkspaceNavigation} from '../../frontend/src/components/PanelWorkspaceNavigation';
import {PanelLecturerSummaryCards} from '../../frontend/src/components/PanelLecturerSummaryCards';
import {StudentPanelAppointmentOverview} from '../../frontend/src/components/StudentPanelAppointment';
import {RequestSummaryCard, ResearchDetailsCard} from '../../frontend/src/components/AppointmentRequestSections';
import {OfficeSupervisorAttention} from '../../frontend/src/components/OfficeSupervisorAttention';
import {OfficePanelAttention} from '../../frontend/src/components/OfficePanelAttention';
import {StaffSupervisorBrowseContext} from '../../frontend/src/components/StaffSupervisorBrowseContext';
import {WorkloadMonitoringSummary} from '../../frontend/src/components/WorkloadMonitoringSummary';
import {OfficeDashboardLayout} from '../../frontend/src/components/OfficeDashboardLayout';
import {StudentSupervisorsOverview} from '../../frontend/src/components/SupervisoryTeamManagement';
import {ResearchAmendmentCard, researchRequestMetadata} from '../../frontend/src/components/ResearchAmendments';
import type {ResearchAmendment} from '../../frontend/src/services/researchAmendmentsApi';
import {RecordPage} from '../../frontend/src/components/RecordPage';
import {RequestMetadata} from '../../frontend/src/components/RequestDetailPrimitives';
import {LecturerResearchWorkspace} from '../../frontend/src/components/LecturerResearchWorkspace';

const role = new URLSearchParams(location.search).get('role') || 'lecturer';
window.fetch = async () => Response.json({withoutSupervisor:12,withoutPanel:12,waitingRequests:7,workloadConcerns:3,capacitySemester:{id:1,label:'2026-2027-S1'},results:[],total:0,page:1,pageSize:10,pageCount:1,facets:{programmes:['Master of Computer Science'],semesters:['2026-2027-S1'],statuses:[]}});
if(role.startsWith('profile-')) {
  const profile={programme:'Master of Artificial Intelligence (Coursework)',title:'Explainable AI for student support recommendations',abstract:'Fictional demonstration research using synthetic learning-support data. Compare interpretable models, explain recommendations and review usability. No real student data is used.'};
  window.fetch=async input=>Response.json(new URL(String(input),location.origin).pathname.endsWith('/options/')?{students:[{id:1,name:'Sample Student',matricNo:'PG001',programme:profile.programme}],programmes:[],profile:{...profile,studentId:1,revision:2},canSubmitResearch:false,canCorrect:role!=='profile-student',canTransfer:role!=='profile-student'}:{requests:[],revisions:[{id:1,revision:0,kind:'BASELINE',before:{programme:'',title:'',abstract:''},after:profile,actorName:'Initial record',createdAt:'2026-10-09T12:59:00Z',reason:'',requestId:null},{id:2,revision:2,kind:'RESEARCH',before:{...profile,abstract:'Original fictional abstract.'},after:profile,actorName:'Dr Amina Rahman',createdAt:'2026-10-14T07:04:00Z',reason:'Clarify explanation comparison.',requestId:1}]});
  if(role.endsWith('-history'))setTimeout(()=>document.querySelector<HTMLElement>('details[aria-label="Research history"] > summary')?.click(),700);
}
const unavailable = role==='lecturer-unavailable';
const lecturer = role==='lecturer'||unavailable;
function ResearchRequestPreview() {
  const pending = role==='research-pending';
  const original='Fictional demonstration research using synthetic learning-support data. Compare interpretable models, explain recommendations and review usability. No real student data is used.';
  const submitted={id:1,action:'SUBMITTED',actorName:'Sample Student',actorRole:'Student',previousStatus:'',newStatus:'PENDING_SUPERVISOR',reason:'',retainTeam:false,createdAt:'2026-10-09T12:59:00Z'};
  const row:ResearchAmendment={id:1,kind:'RESEARCH',status:pending?'PENDING_SUPERVISOR':'APPROVED',studentId:1,studentName:'Sample Student',matricNo:'PG001',sourceProgramme:'Master of Artificial Intelligence (Coursework)',destinationProgramme:'',before:{programme:'Master of Artificial Intelligence (Coursework)',title:'Explainable learning support',abstract:original},after:{programme:'Master of Artificial Intelligence (Coursework)',title:'Explainable learning support',abstract:original+' The proposed revision adds a comparison of explanation clarity across two prototype layouts.'},reason:'Add a comparison of explanation clarity for supervisor review.',createdAt:submitted.createdAt,updatedAt:'2026-10-14T07:04:00Z',stageLabel:pending?'Awaiting Supervisor review':'Approved',canDecide:pending,canCancel:false,requiresTeamAcknowledgement:false,teamSnapshot:{primary:null,coSupervisors:[],panel:[]},unfinishedTaskCount:null,events:role==='research-historical'?[]:pending?[submitted]:[submitted,{...submitted,id:2,action:'APPROVE',actorName:'Dr Amina Rahman',actorRole:'Lecturer',previousStatus:'PENDING_SUPERVISOR',newStatus:'APPROVED',createdAt:'2026-10-14T07:04:00Z'}]};
  return <RecordPage title="Research change request" backLabel="Back to research changes" onBack={()=>{}} metadata={<RequestMetadata {...researchRequestMetadata(row)}/>}><ResearchAmendmentCard row={row} busy={false} lecturerView presentation="detail" onAction={()=>{}} onViewProfile={()=>{}}/></RecordPage>;
}
function Preview() {
  const [section,setSection] = useState<'requests'|'supervisees'|'appointments'|'attention'>('requests');
  return <MemoryRouter initialEntries={[role.startsWith('profile-')?'/supervisor-appointments/research-changes/profile?profileStudent=1':'/supervisor-appointments']}><main className="mx-auto max-w-6xl space-y-6 p-5 md:p-8">
    {role.startsWith('profile-')?<RecordPage title="Research profile" backLabel="Back to Research records" onBack={()=>{}}><LecturerResearchWorkspace role={role==='profile-student'?'Student':'Office Staff/Admin'} routeView="profile" hideHeader/></RecordPage>:role.startsWith('research-')?<ResearchRequestPreview/>:<PageHeader title={role==='office'||role==='student-supervisor'?'Supervisor Appointments':role==='coordinator'?'Supervisor appointment request':role==='workload'?'Panel workload':'Panel Appointments'} subtitle="Manage appointments for the current academic semester."/>}
    {lecturer?<><PanelWorkspaceNavigation role="lecturer" section={section} onChange={setSection}/><PanelLecturerSummaryCards workload={{workloadCount:4,currentStudents:4,confirmedAppointments:2,pendingNominations:2,workloadLimit:10,availableSlots:6,capacityState:unavailable?'TEMPORARILY_UNAVAILABLE':'AVAILABLE',selectable:!unavailable,unavailableUntil:unavailable?'2026-12-01':undefined,semesterCode:'2026-2027-S1',capacityPlanVersion:2}} reviewCount={3} awaitingCoordinatorCount={1}/></>:null}
    {role==='office'?<StaffSupervisorBrowseContext.Provider value="Office Staff/Admin"><SupervisorWorkspaceNavigation role="Office Staff/Admin"/><OfficeSupervisorAttention refreshVersion={0} onStudent={()=>{}} onRequest={()=>{}} onWorkload={()=>{}}/></StaffSupervisorBrowseContext.Provider>:null}
    {role==='office-panel'?<StaffSupervisorBrowseContext.Provider value="Office Staff/Admin"><PanelWorkspaceNavigation role="office" section="attention" onChange={setSection}/><OfficePanelAttention onRecord={()=>{}} onWorkload={()=>{}}/></StaffSupervisorBrowseContext.Provider>:null}
    {role==='workload'?<OfficeDashboardLayout enabled><WorkloadMonitoringSummary kind="panel" records={[]}/></OfficeDashboardLayout>:null}
    {role==='student-supervisor'?<><SupervisorWorkspaceNavigation role="Student"/><StudentSupervisorsOverview workspace={{teams:[{studentId:1,studentName:'Sample Student',matricNo:'PG001',programme:'Master of Computer Science',studentStatus:'ACTIVE',primarySupervisor:{id:1,name:'Dr Amina Rahman'},appointments:[],nominations:[],research:{title:'',area:'',abstract:''},canNominate:false}],appointments:[],nominations:[]}}/></>:null}
    {role==='student'?<StudentPanelAppointmentOverview appointment={{status:'CONFIRMED',readinessState:'CONFIRMED',studentName:'Sample Student',studentId:'PG001',programme:'Master of Computer Science',semester:'2026-2027-S1',researchTitle:'Explainable models for student learning',supervisorName:'Dr Amina Rahman',panelMemberName:'Dr Daniel Tan',panelMemberId:'P001',panelMemberDepartment:'Department of Computing',panelMemberEmail:'panel@example.test',appointmentDate:'10 Oct 2026',researchProfile:null}}/>:null}
    {role==='coordinator'?<SupervisorWorkspaceNavigation role="Programme Coordinator"/>:null}
    {role==='coordinator'||lecturer?<><RequestSummaryCard studentName="Sample Student" studentId="PG001" programme="Master of Computer Science" semester="2026-2027-S1" participants={[{label:'Primary supervisor',value:'Dr Amina Rahman'},{label:'Proposed Panel member',value:'Dr Daniel Tan'}]}/><ResearchDetailsCard title="Explainable models for student learning" area="Artificial intelligence" abstract="Investigating how explainable models can help postgraduate students understand feedback and improve their learning outcomes." source="submitted"/></>:null}
  </main></MemoryRouter>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
setTimeout(()=>{
  const overflow=document.documentElement.scrollWidth>innerWidth;
  const badIcons=[...document.querySelectorAll('svg')].filter(svg=>svg.getAttribute('aria-hidden')!=='true');
  const clipped=[...document.querySelectorAll<HTMLElement>('article, nav a, nav button, [role="group"] > button, h1, h2, h3')].filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>node.textContent?.trim());
  const attentionIconTops=innerWidth>=640?[...document.querySelectorAll('[role="group"][aria-label$="needing attention"] > button > span:first-child')].map(node=>Math.round(node.getBoundingClientRect().top)):[];
  const profileHistory=document.querySelector<HTMLDetailsElement>('details[aria-label="Research history"]');
  parent.postMessage({type:'appointment-polish-checks',role,width:innerWidth,overflow,clipped,attentionIconTops,profileHistoryOpen:profileHistory?.open,decorativeIcons:document.querySelectorAll('svg[aria-hidden="true"]').length,unhiddenIcons:badIcons.length},location.origin);
},1200);
