import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildMarkScorePayload,
  buildMarksAttentionItems,
  buildMarksSetupChecklist,
  formatPeriodStatus,
  marksMutationErrorMessage,
  replaceEvaluationTask,
} from './marksProductionManagement';

assert.equal(formatPeriodStatus('DRAFT'), 'Draft');
assert.equal(formatPeriodStatus('SCHEDULED'), 'Scheduled');
assert.equal(formatPeriodStatus('OPEN'), 'Open');
assert.equal(formatPeriodStatus('CLOSED'), 'Closed');
assert.equal(formatPeriodStatus('ARCHIVED'), 'Archived');

const rubric = {
  id: 1,
  isReady: true,
  isActive: true,
};
const period = {
  id: 4,
  lifecycleStatus: 'PUBLISHED',
  effectiveStatus: 'OPEN',
  taskTotals: {
    total: 8,
    submitted: 3,
    incomplete: 5,
  },
};

assert.deepEqual(
  buildMarksSetupChecklist([period], [rubric]),
  [
    { id: 'period', taskName: 'Configure mark entry period', status: 'COMPLETED', actionLabel: 'Open' },
    { id: 'rubric', taskName: 'Define rubric components', status: 'COMPLETED', actionLabel: 'View' },
    { id: 'tasks', taskName: 'Generate evaluation tasks', status: 'COMPLETED', actionLabel: 'View' },
    { id: 'monitor', taskName: 'Monitor mark submissions', status: 'PENDING', actionLabel: 'Review' },
  ],
);

assert.deepEqual(
  buildMarksAttentionItems(
    [{
      ...period,
      taskTotals: {
        ...period.taskTotals,
        overdue: 2,
      },
    }],
    [
      rubric,
      { id: 2, isReady: false, isActive: true },
    ],
  ),
  [
    {
      id: 'overdue',
      title: 'Overdue mark submissions',
      subtext: '2 tasks past the closing time',
      count: 2,
    },
    {
      id: 'pending',
      title: 'Incomplete mark submissions',
      subtext: '5 tasks not submitted',
      count: 5,
    },
    {
      id: 'rubric',
      title: 'Rubric versions needing work',
      subtext: '1 active version not ready',
      count: 1,
    },
  ],
);

assert.equal(
  marksMutationErrorMessage({ status: 409, message: 'Period is closed.' }),
  'Period is closed.',
);
assert.equal(
  marksMutationErrorMessage({ status: 500, message: 'Internal error' }),
  'Marks configuration could not be saved. Try again.',
);

assert.deepEqual(
  buildMarkScorePayload([
    {
      id: 10,
      code: 'required-component',
      name: 'Required component',
      description: '',
      maxMarks: '60.00',
      required: true,
      marksAwarded: null,
      feedback: '',
    },
    {
      id: 11,
      code: 'optional-component',
      name: 'Optional component',
      description: '',
      maxMarks: '40.00',
      required: false,
      marksAwarded: '15.00',
      feedback: 'Persist this score.',
    },
  ]),
  [
    {
      componentId: 11,
      marksAwarded: 15,
      feedback: 'Persist this score.',
    },
  ],
);

const sharedStudentTask = {
  studentId: 'DEMO-STUDENT-001',
  studentName: 'Demo Student',
  initials: 'DS',
  researchTitle: 'Persisted workflows',
  semester: 'Semester 1',
  deadline: '31 Jul 2026',
  status: 'NOT STARTED' as const,
  deadlineState: 'UPCOMING' as const,
  dueAt: '2026-07-31T16:00:00Z',
  daysUntilDue: 3,
};
const originalTasks = [
  { ...sharedStudentTask, id: 10, evaluatorRole: 'SUPERVISOR' as const },
  { ...sharedStudentTask, id: 11, evaluatorRole: 'PANEL' as const },
];
const updatedTask = {
  ...originalTasks[1],
  status: 'DRAFT SAVED' as const,
};
assert.deepEqual(
  replaceEvaluationTask(originalTasks, updatedTask),
  [originalTasks[0], updatedTask],
  'saving one task must not overwrite another task for the same student',
);

const frontendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const guardedSources = [
  path.join(frontendRoot, 'src/services/marksApi.ts'),
  path.join(frontendRoot, 'src/components/MarkEntryPeriodConfig.tsx'),
  path.join(frontendRoot, 'src/components/MarkEntryRecordDetail.tsx'),
  path.join(frontendRoot, 'src/components/MarkEntryDetail.tsx'),
  path.join(frontendRoot, 'src/components/SubmittedMarkDetail.tsx'),
  path.join(frontendRoot, 'src/components/MarksEntryHistory.tsx'),
  path.join(frontendRoot, 'src/components/LecturerMarksEntry.tsx'),
  path.join(frontendRoot, 'src/components/RubricsManagementView.tsx'),
  path.join(frontendRoot, 'src/components/EvaluationTaskAssignment.tsx'),
  path.join(frontendRoot, 'src/components/AlertListCard.tsx'),
  path.join(frontendRoot, 'src/components/QuickActionsCard.tsx'),
  path.join(frontendRoot, 'src/components/MarkEntryRecords.tsx'),
  path.join(frontendRoot, 'src/components/AppLayout.tsx'),
  path.join(frontendRoot, 'src/App.tsx'),
].map((sourcePath) => readFileSync(sourcePath, 'utf8'));
const joinedSources = guardedSources.join('\n');

for (const forbidden of [
  "from '../mocks/marks'",
  "from '../mocks/rubrics'",
  'MOCK_MARK_RECORDS',
  'MOCK_MARK_RUBRIC_BREAKDOWN',
  'Proposal.pdf',
  'Presentation Slides.pdf',
  'Export PDF',
  'Export Records (PDF/CSV)',
  'Download sheet',
  'Notify panel members',
  'Final Grade',
  'Database Sync Active',
  'alert(',
]) {
  assert.equal(
    joinedSources.includes(forbidden),
    false,
    `production Marks source contains forbidden mock or placeholder content: ${forbidden}`,
  );
}
