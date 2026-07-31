import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = readFileSync(resolve('src/App.tsx'), 'utf8');
const routes = readFileSync(resolve('src/constants/routes.ts'), 'utf8');
const service = readFileSync(resolve('src/services/appointmentsApi.ts'), 'utf8');
const studentForm = readFileSync(
  resolve('src/components/SupervisorAppointmentApplicationPage.tsx'),
  'utf8',
);
const lecturer = readFileSync(
  resolve('src/components/LecturerSupervisorAppointments.tsx'),
  'utf8',
);
const office = readFileSync(
  resolve('src/components/SupervisorAppointmentManagement.tsx'),
  'utf8',
);

assert.match(routes, /supervisorAppointmentRequirements: '\/supervisor-appointments\/requirements'/);
assert.match(app, /SupervisorDocumentRequirements/);
assert.match(app, /currentUser\.role !== 'Office Staff\/Admin'/);
assert.match(service, /requestMultipart<SupervisorApplicationRecord>/);
assert.match(service, /requestBlob\([\s\S]*documents\/\$\{document\.id\}\/download/);
assert.match(studentForm, /getActiveSupervisorDocumentRequirements/);
assert.match(studentForm, /validateSupervisorDocumentSelection/);
assert.match(studentForm, /data-requirement-dropzone/);
assert.match(studentForm, /required complete/);
assert.equal(
  studentForm.includes('credit hours and CGPA meet'),
  false,
  'unsupported eligibility claims must be removed',
);
assert.equal(
  lecturer.includes('Detailed_Proposal.pdf'),
  false,
  'lecturer review must not render fabricated documents',
);
assert.equal(
  office.includes('Supervisor Appointment Letter.pdf'),
  false,
  'Office detail must not render fabricated files',
);
assert.equal(office.includes('Missing confirmation letters'), false);
assert.equal(office.includes('Dr. Siti Noor'), false);
assert.equal(lecturer.includes('now added to your supervisee roster'), false);

console.log('supervisor document integration tests passed');
