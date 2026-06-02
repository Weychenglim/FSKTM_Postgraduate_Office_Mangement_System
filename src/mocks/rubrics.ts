/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for rubric components (UC26). Swap for real API responses later.

import { EditableRubricWeight, MarkRubricBreakdownRow, RubricComponent } from '../types';

export const MOCK_RUBRIC_COMPONENTS: RubricComponent[] = [
  {
    id: '1',
    name: 'Problem Definition',
    description: 'Clarity of problem statement and research objectives',
    maxMarks: 20,
    required: true,
    status: 'ACTIVE',
    displayOrder: 1,
  },
  {
    id: '2',
    name: 'Literature Review',
    description: 'Relevance and depth of reviewed work',
    maxMarks: 20,
    required: true,
    status: 'ACTIVE',
    displayOrder: 2,
  },
  {
    id: '3',
    name: 'Methodology',
    description: 'Suitability and completeness of proposed approach',
    maxMarks: 25,
    required: true,
    status: 'ACTIVE',
    displayOrder: 3,
  },
  {
    id: '4',
    name: 'Technical Understanding',
    description: 'Understanding of system, tools, algorithms, or framework',
    maxMarks: 20,
    required: true,
    status: 'ACTIVE',
    displayOrder: 4,
  },
  {
    id: '5',
    name: 'Presentation and Q&A',
    description: 'Communication, structure, and response to questions',
    maxMarks: 15,
    required: true,
    status: 'ACTIVE',
    displayOrder: 5,
  },
];

export const MOCK_MARK_ENTRY_MODAL_RUBRICS: EditableRubricWeight[] = [
  { id: 1, name: 'Research Methodology Proposal', weight: 20 },
  { id: 2, name: 'Oral Defense Presentation', weight: 30 },
  { id: 3, name: 'Written Thesis Dissertation Progress', weight: 40 },
  { id: 4, name: 'Technical Demo & Artifacts', weight: 10 },
];

export const MOCK_MARK_RUBRIC_BREAKDOWN: MarkRubricBreakdownRow[] = [
  {
    component: 'Problem Definition',
    maxMarks: 20,
    marksAwarded: 18,
    feedback: 'Clear problem statement and objectives.',
  },
  {
    component: 'Literature Review',
    maxMarks: 20,
    marksAwarded: 16,
    feedback: 'Relevant sources with good coverage.',
  },
  {
    component: 'Methodology',
    maxMarks: 25,
    marksAwarded: 21,
    feedback: 'Methodology is suitable and well explained.',
  },
  {
    component: 'Technical Understanding',
    maxMarks: 20,
    marksAwarded: 17,
    feedback: 'Strong technical understanding.',
  },
  {
    component: 'Presentation and Q&A',
    maxMarks: 15,
    marksAwarded: 12,
    feedback: 'Good presentation with minor clarity issues.',
  },
];

export const MOCK_RUBRIC_VALIDATION_REQUIREMENTS = [
  { id: '1', text: 'Total weight must be exactly 100%', type: 'check' },
  { id: '2', text: 'Required components must have > 0 max marks', type: 'check' },
  { id: '3', text: 'All component names must be unique', type: 'check' },
  { id: '4', text: 'Changes affect new tasks only', type: 'info' },
] as const;
