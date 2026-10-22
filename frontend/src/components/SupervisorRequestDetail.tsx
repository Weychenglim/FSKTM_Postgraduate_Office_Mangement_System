import React from 'react';
import type { StudentSupervisorApplication, SupervisorApplicationDocument, SupervisorApplicationRecord } from '../types';
import type { ApprovalEvent } from '../utils/approvalProcess';
import { buildSupervisorApprovalProcess } from '../utils/approvalProcess';
import { requestStatusLabel } from '../utils/lecturerRequests';
import { formatMalaysiaDate } from '../utils/malaysiaDateTime';
import { ApprovalProcess } from './ApprovalProcess';
import { RequestAuditHistory, RequestDetailCard, RequestMetadata, RequestSection, requestBodyTextClass } from './RequestDetailPrimitives';
import { SupervisorDocumentsList } from './SupervisorDocumentsList';
import { RequestSummaryCard, ResearchDetailsCard } from './AppointmentRequestSections';
import { appointmentDetailTypography as text } from './AppointmentPrimitives';
import { appointmentRequestStatusTone } from '../utils/appointmentRequestStatus';
import { SupervisorSectionAEvidence, SupervisorSectionAParticulars, useSupervisorSectionA, withSubmittedSupervisorParticulars } from './SubmittedSupervisorSectionA';
import { SubmittedSupervisorResearchIntent } from './SupervisorResearchIntent';

/** Role-scoped API adapters provide data; consumers provide permitted actions. */
export interface SupervisorRequestPresentation {
  initiatedByOffice?: boolean;
  applicationId?: number | string;
  reference?: string;
  status: string;
  submittedAt?: string;
  submittedBy?: string;
  studentName?: string;
  studentId?: string;
  programme?: string;
  semester?: string;
  proposedSupervisor?: string;
  researchTitle?: string;
  researchArea?: string;
  researchAbstract?: string;
  projectCourseCodes?: string;
  replacementReason?: string | null;
  rejectionReason?: string;
  cancellationReason?: string;
  unavailableUntil?: string | null;
  waitingDays?: number | null;
  waitingOn?: string | null;
  events?: ApprovalEvent[];
  documents?: SupervisorApplicationDocument[];
}

export function toSupervisorRequestPresentation(record: SupervisorApplicationRecord): SupervisorRequestPresentation {
  return {
    initiatedByOffice:record.initiatedByOffice,
    applicationId: record.id, reference: `SV-REQ-${String(record.id).padStart(5, '0')}`,
    status: record.status, submittedAt: record.submittedAt, submittedBy: record.workflow?.find(event=>['SUBMIT','SUBMITTED'].includes(event.action.toUpperCase()))?.actorName,
    studentName: record.studentName, studentId: record.studentId, programme: record.programme, semester: record.semester,
    proposedSupervisor: record.proposedSupervisor, researchTitle: record.researchTitle, researchArea: record.researchArea,
    researchAbstract: record.researchAbstract, projectCourseCodes: record.projectCourseCodes,
    replacementReason: record.replacementReason, rejectionReason: record.rejectionReason, cancellationReason: record.cancellationReason,
    unavailableUntil: record.unavailableUntil, waitingDays: record.waitingDays, waitingOn: record.waitingOn,
    events: record.workflow, documents: record.documents,
  };
}

export function toStudentSupervisorRequestPresentation(record: StudentSupervisorApplication): SupervisorRequestPresentation {
  return {
    initiatedByOffice:record.initiatedByOffice,
    applicationId: record.applicationId, reference: record.applicationId!=null?`SV-REQ-${String(record.applicationId).padStart(5,'0')}`:record.id, status: record.workflowStatus ?? 'UNKNOWN',
    submittedAt: record.submittedAt, submittedBy: record.workflow?.find(event=>['SUBMIT','SUBMITTED'].includes(event.action.toUpperCase()))?.actorName,
    studentName: record.studentName, studentId: record.studentId, programme: record.programme, semester: record.semester,
    proposedSupervisor: record.supervisor, researchTitle: record.title, researchArea: record.researchArea,
    researchAbstract: record.researchAbstract, projectCourseCodes: record.projectCourseCodes,
    replacementReason: record.replacementReason, rejectionReason: record.rejectionReason, cancellationReason: record.cancellationReason,
    unavailableUntil: record.unavailableUntil, waitingDays: record.waitingDays, waitingOn: record.waitingOn,
    events: record.workflow, documents: record.documents,
  };
}

