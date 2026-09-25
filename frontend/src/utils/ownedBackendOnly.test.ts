import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const appointmentServicePath = path.join(
  frontendRoot,
  'src/services/appointmentsApi.ts',
);
const timelineServicePath = path.join(
  frontendRoot,
  'src/services/timelineApi.ts',
);
const envExamplePath = path.join(frontendRoot, '.env.example');
const viteTypesPath = path.join(frontendRoot, 'src/vite-env.d.ts');
const supervisorWorkloadPath = path.join(
  frontendRoot,
  'src/components/SupervisorWorkloadMonitoring.tsx',
);
const panelWorkspacePath = path.join(
  frontendRoot,
  'src/components/LecturerPanelAppointments.tsx',
);
const panelDrawerPath = path.join(
  frontendRoot,
  'src/components/RecommendPanelMemberDrawer.tsx',
);
const activeSuperviseePath = path.join(
  frontendRoot,
  'src/components/ActiveSuperviseeDetail.tsx',
);
const studentSupervisorPaths = [
  'StudentSupervisorAppointment.tsx',
  'SupervisorAppointmentApplicationPage.tsx',
].map((filename) => path.join(
  frontendRoot,
  'src/components',
  filename,
));
const timelineDrawerPaths = [
  'AddTimelineEntryDrawer.tsx',
  'EditTimelineEntryDrawer.tsx',
  'UploadTimelineDrawer.tsx',
].map((filename) => path.join(
  frontendRoot,
  'src/components',
  filename,
));
const appointmentMocksPath = path.join(
  frontendRoot,
  'src/mocks/appointments.ts',
);
const timelineMocksPath = path.join(frontendRoot, 'src/mocks/timeline.ts');

const appointmentService = readFileSync(appointmentServicePath, 'utf8');
const timelineService = readFileSync(timelineServicePath, 'utf8');
const ownedServiceSource = `${appointmentService}\n${timelineService}`;
const environmentSource = `${readFileSync(envExamplePath, 'utf8')}\n${
  readFileSync(viteTypesPath, 'utf8')
}`;
const ownedComponentSource = [
  supervisorWorkloadPath,
  panelWorkspacePath,
  panelDrawerPath,
  activeSuperviseePath,
  ...studentSupervisorPaths,
  ...timelineDrawerPaths,
].map((sourcePath) => readFileSync(sourcePath, 'utf8')).join('\n');

for (const forbidden of [
  "from '../mocks/appointments'",
  "from '../mocks/timeline'",
  'USE_SUPERVISOR_MOCKS',
  'USE_PANEL_MOCKS',
  'USE_TIMELINE_MOCKS',
  'USE_MOCKS',
  'mockResponse',
  'VITE_USE_SUPERVISOR_BACKEND',
  'VITE_USE_PANEL_BACKEND',
  'VITE_USE_TIMELINE_BACKEND',
]) {
  assert.equal(
    ownedServiceSource.includes(forbidden),
    false,
    `owned production service contains legacy mock path: ${forbidden}`,
  );
}

for (const legacyFlag of [
  'VITE_USE_SUPERVISOR_BACKEND',
  'VITE_USE_PANEL_BACKEND',
  'VITE_USE_TIMELINE_BACKEND',
]) {
  assert.equal(
    environmentSource.includes(legacyFlag),
    false,
    `environment contract still exposes ${legacyFlag}`,
  );
}

assert.equal(
  existsSync(appointmentMocksPath),
  false,
  'appointment mock dataset must not remain in production source',
);
assert.equal(
  existsSync(timelineMocksPath),
  false,
  'timeline mock dataset must not remain in production source',
);

for (const forbiddenFallback of [
  'rawSupervisorRecords',
  'DEFAULT_PANEL_CANDIDATES',
  'defaultStudent',
  'RECOMMENDATION_STUDENT',
  "studentId !== 'MEA2400712'",
  "studentId = 'MEA2209841'",
  'Proposal.pdf',
  'Assoc. Prof. Dr. Amina Malik',
  '2026-03-16',
  'ACADEMIC YEAR 2024/2025',
  'Academic Year 2025/2026',
  'catch(() => setApplications([]))',
  "alert(reason instanceof Error ? reason.message : 'Failed to load supervisor candidates.')",
]) {
  assert.equal(
    ownedComponentSource.includes(forbiddenFallback),
    false,
    `owned component contains fabricated fallback data: ${forbiddenFallback}`,
  );
}

for (const endpoint of [
  '/appointments/supervisor/',
  '/appointments/panel/',
  '/appointments/supervisor/applications/',
  '/appointments/supervisor/my-workload/',
  '/appointments/panel/recommendations/',
]) {
  assert.equal(
    appointmentService.includes(endpoint),
    true,
    `appointment service is missing backend endpoint ${endpoint}`,
  );
}

for (const endpoint of [
  '/dashboard/timeline/active/',
  '/dashboard/timeline/upload/',
  '/dashboard/timeline/entries/',
  '/dashboard/tasks/',
  '/dashboard/summary/',
]) {
  assert.equal(
    timelineService.includes(endpoint),
    true,
    `timeline service is missing backend endpoint ${endpoint}`,
  );
}

console.log('owned backend-only source guard tests passed');
