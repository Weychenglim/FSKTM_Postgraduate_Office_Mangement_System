/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for announcements (UC45). Swap for real API responses later.

import { AnnouncementItem } from '../types';

export const MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    title: 'Semester 1 Exam Schedule Released',
    summary: 'Please check the portal for updated venue details and checklist guidelines for all master courses...',
    target: 'All Students',
    priority: 'Urgent',
    dateCreated: '28 May 2026',
    status: 'Active',
  },
  {
    id: 'ann-2',
    title: 'New Research Grant Opportunity',
    summary: 'Internal funding call for CS faculty members with collaborative partners in South East Asia...',
    target: 'Lecturers',
    priority: 'Info',
    dateCreated: '27 May 2026',
    status: 'Active',
  },
  {
    id: 'ann-3',
    title: 'System Maintenance Notice',
    summary: 'E-learning platform will be offline for 2 hours for security assertions renewal and backup setup...',
    target: 'Staff',
    priority: 'General',
    dateCreated: '25 May 2026',
    status: 'Active',
  },
  {
    id: 'ann-4',
    title: "Dean's Special Address",
    summary: 'Invitation to the annual faculty gathering and postgraduate feedback review assembly...',
    target: 'Coordinators',
    priority: 'Info',
    dateCreated: '24 May 2026',
    status: 'Active',
  },
  {
    id: 'ann-5',
    title: 'Postgraduate Defense Committee Rubrics',
    summary: 'Baseline weights adjusted from 20% to 30% for dissertation oral assessment metrics.',
    target: 'Coordinators',
    priority: 'Urgent',
    dateCreated: '22 May 2026',
    status: 'Active',
  },
  {
    id: 'ann-6',
    title: 'Interactive Sign Language Class Opening',
    summary: 'New experimental software engine available for postgraduate feedback and research testing.',
    target: 'Lecturers',
    priority: 'General',
    dateCreated: '15 May 2026',
    status: 'Expired',
  },
];

export const MOCK_ANNOUNCEMENT_ATTACHMENTS = [
  'exam_schedule_2026_draft.pdf',
  'research_grant_circular_v2.docx',
  'it_system_backup_notes.txt',
];
