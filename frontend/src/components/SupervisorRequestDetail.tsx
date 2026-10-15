import React from 'react';
import type { StudentSupervisorApplication, SupervisorApplicationDocument, SupervisorApplicationRecord } from '../types';
import type { ApprovalEvent } from '../utils/approvalProcess';
import { buildSupervisorApprovalProcess } from '../utils/approvalProcess';
import { requestStatusLabel } from '../utils/lecturerRequests';
import { formatMalaysiaDate } from '../utils/malaysiaDateTime';
import { ApprovalProcess } from './ApprovalProcess';
import { RequestAuditHistory, RequestDetailCard, RequestMetadata, RequestSection, RequestField, requestBodyTextClass } from './RequestDetailPrimitives';
import { SupervisorDocumentsList } from './SupervisorDocumentsList';

/** Role-scoped API adapters provide data; consumers provide permitted actions. */
export interface SupervisorRequestPresentation {
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
    submittedBy: request.submittedBy ?? '', statusLabel: request.status === 'UNKNOWN' ? 'Status not recorded' : requestStatusLabel(request.status),
    statusTone: request.status === 'APPROVED' ? 'success' : request.status.startsWith('REJECTED') ? 'danger'
      : request.status.startsWith('CANCELLED') || request.status === 'UNKNOWN' ? 'neutral' : 'warning',
  };
}

export function SupervisorRequestDetail({ request, actions, administration, showApproval = true }: {
  request: SupervisorRequestPresentation; actions?: React.ReactNode; administration?: React.ReactNode; showApproval?: boolean;
}) {
  const progress = buildSupervisorApprovalProcess({kind: 'primary', status: request.status, submittedAt: request.submittedAt, events: request.events, waitingDays: request.waitingDays, waitingOn: request.waitingOn})
    .map(step => step.reason && (step.reason === request.rejectionReason || step.reason === request.cancellationReason) ? { ...step, reason: undefined } : step);
  return <div className="space-y-5"><RequestDetailCard progress={showApproval ? <ApprovalProcess steps={progress} /> : undefined} actions={actions} audit={request.events?.length?<RequestAuditHistory events={request.events}/>:undefined}>
    <RequestSection title="Request summary">
      <dl className="grid gap-4 sm:grid-cols-2">
        <RequestField label="Student" value={request.studentName} />
        <RequestField label="Matric number" value={request.studentId} />
        <RequestField label="Programme" value={request.programme} />
        <RequestField label="Semester" value={request.semester} />
        <RequestField label="Proposed supervisor" value={request.proposedSupervisor} />
      </dl>
      {request.unavailableUntil ? <p className="card-description mt-4 text-amber-700">The selected Supervisor is unavailable for new appointments until {formatMalaysiaDate(request.unavailableUntil)}. This workflow remains recorded.</p> : null}
    </RequestSection>
    <RequestSection title={showApproval ? 'Submitted research' : 'Research information'}>
      <dl className="space-y-4">
        <RequestField label="Research title" value={request.researchTitle} narrative />
        <RequestField label="Research area" value={request.researchArea} narrative />
        <RequestField label="Research abstract" value={request.researchAbstract} narrative />
        {request.projectCourseCodes?<RequestField label="Course code(s)" value={request.projectCourseCodes}/>:null}
        {request.replacementReason ? <RequestField label="Replacement reason" value={request.replacementReason} narrative /> : null}
      </dl>
    </RequestSection>
    {request.rejectionReason ? <RequestSection title="Decision reason"><p className={`${requestBodyTextClass} text-rose-800`}>{request.rejectionReason}</p></RequestSection> : null}
    {request.cancellationReason ? <RequestSection title="Cancellation reason"><p className={requestBodyTextClass}>{request.cancellationReason}</p></RequestSection> : null}
    <RequestSection title="Documents"><SupervisorDocumentsList applicationId={request.applicationId} documents={request.documents} compact /></RequestSection>
  </RequestDetailCard>{administration}</div>;
}
