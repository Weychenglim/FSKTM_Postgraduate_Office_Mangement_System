// Actual Office workspaces with fictional, read-only HTTP fixtures.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import {OfficeDashboardLayout} from '../../frontend/src/components/OfficeDashboardLayout';
import {AdministrationDashboard} from '../../frontend/src/components/AdministrationDashboard';
import {AcademicSemesterManagement} from '../../frontend/src/components/AcademicSemesterManagement';
import {TimelineManagement} from '../../frontend/src/components/TimelineManagement';
import {OfficePeriodsManagement} from '../../frontend/src/components/OfficePeriodsManagement';
import {OfficeCapacityWorkspace} from '../../frontend/src/components/OfficeCapacityWorkspace';
import {WorkflowReconciliationCentre} from '../../frontend/src/components/WorkflowReconciliationCentre';

const role = new URLSearchParams(location.search).get('role') || 'tools-semesters';
const semester = {id:1,code:'2026-2027-S1',academicSession:'2026/2027',term:'SEMESTER_I',label:'Semester I 2026/2027',startsOn:'2026-10-01',endsOn:'2027-03-31',lifecycleStatus:'ACTIVE',effectiveStatus:'ACTIVE',isActive:true};
const timeline = {available:true,semester:'Semester I',session:'2026/2027',uploadedAt:'2026-10-01T00:00:00Z',semesterId:1,levels:[{level:'P1',entries:[{id:1,level:'P1',title:'Research checkpoint',detail:'Review research progress.',step:1,deadlineStart:'2026-10-20',deadlineEnd:'2026-10-30',targetRoles:['STUDENT'],status:'Active'}]}]};
const issue = {issueId:'programme-1',fingerprint:'preview-only',module:'SUPERVISOR_APPOINTMENTS',issueType:'PROGRAMME_MISMATCH',severity:'WARNING',repairability:'REPAIRABLE',title:'Programme mismatch',summary:'Review the programme.',recordType:'SUPERVISOR_APPLICATION',recordId:'1',programme:'Computer Science',studentId:'PG001',currentState:{},dependencies:[],navigation:{},suggestion:{}};
const requested: string[]=[];
const unexpected: string[]=[];
window.fetch = async (input, init) => {
  if (init?.method && init.method !== 'GET') throw Error('Preview supports reads only');
  const url = new URL(String(input),location.origin), path = url.pathname;
  requested.push(path);
  if(path.endsWith('/semesters/active/'))return Response.json({available:true,semester});
  if(path.endsWith('/academics/semesters/'))return Response.json([semester]);
  if(path.endsWith('/timeline/active/'))return Response.json(timeline);
  if(path.endsWith('/timeline/audit-logs/'))return Response.json({logs:[{id:1,actorName:'Sample Office administrator',action:'ENTRY_ADDED',createdAt:'2026-10-01T08:00:00Z',summary:'Added research checkpoint'}]});
  if(path.endsWith('/capacity-workspace/'))return Response.json({lecturers:[],baseline:{activeStudents:24,eligibleLecturers:12,studentsPerLecturer:2}});
  if(path.endsWith('/capacity-plans/'))return Response.json([]);
  if(path.endsWith('/operational-periods/'))return Response.json({periods:[],enforcement:{SUPERVISOR_APPLICATION:false,PANEL_RECOMMENDATION:false}});
  if(path.endsWith('/reconciliation/'))return Response.json({checkedAt:'2026-10-24T02:00:00Z',summary:{total:1,blocking:0,warnings:1,repairable:1,reviewRequired:0},count:1,page:1,pageSize:25,availableProgrammes:['Computer Science'],results:[issue]});
  if(path.endsWith('/attention/'))return Response.json({summary:[]});
  if(path.endsWith('/summary/'))return Response.json({pendingSupervisorRequests:0,pendingPanelApprovals:0,incompleteMarkEntries:0,backupMarkTasks:0});
  if(path.endsWith('/panel/workload/'))return Response.json([]);
  // Empty bounded reads used by period/evaluation selection.
  if(path.endsWith('/marks/periods/') || path.endsWith('/marks/evaluation-tasks/') || path.endsWith('/marks/programme-options/'))return Response.json([]);
  unexpected.push(path);throw Error('Unexpected fixture read: '+path);
};
const noop=()=>{};
const page=role==='tools-home'?<AdministrationDashboard onNavigateToTab={noop}/>:
  role==='tools-semesters'?<AcademicSemesterManagement onBack={noop}/>:
  role.startsWith('tools-calendar')?<TimelineManagement onBack={noop} onManageSemesters={noop}/>:
  role==='tools-periods'?<OfficePeriodsManagement onBack={noop} onManageSemesters={noop}/>:
  role==='tools-capacity'?<OfficeCapacityWorkspace onBack={noop}/>:
  <WorkflowReconciliationCentre onBack={noop}/>;
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/?semester=1']}><OfficeDashboardLayout enabled><main className="mx-auto max-w-6xl p-5 md:p-8">{page}</main></OfficeDashboardLayout></MemoryRouter>);
setTimeout(()=>{
  const label=role==='tools-calendar-entries'?'Entries':role==='tools-calendar-history'?'History':'';
  if(label)[...document.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent?.trim()===label)?.click();
},700);
setTimeout(()=>{
  const visible=(node:Element)=>node.getClientRects().length>0&&!node.closest('[hidden]');
  const clipped=[...document.querySelectorAll('h2,h3,.office-tool-section-heading,.capacity-policy-heading,[aria-label="Calendar views"] button')].filter(visible).filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>node.textContent?.trim());
  const expected=role==='tools-home'?'Office tools':role==='tools-semesters'?'Semester records':role==='tools-periods'?'Submission overview':role==='tools-capacity'?'Capacity limits':role==='tools-reconciliation'?'Issues to review':role==='tools-calendar-entries'?'Timeline entries':role==='tools-calendar-history'?'Recent timeline updates':'Semester schedule';
  const ready=[...document.querySelectorAll('h2,h3')].some(node=>visible(node)&&node.textContent?.trim()===expected);
  const newIcons=[...document.querySelectorAll('.office-tool-section-heading > div > span svg,.capacity-policy-heading h2 svg,.home-tool-group h3 svg,[aria-label="Calendar views"] svg')];
  parent.postMessage({type:'appointment-polish-checks',role,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,clipped:[...(ready?clipped:['Expected heading missing: '+expected,...requested]),...unexpected.map(path=>'Unexpected fixture read: '+path)],attentionIconTops:[],decorativeIcons:newIcons.length,unhiddenIcons:newIcons.filter(node=>node.getAttribute('aria-hidden')!=='true').length},location.origin);
},1800);
