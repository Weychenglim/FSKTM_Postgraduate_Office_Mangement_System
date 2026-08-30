import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dashboardFiles = [
  'AdministrationDashboard.tsx',
  'CoordinatorDashboard.tsx',
  'LecturerDashboard.tsx',
  'StudentDashboard.tsx',
];

for (const fileName of dashboardFiles) {
  const source = readFileSync(resolve('src/components', fileName), 'utf8');

  assert.match(
    source,
    /<MonitoringTasksCard/,
    `${fileName} should render the persisted action centre`,
  );
  assert.match(
    source,
    /resolveDashboardTaskRoute/,
    `${fileName} should resolve action-centre navigation from task metadata`,
  );
  assert.match(
    source,
    /<DashboardTimeline/,
    `${fileName} should retain the semester timeline visualization`,
  );
}

const monitoringSource = readFileSync(
  resolve('src/components/MonitoringTasksCard.tsx'),
  'utf8',
);
assert.match(monitoringSource, /getDashboardTasks/);
assert.doesNotMatch(monitoringSource, /defaultTasks/);

const timelineApiSource = readFileSync(
  resolve('src/services/timelineApi.ts'),
  'utf8',
);
assert.match(
  timelineApiSource,
  /request<\{ tasks: DashboardTask\[\] \}>\('\/dashboard\/tasks\/'\)/,
);

const appSource = readFileSync(resolve('src/App.tsx'), 'utf8');
assert.equal(
  (appSource.match(/onNavigateToRoute=\{navigate\}/g) ?? []).length,
  dashboardFiles.length + 3,
  'App should wire exact routes into every role dashboard, reports, progress dossiers, and reconciliation',
);

const capacityEntryFiles = [
  'AdministrationDashboard.tsx',
  'AcademicSemesterManagement.tsx',
  'SupervisorWorkloadMonitoring.tsx',
  'PanelWorkloadMonitoring.tsx',
  'WorkflowReconciliationCentre.tsx',
];
for (const fileName of capacityEntryFiles) {
  const source = readFileSync(resolve('src/components', fileName), 'utf8');
  assert.match(
    source,
    /dashboardLecturerCapacity|onOpenCapacity/,
    `${fileName} should link to Lecturer Capacity Management`,
  );
}

assert.ok(
  (appSource.match(/onOpenCapacity=/g) ?? []).length >= 4,
  'App should pass the Lecturer capacity route to semesters, both workloads, and reconciliation',
);
const componentOpening = (name: string, length = 1600) => {
  const start = appSource.indexOf(`<${name}`);
  assert.notEqual(start, -1, `${name} should be rendered by App`);
  return appSource.slice(start, start + length);
};
assert.match(componentOpening('PanelAppointmentManagement'), /onOpenCapacity=/);
assert.match(componentOpening('SupervisorAppointmentManagement'), /onOpenCapacity=/);
assert.doesNotMatch(componentOpening('LecturerMarksEntry', 500), /onOpenCapacity=/);
assert.doesNotMatch(componentOpening('MarkEntryRecords', 700), /onOpenCapacity=/);

console.log('Dashboard action-centre integration tests passed');
