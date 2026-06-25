import assert from 'node:assert/strict';
import { PanelRecommendationDraft } from '../types';
import {
  filterPanelRecommendationRecords,
  panelRecommendationStatusGroup,
} from './panelRecommendationRecords';

const records: PanelRecommendationDraft[] = [
  {
    id: 1,
    studentId: 'MEA1',
    studentName: 'Student Pending',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    proposedTopic: 'Pending topic',
    recommendedMember: 'Dr. Panel',
    recommendedMemberId: 'L1',
    submittedDate: '01 Jun 2026',
    status: 'PENDING_COORDINATOR',
  },
  {
    id: 2,
    studentId: 'MEA2',
    studentName: 'Student Approved',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    proposedTopic: 'Approved topic',
    recommendedMember: 'Dr. Panel',
    recommendedMemberId: 'L1',
    submittedDate: '02 Jun 2026',
    status: 'APPROVED',
  },
  {
    id: 3,
    studentId: 'MEA3',
    studentName: 'Student Rejected',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    proposedTopic: 'Rejected topic',
    recommendedMember: 'Dr. Other',
    recommendedMemberId: 'L2',
    submittedDate: '03 Jun 2026',
    status: 'REJECTED_BY_PANEL',
  },
];

assert.equal(panelRecommendationStatusGroup('SUBMITTED_TO_PANEL'), 'Pending');
assert.equal(panelRecommendationStatusGroup('PENDING_COORDINATOR'), 'Pending');
assert.equal(panelRecommendationStatusGroup('APPROVED'), 'Approved');
assert.equal(panelRecommendationStatusGroup('REJECTED_BY_COORDINATOR'), 'Rejected');
assert.deepEqual(
  filterPanelRecommendationRecords(records, 'approved', 'All').map((record) => record.id),
  [2],
);
assert.deepEqual(
  filterPanelRecommendationRecords(records, '', 'Rejected').map((record) => record.id),
  [3],
);

console.log('panelRecommendationRecords tests passed');
