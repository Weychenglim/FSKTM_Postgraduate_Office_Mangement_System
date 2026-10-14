import assert from 'node:assert/strict';
import type { DocumentTypeOption, TaggableStudent } from '../types';
import { checkChip, formatFileSize, studentsLine, typeAndTags, uploadedLine } from './documentDisplay';
import { EMPTY_DOCUMENT_FILTERS, filtersFromParams, filtersToParams, moreFilterCount } from './documentFilters';
import { defaultSharing, sharingNames, staffTypeChoices, studentAudienceSentence } from './documentSharing';
import { addTags, cleanTag } from './documentTags';
import { acceptAttribute, acceptedKinds, fileProblem, kindForName, kindsSentence, titleFromFileName } from './documentUpload';

const type = (overrides: Partial<DocumentTypeOption>): DocumentTypeOption => ({
  code: 'thesis', label: 'Thesis', description: '', group: 'RESEARCH_PROJECT', groupLabel: 'Research Project',
  kind: 'STUDENT', uploaders: ['STUDENT'], allowedKinds: ['PDF', 'DOCX'], shareSupervisors: true, sharePanel: true,
  shareCoordinator: true, needsCheck: false, onePerStudent: true, isActive: true, ...overrides,
});
const student = (overrides: Partial<TaggableStudent>): TaggableStudent => ({
  matric: 'S1', name: 'Ali Hassan', programme: 'DS', status: 'Active', relation: 'Your supervisee', roles: ['SUPERVISOR'],
  supervisors: [], panel: [], coordinators: [], ...overrides,
});

// Display
assert.equal(formatFileSize(512), '512 B');
assert.equal(formatFileSize(640 * 1024), '640 KB');
assert.equal(formatFileSize(2.5 * 1024 * 1024), '2.5 MB');
assert.equal(formatFileSize(10 * 1024 * 1024), '10 MB');
assert.equal(checkChip('NONE'), null, 'No chip when nobody needs to act');
assert.equal(checkChip('WAITING')?.label, 'Waiting for office');
assert.equal(checkChip('RETURNED')?.label, 'Returned');
assert.deepEqual(studentsLine([]), { main: 'Staff file', sub: '' });
assert.deepEqual(studentsLine([{ matric: 'S1', name: 'Ali Hassan', programme: '' }]), { main: 'Ali Hassan', sub: 'S1' });
assert.deepEqual(
  studentsLine([{ matric: 'S1', name: 'Ali', programme: '' }, { matric: 'S2', name: 'Bella', programme: '' }, { matric: 'S3', name: 'Chen', programme: '' }]),
  { main: 'Ali and 2 more', sub: 'Bella, Chen' },
);
assert.equal(typeAndTags('Thesis', ['draft', 'chapter 4']), 'Thesis   #draft  #chapter 4');
assert.equal(typeAndTags('Letter', []), 'Letter');
assert.equal(uploadedLine('Siti', true), 'Uploaded by you');

// Filters
const parsed = filtersFromParams(new URLSearchParams('view=check&q=ali&student=S1&uploader=staff&status=BAD&kind=PDF&from=2026-10-01&to=yesterday'));
assert.equal(parsed.view, 'check');
assert.equal(parsed.status, '', 'Unknown values fall back to empty');
assert.equal(parsed.to, '', 'Dates must be YYYY-MM-DD');
assert.equal(filtersFromParams(new URLSearchParams('view=everything')).view, 'all');
assert.equal(filtersToParams({ ...EMPTY_DOCUMENT_FILTERS, q: ' ali ', type: 'thesis' }).toString(), 'q=ali&type=thesis');
assert.equal(filtersToParams(EMPTY_DOCUMENT_FILTERS).toString(), '', 'Defaults leave a clean address');
assert.equal(moreFilterCount({ ...EMPTY_DOCUMENT_FILTERS, uploader: 'me', kind: 'PDF', type: 'thesis' }), 2);

