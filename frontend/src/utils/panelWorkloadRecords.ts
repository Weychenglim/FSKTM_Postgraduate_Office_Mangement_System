import { PanelWorkloadRecord } from '../types';

export interface PanelWorkloadSummary {
  totalPanels: number;
  available: number;
  nearLimit: number;
  fullLoad: number;
}

export const getPanelWorkloadSummary = (records: PanelWorkloadRecord[]): PanelWorkloadSummary => ({
  totalPanels: records.length,
  available: records.filter((record) => record.availability === 'Available').length,
  nearLimit: records.filter((record) => record.availability === 'Near Limit').length,
  fullLoad: records.filter((record) => record.availability === 'Full Load').length,
});

export const getPanelWorkloadUtilization = (record: PanelWorkloadRecord): number => {
  if (
    !Number.isFinite(record.currentStudents)
    || !Number.isFinite(record.workloadLimit)
    || record.currentStudents <= 0
    || record.workloadLimit <= 0
  ) return 0;
  const percentage = Math.round((record.currentStudents / record.workloadLimit) * 100);
  return Math.max(0, Math.min(percentage, 100));
};
