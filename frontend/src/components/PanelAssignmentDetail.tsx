import React, {useEffect,useState} from 'react';
import {getPanelAssignment} from '../services/appointmentsApi';
import {LoadingState,ErrorState} from './StateViews';
import {FilePenLine} from 'lucide-react';
import type {PanelAssignment} from '../types';
import {RecordPage} from './RecordPage';
import {ViewStudentRecordAction} from './RequestDetailPrimitives';
import {PanelAssignmentDetails} from './PanelAssignmentDetails';
import {toAssignmentPanelPresentation,panelRecordedDate} from '../utils/panelPresentation';
import {PortalButton} from './PortalPrimitives';
export function PanelAssignmentDetail({assignment,onBack,onOpenMarksEntry,onOpenStudent}:{assignment:PanelAssignment;onBack:()=>void;onOpenMarksEntry?:()=>void;onOpenStudent?:(id:string)=>void}){
  const [loaded,setLoaded]=useState<PanelAssignment|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(assignment.academicTeam !== undefined)return;
    let current=true;
    setLoaded(null);setError(null);
    getPanelAssignment(assignment.appointmentId).then(row=>{
      if(row.appointmentId!==assignment.appointmentId || row.studentId!==assignment.studentId)throw new Error('The returned assignment does not match this student.');
      if(current)setLoaded(row);
    }).catch(failure=>{if(current)setError(failure instanceof Error?failure.message:'Assignment details could not be loaded.');});
    return ()=>{current=false;};
  },[assignment.appointmentId,assignment.studentId,assignment.academicTeam,attempt]);
  const resolved=assignment.academicTeam !== undefined ? assignment : loaded?.appointmentId===assignment.appointmentId && loaded.studentId===assignment.studentId ? loaded : null;
  if(!resolved)return <RecordPage title="Panel assignment" backLabel="Back to My Panel students" onBack={onBack}>{error?<ErrorState message={error} onRetry={()=>setAttempt(value=>value+1)}/>:<LoadingState message="Loading assignment details…"/>}</RecordPage>;
  const presentation=toAssignmentPanelPresentation(resolved);
  const record={...presentation,appointmentDate:panelRecordedDate(resolved.appointmentDate) ?? presentation.appointmentDate};
  return <RecordPage title="Panel assignment" backLabel="Back to My Panel students" onBack={onBack}>
    <PanelAssignmentDetails academicTeam={resolved.academicTeam ?? null} record={record} contextAction={<ViewStudentRecordAction studentId={record.studentId} onOpen={onOpenStudent}/>} actions={onOpenMarksEntry?<PortalButton variant="primary" icon={FilePenLine} size="sm" onClick={onOpenMarksEntry}>Open Marks Entry</PortalButton>:undefined}/>
  </RecordPage>;
}
