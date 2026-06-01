/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for rubric components (UC26). Swap for real API responses later.

import { RubricComponent } from '../types';

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
