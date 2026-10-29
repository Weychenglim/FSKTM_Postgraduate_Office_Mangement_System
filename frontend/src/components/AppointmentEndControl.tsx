import { PortalSelect } from './PortalSelect';
import React, {useState} from 'react';
import {CircleStop} from 'lucide-react';
import type {AppointmentEndOutcome} from '../types';
import type {DecisionOutcome} from '../utils/decisionSubmission';
import {PortalButton} from './PortalPrimitives';
import {DecisionDialog} from './DecisionDialog';

type DirectOutcome=Exclude<AppointmentEndOutcome,'REPLACED'>;
interface AppointmentEndControlProps {
  label:string; buttonLabel?:string; context?:React.ReactNode; decisionKey?:string|number; disabled?:boolean;
  onReload?:()=>Promise<unknown>;
  onSubmit:(outcome:DirectOutcome,reason:string)=>Promise<void|DecisionOutcome>;
}
export const AppointmentEndControl:React.FC<AppointmentEndControlProps>=({label,buttonLabel='End Appointment',context,decisionKey,disabled=false,onReload,onSubmit})=>{
  const [open,setOpen]=useState(false);
  const [outcome,setOutcome]=useState<DirectOutcome>('COMPLETED');
  const [reason,setReason]=useState('');
  return <>
    {!disabled ? <PortalButton variant="danger" icon={CircleStop} onClick={()=>setOpen(true)}>{buttonLabel}</PortalButton> : null}
    <DecisionDialog isOpen={open} decisionKey={decisionKey??label} title={`End ${label}?`} context={context}
      kind="confirmation" tone="danger" confirmLabel="End appointment" successMessage={`${label} ended.`}
      message="This ends the appointment immediately, releases its active workload and retires unfinished official Marks tasks. The recorded history remains available."
      dirty={!!reason.trim()||outcome!=='COMPLETED'} canConfirm={!!reason.trim()}
      onClose={()=>{setOpen(false);setReason('');setOutcome('COMPLETED');}} onReload={onReload}
      onConfirm={async()=>{if(!reason.trim())return false;return await onSubmit(outcome,reason.trim());}}>
      <label className="form-label block">Appointment outcome<PortalSelect value={outcome} onChange={event=>setOutcome(event.target.value as DirectOutcome)} className="form-control form-control-md mt-2"><option value="COMPLETED">Completed</option><option value="WITHDRAWN">Withdrawn</option><option value="OTHER">Other</option></PortalSelect></label>
      <label className="form-label block">Reason<textarea required value={reason} onChange={event=>setReason(event.target.value)} className="form-control form-control-md mt-2 min-h-28" placeholder="Record the decision and context"/></label>
    </DecisionDialog>
  </>;
};
