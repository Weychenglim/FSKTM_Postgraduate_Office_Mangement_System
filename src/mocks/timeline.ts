/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for the semester timeline (UC46–UC48). Swap for real API later.

import { TimelineEntry } from '../types';

export const MOCK_TIMELINE_ENTRIES: TimelineEntry[] = [
  {
    id: 'ent_1',
    event: 'Supervisor Request Period',
    category: 'Supervisor Appointment',
    startDate: '01 Oct 2025',
    endDate: '15 Oct 2025',
    targetRole: ['STUDENT'],
    status: 'Completed',
  },
  {
    id: 'ent_2',
    event: 'Panel Recommendation Period',
    category: 'Panel Appointment',
    startDate: '16 Oct 2025',
    endDate: '30 Oct 2025',
    targetRole: ['LECTURER'],
    status: 'Active',
  },
  {
    id: 'ent_3',
    event: 'Proposal Upload Deadline',
    category: 'Document Submission',
    startDate: '25 Oct 2025',
    endDate: '25 Oct 2025',
    targetRole: ['STUDENT'],
    status: 'Deadline',
  },
  {
    id: 'ent_4',
    event: 'Evaluation Schedule Release',
    category: 'Announcements',
    startDate: '20 Nov 2025',
    endDate: '20 Nov 2025',
    targetRole: ['STUDENT', 'LECTURER'],
    status: 'Upcoming',
  },
  {
    id: 'ent_5',
    event: 'Mark Entry Period',
    category: 'Marks & Evaluation',
    startDate: '01 Dec 2025',
    endDate: '10 Dec 2025',
    targetRole: ['LECTURER'],
    status: 'Upcoming',
  },
];

export const MOCK_IMPORTED_TIMELINE_ENTRIES: TimelineEntry[] = [
  {
    id: 'ent_1_new',
    event: 'Supervisor Request Period (Reloaded)',
    category: 'Supervisor Appointment',
    startDate: '02 Oct 2025',
    endDate: '16 Oct 2025',
    targetRole: ['STUDENT'],
    status: 'Completed',
  },
  {
    id: 'ent_2_new',
    event: 'Panel Recommendation Period (Reloaded)',
    category: 'Panel Appointment',
    startDate: '17 Oct 2025',
    endDate: '01 Nov 2025',
    targetRole: ['LECTURER'],
    status: 'Active',
  },
  {
    id: 'ent_3_new',
    event: 'Proposal Upload Deadline (Reloaded)',
    category: 'Document Submission',
    startDate: '27 Oct 2025',
    endDate: '27 Oct 2025',
    targetRole: ['STUDENT'],
    status: 'Deadline',
  },
];