export function supervisorRequestMetadata(request: SupervisorRequestPresentation): React.ComponentProps<typeof RequestMetadata> {
  return {
    reference: request.reference, submittedAt: request.submittedAt ?? null,
    submittedBy: request.submittedBy ?? '', statusLabel: requestStatusLabel(request.status),
    statusTone: appointmentRequestStatusTone(request.status),
  };
}

export function SupervisorRequestDetail({ request, actions, administration, contextAction, showApproval = true }: {
  request: SupervisorRequestPresentation; actions?: React.ReactNode; administration?: React.ReactNode; contextAction?: React.ReactNode; showApproval?: boolean;
}) {
  const sectionA = useSupervisorSectionA(request.initiatedByOffice ? undefined : request.applicationId);
  const submitted = withSubmittedSupervisorParticulars(request, sectionA.record);
  const progress = buildSupervisorApprovalProcess({kind: 'primary', status: request.status, submittedAt: request.submittedAt, events: request.events, waitingDays: request.waitingDays, waitingOn: request.waitingOn})
    .map(step => step.reason && (step.reason === request.rejectionReason || step.reason === request.cancellationReason) ? { ...step, reason: undefined } : step);
  const notes = <>
    {request.replacementReason ? <RequestSection title="Requested replacement" headingClassName={text.heading}><p className={requestBodyTextClass}>{request.replacementReason}</p></RequestSection> : null}
    {request.rejectionReason ? <RequestSection title="Decision reason" headingClassName={text.heading}><p className={`${requestBodyTextClass} text-rose-800`}>{request.rejectionReason}</p></RequestSection> : null}
    {request.cancellationReason ? <RequestSection title="Cancellation reason" headingClassName={text.heading}><p className={requestBodyTextClass}>{request.cancellationReason}</p></RequestSection> : null}
  </>;
  const hasNotes = !!(request.replacementReason || request.rejectionReason || request.cancellationReason);
  return <div className="space-y-6">
    <RequestSummaryCard studentName={submitted.studentName} studentId={submitted.studentId} programme={submitted.programme} semester={submitted.semester}
      participants={[{label:'Proposed supervisor',value:request.proposedSupervisor}]} contextAction={contextAction}>
      {request.unavailableUntil ? <p className="card-description text-amber-700">The Supervisor is unavailable for new appointments until {formatMalaysiaDate(request.unavailableUntil)}. This workflow remains recorded.</p> : null}
      {request.initiatedByOffice ? <p className="card-description border-t border-slate-200 pt-4">Office-initiated replacement</p> : request.applicationId != null ? <SupervisorSectionAParticulars {...sectionA} /> : null}
    </RequestSummaryCard>
    <ResearchDetailsCard title={request.researchTitle} area={request.researchArea} abstract={request.researchAbstract} source={showApproval?'submitted':'record'} courseCodes={request.projectCourseCodes} showCourseCodes
      documents={<SupervisorDocumentsList applicationId={request.applicationId} documents={request.documents} compact />} />
    {sectionA.record ? <SupervisorSectionAEvidence record={sectionA.record} /> : null}
    {request.applicationId != null ? <SubmittedSupervisorResearchIntent applicationId={request.applicationId} /> : null}
    {showApproval || hasNotes || actions || request.events?.length ? <RequestDetailCard padding="lg" progress={showApproval ? <ApprovalProcess steps={progress} /> : undefined} actions={actions} audit={request.events?.length?<RequestAuditHistory events={request.events}/>:undefined}>
      {hasNotes ? notes : null}
    </RequestDetailCard> : null}
    {administration}
  </div>;
}
