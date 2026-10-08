import { MarkRecord } from '../types';

export type MarkRecordStatusTab =
  | 'All Records'
  | 'Submitted'
  | 'Draft Saved'
  | 'Not Started'
  | 'Overdue';

export interface MarkRecordSummary {
  total: number;
  submitted: number;
  draft: number;
  notStarted: number;
  overdue: number;
  incomplete: number;
}

export const getOperationalMarkRecords = (records: MarkRecord[]): MarkRecord[] =>
  records.filter(record => !record.taskLifecycleStatus || record.taskLifecycleStatus === 'ACTIVE');

export const getMarkMonitoringSemesterLabel = (records: MarkRecord[]): string => {
  const semesters = [...new Set(getOperationalMarkRecords(records).map(record => record.semester))];
  if (!semesters.length) return 'No active evaluation tasks';
  return semesters.length === 1 ? semesters[0] : `Multiple semesters (${semesters.length})`;
};

export const getMarkRecordSummary = (records: MarkRecord[]): MarkRecordSummary => {
  records = getOperationalMarkRecords(records);
  const submitted = records.filter((record) => record.status === 'Submitted').length;
  const draft = records.filter((record) => record.status === 'Draft').length;
  const notStarted = records.filter((record) => record.status === 'Not Started').length;
  const overdue = records.filter((record) => record.status === 'Overdue').length;

  return {
    total: records.length,
    submitted,
    draft,
    notStarted,
    overdue,
    incomplete: draft + notStarted + overdue,
  };
};

export const filterMarkRecordsByStatusTab = (
  records: MarkRecord[],
  statusTab: MarkRecordStatusTab,
): MarkRecord[] => {
  if (statusTab === 'All Records') return records;
  if (statusTab === 'Draft Saved') {
    return records.filter((record) => record.status === 'Draft');
  }
  return records.filter((record) => record.status === statusTab);
};
