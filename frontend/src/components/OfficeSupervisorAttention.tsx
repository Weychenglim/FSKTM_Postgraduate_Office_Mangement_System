import React,{useEffect,useState} from 'react';
import { useReturnToFocusReload } from '../utils/returnToFocus';
import { formatRequestStageWaiting } from '../utils/requestStageWaiting';
import {useListState} from './ListState';
import {PortalButton} from './PortalPrimitives';
import {LoadingState,ErrorState} from './StateViews';
import {WorkspaceSectionHeader} from './RequestWorkspacePrimitives';
import {CoordinatorDataTable,CoordinatorFiltersBar,CoordinatorPageFooter,useCoordinatorFilters,useCoordinatorPage} from './CoordinatorBrowsePrimitives';
import {officeSupervisorApi,type OfficeAttentionCategory,type OfficeAttentionSummary,type OfficeAttentionRow,type OfficeAttentionStudent,type OfficeAttentionRequest,type OfficeAttentionWorkload} from '../services/staffSupervisorWorkspaceApi';
import {requestStatusLabel} from '../utils/lecturerRequests';
import {formatMalaysiaDate} from '../utils/malaysiaDateTime';
import {exportOfficeBrowsePage} from '../utils/officeSupervisorExports';
import type {CsvColumn} from '../utils/csvExport';
import { Select } from './Select';

const categories = [
  {key:'students',title:'Without supervisor',unit:'students',description:'Active students without an active primary supervisor.',count:'withoutSupervisor'},
  {key:'waiting',title:'Waiting requests',unit:'requests',description:'Ongoing appointment, research and transfer requests.',count:'waitingRequests'},
  {key:'workload',title:'Workload concerns',unit:'lecturers',description:'Current capacity limits and missing configuration.',count:'workloadConcerns'},
] as const;
const workloadReasons:Record<string,string>={near_limit:'Near capacity limit',full:'At capacity',over_capacity:'Above capacity limit',not_configured:'Capacity not configured'};
export const officeRequestKindLabel=(kind:OfficeAttentionRequest['kind'])=>({primary:'Primary supervisor',supporting:'Supporting supervisor',research:'Research change',transfer:'Programme transfer'})[kind];
export const officeAttentionStatusLabel=(status:string)=>status==='PENDING_SUPERVISOR'?'Awaiting Supervisor review':requestStatusLabel(status);
const workloadReason=(row:OfficeAttentionWorkload)=>workloadReasons[row.reason]??row.reason;
const studentReason=(row:OfficeAttentionStudent)=>row.pendingStatus?'Application in progress':'No ongoing application';
type TableProps={category:OfficeAttentionCategory;rows:OfficeAttentionRow[];onStudent:(matric:string)=>void;onRequest:(row:OfficeAttentionRequest)=>void;onWorkload:(id:string)=>void};
export function OfficeAttentionTable({category,rows,onStudent,onRequest,onWorkload}:TableProps) {
  if(category==='students')return <CoordinatorDataTable label="Students without a primary supervisor" columns={['Student','Programme','Intake semester','Application progress','Action']} rows={(rows as OfficeAttentionStudent[]).map(row=>({key:row.id,cells:[<><p>{row.studentName}</p><p className="card-caption mt-1">{row.matricNo}</p></>,row.programme||'Not recorded',row.semester||'Not recorded',<><p>{studentReason(row)}</p>{row.pendingStatus?<p className="card-caption mt-1">{requestStatusLabel(row.pendingStatus)}</p>:null}</>,<div className="flex flex-wrap justify-end gap-2"><PortalButton size="sm" onClick={()=>onStudent(row.matricNo)}>View student</PortalButton>{row.applicationId&&row.pendingStatus?<PortalButton size="sm" onClick={()=>onRequest({key:`primary-${row.applicationId}`,id:row.applicationId!,kind:'primary',studentId:row.id,studentName:row.studentName,matricNo:row.matricNo,programme:row.programme,candidateName:'',status:row.pendingStatus!,submittedAt:'',waitingDays:null,waitingOn:''})}>View request</PortalButton>:null}</div>]}))}/>;
  if(category==='workload')return <CoordinatorDataTable label="Supervisor workload concerns" columns={['Supervisor','Department','Current load','Configured limit','Reason for attention','Action']} rows={(rows as OfficeAttentionWorkload[]).map(row=>({key:row.id,cells:[<><p>{row.lecturerName}</p><p className="card-caption mt-1">{row.lecturerId}</p></>,row.department||'Not recorded',row.currentStudents,row.workloadLimit==null||row.capacityState==='NOT_CONFIGURED'?'Not configured':row.workloadLimit,workloadReason(row),<PortalButton size="sm" onClick={()=>onWorkload(row.lecturerId)}>View workload</PortalButton>]}))}/>;
  return <CoordinatorDataTable label="Requests waiting for review" columns={['Student','Request type','Programme','Waiting on','Waiting at this stage','Action']} rows={(rows as OfficeAttentionRequest[]).map(row=>({key:row.key,cells:[<><p>{row.studentName}</p><p className="card-caption mt-1">{row.matricNo}</p></>,officeRequestKindLabel(row.kind),row.programme,<><p>{row.waitingOn||requestStatusLabel(row.status)}</p>{row.candidateName&&['Supervisor','Supporting lecturer'].includes(row.waitingOn)?<p className="card-caption mt-1">{row.candidateName}</p>:null}</>,formatRequestStageWaiting(row.status,row.waitingDays),<PortalButton size="sm" onClick={()=>onRequest(row)}>View request</PortalButton>]}))}/>;
}

