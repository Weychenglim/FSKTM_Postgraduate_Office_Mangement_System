import { request } from './apiClient';
import type { SupervisorApplicationPrefill, SupervisorSectionASnapshot, SupervisorStudentParticularsData } from '../types/supervisorSectionA';

export const getSupervisorApplicationPrefill = (): Promise<SupervisorApplicationPrefill> =>
  request('/appointments/supervisor/application-prefill/');

export const updateSupervisorApplicationContact = (contact: { phone: string; address: string }): Promise<{ studentParticulars: SupervisorStudentParticularsData }> =>
  request('/appointments/supervisor/application-contact/', { method: 'PATCH', body: JSON.stringify(contact) });

export const getSupervisorApplicationSectionA = (id: number | string): Promise<{ sectionA: SupervisorSectionASnapshot | null }> =>
  request(`/appointments/supervisor/applications/${encodeURIComponent(String(id))}/section-a/`);
