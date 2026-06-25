import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentFiles = [
  'MarkEntryDetail.tsx',
  'RecommendationDetailsDrawer.tsx',
  'RubricsManagementView.tsx',
  'StudentSupervisorAppointment.tsx',
];

const forbiddenPattern = /\b(?:window\.)?confirm\s*\(/;

for (const fileName of componentFiles) {
  const filePath = join(process.cwd(), 'src', 'components', fileName);
  const source = readFileSync(filePath, 'utf8');
  if (forbiddenPattern.test(source)) {
    throw new Error(`${fileName} must use PortalConfirmModal instead of browser confirm().`);
  }
}

console.log('portalConfirmUsage tests passed');
