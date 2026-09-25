import type {
  ReconciliationApplyRequest,
  ReconciliationAudit,
  ReconciliationFilters,
  ReconciliationListResponse,
  ReconciliationPreview,
} from '../types';
import { buildReconciliationQuery } from '../utils/workflowReconciliation';
import { request } from './apiClient';

export const getReconciliationIssues = (
  filters: ReconciliationFilters = {},
): Promise<ReconciliationListResponse> => request(
  `/dashboard/reconciliation/${buildReconciliationQuery(filters)}`,
);

export const previewReconciliationIssue = (
  issueId: string,
): Promise<ReconciliationPreview> => request(
  `/dashboard/reconciliation/issues/${encodeURIComponent(issueId)}/preview/`,
);

export const applyReconciliationIssue = (
  issueId: string,
  payload: ReconciliationApplyRequest,
): Promise<{ resolved: boolean; issueId: string; action: string }> => request(
  `/dashboard/reconciliation/issues/${encodeURIComponent(issueId)}/apply/`,
  { method: 'POST', body: JSON.stringify(payload) },
);

export const getReconciliationAudits = (): Promise<{ results: ReconciliationAudit[] }> =>
  request('/dashboard/reconciliation/audits/');
