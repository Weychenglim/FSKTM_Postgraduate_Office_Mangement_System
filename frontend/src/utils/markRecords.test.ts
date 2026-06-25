import { MarkRecord } from '../types';
import { filterMarkRecordsByStatusTab, getMarkRecordSummary } from './markRecords';

const records: MarkRecord[] = [
  {
    id: 'MRK-00001',
    studentId: 'S001',
    studentName: 'Submitted Student',
    studentInitials: 'SS',
    researchTitle: 'Submitted research',
    panelMember: 'Dr. Marker',
    semester: 'Sem 1 2025/2026',
    programme: 'MASTER OF COMPUTER SCIENCE (COURSEWORK)',
    totalMark: 88,
    status: 'Submitted',
    submittedDate: '10 Jun 2026',
  },
  {
    id: 'MRK-00002',
    studentId: 'S002',
    studentName: 'Draft Student',
    studentInitials: 'DS',
    researchTitle: 'Draft research',
    panelMember: 'Dr. Marker',
    semester: 'Sem 1 2025/2026',
    programme: 'MASTER OF COMPUTER SCIENCE (COURSEWORK)',
    totalMark: 'Draft',
    status: 'Draft',
    submittedDate: '-',
  },
  {
    id: 'MRK-00003',
    studentId: 'S003',
    studentName: 'Pending Student',
    studentInitials: 'PS',
    researchTitle: 'Pending research',
    panelMember: 'Dr. Marker',
    semester: 'Sem 1 2025/2026',
    programme: 'MASTER OF COMPUTER SCIENCE (COURSEWORK)',
    totalMark: null,
    status: 'Not Started',
    submittedDate: '-',
  },
  {
    id: 'MRK-00004',
    studentId: 'S004',
    studentName: 'Overdue Student',
    studentInitials: 'OS',
    researchTitle: 'Overdue research',
    panelMember: 'Dr. Marker',
    semester: 'Sem 1 2025/2026',
    programme: 'MASTER OF COMPUTER SCIENCE (COURSEWORK)',
    totalMark: null,
    status: 'Overdue',
    submittedDate: '-',
  },
];

const summary = getMarkRecordSummary(records);

if (summary.total !== 4) throw new Error(`Expected total 4, got ${summary.total}`);
if (summary.submitted !== 1) throw new Error(`Expected submitted 1, got ${summary.submitted}`);
if (summary.draft !== 1) throw new Error(`Expected draft 1, got ${summary.draft}`);
if (summary.notStarted !== 1) throw new Error(`Expected notStarted 1, got ${summary.notStarted}`);
if (summary.overdue !== 1) throw new Error(`Expected overdue 1, got ${summary.overdue}`);
if (summary.incomplete !== 3) throw new Error(`Expected incomplete 3, got ${summary.incomplete}`);

const draftRecords = filterMarkRecordsByStatusTab(records, 'Draft Saved');
if (draftRecords.length !== 1 || draftRecords[0].id !== 'MRK-00002') {
  throw new Error('Draft Saved tab should include only Draft records.');
}

const allRecords = filterMarkRecordsByStatusTab(records, 'All Records');
if (allRecords.length !== records.length) {
  throw new Error('All Records tab should not filter records.');
}

console.log('markRecords tests passed');
