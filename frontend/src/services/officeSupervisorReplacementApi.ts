import {request} from './apiClient';
import type {SupervisorApplicationRecord, SupervisorCandidate} from '../types';

export interface OfficeSupervisorReplacementContext {
  appointmentId:number;
  studentId:string;
  studentName:string;
  programme:string;
  currentSupervisor:string;
  researchTitle:string;
  researchArea:string;
  researchAbstract:string;
  projectCourseCodes:string;
  candidates:SupervisorCandidate[];
  canSubmit:boolean;
  blockedReason:string|null;
  pendingApplicationId:number|null;
}

const path = (appointmentId:number) => `/appointments/supervisor/appointments/${appointmentId}/replacement/`;
export const getOfficeSupervisorReplacement = (appointmentId:number) => request<OfficeSupervisorReplacementContext>(path(appointmentId));
export const createOfficeSupervisorReplacement = (appointmentId:number,input:{proposedSupervisorId:string;reason:string}) =>
  request<SupervisorApplicationRecord>(path(appointmentId),{method:'POST',body:JSON.stringify(input)});
