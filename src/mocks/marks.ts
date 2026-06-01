/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for Mark Entry Records. Swap for real API responses later.

import { MarkRecord } from '../types';

export const MOCK_MARK_RECORDS: MarkRecord[] = [
  {
    id: 'MRK-2025-021',
    studentId: 'MEA2400712',
    studentName: 'Nur Aina Rahman',
    studentInitials: 'NR',
    researchTitle: 'Blockchain-Based Academic Record Verification System',
    panelMember: 'Dr. Sarah Lim',
    semester: 'Sem 1 2025/2026',
    programme: 'Master of Software Engineering',
    totalMark: 84,
    status: 'Submitted',
    submittedDate: '12 Dec 2025',
    rubricScores: { 'Proposal': 18, 'Literature Review': 17, 'Methodology': 21, 'System Build': 16, 'Viva': 12 }
  },
  {
    id: 'MRK-2025-018',
    studentId: 'MEA2401023',
    studentName: 'Farah Nabila',
    studentInitials: 'FN',
    researchTitle: 'Mobile Learning Adoption in Higher Education: A Malaysian Case Study',
    panelMember: 'Dr. Robert Chen',
    semester: 'Sem 1 2025/2026',
    programme: 'Master of Information Technology',
    totalMark: 79,
    status: 'Submitted',
    submittedDate: '13 Dec 2025',
    rubricScores: { 'Proposal': 16, 'Literature Review': 16, 'Methodology': 20, 'System Build': 15, 'Viva': 12 }
  },
  {
    id: 'MRK-2025-014',
    studentId: 'MEA2302199',
    studentName: 'Jason Lee',
    studentInitials: 'JL',
    researchTitle: 'Quantum Computing Algorithms in Cryptography & Cybersecurity',
    panelMember: 'Assoc. Prof. Dr. Amina Malik',
    semester: 'Sem 1 2025/2026',
    programme: 'Master of Computer Science',
    totalMark: 'Draft',
    status: 'Draft',
    submittedDate: '-',
    rubricScores: { 'Proposal': 14, 'Literature Review': 15, 'Methodology': 18 }
  },
  {
    id: 'MRK-2025-011',
    studentId: 'MEA2301184',
    studentName: 'Sarah Natasha',
    studentInitials: 'SN',
    researchTitle: 'Blockchain-Based Verification Framework for Academic Credentials',
    panelMember: 'Dr. Sarah Lim',
    semester: 'Sem 1 2025/2026',
    programme: 'Master of Computer Science',
    totalMark: null,
    status: 'Not Started',
    submittedDate: '-'
  },
  {
    id: 'MRK-2025-009',
    studentId: 'MEA2400881',
    studentName: 'Kumar Raj',
    studentInitials: 'KR',
    researchTitle: 'Cloud-Based Research Document Management for Multi-University Collaboration',
    panelMember: 'Dr. Robert Chen',
    semester: 'Sem 1 2025/2026',
    programme: 'Master of Computer Science',
    totalMark: null,
    status: 'Overdue',
    submittedDate: '-'
  },
  {
    id: 'MRK-2025-008',
    studentId: 'MEA2400211',
    studentName: 'Abdul Rahman Malik',
    studentInitials: 'AM',
    researchTitle: 'Internet of Things (IoT) Based Flood Defense Alert Mechanisms',
    panelMember: 'Dr. Sarah Lim',
    semester: 'Sem 1 2025/2026',
    programme: 'Master of Information Technology',
    totalMark: 91,
    status: 'Submitted',
    submittedDate: '10 Dec 2025',
    rubricScores: { 'Proposal': 19, 'Literature Review': 19, 'Methodology': 23, 'System Build': 18, 'Viva': 12 }
  },
  {
    id: 'MRK-2025-007',
    studentId: 'MEA2304910',
    studentName: 'Clara Wong',
    studentInitials: 'CW',
    researchTitle: 'Predictive Medical Diagnostics Using Deep Convoluted Neural Networks',
    panelMember: 'Assoc. Prof. Dr. Amina Malik',
    semester: 'Sem 1 2025/2026',
    programme: 'Master of Software Engineering',
    totalMark: 'Draft',
    status: 'Draft',
    submittedDate: '-'
  },
  {
    id: 'MRK-2025-006',
    studentId: 'MEA2401123',
    studentName: 'Zainab Qureshi',
    studentInitials: 'ZQ',
    researchTitle: 'Interactive Arabic Sign Language Translation Engine with Haptic Feedback',
    panelMember: 'Dr. Robert Chen',
    semester: 'Sem 2 2024/2025',
    programme: 'Master of Information Technology',
    totalMark: 88,
    status: 'Closed',
    submittedDate: '15 Jun 2025'
  }
];
