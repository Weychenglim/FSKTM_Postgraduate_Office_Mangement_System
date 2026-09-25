import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appSource = readFileSync(resolve('src/App.tsx'), 'utf8');
const timelineService = readFileSync(resolve('src/services/timelineApi.ts'), 'utf8');
const timelineManagement = readFileSync(resolve('src/components/TimelineManagement.tsx'), 'utf8');
const marksConfig = readFileSync(resolve('src/components/MarkEntryPeriodConfig.tsx'), 'utf8');
const reports = readFileSync(resolve('src/components/WorkflowReports.tsx'), 'utf8');

assert.match(
  appSource,
  /isDashboardSemestersRoute[\s\S]+currentUser\.role !== 'Office Staff\/Admin'/,
  'semester management must redirect non-office roles',
);
assert.match(
  appSource,
  /const AcademicSemesterManagement = lazyNamed/,
  'semester management must remain lazy-loaded',
);
assert.match(
  timelineService,
  /body\.append\('semesterId', String\(semesterId\)\)/,
  'timeline uploads must use the persisted semester identifier',
);
assert.equal(
  timelineService.includes("body.append('semester',"),
  false,
  'timeline uploads must not submit free-text semester labels',
);
assert.match(
  timelineManagement,
  /getAcademicSemesters\(\)/,
  'timeline management must load authoritative semester options',
);
assert.match(
  marksConfig,
  /semesterId: Number\(form\.semesterId\)/,
  'Marks periods must submit the authoritative semester identifier',
);
assert.match(
  reports,
  /semester: 'active'/,
  'workflow reports must default to the active semester',
);

console.log('academic semester integration tests passed');
