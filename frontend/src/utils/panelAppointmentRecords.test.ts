import { PanelRecord } from '../types';
import { filterPanelRecordsByStatusTab, getPanelRecordSummary } from './panelAppointmentRecords';

const records: PanelRecord[] = [
  {
    recordId: 'profile-1',
    id: 'MEA1',
    studentName: 'Student One',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    semester: 'Sem 1 2025/2026',
    supervisor: 'Dr. Supervisor',
    panelMember: 'Not Assigned',
    status: 'No Panel',
    updatedDate: '06 Jun 2026',
  },
  {
    recordId: 'recommendation-2',
    id: 'MEA2',
    studentName: 'Student Two',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    semester: 'Sem 1 2025/2026',
    supervisor: 'Dr. Supervisor',
    panelMember: 'Dr. Panel',
    status: 'Recommendation',
    updatedDate: '06 Jun 2026',
  },
  {
    recordId: 'recommendation-3',
    id: 'MEA3',
    studentName: 'Student Three',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    semester: 'Sem 1 2025/2026',
    supervisor: 'Dr. Supervisor',
    panelMember: 'Dr. Panel',
    status: 'Pending',
    updatedDate: '06 Jun 2026',
  },
  {
    recordId: 'appointment-4',
    id: 'MEA4',
    studentName: 'Student Four',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    semester: 'Sem 1 2025/2026',
    supervisor: 'Dr. Supervisor',
    panelMember: 'Dr. Panel',
    status: 'Approved',
    updatedDate: '06 Jun 2026',
  },
  {
    recordId: 'recommendation-5',
    id: 'MEA5',
    studentName: 'Student Five',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    semester: 'Sem 1 2025/2026',
    supervisor: 'Dr. Supervisor',
    panelMember: 'Not Assigned',
    status: 'Rejected',
    updatedDate: '06 Jun 2026',
  },
  {
    recordId: 'recommendation-6',
    id: 'MEA6',
    studentName: 'Student Six',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    semester: 'Sem 2 2025/2026',
    supervisor: 'Dr. Supervisor',
    panelMember: 'Dr. Panel',
    status: 'Cancelled',
    updatedDate: '06 Jun 2026',
    cancellationReason: 'Student changed research direction.',
  },
];

const summary = getPanelRecordSummary(records);

if (summary.withoutPanel !== 1) throw new Error(`Expected 1 no-panel record, got ${summary.withoutPanel}`);
if (summary.pending !== 2) throw new Error(`Expected 2 pending records, got ${summary.pending}`);
if (summary.approved !== 1) throw new Error(`Expected 1 approved record, got ${summary.approved}`);
if (summary.rejected !== 1) throw new Error(`Expected 1 rejected record, got ${summary.rejected}`);
if (summary.cancelled !== 1) throw new Error(`Expected 1 cancelled record, got ${summary.cancelled}`);

const cancelledRecords = filterPanelRecordsByStatusTab(records, 'Cancelled');
if (cancelledRecords.length !== 1 || cancelledRecords[0].recordId !== 'recommendation-6') {
  throw new Error('Cancelled tab should include only cancelled records.');
}

const pendingRecords = filterPanelRecordsByStatusTab(records, 'Pending');
if (pendingRecords.length !== 2 || pendingRecords.some((record) => !['Pending', 'Recommendation'].includes(record.status))) {
  throw new Error('Pending tab should include pending coordinator and selected-panel recommendation records.');
}

console.log('panelAppointmentRecords tests passed');
