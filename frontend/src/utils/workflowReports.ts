import type { UserRole, WorkflowReportAttentionItem, WorkflowReportFilters } from '../types';
import {
  APP_ROUTES,
  routeForDashboardTimeline,
  routeForParticipantLifecycle,
  routeForPanelRecommendation,
  routeForSupervisorApplication,
} from '../constants/routes';

export const buildWorkflowReportQuery = (filters: WorkflowReportFilters): string => {
  const params = new URLSearchParams();
  if (filters.startDate?.trim()) params.set('startDate', filters.startDate.trim());
  if (filters.endDate?.trim()) params.set('endDate', filters.endDate.trim());
  if (filters.programme?.trim()) params.set('programme', filters.programme.trim());
  if (filters.semester?.trim()) params.set('semester', filters.semester.trim());
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const formatReportMetric = (
  value: number | null | undefined,
  suffix = '',
): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value}${suffix}`;
};

export const canAccessWorkflowReports = (role: UserRole): boolean =>
  role === 'Office Staff/Admin'
  || role === 'Programme Coordinator'
  || role === 'Lecturer';

export const resolveWorkflowReportRecordRoute = (
  item: Pick<WorkflowReportAttentionItem, 'recordType' | 'recordId'>,
): string => {
  if (item.recordType === 'STUDENT_PARTICIPANT' || item.recordType === 'LECTURER_PARTICIPANT') {
    return routeForParticipantLifecycle();
  }
  if (item.recordType === 'SUPERVISOR_APPLICATION') {
    return routeForSupervisorApplication(item.recordId);
  }
  if (item.recordType === 'PANEL_RECOMMENDATION') {
    return routeForPanelRecommendation(item.recordId);
  }
  if (item.recordType === 'TIMELINE_ENTRY') {
    return routeForDashboardTimeline();
  }
  return item.recordType === 'MARK_TASK' ? APP_ROUTES.marks : APP_ROUTES.dashboardReports;
};

export const reportLabel = (value: string): string =>
  value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