// Upload checks mirror the server
assert.equal(kindForName('Report.PDF'), 'PDF');
assert.equal(kindForName('photo.jpeg'), 'IMAGE');
assert.equal(kindForName('archive.zip'), null);
const everything = type({ allowedKinds: ['PDF', 'DOCX', 'IMAGE', 'XLSX', 'PPTX'], label: 'Other' });
assert.deepEqual(acceptedKinds(everything, false), ['PDF', 'DOCX', 'IMAGE'], 'Students never send Excel or PowerPoint');
assert.deepEqual(acceptedKinds(everything, true), ['PDF', 'DOCX', 'IMAGE', 'XLSX', 'PPTX']);
assert.equal(kindsSentence(['PDF', 'DOCX']), 'PDF or Word (.docx)');
assert.equal(kindsSentence(['PDF', 'DOCX', 'IMAGE']), 'PDF, Word (.docx) or JPG or PNG');
assert.equal(acceptAttribute(['PDF', 'IMAGE']), '.pdf,.jpg,.jpeg,.png');
const tenMb = 10 * 1024 * 1024;
assert.equal(fileProblem(null, type({}), false, tenMb), 'Choose a file to upload.');
assert.equal(fileProblem({ name: 'a.pdf', size: 0 }, type({}), false, tenMb), 'This file is empty.');
assert.equal(fileProblem({ name: 'a.pdf', size: 13 * 1024 * 1024 }, type({}), false, tenMb), 'File is 13 MB. The maximum is 10 MB.');
assert.equal(fileProblem({ name: 'a.png', size: 10 }, type({}), false, tenMb), 'Unsupported file type. Thesis accepts PDF or Word (.docx).');
assert.equal(fileProblem({ name: 'a.docx', size: 10 }, type({}), false, tenMb), null);
assert.equal(titleFromFileName('C:\\fake\\Thesis_draft__3.pdf'), 'Thesis draft 3');

// Sharing
assert.deepEqual(defaultSharing(type({ sharePanel: false })), { supervisors: true, panel: false, coordinator: true });
assert.deepEqual(
  sharingNames([student({ supervisors: ['Dr Co'], panel: ['Dr Panel'], coordinators: ['Prof C'] }), student({ supervisors: ['Dr Co', 'Dr Rizal'], coordinators: ['Prof C'] })]),
  { supervisors: ['Dr Co', 'Dr Rizal'], panel: ['Dr Panel'], coordinators: ['Prof C'] },
);
assert.equal(studentAudienceSentence(type({ sharePanel: false })), 'Seen by the PG office, your supervisor and your programme coordinator.');
assert.equal(studentAudienceSentence(type({ shareSupervisors: false, sharePanel: false, shareCoordinator: false })), 'Seen by the PG office only.');
const types = [
  type({ code: 'thesis', uploaders: ['STUDENT'] }),
  type({ code: 'evaluation-form', uploaders: ['SUPERVISOR', 'PANEL', 'COORDINATOR'] }),
  type({ code: 'research-proposal', uploaders: ['STUDENT', 'SUPERVISOR'] }),
  type({ code: 'staff-document', kind: 'STAFF', uploaders: ['LECTURER', 'COORDINATOR'] }),
  type({ code: 'other', kind: 'BOTH', uploaders: ['STUDENT', 'SUPERVISOR', 'PANEL', 'COORDINATOR', 'LECTURER'] }),
];
const codes = (list: DocumentTypeOption[]) => list.map(item => item.code);
assert.deepEqual(codes(staffTypeChoices(types, { isOffice: false, role: 'Lecturer', staffFile: false, students: [{ roles: ['PANEL'] }] })), ['evaluation-form', 'other']);
assert.deepEqual(codes(staffTypeChoices(types, { isOffice: false, role: 'Lecturer', staffFile: false, students: [{ roles: ['SUPERVISOR'] }, { roles: ['PANEL'] }] })), ['evaluation-form', 'other'], 'Every picked student must allow the type');
assert.deepEqual(codes(staffTypeChoices(types, { isOffice: false, role: 'Lecturer', staffFile: false, students: [{ roles: ['SUPERVISOR'] }] })), ['evaluation-form', 'research-proposal', 'other']);
assert.deepEqual(codes(staffTypeChoices(types, { isOffice: false, role: 'Lecturer', staffFile: true, students: [] })), ['staff-document', 'other']);
assert.deepEqual(codes(staffTypeChoices(types, { isOffice: true, role: 'Office Staff/Admin', staffFile: false, students: [] })), ['thesis', 'evaluation-form', 'research-proposal', 'other']);

// Tags
assert.equal(cleanTag('  #Signed   copy '), 'Signed copy');
assert.deepEqual(addTags(['Draft'], 'draft, Final, #final'), { tags: ['Draft', 'Final'], problem: null });
assert.equal(addTags([], 'x').problem, 'A tag is 2 to 30 characters.');
assert.equal(addTags(Array.from({ length: 10 }, (_, n) => `tag ${n}`), 'one more').problem, 'A file can have at most 10 tags.');

console.log('Document display, filter, upload, sharing and tag helpers behave as expected');
