import React, {useCallback, useEffect, useRef, useState} from 'react';
import {UserRoundPen} from 'lucide-react';
import type {UserRole} from '../types/auth';
import type {SupervisoryTeam} from '../types/coSupervision';
import type {SupervisorApplicationRecord} from '../types';
import {createOfficeSupervisorReplacement, getOfficeSupervisorReplacement, type OfficeSupervisorReplacementContext} from '../services/officeSupervisorReplacementApi';
import {fieldErrors} from '../services/apiClient';
import {requestStatusLabel} from '../utils/lecturerRequests';
import {capacityStateLabel} from '../utils/lecturerCapacity';
import {RecordPage} from './RecordPage';
import {PortalButton, PortalCard} from './PortalPrimitives';
import {PortalSelect} from './PortalSelect';
import {ErrorState, LoadingState} from './StateViews';
import {RequestSummaryField} from './AppointmentRequestSections';
import {appointmentDetailTypography as text} from './AppointmentPrimitives';

export function PrimarySupervisorReplacementActions({role,team,active,busy,onChange,variant='primary'}:{
  role?:UserRole;team:SupervisoryTeam;active:boolean;busy:boolean;onChange?:()=>void;variant?:'primary'|'secondary';
}) {
  if (role !== 'Office Staff/Admin' || !active) return null;
  if (team.pendingPrimaryReplacement) return <div role="status" className="space-y-1">
    <p className="card-value">Replacement requested: {team.pendingPrimaryReplacement.supervisorName}</p>
    <p className="card-description">{requestStatusLabel(team.pendingPrimaryReplacement.status)}</p>
  </div>;
  return team.canChangePrimarySupervisor && team.primaryAppointmentId && onChange
    ? <PortalButton variant={variant} icon={UserRoundPen} disabled={busy} onClick={onChange}>Request supervisor change</PortalButton> : null;
}

export function OfficeSupervisorReplacementFields({context,selectedId,reason,busy,onCandidateChange,onReasonChange,onRefresh,errors={}}:{
  context:OfficeSupervisorReplacementContext;selectedId:string;reason:string;busy:boolean;
  onCandidateChange:(id:string)=>void;onReasonChange:(value:string)=>void;onRefresh?:()=>void;errors?:Record<string,string>;
}) {
  const candidate=context.candidates.find(row=>row.id===selectedId);
  const selectable=candidate && (candidate.selectable ?? candidate.filled<candidate.total);
  return <fieldset disabled={busy} className="min-w-0 space-y-5">
    {context.blockedReason ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="card-description text-amber-900">{context.blockedReason}</p>
      {onRefresh?<PortalButton type="button" size="sm" onClick={onRefresh}>Check availability</PortalButton>:null}
    </div> : null}
    <div className="space-y-2">
      <label htmlFor="replacement-supervisor" className="card-label block">New supervisor</label>
      <PortalSelect id="replacement-supervisor" required className="form-control form-control-md" value={selectedId} onChange={event=>onCandidateChange(event.target.value)} aria-invalid={!!errors.proposedSupervisorId} aria-describedby={errors.proposedSupervisorId?'replacement-supervisor-error':undefined}>
        <option value="">Choose a supervisor</option>
        {context.candidates.map(row=><option key={row.id} value={row.id} disabled={!(row.selectable ?? row.filled<row.total)}>
          {row.name} · {row.filled}/{row.total} filled{row.capacityState?` · ${capacityStateLabel(row.capacityState)}`:''}
        </option>)}
      </PortalSelect>
      {!context.candidates.length ? <p className="card-description">No eligible replacement supervisors are available.</p> : null}
      {errors.proposedSupervisorId ? <p id="replacement-supervisor-error" className="card-description text-rose-700">{errors.proposedSupervisorId}</p> : null}
    </div>
    <div className="space-y-2">
      <label htmlFor="primary-replacement-reason" className="card-label block">Reason for change</label>
      <textarea id="primary-replacement-reason" required rows={4} className="form-control form-control-md" value={reason} onChange={event=>onReasonChange(event.target.value)} aria-invalid={!!errors.reason} aria-describedby={errors.reason?'primary-replacement-reason-error':undefined}/>
      {errors.reason ? <p id="primary-replacement-reason-error" className="card-description text-rose-700">{errors.reason}</p> : null}
    </div>
    <p className="card-description">The current supervisor stays appointed until the replacement is approved.</p>
    <div className="flex justify-end"><PortalButton type="submit" variant="primary" disabled={busy||!context.canSubmit||!selectable||!reason.trim()} isLoading={busy}>Send for review</PortalButton></div>
  </fieldset>;
}