function attentionColumns(category:OfficeAttentionCategory):CsvColumn<OfficeAttentionRow>[] {
  if(category==='workload')return [
    {header:'Staff number',value:row=>(row as OfficeAttentionWorkload).lecturerId},
    {header:'Supervisor',value:row=>(row as OfficeAttentionWorkload).lecturerName},
    {header:'Department',value:row=>(row as OfficeAttentionWorkload).department},
    {header:'Current load',value:row=>(row as OfficeAttentionWorkload).currentStudents},
    {header:'Configured limit',value:row=>(row as OfficeAttentionWorkload).workloadLimit},
    {header:'Capacity state',value:row=>(row as OfficeAttentionWorkload).capacityState},
    {header:'Reason',value:row=>workloadReason(row as OfficeAttentionWorkload)},
  ];
  const common:CsvColumn<OfficeAttentionRow>[]=[
    {header:'Matric number',value:row=>(row as OfficeAttentionStudent|OfficeAttentionRequest).matricNo},
    {header:'Student',value:row=>(row as OfficeAttentionStudent|OfficeAttentionRequest).studentName},
    {header:'Programme',value:row=>(row as OfficeAttentionStudent|OfficeAttentionRequest).programme},
  ];
  return category==='students'?[...common,
    {header:'Intake semester',value:row=>(row as OfficeAttentionStudent).semester},
    {header:'Application progress',value:row=>studentReason(row as OfficeAttentionStudent)},
    {header:'Current stage',value:row=>(row as OfficeAttentionStudent).pendingStatus},
  ]:[...common,
    {header:'Request type',value:row=>officeRequestKindLabel((row as OfficeAttentionRequest).kind)},
    {header:'Request ID',value:row=>(row as OfficeAttentionRequest).id},
    {header:'Submitted',value:row=>(row as OfficeAttentionRequest).submittedAt?formatMalaysiaDate((row as OfficeAttentionRequest).submittedAt):''},
    {header:'Waiting on',value:row=>(row as OfficeAttentionRequest).waitingOn},
    {header:'Current stage',value:row=>(row as OfficeAttentionRequest).status},
    {header:'Waiting days',value:row=>(row as OfficeAttentionRequest).waitingDays},
  ];
}

