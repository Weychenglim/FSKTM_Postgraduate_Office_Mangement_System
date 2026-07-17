import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appSource = readFileSync(resolve('src/App.tsx'), 'utf8');

const routeModules = [
  'MarkEntryPeriodConfig',
  'RubricsManagementView',
  'EvaluationTaskAssignment',
  'MarkEntryRecords',
  'MarkEntryRecordDetail',
  'PanelAppointmentManagement',
  'SupervisorAppointmentManagement',
  'LecturerMarksEntry',
  'LecturerPanelAppointments',
  'LecturerSupervisorAppointments',
  'AdministrationDashboard',
  'TimelineManagement',
  'FileRepository',
  'StudentFileSubmission',
  'NotificationsAnnouncements',
  'AnnouncementManagement',
  'AcademicFAQEditor',
  'StudentFAQChatbot',
  'LetterTemplateManagement',
  'StudentLetterGeneration',
  'StudentRegistry',
  'StudentDashboard',
  'LecturerDashboard',
  'CoordinatorDashboard',
  'CoordinatorSupervisorApprovals',
  'StudentSupervisorAppointment',
  'StudentPanelAppointment',
  'SettingsView',
];

for (const moduleName of routeModules) {
  assert.equal(
    appSource.includes(`import { ${moduleName} } from './components/${moduleName}'`),
    false,
    `${moduleName} should be lazy-loaded instead of eagerly imported in App.tsx`,
  );
  assert.match(
    appSource,
    new RegExp(`const ${moduleName} = lazyNamed\\('${moduleName}'`),
    `${moduleName} should use the shared lazyNamed route loader`,
  );
}

assert.equal(
  appSource.includes('CoordinatorSupervisorDeferred'),
  false,
  'Coordinator supervisor approvals should not use the stale Deferred component name',
);

const coordinatorSupervisorSource = readFileSync(
  resolve('src/components/CoordinatorSupervisorApprovals.tsx'),
  'utf8',
);
const lecturerSupervisorSource = readFileSync(
  resolve('src/components/LecturerSupervisorAppointments.tsx'),
  'utf8',
);

assert.equal(
  coordinatorSupervisorSource.includes('window.prompt'),
  false,
  'Coordinator supervisor rejection should use an in-app reason control instead of window.prompt',
);

assert.equal(
  lecturerSupervisorSource.includes('prompt('),
  false,
  'Lecturer supervisor rejection should use an in-app reason control instead of prompt()',
);

assert.match(
  appSource,
  /<React\.Suspense fallback=\{<ModuleLoadingFallback \/>\}>/,
  'Authenticated route content should be wrapped in a shared Suspense fallback',
);

console.log('route lazy loading tests passed');
