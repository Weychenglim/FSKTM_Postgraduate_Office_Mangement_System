/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for a student's own document submissions (UC35).

import { SubmissionRecord } from '../types';

export const MOCK_STUDENT_SUBMISSIONS: SubmissionRecord[] = [
  {
    id: 'sub-1',
    name: 'thesis_v2_final_revision.pdf',
    category: 'Final Thesis Draft',
    uploaded: 'Oct 24, 2023 • 10:45 AM',
    size: '4.2 MB',
    sizeBytes: 4404019,
    status: 'Approved',
  },
  {
    id: 'sub-2',
    name: 'midterm_progress_2023.docx',
    category: 'Midterm Progress Report',
    uploaded: 'Nov 12, 2023 • 02:15 PM',
    size: '1.8 MB',
    sizeBytes: 1887436,
    status: 'Pending Review',
  },
  {
    id: 'sub-3',
    name: 'proposal_v1_notes.docx',
    category: 'Thesis Proposal',
    uploaded: 'Dec 01, 2023 • 09:30 AM',
    size: '2.4 MB',
    sizeBytes: 2516582,
    status: 'Draft',
  },
];
