import type {
  EvaluationTask,
  EvaluationTaskComponent,
  EvaluationPeriodEffectiveStatus,
  EvaluationPeriodLifecycle,
} from '../types/marks';

export function replaceEvaluationTask(
  tasks: EvaluationTask[],
  updatedTask: EvaluationTask,
): EvaluationTask[] {
  return tasks.map((task) => (
    task.id === updatedTask.id ? updatedTask : task
  ));
}

type SetupPeriod = {
  lifecycleStatus: EvaluationPeriodLifecycle | string;
  taskTotals: {
    total: number;
    submitted: number;
    incomplete?: number;
    overdue?: number;
  };
};

type SetupRubric = {
  isReady: boolean;
  isActive: boolean;
};

export type MarksSetupChecklistItem = {
  id: 'period' | 'rubric' | 'tasks' | 'monitor';
  taskName: string;
  status: 'COMPLETED' | 'PENDING';
  actionLabel: string;
};

export type MarksAttentionItem = {
  id: 'overdue' | 'pending' | 'rubric';
  title: string;
  subtext: string;
  count: number;
};

const PERIOD_STATUS_LABELS: Record<EvaluationPeriodEffectiveStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  OPEN: 'Open',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

export function formatPeriodStatus(
  status: EvaluationPeriodEffectiveStatus,
): string {
  return PERIOD_STATUS_LABELS[status];
}

export function buildMarksSetupChecklist(
  periods: SetupPeriod[],
  rubrics: SetupRubric[],
): MarksSetupChecklistItem[] {
  const hasPeriod = periods.some(
    (period) => period.lifecycleStatus !== 'ARCHIVED',
  );
  const hasReadyRubric = rubrics.some(
    (rubric) => rubric.isActive && rubric.isReady,
  );
  const totalTasks = periods.reduce(
    (total, period) => total + period.taskTotals.total,
    0,
  );
  const submittedTasks = periods.reduce(
    (total, period) => total + period.taskTotals.submitted,
    0,
  );
  return [
    {
      id: 'period',
      taskName: 'Configure mark entry period',
      status: hasPeriod ? 'COMPLETED' : 'PENDING',
      actionLabel: 'Open',
    },
    {
      id: 'rubric',
      taskName: 'Define rubric components',
      status: hasReadyRubric ? 'COMPLETED' : 'PENDING',
      actionLabel: 'View',
    },
    {
      id: 'tasks',
      taskName: 'Generate evaluation tasks',
      status: totalTasks > 0 ? 'COMPLETED' : 'PENDING',
      actionLabel: 'View',
    },
    {
      id: 'monitor',
      taskName: 'Monitor mark submissions',
      status:
        totalTasks > 0 && submittedTasks === totalTasks
          ? 'COMPLETED'
          : 'PENDING',
      actionLabel: 'Review',
    },
  ];
}

export function buildMarksAttentionItems(
  periods: SetupPeriod[],
  rubrics: SetupRubric[],
): MarksAttentionItem[] {
  const activePeriods = periods.filter(
    (period) => period.lifecycleStatus !== 'ARCHIVED',
  );
  const overdue = activePeriods.reduce(
    (total, period) => total + (period.taskTotals.overdue || 0),
    0,
  );
  const incomplete = activePeriods.reduce(
    (total, period) => total + (
      period.taskTotals.incomplete
      ?? Math.max(period.taskTotals.total - period.taskTotals.submitted, 0)
    ),
    0,
  );
  const unreadyRubrics = rubrics.filter(
    (rubric) => rubric.isActive && !rubric.isReady,
  ).length;
  return [
    {
      id: 'overdue',
      title: 'Overdue mark submissions',
      subtext: `${overdue} ${overdue === 1 ? 'task' : 'tasks'} past the closing time`,
      count: overdue,
    },
    {
      id: 'pending',
      title: 'Incomplete mark submissions',
      subtext: `${incomplete} ${incomplete === 1 ? 'task' : 'tasks'} not submitted`,
      count: incomplete,
    },
    {
      id: 'rubric',
      title: 'Rubric versions needing work',
      subtext: `${unreadyRubrics} active ${unreadyRubrics === 1 ? 'version' : 'versions'} not ready`,
      count: unreadyRubrics,
    },
  ];
}

export function marksMutationErrorMessage(error: unknown): string {
  if (
    error
    && typeof error === 'object'
    && 'status' in error
    && 'message' in error
  ) {
    const status = Number((error as { status?: unknown }).status);
    const message = (error as { message?: unknown }).message;
    if (
      [400, 403, 404, 409].includes(status)
      && typeof message === 'string'
      && message.trim()
    ) {
      return message;
    }
  }
  return 'Marks configuration could not be saved. Try again.';
}

export function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function buildMarkScorePayload(
  components: EvaluationTaskComponent[],
): Array<{
  componentId: number;
  marksAwarded: number;
  feedback: string;
}> {
  return components.flatMap((component) => {
    if (component.marksAwarded === null) return [];
    return [{
      componentId: component.id,
      marksAwarded: Number(component.marksAwarded),
      feedback: component.feedback || '',
    }];
  });
}
