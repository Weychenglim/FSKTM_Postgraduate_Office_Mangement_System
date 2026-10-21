import React from 'react';
import {ApprovalProcess,formatRequestDisplayDate} from './ApprovalProcess';
import {RequestAuditHistory,RequestDetailCard,RequestSection} from './RequestDetailPrimitives';
import {appointmentDetailTypography as text} from './AppointmentPrimitives';
import {StatusBadge} from './PortalPrimitives';
import {RequestSummaryCard,ResearchDetailsCard,RequestSummaryField as Fact} from './AppointmentRequestSections';
import {buildPanelApprovalSteps,panelRecordedDate,panelStatusLabel,panelStatusTone,type PanelPresentation} from '../utils/panelPresentation';

export function panelRecordMetadata(record:PanelPresentation) {
  const event=(record.workflow??[]).find(e=>['SUBMIT','SUBMITTED'].includes(e.action));
  return {submittedAt:event?.createdAt||panelRecordedDate(record.submittedAt||record.submittedDate),submittedBy:event?.actorName||'',statusLabel:panelStatusLabel(record.status),statusTone:panelStatusTone(record.status)};
}
export function PanelRecommendationDetail({record,actions,administration,contextAction}:{record:PanelPresentation;actions?:React.ReactNode;administration?:React.ReactNode;contextAction?:React.ReactNode}) {
  const started=record.status!=='NOT_SUBMITTED';
  const hasNotes=!!(record.justification||record.replacesAppointmentId||record.replacementReason||record.rejectionReason||record.cancellationReason||record.unavailableUntil);
  const contacts=[{label:'Student email',value:record.studentEmail},{label:'Supervisor email',value:record.supervisorEmail},...(started?[{label:'Staff number',value:record.recommendedMemberId},{label:'Department',value:record.panelMemberDepartment},{label:'Panel email',value:record.panelMemberEmail}]:[])].filter(fact=>fact.value);
  return <div data-panel-recommendation-detail className="space-y-6">
    <RequestSummaryCard studentName={record.studentName} studentId={record.studentId} programme={record.programme} semester={record.semester}
      participants={[{label:'Primary supervisor',value:record.supervisorName},...(started?[{label:'Proposed Panel member',value:record.recommendedMember}]:[])]} contextAction={contextAction}>
      {contacts.length?<details className="border-t border-slate-200 pt-4"><summary className={`${text.label} cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy`}>Contact details</summary><dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">{contacts.map(fact=><Fact key={fact.label} {...fact}/>)}</dl></details>:null}
      {!started?<p className={text.body}>No Panel recommendation has been submitted for this record.</p>:null}
    </RequestSummaryCard>
    <ResearchDetailsCard title={record.proposedTopic} area={record.researchArea} abstract={record.abstract} source="profile"/>
    {started||hasNotes||actions||record.workflow?.length?<RequestDetailCard padding="lg"
      progress={started?<ApprovalProcess steps={buildPanelApprovalSteps(record)}/>:undefined}
      actions={actions} audit={record.workflow?.length?<RequestAuditHistory events={record.workflow}/>:undefined}>
    {record.justification?<RequestSection title="Nomination justification" headingClassName={text.heading}><p className={`${text.body} max-w-prose whitespace-pre-wrap break-words`}>{record.justification}</p></RequestSection>:null}
    {record.replacesAppointmentId||record.replacementReason?<RequestSection title="Requested replacement" headingClassName={text.heading}><p className={text.body}>{['SUBMITTED_TO_PANEL','PENDING_COORDINATOR'].includes(record.status)&&record.replacedAppointmentStatus==='ACTIVE'?'The current Panel appointment continues until this replacement is approved.':'This nomination requested a replacement of the previous Panel member.'}</p>{record.replacementReason?<p className={`${text.body} max-w-prose whitespace-pre-wrap break-words`}>{record.replacementReason}</p>:null}{record.replacedPanelMember?<p className={text.body}>{record.replacedAppointmentStatus==='ACTIVE'&&['SUBMITTED_TO_PANEL','PENDING_COORDINATOR'].includes(record.status)?'Panel member being replaced':'Previous Panel member'}: <span className="font-semibold">{record.replacedPanelMember}</span></p>:null}</RequestSection>:null}
    {record.rejectionReason||record.cancellationReason?<RequestSection title={record.rejectionReason?'Rejection reason':'Cancellation reason'} headingClassName={text.heading}><p className={`${text.body} max-w-prose whitespace-pre-wrap break-words`}>{record.rejectionReason||record.cancellationReason}</p></RequestSection>:null}
    {record.unavailableUntil?<p className="card-description text-amber-800">Unavailable for new appointments until {formatRequestDisplayDate(record.unavailableUntil)}. This recorded recommendation remains available.</p>:null}
    </RequestDetailCard>:null}{administration}</div>;
}
export function PanelAppointmentRecordCard({record,actions}:{record:PanelPresentation;actions?:React.ReactNode}) {
  const lifecycle=record.appointmentLifecycle;
  if(!lifecycle)return null;
  const active=lifecycle.status==='ACTIVE';
  const approved=record.coordinatorDecisionAt||lifecycle.lifecycle?.find(e=>e.action==='ACTIVATED')?.createdAt||record.appointmentDate;
  const events=(lifecycle.lifecycle??[]).map(e=>({...e,reason:e.reason??undefined}));
  return <div data-panel-appointment-record><RequestDetailCard padding="lg" actions={actions} audit={events.length?<RequestAuditHistory title="Appointment history" events={events}/>:undefined}>
    <RequestSection title="Appointment record" headingClassName={text.heading}><dl className="grid gap-x-10 gap-y-6 pt-3 sm:grid-cols-2"><Fact label="Student" value={record.studentName} name/><Fact label="Appointed Panel member" value={record.recommendedMember} name/><div><dt className={text.label}>Appointment status</dt><dd className="mt-2"><StatusBadge tone={active?'success':'neutral'}>{panelStatusLabel(lifecycle.status)}</StatusBadge></dd></div><Fact label="Appointment date" value={formatRequestDisplayDate(panelRecordedDate(approved))}/>{!active?<Fact label="Ended on" value={formatRequestDisplayDate(lifecycle.endedAt)}/>:null}</dl></RequestSection>
    {!active&&(lifecycle.endOutcome||lifecycle.endReason)?<RequestSection title="Appointment outcome" headingClassName={text.heading}>{lifecycle.endOutcome?<p className={text.body}>{panelStatusLabel(lifecycle.endOutcome)}</p>:null}{lifecycle.endReason?<p className={`${text.body} max-w-prose whitespace-pre-wrap break-words`}>{lifecycle.endReason}</p>:null}{lifecycle.endedBy?<p className="card-caption">Recorded by {lifecycle.endedBy}</p>:null}</RequestSection>:null}
  </RequestDetailCard></div>;
}
