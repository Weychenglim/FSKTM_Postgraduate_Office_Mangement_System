import { request } from './apiClient';
import type { CoordinatorDelegation, CoordinatorDelegationInput, CoordinatorDelegationOptions } from '../types/coordinatorDelegation';

const base = '/accounts/coordinator-delegations/';
export const getCoordinatorDelegations = (signal?: AbortSignal) => request<CoordinatorDelegation[]>(base, { signal });
export const getCoordinatorDelegationOptions = (signal?: AbortSignal) => request<CoordinatorDelegationOptions>(`${base}options/`, { signal });
export const createCoordinatorDelegation = (values: CoordinatorDelegationInput) => request<CoordinatorDelegation>(base, { method: 'POST', body: JSON.stringify(values) });
export const revokeCoordinatorDelegation = (id: number, reason: string) => request<CoordinatorDelegation>(`${base}${id}/revoke/`, { method: 'POST', body: JSON.stringify({ reason }) });
