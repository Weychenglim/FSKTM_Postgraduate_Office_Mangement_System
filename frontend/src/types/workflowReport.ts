export type WorkflowReportRole = 'OFFICE_ADMIN' | 'COORDINATOR' | 'LECTURER';

export interface WorkflowReportFilters {
  startDate?: string;
  endDate?: string;
  programme?: string;
}

export interface WorkflowReportRecord {
  recordType: string;
  recordId: string;
  studentId?: string;
  studentName?: string;
  programme?: string;
  assignee?: string;
  status: string;
  reportDate: string;
  waitingSince?: string | null;
  waitingDays?: number | null;
  waitingOn?: string | null;
  ageBand?: string | null;
  evaluatorRole?: string;
  dueAt?: string | null;
  daysUntilDue?: number | null;
  deadlineState?: string;
  title?: string;
  level?: string;
  targetRoles?: string[];
}

export interface ReportModuleSummary {
  total: number;
  statusCounts: Record<string, number>;
  waitingOwnerCounts: Record<string, number>;
  ageBands: Record<string, number>;
  records: WorkflowReportRecord[];
}

export interface MarksReportSummary {
  total: number;
  statusCounts: Record<string, number>;
  deadlineStateCounts: Record<string, number>;
  evaluatorRoleCounts: Record<string, number>;
  completionRate: number | null;
  records: WorkflowReportRecord[];
}

export interface TimelineReportSummary {
  total: number;
  statusCounts: Record<string, number>;
  levelCounts: Record<string, number>;
  targetRoleCounts: Record<string, number>;
  records: WorkflowReportRecord[];
}

export interface WorkflowReportAttentionItem {
  kind: 'WAITING' | 'DEADLINE';
  recordType: string;
  recordId: string;
  studentId: string;
  label: string;
  programme: string;
  waitingDays: number | null;
  waitingOn: string | null;
  deadlineState: string | null;
  dueAt: string | null;
}

export interface WorkflowReport {
  generatedAt: string;
  scope: {
    role: WorkflowReportRole;
    programme: string | null;
  };
  filters: {
    startDate: string | null;
    endDate: string | null;
    programme: string | null;
    availableProgrammes: string[];
  };
  overview: {
    totalRecords: number;
    pendingApprovals: number;
    averageWaitingDays: number | null;
    longestWaitingDays: number | null;
    marksCompletionRate: number | null;
    overdueMarks: number;
    activeTimelineEntries: number;
  };
  supervisor: ReportModuleSummary | null;
  panel: ReportModuleSummary | null;
  marks: MarksReportSummary | null;
  timeline: TimelineReportSummary | null;
  attention: WorkflowReportAttentionItem[];
}
