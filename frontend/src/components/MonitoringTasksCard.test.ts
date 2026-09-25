import assert from 'node:assert/strict';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonitoringTasksCardView } from './MonitoringTasksCard';
import type { DashboardTask } from '../types';

const renderView = (
  props: Partial<ComponentProps<typeof MonitoringTasksCardView>>,
) => renderToStaticMarkup(
  createElement(MonitoringTasksCardView, {
    tasks: [],
    loading: false,
    error: null,
    onRetry: () => undefined,
    onTaskClick: () => undefined,
    ...props,
  }),
);

const waitingTask: DashboardTask = {
  id: 'supervisor-12',
  name: 'Supervisor appointment: Demo Student',
  status: 'pending',
  statusText: 'Pending review',
  target: 'Supervisor Appointments',
  targetModule: 'SUPERVISOR_APPOINTMENTS',
  recordType: 'SUPERVISOR_APPLICATION',
  recordId: '12',
  waitingSince: '2026-07-20T00:00:00+08:00',
  waitingDays: 3,
  waitingOn: 'SUPERVISOR',
  dueAt: null,
  daysUntilDue: null,
  deadlineState: null,
};

const deadlineTask: DashboardTask = {
  id: 'marks-8',
  name: 'Marks entry: Demo Student',
  status: 'overdue',
  statusText: 'Past due',
  target: 'Marks Entry',
  targetModule: 'MARKS',
  recordType: 'EVALUATION_TASK',
  recordId: '8',
  waitingSince: null,
  waitingDays: null,
  waitingOn: null,
  dueAt: '2026-07-21T00:00:00+08:00',
  daysUntilDue: -2,
  deadlineState: 'OVERDUE',
};

const undatedTask: DashboardTask = {
  id: 'marks-9',
  name: 'Marks entry: Demo Student Two',
  status: 'pending',
  statusText: 'Awaiting period configuration',
  target: 'Marks Entry',
  targetModule: 'MARKS',
  recordType: 'EVALUATION_TASK',
  recordId: '9',
  waitingSince: null,
  waitingDays: null,
  waitingOn: null,
  dueAt: null,
  daysUntilDue: null,
  deadlineState: 'NO_DEADLINE',
};

{
  const html = renderView({ loading: true });
  assert.match(html, /Loading action centre/);
  assert.match(html, /role="status"/);
}

{
  const html = renderView({ error: 'Dashboard actions are unavailable.' });
  assert.match(html, /Dashboard actions are unavailable/);
  assert.match(html, /Retry/);
  assert.match(html, /role="alert"/);
}

{
  const html = renderView({});
  assert.match(html, /No actions waiting/);
}

{
  const html = renderView({ tasks: [waitingTask, deadlineTask, undatedTask] });
  assert.match(html, /Supervisor appointment: Demo Student/);
  assert.match(html, /Waiting on Supervisor for 3 days/);
  assert.match(html, /Marks entry: Demo Student/);
  assert.match(html, /Overdue by 2 days/);
  assert.match(html, /No deadline/);
  assert.match(html, /3 items/);
}

console.log('MonitoringTasksCard tests passed');
