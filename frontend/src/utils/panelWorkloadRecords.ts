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
