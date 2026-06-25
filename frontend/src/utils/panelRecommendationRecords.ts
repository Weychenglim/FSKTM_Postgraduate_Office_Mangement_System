import { PanelRecommendationDraft, PanelRecommendationStatus } from '../types';

export type PanelRecommendationRecordGroup = 'All' | 'Pending' | 'Approved' | 'Rejected';

export const panelRecommendationStatusGroup = (
  status: PanelRecommendationStatus,
): Exclude<PanelRecommendationRecordGroup, 'All'> => {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED_BY_PANEL' || status === 'REJECTED_BY_COORDINATOR') {
    return 'Rejected';
  }
  return 'Pending';
};

export const filterPanelRecommendationRecords = (
  records: PanelRecommendationDraft[],
  query: string,
  group: PanelRecommendationRecordGroup,
) => {
  const normalizedQuery = query.trim().toLowerCase();
  return records.filter((record) => {
    const matchesQuery =
      !normalizedQuery ||
      record.studentName.toLowerCase().includes(normalizedQuery) ||
      record.studentId.toLowerCase().includes(normalizedQuery) ||
      record.proposedTopic.toLowerCase().includes(normalizedQuery) ||
      record.recommendedMember.toLowerCase().includes(normalizedQuery) ||
      (record.supervisorName || '').toLowerCase().includes(normalizedQuery);
    const matchesGroup = group === 'All' || panelRecommendationStatusGroup(record.status) === group;
    return matchesQuery && matchesGroup;
  });
};
