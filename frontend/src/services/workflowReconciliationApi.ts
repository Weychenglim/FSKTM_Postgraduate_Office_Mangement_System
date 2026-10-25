import type {
  ReconciliationAcceptance,
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

export const getReconciliationAudits = (record?: { entityType: string; entityId: string }): Promise<{ results: ReconciliationAudit[]; count?: number }> => {
  const query = record ? `?${new URLSearchParams(record)}` : '';
  return request(`/dashboard/reconciliation/audits/${query}`);
};

export const acceptReconciliationIssue = (issueId: string, payload: { expectedFingerprint: string; reason: string }): Promise<{
  accepted: boolean; issueId: string; acceptance: ReconciliationAcceptance;
}> => request(`/dashboard/reconciliation/issues/${encodeURIComponent(issueId)}/accept/`, {
  method: 'POST', body: JSON.stringify(payload),
});