function OfficeAttentionBrowse({category,refreshVersion,capacitySemester,onStudent,onRequest,onWorkload}:Omit<TableProps,'rows'>&{refreshVersion:number;capacitySemester?:OfficeAttentionSummary['capacitySemester']}) {
  const initialSort=category==='students'?'no_request':category==='waiting'?'waiting':'name';
  const f=useCoordinatorFilters(`office-attention:${category}`,initialSort);
  const result=useCoordinatorPage(officeSupervisorApi.attention,{...f.params,category},refreshVersion);
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState<string|null>(null),[exportNotice,setExportNotice]=useState<string|null>(null);
  const noun=categories.find(item=>item.key===category)!.unit;
  const exportRecords=async()=>{
    if(exporting)return;
    setExporting(true);setExportError(null);setExportNotice(null);
    try{const count=await exportOfficeBrowsePage(`supervisor_attention_${category}.csv`,officeSupervisorApi.attention,{...f.params,category},attentionColumns(category));setExportNotice(`Exported ${count} matching ${count===1?noun.slice(0,-1):noun}.`);}
    catch(error){setExportError(error instanceof Error?error.message:'Records could not be exported.');}
    finally{setExporting(false);}
  };
  const description=category==='students'?'Students with no active primary supervisor. Applications in progress are shown separately from students with no ongoing application.'
    :category==='waiting'?'Monitor the current reviewer and calendar days at that stage. Waiting time does not imply an overdue request.'
    :capacitySemester===undefined?'Current-semester supervision capacity, including primary and supporting appointments.'
    :capacitySemester?`Capacity for ${capacitySemester.label}. Current load includes primary and supporting appointments.`:'No active academic semester. Capacity configuration needs review.';
  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <WorkspaceSectionHeader title={categories.find(item=>item.key===category)!.title} description={description} actions={<PortalButton size="sm" disabled={result.loading||!!result.error||exporting} isLoading={exporting} onClick={()=>void exportRecords()}>Export matching records</PortalButton>}/>
    {category==='workload'?<div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <label className="form-label">Find a supervisor<input className="form-control form-control-sm mt-1" type="search" placeholder="Name, staff number or department" value={f.q} onChange={e=>f.change(f.setQ)(e.target.value)}/></label>
      <label className="form-label">Reason<Select className="form-control form-control-sm mt-1" value={f.status} onChange={e=>f.change(f.setStatus)(e.target.value)}><option value="">All reasons</option>{Object.entries(workloadReasons).map(([value,label])=><option value={value} key={value}>{label}</option>)}</Select></label>
      <label className="form-label">Sort by<Select className="form-control form-control-sm mt-1" value={f.sort} onChange={e=>{f.setSort(e.target.value);f.setPage(1);}}><option value="name">Supervisor name</option><option value="load">Highest load first</option></Select></label>
    </div><div className="mt-3 flex justify-end"><PortalButton size="sm" onClick={f.reset}>Clear filters</PortalButton></div></div>
    :<CoordinatorFiltersBar filters={category==='students'?{...f,type:f.status,setType:f.setStatus}:f} facets={result.data?.facets} requests={category==='waiting'} includeStatusAndDates={category==='waiting'} searchLabel="Find a student" searchPlaceholder="Student name or matric number"
      typeLabel={category==='students'?'Application progress':'Request type'} typeOptions={category==='students'?[['','All students'],['none','No ongoing application'],['in_progress','Application in progress']]:[['all','All types'],['primary','Primary supervisor'],['supporting','Supporting supervisor'],['research','Research change'],['transfer','Programme transfer']]}
      semesterLabel={category==='students'?'Intake semester':'Semester'}
      statusLabel={officeAttentionStatusLabel}
      sortOptions={category==='students'?[['no_request','No ongoing application first'],['name','Student name']]:undefined}/>}
    {exportError?<p role="alert" className="card-description text-rose-700">{exportError}</p>:null}{exportNotice?<p role="status" className="card-description">{exportNotice}</p>:null}
    {result.loading?<LoadingState message="Loading attention records…"/>:result.error?<ErrorState message={result.error} onRetry={result.reload}/>:!result.data?.results.length?<p role="status" className="card-description py-6 text-center">No matching {noun}. Adjust the filters or choose another category.</p>:<OfficeAttentionTable category={category} rows={result.data.results} onStudent={onStudent} onRequest={onRequest} onWorkload={onWorkload}/>}
    {!result.loading&&!result.error?<CoordinatorPageFooter data={result.data} filters={f} noun={noun}/>:null}
  </section>;
}

export function OfficeSupervisorAttention({refreshVersion=0,onStudent,onRequest,onWorkload}:Omit<TableProps,'category'|'rows'>&{refreshVersion?:number}) {
  const [category,setCategory]=useListState<OfficeAttentionCategory>('office-attention','category','students');
  const [summary,setSummary]=useState<OfficeAttentionSummary|null>(null),[summaryError,setSummaryError]=useState<string|null>(null),[summaryLoading,setSummaryLoading]=useState(true),[retry,setRetry]=useState(0);
  useReturnToFocusReload(() => setRetry(value => value + 1), !summaryLoading);
  useEffect(()=>{let active=true;setSummaryLoading(true);setSummaryError(null);officeSupervisorApi.attentionSummary().then(value=>{if(active)setSummary(value);}).catch(error=>{if(active){setSummary(null);setSummaryError(error instanceof Error?error.message:'Attention counts could not be loaded.');}}).finally(()=>{if(active)setSummaryLoading(false);});return()=>{active=false;};},[refreshVersion,retry]);
  return <div className="space-y-5">
    <p className="card-description">Choose a category to see the records behind it. Counts cover all programmes; table filters apply below.</p>
    <div role="group" aria-label="Records needing attention" className="grid gap-3 sm:grid-cols-3">{categories.map(item=><button type="button" key={item.key} aria-pressed={category===item.key} onClick={()=>setCategory(item.key)} className={`space-y-2 rounded-2xl border bg-white p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy ${category===item.key?'border-brand-navy shadow-sm':'border-slate-200 hover:border-slate-400'}`}><span className="card-value block">{item.title}</span><span className="card-metric block">{summaryLoading?'…':summary?summary[item.count]:'—'} <span className="card-caption font-medium">{summary&&!summaryLoading&&summary[item.count]===1?item.unit.slice(0,-1):item.unit}</span></span><span className="card-description block">{item.description}</span></button>)}</div>
    {summaryError?<ErrorState message={`Attention counts unavailable. ${summaryError}`} onRetry={()=>setRetry(value=>value+1)}/>:null}
    <OfficeAttentionBrowse key={category} category={category} refreshVersion={refreshVersion} capacitySemester={summary?.capacitySemester} onStudent={onStudent} onRequest={onRequest} onWorkload={onWorkload}/>
  </div>;
}
