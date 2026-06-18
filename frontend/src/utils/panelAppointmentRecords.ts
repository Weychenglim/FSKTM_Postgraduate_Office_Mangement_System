import { PanelRecord } from '../types';

export interface PanelRecordSummary {
  withoutPanel: number;
  pending: number;
  approved: number;
  rejected: number;
}

export const getPanelRecordSummary = (records: PanelRecord[]): PanelRecordSummary => ({
  withoutPanel: records.filter((record) => record.status === 'No Panel').length,
  pending: records.filter((record) => record.status === 'Pending' || record.status === 'Recommendation').length,
  approved: records.filter((record) => record.status === 'Approved').length,
  rejected: records.filter((record) => record.status === 'Rejected').length,
});
