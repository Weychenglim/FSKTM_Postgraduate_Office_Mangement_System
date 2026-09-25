import { request } from './apiClient';
import type { CoSupervisorAction, CoSupervisorAppointment, CoSupervisorCandidate, CoSupervisorNomination, CoSupervisorOutcome, SupervisoryTeam, SupervisoryWorkspace } from '../types/coSupervision';

const base = '/appointments/co-supervisor';
export const getSupervisoryWorkspace = () => request<SupervisoryWorkspace>(`${base}/`);
export const getSupervisoryTeam = (studentId: number) => request<SupervisoryTeam>(`${base}/students/${studentId}/`);
export const getCoSupervisorCandidates = (studentId: number) => request<CoSupervisorCandidate[]>(`${base}/students/${studentId}/candidates/`);
export const nominateCoSupervisor = (input: { studentId: number; candidateId: number; justification: string; replacesAppointmentId?: number }) =>
  request<CoSupervisorNomination>(`${base}/nominations/`, { method: 'POST', body: JSON.stringify(input) });
export const decideCoSupervisor = (nominationId: number, action: CoSupervisorAction, reason = '') =>
  request<CoSupervisorNomination>(`${base}/nominations/${nominationId}/${action}/`, { method: 'POST', body: JSON.stringify({ reason }) });
export const endCoSupervisor = (appointmentId: number, outcome: CoSupervisorOutcome, reason: string) =>
  request<CoSupervisorAppointment>(`${base}/appointments/${appointmentId}/end/`, { method: 'POST', body: JSON.stringify({ outcome, reason }) });
