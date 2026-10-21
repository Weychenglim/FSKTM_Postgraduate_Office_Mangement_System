import { request } from './apiClient';
import type { SupervisorApplicationDraftInput, SupervisorApplicationDraftResponse, SupervisorResearchIntent } from '../types/supervisorResearchIntent';

const draftPath = '/appointments/supervisor/application-draft/';
export const getSupervisorApplicationDraft = (): Promise<SupervisorApplicationDraftResponse> => request(draftPath, { cache: 'no-store' });
export const saveSupervisorApplicationDraft = (draft: SupervisorApplicationDraftInput): Promise<SupervisorApplicationDraftResponse> => request(draftPath, { method: 'PUT', body: JSON.stringify(draft), cache: 'no-store' });
export const deleteSupervisorApplicationDraft = (): Promise<void> => request(draftPath, { method: 'DELETE', cache: 'no-store' });
export const getSupervisorApplicationResearchIntent = (id: number | string): Promise<{ researchIntent: SupervisorResearchIntent | null }> =>
  request(`/appointments/supervisor/applications/${encodeURIComponent(String(id))}/research-intent/`, { cache: 'no-store' });
