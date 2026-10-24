import {request} from './apiClient';
import type {LecturerCapacityEntry} from '../types';

export type CapacityWorkspaceLecturer = Omit<LecturerCapacityEntry,'updatedBy'|'createdAt'|'updatedAt'> & {
  availabilitySummary?: {current: number; scheduled: number};
  activeStudentCount:number|null;
  primaryStudentCount:number|null;
  supportingStudentCount:number|null;
  panelStudentCount:number|null;
  userEnabled?:boolean;
  canConfigure?:boolean;
  workloadIdentityIncomplete?:boolean;
};
export interface CapacityPlanningBaseline {
  activeStudents:number;
  eligibleLecturers:number;
  studentsPerLecturer:number|null;
}
export interface CapacityWorkspace {
  lecturers:CapacityWorkspaceLecturer[];
  baseline:CapacityPlanningBaseline;
}
export function getCapacityWorkspace(semesterId:number):Promise<CapacityWorkspace> {
  return request(`/academics/semesters/${semesterId}/capacity-workspace/`);
}
