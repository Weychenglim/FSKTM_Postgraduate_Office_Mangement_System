import { ApiError, request } from './apiClient';
import type { CapacityAuthorizationInput, CapacityReassessment, CapacityReassessmentWorkspace, CapacityRequestKind, CapacityRevocationInput } from '../types/capacityReassessment';

const base = '/appointments/capacity-reassessments';
export const getCapacityReassessments = (studentId?: number) => request<CapacityReassessmentWorkspace>(`${base}/${studentId === undefined ? '' : `?studentId=${studentId}`}`);
export const authorizeCapacityReassessment = (kind: CapacityRequestKind, id: number, input: CapacityAuthorizationInput) => request<CapacityReassessment>(`${base}/${kind}/${id}/authorize/`, { method: 'POST', body: JSON.stringify(input) });
export const revokeCapacityReassessment = (kind: CapacityRequestKind, id: number, input: CapacityRevocationInput) => request<CapacityReassessment>(`${base}/${kind}/${id}/revoke/`, { method: 'POST', body: JSON.stringify(input) });

// Refresh conflicting writes for review without ever replaying an Office decision.
export async function runCapacityReassessmentAction(operation: () => Promise<unknown>, refresh: () => Promise<void>) {
  try {
    await operation();
  } catch (error) {
    const conflict = error instanceof ApiError && error.status === 409;
    if (conflict) await refresh();
    return { ok: false, conflict, message: conflict ? 'The request or active semester changed. Review the refreshed details before taking a new action.' : error instanceof Error ? error.message : 'The authorization could not be saved.' };
  }
  await refresh();
  return { ok: true, conflict: false, message: 'Capacity reassessment authorization updated. The appointment still follows its existing approval process.' };
}