export function OfficeSupervisorReplacementForm({appointmentId,onBack,onSubmitted,onBusyChange,backLabel="Back to supervision"}:{
  appointmentId:number;backLabel?:string;onBack:()=>void;onSubmitted:(application:SupervisorApplicationRecord)=>void;onBusyChange?:(busy:boolean)=>void;
}) {
  const [context,setContext]=useState<OfficeSupervisorReplacementContext|null>(null);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState<string|null>(null);
  const [submitError,setSubmitError]=useState<string|null>(null);
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [selectedId,setSelectedId]=useState('');
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const generation=useRef(0);
  const inFlight=useRef(false);
  const navigationComplete=useRef(false);
  const load=useCallback(async()=>{
    const token=++generation.current;
    setLoading(true);setLoadError(null);
    try {
      const result=await getOfficeSupervisorReplacement(appointmentId);
      if(result.appointmentId!==appointmentId) throw new Error('The returned appointment does not match this supervision record.');
      if(generation.current===token)setContext(result);
    } catch(failure) {
      if(generation.current===token){setContext(null);setLoadError(failure instanceof Error?failure.message:'The appointment could not be loaded.');}
    } finally {if(generation.current===token)setLoading(false);}
  },[appointmentId]);
  useEffect(()=>{void load();return()=>{generation.current+=1;};},[load]);
  const working=busy||loading;
  useEffect(()=>{onBusyChange?.(working);return()=>onBusyChange?.(false);},[working,onBusyChange]);

  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    const candidate=context?.candidates.find(row=>row.id===selectedId);
    if(loading||inFlight.current||navigationComplete.current||!context?.canSubmit||!candidate||!(candidate.selectable??candidate.filled<candidate.total)||!reason.trim())return;
    inFlight.current=true;setBusy(true);setSubmitError(null);setErrors({});
    let application:SupervisorApplicationRecord;
    try {
      application=await createOfficeSupervisorReplacement(appointmentId,{proposedSupervisorId:selectedId,reason:reason.trim()});
    } catch(failure) {
      setErrors(fieldErrors(failure));
      setSubmitError(failure instanceof Error?failure.message:'The replacement could not be requested.');
      // A failed/unreadable response may follow a committed request. Reconcile
      // eligibility before another POST; a failed read removes stale actions.
      await load();
      return;
    } finally {inFlight.current=false;setBusy(false);}
    navigationComplete.current=true;
    onSubmitted(application);
  };

  return <RecordPage title="Change supervisor" backLabel={backLabel} onBack={onBack} pageKey={`primary-replacement:${appointmentId}`} dirty={!!selectedId||!!reason.trim()} busy={working} navigationComplete={navigationComplete}>
    {submitError?<p role="alert" className="card-description rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">{submitError}</p>:null}
    {loading?<LoadingState message="Loading current supervision…"/>:loadError?<ErrorState message={loadError} onRetry={()=>void load()}/>:context?<PortalCard padding="lg">
      <form onSubmit={submit} className="space-y-6">
        <h2 className={text.heading}>Supervisor replacement</h2>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <RequestSummaryField label="Student" value={`${context.studentName} · ${context.studentId}`}/>
          <RequestSummaryField label="Current supervisor" value={context.currentSupervisor}/>
          <RequestSummaryField label="Research title" value={context.researchTitle}/>
          <RequestSummaryField label="Programme" value={context.programme}/>
        </dl>
        <OfficeSupervisorReplacementFields context={context} selectedId={selectedId} reason={reason} busy={busy} errors={errors} onRefresh={()=>void load()}
          onCandidateChange={value=>{setSelectedId(value);setSubmitError(null);setErrors({});}}
          onReasonChange={value=>{setReason(value);setSubmitError(null);setErrors({});}}/>
      </form>
    </PortalCard>:null}
  </RecordPage>;
}
