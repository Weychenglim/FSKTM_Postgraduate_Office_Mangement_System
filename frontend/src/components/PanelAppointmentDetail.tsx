import React from 'react';
import type {PanelRecord} from '../types';
import {RecordPage} from './RecordPage';
import {RequestMetadata,ViewStudentRecordAction} from './RequestDetailPrimitives';
import {PanelRecommendationDetail,PanelAppointmentRecordCard,panelRecordMetadata} from './PanelRecordDetails';
import {toOfficePanelPresentation} from '../utils/panelPresentation';
import {AppointmentEndControl} from './AppointmentEndControl';
import {endPanelAppointment} from '../services';
import {completeDecision} from '../utils/decisionSubmission';
import {PanelAssignmentDetails,PanelAppointmentOverview} from './PanelAssignmentDetails';
interface PanelAppointmentDetailProps {backLabel?:string;onBack:()=>void;record?:PanelRecord|null;onLifecycleChanged?:()=>Promise<void>|void;onOpenStudent?:(id:string)=>void;overview?:boolean;appointmentView?:boolean;onViewRequest?:(id:string)=>void;onViewAppointment?:(id:number)=>void;}
export function PanelAppointmentDetail({backLabel='Back to Panel appointments',onBack,record,onLifecycleChanged,onOpenStudent,overview=false,appointmentView=false,onViewRequest,onViewAppointment}:PanelAppointmentDetailProps){
  if(!record)return <RecordPage title="Panel appointment" backLabel={backLabel} onBack={onBack}><p className="card-description">Panel record unavailable.</p></RecordPage>;
  const presentation=toOfficePanelPresentation(record);
  const reload=onLifecycleChanged?async()=>{await onLifecycleChanged();}:undefined;
  const lifecycle=presentation.appointmentLifecycle;
  if(overview){
    return <RecordPage title="Panel appointment overview" backLabel={backLabel} onBack={onBack}>
      <PanelAppointmentOverview record={presentation} onOpenStudent={onOpenStudent} onViewRequest={onViewRequest} onViewAppointment={onViewAppointment}/>
    </RecordPage>;
  }
  if(appointmentView)return <RecordPage title="Panel appointment" backLabel={backLabel} onBack={onBack}><PanelAssignmentDetails onViewRequest={onViewRequest} record={presentation} contextAction={<ViewStudentRecordAction studentId={record.id} onOpen={onOpenStudent}/>} actions={lifecycle?.status==='ACTIVE'?<AppointmentEndControl buttonLabel="End panel appointment" label="Panel appointment" context={<>{record.studentName} · {record.programme}</>} decisionKey={lifecycle.appointmentId} onReload={reload} onSubmit={(outcome,reason)=>completeDecision(()=>endPanelAppointment(lifecycle.appointmentId,outcome,reason),reload)}/>:undefined}/></RecordPage>;
  return <RecordPage title={presentation.status==='NOT_SUBMITTED'?'Student Panel record':'Panel recommendation'} metadata={<RequestMetadata {...panelRecordMetadata(presentation)}/>} backLabel={backLabel} onBack={onBack}>
    <PanelRecommendationDetail record={presentation} contextAction={<ViewStudentRecordAction studentId={record.id} onOpen={onOpenStudent}/>} administration={<PanelAppointmentRecordCard compact record={presentation} actions={lifecycle?.status==='ACTIVE'?<AppointmentEndControl buttonLabel="End panel appointment" label="Panel appointment" context={<>{record.studentName} · {record.programme}</>} decisionKey={lifecycle.appointmentId} onReload={reload} onSubmit={(outcome,reason)=>completeDecision(()=>endPanelAppointment(lifecycle.appointmentId,outcome,reason),reload)}/>:undefined}/>}/>
  </RecordPage>;
}
