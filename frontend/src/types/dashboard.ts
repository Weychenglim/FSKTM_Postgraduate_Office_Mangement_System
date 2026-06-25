/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DashboardAttentionRow {
  id: string;
  type: string;
  count: string;
  targetTab: string;
  detail: string;
  markStatusTab?: import('../utils/markRecords').MarkRecordStatusTab;
}

export type StudentActionIconKey = 'upload' | 'award' | 'mail';

export interface StudentNextAction {
  title: string;
  meta: string;
  due: string;
  target: string;
  iconKey: StudentActionIconKey;
}

export interface DashboardTask {
  id: string;
  name: string;
  status: string;
  statusText: string;
  target: string;
}

export interface DashboardSummary {
  pendingSupervisorRequests: number;
  pendingSupervisorApprovals: number;
  pendingPanelReviews: number;
  pendingPanelApprovals: number;
  incompleteMarkEntries: number;
  overdueMarkEntries: number;
  supervisorMarkTasks?: number;
  panelMarkTasks?: number;
  backupMarkTasks?: number;
  submittedMarkEntries?: number;
}
