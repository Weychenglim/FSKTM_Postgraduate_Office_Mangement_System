import {OfficePanelTools} from './OfficePanelTools';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router';
import type {PanelRecord,PanelWorkloadRecord} from '../types';
import {getPanelAppointments} from '../services';
import {getExactPanelRecord} from '../services/panelWorkspaceApi';
import {toOfficePanelPresentation,panelBrowseRecordKey,type PanelPresentation} from '../utils/panelPresentation';
import {useReturnToFocusReload} from '../utils/returnToFocus';
import {capacityStateLabel} from '../utils/lecturerCapacity';
import {getPanelWorkloadUtilization} from '../utils/panelWorkloadRecords';
import {PageHeader} from './PortalPrimitives';
import {RecordPage} from './RecordPage';
import {LoadingState,ErrorState} from './StateViews';
import {PanelAppointmentDetail} from './PanelAppointmentDetail';
import {PanelWorkloadMonitoring} from './PanelWorkloadMonitoring';
import {PanelWorkspaceNavigation,panelWorkspaceSection} from './PanelWorkspaceNavigation';
import {PanelBrowse} from './PanelBrowse';
import {PanelAssignmentsWorkspace} from './PanelAssignmentsWorkspace';
import {OfficePanelAttention} from './OfficePanelAttention';
import {StaffSupervisorBrowseContext} from './StaffSupervisorBrowseContext';
interface PanelAppointmentManagementProps {
 workloadBackLabel?:string;
 detailBackLabel?:string;routeView?:'list'|'detail'|'workload';routeRecordId?:string;
 onNavigateToList?:()=>void;onNavigateToWorkload?:(lecturerId?:string)=>void;
 onNavigateToRecord?:(id:string)=>void;onNavigateToDossier?:(id:string)=>void;onOpenCapacity?:()=>void;
}
export const PanelWorkloadSnapshotRow = ({ record: w }: { record: PanelWorkloadRecord }) => {
  const label = w.capacityState ? capacityStateLabel(w.capacityState) : w.availability;
  const tone = w.capacityState
    ? w.capacityState === 'AVAILABLE' ? 'available'
      : w.capacityState === 'FULL' || w.capacityState === 'OVER_CAPACITY' ? 'full'
      : w.capacityState === 'INELIGIBLE' ? 'neutral' : 'warning'
    : w.availability === 'Full Load' ? 'full' : w.availability === 'Near Limit' ? 'warning' : 'available';
  return (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-[11px] font-bold">
      <span className="card-description">{w.name}</span>
      <span className={`text-[9px] font-black ${
        tone === 'full' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' :
        tone === 'neutral' ? 'text-slate-500' : 'text-emerald-600'
      }`}>{label.toUpperCase()}</span>
    </div>
    <div className="flex items-center justify-between text-[10px] text-slate-450">
      <span className="card-description">{w.currentStudents} / {w.workloadLimit} reserved panel seats</span>
    </div>
    {w.capacityState === 'TEMPORARILY_UNAVAILABLE' && w.unavailableUntil && (
      <p className="card-description text-amber-700">Unavailable until {w.unavailableUntil}</p>
    )}
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${
        tone === 'full' ? 'bg-red-600' : tone === 'warning' ? 'bg-amber-500' :
        tone === 'neutral' ? 'bg-slate-400' : 'bg-emerald-500'
      }`} style={{ width: `${getPanelWorkloadUtilization(w)}%` }} />
    </div>
  </div>
  );
};


export function PanelAppointmentManagement({detailBackLabel='Back to Panel Appointments',workloadBackLabel,routeView='list',routeRecordId,onNavigateToList,onNavigateToWorkload,onNavigateToRecord,onNavigateToDossier,onOpenCapacity}:PanelAppointmentManagementProps){
 const [params,setParams]=useSearchParams();
 const section=panelWorkspaceSection('office',params.get('panelSection'));
 const [records,setRecords]=useState<PanelRecord[]>([]),[exact,setExact]=useState<PanelRecord|null>(null),[exactKey,setExactKey]=useState<string|null>(null),[loading,setLoading]=useState(routeView==='detail'||section!=='attention'),[error,setError]=useState<string|null>(null);
 const recordVersion=useRef(0);
 const loadRecords=useCallback(async(strict=false)=>{
  const version=++recordVersion.current;
  if(!strict){setLoading(true);setError(null);}
  try{if(routeView==='detail'&&routeRecordId){const row=await getExactPanelRecord(routeRecordId);if(version===recordVersion.current){setExact(row);setExactKey(routeRecordId);}}else{const rows=await getPanelAppointments();if(version===recordVersion.current)setRecords(rows);}}
  catch(reason){if(strict)throw reason;if(version===recordVersion.current){setError(reason instanceof Error?reason.message:'Panel records could not be loaded.');setExact(null);}}
  finally{if(version===recordVersion.current)setLoading(false);}
 },[routeView,routeRecordId]);
 useEffect(()=>{if(routeView==='detail'||routeView==='list'&&section!=='attention')void loadRecords();return()=>{recordVersion.current++;};},[loadRecords,routeView,section]);
 useReturnToFocusReload(loadRecords,routeView==='list'&&section!=='attention'&&!loading);
 const back=onNavigateToList??(()=>{});
 const open=(row:PanelPresentation)=>onNavigateToRecord?.(panelBrowseRecordKey(row,section==='appointments'?'appointments':'requests'));
 if(routeView==='workload')return <PanelWorkloadMonitoring onBack={back} onOpenCapacity={onOpenCapacity} initialLecturerId={params.get('lecturer')??undefined} backLabel={workloadBackLabel}/>;
 if(routeView==='detail')return loading||(!error&&exactKey!==routeRecordId)?<RecordPage title="Panel appointment detail" backLabel={detailBackLabel} onBack={back}><LoadingState message="Loading Panel appointment record…"/></RecordPage>:error?<RecordPage title="Panel appointment detail" backLabel={detailBackLabel} onBack={back}><ErrorState message={error} onRetry={()=>void loadRecords()}/></RecordPage>:<PanelAppointmentDetail overview={routeRecordId?.startsWith('profile-')} appointmentView={routeRecordId?.startsWith('appointment-')} onViewRequest={id=>onNavigateToRecord?.(`recommendation-${id}`)} onViewAppointment={id=>onNavigateToRecord?.(`appointment-${id}`)} record={exact} backLabel={detailBackLabel} onBack={back} onLifecycleChanged={()=>loadRecords(true)} onOpenStudent={onNavigateToDossier}/>;
 return <StaffSupervisorBrowseContext.Provider value="Office Staff/Admin"><div id="panel-module-root" className="space-y-6 text-left">
  <PageHeader title="Panel Appointments" subtitle="Monitor Panel nominations, appointments and records needing attention." actions={<OfficePanelTools onWorkload={()=>onNavigateToWorkload?.()}/>}/>
  <PanelWorkspaceNavigation role="office" section={section} onChange={value=>setParams(current=>{const next=new URLSearchParams(current);next.set('panelSection',value);next.delete('panelLecturer');return next;},{replace:true})}/>
  {section==='attention'?<OfficePanelAttention onRecord={id=>onNavigateToRecord?.(id)} onWorkload={id=>onNavigateToWorkload?.(id)}/>:loading?<LoadingState message="Loading Panel records…"/>:error?<ErrorState message={error} onRetry={()=>void loadRecords()}/>:section==='appointments'?<PanelAssignmentsWorkspace role="office" records={records.map(toOfficePanelPresentation)} onOpen={open}/>:<PanelBrowse scope="office-requests" title="Appointment requests" description="Monitor ongoing nominations and final request outcomes across programmes." records={records.map(toOfficePanelPresentation)} onOpen={open} exportable/>}
 </div></StaffSupervisorBrowseContext.Provider>;
}
