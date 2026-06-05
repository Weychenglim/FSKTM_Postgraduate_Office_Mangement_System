/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DashboardAttentionRow, StudentNextAction } from '../types';

export const MOCK_DASHBOARD_ATTENTION_ROWS: DashboardAttentionRow[] = [
  {
    id: 'attn_1',
    type: 'Students without approved supervisor',
    count: '12 records',
    status: 'OPEN',
    targetTab: 'Supervisor Appointments',
    detail: 'Redirecting to Supervisor Appointment allocation boards...',
  },
  {
    id: 'attn_2',
    type: 'Approved supervisor but no panel assigned',
    count: '5 records',
    status: 'OPEN',
    targetTab: 'Panel Appointments',
    detail: 'Redirecting to Panel Appointment scheduling and assignment portal...',
  },
  {
    id: 'attn_3',
    type: 'Lecturers near supervisor workload limit',
    count: '3 lecturers',
    status: 'OPEN',
    targetTab: 'Supervisor Appointments',
    detail: 'Opening lecturer workload monitor and limit audits...',
  },
  {
    id: 'attn_4',
    type: 'Lecturers near panel workload limit',
    count: '2 lecturers',
    status: 'OPEN',
    targetTab: 'Panel Appointments',
    detail: 'Opening panel workload list to resolve appointment gaps...',
  },
  {
    id: 'attn_5',
    type: 'Mark entry tasks not generated',
    count: '1 semester',
    status: 'OPEN',
    targetTab: 'Marks Entry',
    detail: 'Launching Marks & Evaluation generation engine...',
  },
];

export const MOCK_STUDENT_NEXT_ACTIONS: StudentNextAction[] = [
  {
    title: 'Submit proposal document',
    meta: 'Document Submission - Proposal Due',
    due: '18 Oct 2025',
    target: 'File Management',
    iconKey: 'upload',
  },
  {
    title: 'Check panel appointment release',
    meta: 'Panel Appointment - Recommendation Period',
    due: '28 Nov 2025',
    target: 'Panel Appointments',
    iconKey: 'award',
  },
  {
    title: 'Generate confirmation letter',
    meta: 'Official Documents',
    due: 'Available anytime',
    target: 'Letter Generation',
    iconKey: 'mail',
  },
];
