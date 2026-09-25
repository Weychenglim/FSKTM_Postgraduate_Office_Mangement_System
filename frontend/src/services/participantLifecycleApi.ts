import type {
  ParticipantLifecycleListResponse,
  ParticipantLifecycleRecord,
  ParticipantTransitionRequest,
  ParticipantType,
} from '../types';
import { request } from './apiClient';

const participantPath = (type: ParticipantType, identifier: string) =>
  `/accounts/participants/${type === 'STUDENT' ? 'students' : 'lecturers'}/${encodeURIComponent(identifier)}`;

export function getParticipants(query = ''): Promise<ParticipantLifecycleListResponse> {
  return request<ParticipantLifecycleListResponse>(`/accounts/participants/${query}`);
}

export function getParticipant(
  type: ParticipantType,
  identifier: string,
): Promise<ParticipantLifecycleRecord> {
  return request<ParticipantLifecycleRecord>(`${participantPath(type, identifier)}/`);
}

export function transitionParticipant(
  type: ParticipantType,
  identifier: string,
  values: ParticipantTransitionRequest,
): Promise<ParticipantLifecycleRecord> {
  return request<ParticipantLifecycleRecord>(`${participantPath(type, identifier)}/transition/`, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function cancelParticipantPendingWork(
  type: ParticipantType,
  identifier: string,
  recordType: string,
  recordId: number,
  reason: string,
): Promise<{ recordType: string; recordId: number; status: string }> {
  return request(`${participantPath(type, identifier)}/pending-work/cancel/`, {
    method: 'POST',
    body: JSON.stringify({ recordType, recordId, reason }),
  });
}
