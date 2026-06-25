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

export const getMarkRecordSummary = (records: MarkRecord[]): MarkRecordSummary => {
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
