import type {
  ReconciliationAllowedResolution,
  ReconciliationFilters,
  ReconciliationResolution,
} from '../types';
import { ApiError } from '../services/apiClient';
import {
  APP_ROUTES,
  routeForMarkRecord,
  routeForPanelRecommendation,
  routeForSupervisorApplication,
} from '../constants/routes';

export const buildReconciliationQuery = (filters: ReconciliationFilters): string => {
  const params = new URLSearchParams();
  if (filters.module) params.set('module', filters.module);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.repairability) params.set('repairability', filters.repairability);
  if (filters.programme) params.set('programme', filters.programme);
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 25));
  return `?${params.toString()}`;
};

export const resolutionPayload = (
  resolution: ReconciliationAllowedResolution,
  programme?: string,
): ReconciliationResolution => ({
  action: resolution.action,
  ...(resolution.semesterId ? { semesterId: resolution.semesterId } : {}),
  ...(resolution.requiresProgramme && programme ? { programme } : {}),
});

export const reconciliationErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 409) {
    return error.message.includes('changed after preview')
      ? 'The issue changed after preview. Refresh and review it again.'
      : error.message;
  }
  return error instanceof Error ? error.message : 'Unable to complete reconciliation.';
};

export const reconciliationRecordRoute = (
  targetModule?: string,
  recordType?: string,
  recordId?: string,
): string | null => {
  if (!recordId) return null;
  if (targetModule === 'SUPERVISOR_APPOINTMENTS' && recordType === 'SUPERVISOR_APPLICATION') {
    return routeForSupervisorApplication(recordId);
  }
  if (targetModule === 'PANEL_APPOINTMENTS' && recordType === 'PANEL_RECOMMENDATION') {
    return routeForPanelRecommendation(recordId);
  }
  if (targetModule === 'MARKS') {
    return recordType === 'MARK_RECORD'
      ? routeForMarkRecord(recordId)
      : APP_ROUTES.marks;
  }
  if (targetModule === 'DASHBOARD' && recordType === 'TIMELINE_ENTRY') {
    return APP_ROUTES.dashboardTimeline;
  }
  return null;
};
