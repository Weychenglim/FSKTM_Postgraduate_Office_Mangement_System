import type {
  AvailabilityWindowCommand,
  CapacityEntryCommand,
  CapacityHistoryQuery,
  CapacityPublishCommand,
  LecturerAvailabilityWindow,
  LecturerCapacityAudit,
  SemesterCapacityPlan,
} from '../types';
import { request } from './apiClient';

const historyQuery = ({ limit, offset }: CapacityHistoryQuery = {}): string => {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  if (offset !== undefined) params.set('offset', String(offset));
  const query = params.toString();
  return query ? `?${query}` : '';
};

export function getSemesterCapacityPlans(
  semesterId: number,
  query?: CapacityHistoryQuery,
): Promise<SemesterCapacityPlan[]> {
  return request<SemesterCapacityPlan[]>(
    `/academics/semesters/${semesterId}/capacity-plans/${historyQuery(query)}`,
  );
}

export function createSemesterCapacityPlan(
  semesterId: number,
  copyFromPlanId: number | null = null,
): Promise<SemesterCapacityPlan> {
  return request<SemesterCapacityPlan>(
    `/academics/semesters/${semesterId}/capacity-plans/`,
    {
      method: 'POST',
      body: JSON.stringify({ copyFromPlanId }),
    },
  );
}

export function getSemesterCapacityPlan(planId: number): Promise<SemesterCapacityPlan> {
  return request<SemesterCapacityPlan>(`/academics/capacity-plans/${planId}/`);
}

export function updateLecturerCapacityEntry(
  planId: number,
  lecturerId: number,
  command: CapacityEntryCommand,
): Promise<SemesterCapacityPlan> {
  return request<SemesterCapacityPlan>(
    `/academics/capacity-plans/${planId}/lecturers/${lecturerId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(command),
    },
  );
}

export function cloneSemesterCapacityPlan(planId: number): Promise<SemesterCapacityPlan> {
  return request<SemesterCapacityPlan>(`/academics/capacity-plans/${planId}/clone/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function publishSemesterCapacityPlan(
  planId: number,
  command: CapacityPublishCommand,
): Promise<SemesterCapacityPlan> {
  return request<SemesterCapacityPlan>(`/academics/capacity-plans/${planId}/publish/`, {
    method: 'POST',
    body: JSON.stringify(command),
  });
}

export function getLecturerAvailabilityWindows(
  semesterId: number,
  query?: CapacityHistoryQuery,
): Promise<LecturerAvailabilityWindow[]> {
  return request<LecturerAvailabilityWindow[]>(
    `/academics/semesters/${semesterId}/availability/${historyQuery(query)}`,
  );
}

export function createLecturerAvailabilityWindow(
  semesterId: number,
  command: AvailabilityWindowCommand,
): Promise<LecturerAvailabilityWindow> {
  return request<LecturerAvailabilityWindow>(
    `/academics/semesters/${semesterId}/availability/`,
    {
      method: 'POST',
      body: JSON.stringify(command),
    },
  );
}

export function cancelLecturerAvailabilityWindow(
  windowId: number,
  reason: string,
): Promise<LecturerAvailabilityWindow> {
  return request<LecturerAvailabilityWindow>(
    `/academics/availability/${windowId}/cancel/`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}

export function getLecturerCapacityAudits(
  semesterId: number,
  query?: CapacityHistoryQuery,
): Promise<LecturerCapacityAudit[]> {
  return request<LecturerCapacityAudit[]>(
    `/academics/semesters/${semesterId}/capacity-audits/${historyQuery(query)}`,
  );
}
