import assert from 'node:assert/strict';
import test from 'node:test';
import { officeMonitoringRoute, officeMonitoringView, filterMonitoringMarks } from './officeMonitoring';
import type { MarkRecord } from '../types';

test('monitoring links select the destination workspace and an explicit view', () => {
  for (const view of ['supervisor-pending', 'panel-pending', 'incomplete', 'backup', 'panel-capacity'] as const) {
    const route = new URL(officeMonitoringRoute(view), 'https://portal.test');
    assert.equal(officeMonitoringView(route.pathname, route.search), view);
  }
  assert.match(officeMonitoringRoute('supervisor-pending'), /^\/supervisor-appointments\/requests\?/);
  assert.match(officeMonitoringRoute('panel-pending'), /panelSection=requests/);
  assert.equal(officeMonitoringView('/dashboard', '?monitor=backup'), null);
  assert.equal(officeMonitoringView('/marks/records', '?monitor=invalid'), null);
});

test('marks monitoring matches active incomplete tasks and all active Backup assignments', () => {
  const records = [
    { id: 'draft', status: 'Draft', evaluatorRole: 'SUPERVISOR', taskLifecycleStatus: 'ACTIVE' },
    { id: 'not-started', status: 'Not Started', evaluatorRole: 'PANEL', taskLifecycleStatus: 'ACTIVE' },
    { id: 'backup-submitted', status: 'Submitted', evaluatorRole: 'BACKUP', taskLifecycleStatus: 'ACTIVE' },
    { id: 'backup-draft', status: 'Draft', evaluatorRole: 'BACKUP', taskLifecycleStatus: 'ACTIVE' },
    { id: 'paused', status: 'Draft', evaluatorRole: 'BACKUP', taskLifecycleStatus: 'PAUSED' },
    { id: 'retired', status: 'Not Started', evaluatorRole: 'BACKUP', taskLifecycleStatus: 'RETIRED' },
  ] as MarkRecord[];
  assert.deepEqual(filterMonitoringMarks(records, 'incomplete').map(row => row.id), ['draft', 'not-started', 'backup-draft']);
  assert.deepEqual(filterMonitoringMarks(records, 'backup').map(row => row.id), ['backup-submitted', 'backup-draft']);
  assert.equal(filterMonitoringMarks(records, null), records);
});
