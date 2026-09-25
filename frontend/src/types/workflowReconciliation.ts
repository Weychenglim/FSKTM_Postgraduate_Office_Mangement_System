export type ReconciliationSeverity = 'BLOCKING' | 'WARNING';
export type ReconciliationRepairability = 'REPAIRABLE' | 'REVIEW_REQUIRED';

export interface ReconciliationNavigation {
  targetModule?: string;
  recordType?: string;
  recordId?: string;
}

export interface ReconciliationIssue {
  issueId: string;
  module: string;
  issueType: string;
  severity: ReconciliationSeverity;
  repairability: ReconciliationRepairability;
  title: string;
  summary: string;
  recordType: string;
  recordId: string;
  programme: string | null;
  studentId: string | null;
  currentState: Record<string, unknown>;
  suggestion: Record<string, unknown>;
  dependencies: string[];
  navigation: ReconciliationNavigation;
  fingerprint: string;
}

export interface ReconciliationSummary {
  total: number;
  blocking: number;
  warnings: number;
  repairable: number;
  reviewRequired: number;
}

export interface ReconciliationListResponse {
  summary: ReconciliationSummary;
  count: number;
  page: number;
  pageSize: number;
  availableProgrammes: string[];
  results: ReconciliationIssue[];
}

export interface ReconciliationAllowedResolution {
  action: string;
  label: string;
  semesterId?: number;
  studentUserId?: number;
  supervisorId?: number;
  requiresProgramme?: boolean;
}

export interface ReconciliationPreview {
  issue: ReconciliationIssue;
  allowedResolutions: ReconciliationAllowedResolution[];
}

export interface ReconciliationFilters {
  module?: string;
  severity?: string;
  repairability?: string;
  programme?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ReconciliationResolution {
  action: string;
  semesterId?: number;
  programme?: string;
}

export interface ReconciliationApplyRequest {
  expectedFingerprint: string;
  reason: string;
  resolution: ReconciliationResolution;
}

export interface ReconciliationAudit {
  id: number;
  issueType: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: { id: number; name: string };
  reason: string;
  fingerprint: string;
  beforeValues: Record<string, unknown>;
  afterValues: Record<string, unknown>;
  affectedRecords: Record<string, unknown>;
  createdAt: string;
}
