import { request } from './apiClient';

export type ResearchSnapshot = { title: string; abstract: string; programme: string };
export type AmendmentKind = 'RESEARCH' | 'TRANSFER';
export type AmendmentStatus = 'PENDING_SUPERVISOR' | 'PENDING_SOURCE_COORDINATOR' | 'PENDING_COORDINATOR' | 'PENDING_DESTINATION_COORDINATOR' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type TeamMember = { appointmentId: number; userId: number; name: string };
export interface ResearchAmendment {
  id: number; kind: AmendmentKind; status: AmendmentStatus; studentId: number; studentName: string; matricNo: string;
  sourceProgramme: string; destinationProgramme: string; before: ResearchSnapshot; after: ResearchSnapshot; reason: string;
  createdAt: string; updatedAt: string; stageLabel: string; canDecide: boolean; canCancel: boolean; requiresTeamAcknowledgement: boolean;
  teamSnapshot: { primary: TeamMember | null; coSupervisors: TeamMember[]; panel: TeamMember[] }; unfinishedTaskCount: number | null;
  events: { id: number; action: string; actorName: string; actorRole: string; previousStatus: string; newStatus: string; reason: string; retainTeam: boolean; createdAt: string }[];
}
export interface ResearchRevision {
  id: number; revision: number; studentId?: number; studentName?: string; before: ResearchSnapshot; after: ResearchSnapshot;
  reason: string; actorName: string; createdAt: string; requestId: number | null; kind: 'BASELINE' | 'CORRECTION' | AmendmentKind;
}
export interface ResearchAmendmentOptions {
  students: { id: number; name: string; matricNo: string; programme: string }[]; programmes: string[];
  profile: (ResearchSnapshot & { studentId: number; revision: number }) | null;
  canSubmitResearch: boolean; canCorrect: boolean; canTransfer: boolean;
}
export type AmendmentInput = { studentId?: number; kind: AmendmentKind; title?: string; abstract?: string; destinationProgramme?: string; reason: string };
export type CorrectionInput = { studentId: number; title?: string; abstract?: string; reason: string; meaningUnchanged: true; expectedRevision: number };
const base = '/appointments/research-amendments';
const query = (studentId?: number) => studentId === undefined ? '' : `?studentId=${studentId}`;
export const getResearchAmendmentOptions = (studentId?: number) => request<ResearchAmendmentOptions>(`${base}/options/${query(studentId)}`);
export const getResearchAmendments = (studentId?: number) => request<{ requests: ResearchAmendment[]; revisions: ResearchRevision[] }>(`${base}/${query(studentId)}`);
export const submitResearchAmendment = (input: AmendmentInput) => request<ResearchAmendment>(`${base}/`, { method: 'POST', body: JSON.stringify(input) });
export const correctResearchProfile = (input: CorrectionInput) => request<ResearchRevision>(`${base}/corrections/`, { method: 'POST', body: JSON.stringify(input) });
export const decideResearchAmendment = (id: number, input: { decision: 'APPROVE' | 'REJECT'; reason?: string; retainTeam?: true; expectedStatus: AmendmentStatus }) => request<ResearchAmendment>(`${base}/${id}/decision/`, { method: 'POST', body: JSON.stringify(input) });
export const cancelResearchAmendment = (id: number, reason: string) => request<ResearchAmendment>(`${base}/${id}/cancel/`, { method: 'POST', body: JSON.stringify({ reason }) });
