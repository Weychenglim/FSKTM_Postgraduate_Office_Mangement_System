import { PanelRecord } from '../types';

export type PanelRecordStatusTab =
  | 'All Records'
  | 'No Panel'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled';

export interface PanelRecordSummary {
  withoutPanel: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export const getPanelRecordSummary = (records: PanelRecord[]): PanelRecordSummary => ({
  withoutPanel: records.filter((record) => record.status === 'No Panel').length,
  pending: records.filter((record) => record.status === 'Pending' || record.status === 'Recommendation').length,
  approved: records.filter((record) => record.status === 'Approved').length,
  rejected: records.filter((record) => record.status === 'Rejected').length,
  cancelled: records.filter((record) => record.status === 'Cancelled').length,
});

export const filterPanelRecordsByStatusTab = (
  records: PanelRecord[],
  statusTab: PanelRecordStatusTab,
): PanelRecord[] => {
  if (statusTab === 'All Records') return records;
  if (statusTab === 'Pending') {
    return records.filter((record) => record.status === 'Pending' || record.status === 'Recommendation');
  }
  return records.filter((record) => record.status === statusTab);
};
