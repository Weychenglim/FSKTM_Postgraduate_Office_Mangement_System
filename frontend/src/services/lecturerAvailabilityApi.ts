import type {AcademicSemester} from '../types/academicSemester';
import {request} from './apiClient';

export type LecturerAvailabilityRole = 'SUPERVISOR' | 'PANEL';
interface AvailabilityActor {id:number;name:string}
export interface LecturerAvailabilityWindow {
  id:number;
  semesterId:number;
  semesterCode:string;
  lecturerId:number;
  staffNo:string;
  lecturerName:string;
  role:LecturerAvailabilityRole;
  startsOn:string;
  endsOn:string;
  reason:string;
  isEffective:boolean;
  isCancelled:boolean;
  createdBy:AvailabilityActor|null;
  createdAt:string;
  cancelledBy:AvailabilityActor|null;
  cancelledAt:string|null;
  cancellationReason:string|null;
}
export interface LecturerAvailabilityContext {
  semesters:AcademicSemester[];
  semesterId:number|null;
  restrictions:LecturerAvailabilityWindow[];
  roles:LecturerAvailabilityRole[];
  canManage:boolean;
  pagination:{total:number;limit:number;offset:number};
}
export interface LecturerAvailabilityInput {
  semesterId:number;
  role:LecturerAvailabilityRole;
  startsOn:string;
  endsOn:string;
  reason:string;
  confirmed:true;
}
export function getLecturerAvailability({semesterId,limit=10,offset=0}:{semesterId?:number;limit?:number;offset?:number}={}):Promise<LecturerAvailabilityContext> {
  const query=new URLSearchParams({limit:String(limit),offset:String(offset)});
  if(semesterId!==undefined)query.set('semesterId',String(semesterId));
  return request<LecturerAvailabilityContext>(`/academics/my-availability/?${query}`);
}
export function createLecturerAvailability(values:LecturerAvailabilityInput):Promise<LecturerAvailabilityWindow> {
  return request<LecturerAvailabilityWindow>('/academics/my-availability/',{method:'POST',body:JSON.stringify(values)});
}
export function cancelLecturerAvailability(id:number,reason:string):Promise<LecturerAvailabilityWindow> {
  return request<LecturerAvailabilityWindow>(`/academics/my-availability/${id}/cancel/`,{method:'POST',body:JSON.stringify({reason,confirmed:true})});
}
