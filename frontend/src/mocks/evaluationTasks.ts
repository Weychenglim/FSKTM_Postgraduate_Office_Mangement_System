/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for evaluation task assignment preview (UC25). Swap for real API later.

import { EvaluationPreviewTask } from '../types';

export const MOCK_EVALUATION_PREVIEW_TASKS: EvaluationPreviewTask[] = [
  {
    id: 't1',
    studentId: 'MEA2301184',
    studentName: 'Sarah Natasha',
    researchTitle: 'Blockchain-Based Verification Framework for Academic Credentials',
    panelMember: 'Dr. Sarah Lim',
    evaluatorRole: 'PANEL',
    evaluatorRoleLabel: 'Panel',
    semester: 'Sem 1 2025/2026',
    status: 'GENERATED',
  },
  {
    id: 't2',
    studentId: 'MEA2302199',
    studentName: 'Jason Lee',
    researchTitle: 'Quantum Computing Algorithms in Cryptography',
    panelMember: 'Assoc. Prof. Dr. Amina Malik',
    evaluatorRole: 'SUPERVISOR',
    evaluatorRoleLabel: 'Supervisor',
    semester: 'Sem 1 2025/2026',
    status: 'GENERATED',
  },
  {
    id: 't3',
    studentId: 'MEA2400712',
    studentName: 'Nur Aina Rahman',
    researchTitle: 'Blockchain-Based Academic Record Verification System',
    panelMember: 'Dr. Sarah Lim',
    evaluatorRole: 'PANEL',
    evaluatorRoleLabel: 'Panel',
    semester: 'Sem 1 2025/2026',
    status: 'GENERATED',
  },
  {
    id: 't4',
    studentId: 'MEA2400881',
    studentName: 'Kumar Raj',
    researchTitle: 'Cloud-Based Research Document Management',
    panelMember: 'Dr. Robert Chen',
    evaluatorRole: 'BACKUP',
    evaluatorRoleLabel: 'Backup / Manual Override',
    semester: 'Sem 1 2025/2026',
    status: 'GENERATED',
  },
  {
    id: 't5',
    studentId: 'MEA2401023',
    studentName: 'Farah Nabila',
    researchTitle: 'Mobile Learning Adoption in Higher Education',
    panelMember: 'Dr. Robert Chen',
    evaluatorRole: 'PANEL',
    evaluatorRoleLabel: 'Panel',
    semester: 'Sem 1 2025/2026',
    status: 'GENERATED',
  },
];
