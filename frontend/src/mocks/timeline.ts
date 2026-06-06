/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for the semester timeline (UC46–UC48). Swap for real API later.

import { TimelineEntry } from '../types';

export const MOCK_TIMELINE_ENTRIES: TimelineEntry[] = [
  {
    id: 'ent_1',
    event: 'Submit appointment of supervisor forms',
    category: 'Research Project (P1)',
    startDate: '16 Mar 2026',
    endDate: '20 Mar 2026',
    targetRole: ['STUDENT'],
    status: 'Upcoming',
  },
  {
    id: 'ent_2',
    event: 'Office informs students and supervisors of step 2 decision',
    category: 'Research Project (P1)',
    startDate: '03 Apr 2026',
    endDate: '03 Apr 2026',
    targetRole: ['OFFICE_STAFF'],
    status: 'Deadline',
  },
  {
    id: 'ent_3',
    event: 'Supervisor nominates Internal Examiner (Panel)',
    category: 'Research Project (P1)',
    startDate: '04 May 2026',
    endDate: '22 May 2026',
    targetRole: ['STUDENT', 'LECTURER'],
    status: 'Upcoming',
  },
  {
    id: 'ent_4',
    event: 'Final presentation',
    category: 'Research Project (P2)',
    startDate: '08 Jun 2026',
    endDate: '03 Jul 2026',
    targetRole: ['STUDENT', 'LECTURER'],
    status: 'Upcoming',
  },
  {
    id: 'ent_5',
    event: 'Marks entry',
    category: 'Research Project (P2)',
    startDate: '08 Jun 2026',
    endDate: '10 Jul 2026',
    targetRole: ['STUDENT', 'LECTURER'],
    status: 'Upcoming',
  },
];

export const MOCK_IMPORTED_TIMELINE_ENTRIES: TimelineEntry[] = [
  {
    id: 'ent_1_new',
    event: 'Submit appointment of supervisor forms (Reloaded)',
    category: 'Research Project (P1)',
    startDate: '16 Mar 2026',
    endDate: '20 Mar 2026',
    targetRole: ['STUDENT'],
    status: 'Upcoming',
  },
  {
    id: 'ent_2_new',
    event: 'Office decision notification (Reloaded)',
    category: 'Research Project (P1)',
    startDate: '03 Apr 2026',
    endDate: '03 Apr 2026',
    targetRole: ['OFFICE_STAFF'],
    status: 'Deadline',
  },
  {
    id: 'ent_3_new',
    event: 'Final presentation (Reloaded)',
    category: 'Research Project (P2)',
    startDate: '08 Jun 2026',
    endDate: '03 Jul 2026',
    targetRole: ['STUDENT', 'LECTURER'],
    status: 'Upcoming',
  },
];
