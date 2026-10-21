import React from 'react';
import type {PanelRecord} from '../types';
import {RecordPage} from './RecordPage';
import {RequestMetadata,ViewStudentRecordAction} from './RequestDetailPrimitives';
import {PanelRecommendationDetail,PanelAppointmentRecordCard,panelRecordMetadata} from './PanelRecordDetails';
import {toOfficePanelPresentation} from '../utils/panelPresentation';
import {AppointmentEndControl} from './AppointmentEndControl';
import {endPanelAppointment} from '../services';
import {completeDecision} from '../utils/decisionSubmission';
import {AppointmentAttentionOverview} from './AppointmentAttentionOverview';
interface PanelAppointmentDetailProps {backLabel?:string;onBack:()=>void;record?:PanelRecord|null;onLifecycleChanged?:()=>Promise<void>|void;onOpenStudent?:(id:string)=>void;overview?:boolean;onViewRequest?:(id:string)=>void;onViewAppointment?:(id:number)=>void;}
export function PanelAppointmentDetail({backLabel='Back to Panel appointments',onBack,record,onLifecycleChanged,onOpenStudent,overview=false,onViewRequest,onViewAppointment}:PanelAppointmentDetailProps){
  if(!record)return <RecordPage title="Panel appointment" backLabel={backLabel} onBack={onBack}><p className="card-description">Panel record unavailable.</p></RecordPage>;
  const presentation=toOfficePanelPresentation(record);
  const reload=onLifecycleChanged?async()=>{await onLifecycleChanged();}:undefined;
  const lifecycle=presentation.appointmentLifecycle;
  if(overview){
    const pending=['SUBMITTED_TO_PANEL','PENDING_COORDINATOR'].includes(presentation.status);
    const recommendationId=record.recommendationId??record.recommendation?.id;
    return <RecordPage title="Panel appointment overview" backLabel={backLabel} onBack={onBack}>
      <AppointmentAttentionOverview module="Panel" studentName={record.studentName} studentId={record.id} programme={record.programme}
        active={lifecycle?.status==='ACTIVE'} supervisor={record.supervisor} research={{title:record.researchTitle,area:record.researchArea,abstract:record.abstract}} onOpenStudent={onOpenStudent}
        onOpenAppointment={lifecycle&&onViewAppointment?()=>onViewAppointment(lifecycle.appointmentId):undefined}
        pendingRequest={pending?{status:presentation.status,candidate:presentation.recommendedMember,onOpen:recommendationId!=null&&onViewRequest?()=>onViewRequest(String(recommendationId)):undefined}:undefined}/>
    </RecordPage>;
  }
  return <RecordPage title={presentation.status==='NOT_SUBMITTED'?'Student Panel record':'Panel recommendation'} metadata={<RequestMetadata {...panelRecordMetadata(presentation)}/>} backLabel={backLabel} onBack={onBack}>
    <PanelRecommendationDetail record={presentation} contextAction={<ViewStudentRecordAction studentId={record.id} onOpen={onOpenStudent}/>} administration={<PanelAppointmentRecordCard record={presentation} actions={lifecycle?.status==='ACTIVE'?<AppointmentEndControl label="Panel appointment" context={<>{record.studentName} · {record.programme}</>} decisionKey={lifecycle.appointmentId} onReload={reload} onSubmit={(outcome,reason)=>completeDecision(()=>endPanelAppointment(lifecycle.appointmentId,outcome,reason),reload)}/>:undefined}/>}/>
  </RecordPage>;
}
