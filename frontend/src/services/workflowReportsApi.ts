import type { WorkflowReport, WorkflowReportFilters } from '../types';
import { request, requestBlob } from './apiClient';
import { buildWorkflowReportQuery } from '../utils/workflowReports';

export const getWorkflowReport = (
  filters: WorkflowReportFilters = {},
): Promise<WorkflowReport> =>
  request<WorkflowReport>(`/dashboard/reports/${buildWorkflowReportQuery(filters)}`);

export const downloadWorkflowReport = async (
  filters: WorkflowReportFilters = {},
): Promise<void> => {
  const blob = await requestBlob(
    `/dashboard/reports/export/${buildWorkflowReportQuery(filters)}`,
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'workflow_analytics_report.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
