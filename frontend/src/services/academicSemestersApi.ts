import type {
  AcademicSemester,
  AcademicSemesterAudit,
  AcademicSemesterInput,
  ActiveAcademicSemesterResponse,
} from '../types';
import { request } from './apiClient';

export function getActiveAcademicSemester(): Promise<ActiveAcademicSemesterResponse> {
  return request<ActiveAcademicSemesterResponse>('/academics/semesters/active/');
}

export function getAcademicSemesters(includeArchived = false): Promise<AcademicSemester[]> {
  const query = includeArchived ? '?includeArchived=true' : '';
  return request<AcademicSemester[]>(`/academics/semesters/${query}`);
}

export function createAcademicSemester(values: AcademicSemesterInput): Promise<AcademicSemester> {
  return request<AcademicSemester>('/academics/semesters/', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateAcademicSemester(
  id: number,
  values: Partial<AcademicSemesterInput>,
): Promise<AcademicSemester> {
  return request<AcademicSemester>(`/academics/semesters/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

function transitionSemester(id: number, action: string, reason: string): Promise<AcademicSemester> {
  return request<AcademicSemester>(`/academics/semesters/${id}/${action}/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function activateAcademicSemester(id: number, reason: string): Promise<AcademicSemester> {
  return transitionSemester(id, 'activate', reason);
}

export function closeAcademicSemester(id: number, reason: string): Promise<AcademicSemester> {
  return transitionSemester(id, 'close', reason);
}

export function archiveAcademicSemester(id: number, reason: string): Promise<AcademicSemester> {
  return transitionSemester(id, 'archive', reason);
}

export function extendAcademicSemester(
  id: number,
  endsOn: string,
  reason: string,
): Promise<AcademicSemester> {
  return request<AcademicSemester>(`/academics/semesters/${id}/extend/`, {
    method: 'POST',
    body: JSON.stringify({ endsOn, reason }),
  });
}

export function getAcademicSemesterAudits(id: number): Promise<AcademicSemesterAudit[]> {
  return request<AcademicSemesterAudit[]>(`/academics/semesters/${id}/audits/`);
}
