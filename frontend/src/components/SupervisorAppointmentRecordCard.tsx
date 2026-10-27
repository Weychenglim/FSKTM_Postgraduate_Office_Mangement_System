import React from 'react';
import type {AppointmentLifecycle,SupervisorApplicationRecord,SupervisorRecord} from '../types';
import type {ApprovalEvent} from '../utils/approvalProcess';
import {AppointmentEndControl} from './AppointmentEndControl';
import {formatRequestDisplayDate} from './ApprovalProcess';
import {RequestAuditHistory,RequestDetailCard,RequestDetailActions,RequestSection,readableRecordStatus} from './RequestDetailPrimitives';
import {StatusBadge} from './PortalPrimitives';
import {formatMalaysiaDate} from '../utils/malaysiaDateTime';
import {appointmentDetailTypography} from './AppointmentPrimitives';
import {CalendarClock} from 'lucide-react';
import {supervisionDetailLabel, supervisionDetailBody} from './SupervisionDetailLayout';

export interface SupervisorAppointmentPresentation {
  studentName:string;
  studentId:string;
  supervisor:string;
  status:string;
  approvedAt?:string|null;
  endedAt?:string|null;
  endOutcome?:string|null;
  endReason?:string|null;
  endedBy?:string|null;
  events:ApprovalEvent[];
}

function lifecycleEvents(lifecycle?:AppointmentLifecycle|null):ApprovalEvent[] {
  return (lifecycle?.lifecycle??[]).map(event=>({...event,reason:event.reason??undefined}));
}

export function toOfficeAppointmentPresentation(record:SupervisorRecord):SupervisorAppointmentPresentation {
  const lifecycle=record.appointmentLifecycle;
  return {studentName:record.studentName,studentId:record.studentId,supervisor:record.supervisor,
    status:lifecycle?.status??(record.status==='Approved'?'ACTIVE':record.status==='Ended'?'ENDED':record.status),
    approvedAt:record.workflow?.filter(event=>event.newStatus==='APPROVED'&&event.previousStatus!=='APPROVED').at(-1)?.createdAt
      ??record.approvalRecordedAt??lifecycle?.lifecycle?.find(event=>event.action==='ACTIVATED')?.createdAt??record.approvedDate,
    endedAt:lifecycle?.endedAt??record.releasedDate,endOutcome:lifecycle?.endOutcome,endReason:lifecycle?.endReason,
    endedBy:lifecycle?.endedBy,events:lifecycleEvents(lifecycle)};
}

export function toCoordinatorAppointmentPresentation(record:SupervisorApplicationRecord):SupervisorAppointmentPresentation {
  const lifecycle=record.appointmentLifecycle;
  return {studentName:record.studentName,studentId:record.studentId,supervisor:record.proposedSupervisor,status:lifecycle?.status??'',
    approvedAt:record.workflow.filter(event=>event.newStatus==='APPROVED'&&event.previousStatus!=='APPROVED').at(-1)?.createdAt
      ??record.coordinatorDecisionAt??lifecycle?.lifecycle?.find(event=>event.action==='ACTIVATED')?.createdAt,
    endedAt:lifecycle?.endedAt,endOutcome:lifecycle?.endOutcome,endReason:lifecycle?.endReason,endedBy:lifecycle?.endedBy,events:lifecycleEvents(lifecycle)};
}

function recordedDate(value?:string|null):string {
  // Older Office payloads carry an already formatted date with no time.
  if(value&&/^\d{1,2} [A-Za-z]{3} \d{4}$/.test(value))return value;
  const date=formatRequestDisplayDate(value);
  return date==='Not recorded'?'Date unavailable':formatMalaysiaDate(value!);
}

export function SupervisorAppointmentRecordCard({record,onEnd,actions,compact=false}:{record:SupervisorAppointmentPresentation;onEnd?:React.ComponentProps<typeof AppointmentEndControl>['onSubmit'];actions?:React.ReactNode;compact?:boolean}) {
  const active=record.status==='ACTIVE';
  const label=compact ? supervisionDetailLabel : appointmentDetailTypography.label;
  const body=compact ? supervisionDetailBody : appointmentDetailTypography.body;
  const controls=actions||onEnd?<div className={`flex flex-wrap items-start ${compact?'gap-3':'gap-2'}`}>{actions}{onEnd?<AppointmentEndControl label="Supervisor appointment" context={<>{record.studentName} · {record.studentId}</>} decisionKey={record.studentId} disabled={!active} onSubmit={onEnd}/>:null}</div>:undefined;
  return <div data-supervisor-appointment-record className="[&_.section-label]:font-semibold [&_.card-value]:font-semibold [&_.card-description]:font-normal"><RequestDetailCard padding="lg"
    actions={compact&&controls?<RequestDetailActions>{controls}</RequestDetailActions>:controls}
    audit={record.events.length?<RequestAuditHistory title="Appointment history" events={record.events}/>:undefined}>
    <RequestSection title="Appointment record" icon={compact?CalendarClock:undefined} headingClassName={appointmentDetailTypography.heading}><dl className={`grid gap-x-10 gap-y-6 pt-3 ${compact?'':'sm:grid-cols-2'}`}>
      {!compact ? <>
      <div><dt className={appointmentDetailTypography.label}>Student</dt><dd className={`${appointmentDetailTypography.name} mt-2`}>{record.studentName}</dd><dd className="card-caption mt-1">{record.studentId}</dd></div>
      <div><dt className={appointmentDetailTypography.label}>Primary supervisor</dt><dd className={`${appointmentDetailTypography.name} mt-2`}>{record.supervisor||'Supervisor unavailable'}</dd></div>
      </> : null}
      <div><dt className={label}>Appointment status</dt><dd className="mt-2"><StatusBadge tone={active?'success':'neutral'}>{readableRecordStatus(record.status)}</StatusBadge></dd></div>
      <div><dt className={label}>Approved on</dt><dd className={`${body} mt-2`}>{recordedDate(record.approvedAt)}</dd></div>
      {!active?<div><dt className={label}>Ended on</dt><dd className={`${body} mt-2`}>{recordedDate(record.endedAt)}</dd></div>:null}
    </dl></RequestSection>
    {!active&&(record.endOutcome||record.endReason)?<RequestSection title="Appointment outcome" headingClassName={appointmentDetailTypography.heading}>
      {record.endOutcome?<p className="card-value capitalize">{readableRecordStatus(record.endOutcome)}</p>:null}
      {record.endReason?<p className="card-description whitespace-pre-wrap">{record.endReason}</p>:null}
      {record.endedBy?<p className="card-caption">Recorded by {record.endedBy}</p>:null}
    </RequestSection>:null}
  </RequestDetailCard></div>;
}
