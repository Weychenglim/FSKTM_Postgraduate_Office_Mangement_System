import React from 'react';
import type {PanelAssignment} from '../types';
import {RecordPage} from './RecordPage';
import {RequestMetadata,ViewStudentRecordAction} from './RequestDetailPrimitives';
import {PanelRecommendationDetail,PanelAppointmentRecordCard,panelRecordMetadata} from './PanelRecordDetails';
import {toAssignmentPanelPresentation} from '../utils/panelPresentation';
import {PortalButton} from './PortalPrimitives';
export function PanelAssignmentDetail({assignment,onBack,onOpenMarksEntry,onOpenStudent}:{assignment:PanelAssignment;onBack:()=>void;onOpenMarksEntry?:()=>void;onOpenStudent?:(id:string)=>void}){
  const record=toAssignmentPanelPresentation(assignment);
  return <RecordPage title="Panel assignment" backLabel="Back to My Panel students" onBack={onBack} metadata={<RequestMetadata {...panelRecordMetadata(record)}/> }>
    <PanelRecommendationDetail record={record} contextAction={<ViewStudentRecordAction studentId={record.studentId} onOpen={onOpenStudent}/>} administration={<PanelAppointmentRecordCard record={record} actions={onOpenMarksEntry?<PortalButton size="sm" onClick={onOpenMarksEntry}>Open Marks Entry</PortalButton>:undefined}/>}/>
  </RecordPage>;
}
