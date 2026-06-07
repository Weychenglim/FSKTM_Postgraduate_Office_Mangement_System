import { PanelRecord } from '../types';
import { getPanelRecordSummary } from './panelAppointmentRecords';

const records: PanelRecord[] = [
  {
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
    id: 'MEA5',
    studentName: 'Student Five',
    programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
    semester: 'Sem 1 2025/2026',
    supervisor: 'Dr. Supervisor',
    panelMember: 'Not Assigned',
    status: 'Rejected',
    updatedDate: '06 Jun 2026',
  },
];

const summary = getPanelRecordSummary(records);

if (summary.withoutPanel !== 1) throw new Error(`Expected 1 no-panel record, got ${summary.withoutPanel}`);
if (summary.pending !== 2) throw new Error(`Expected 2 pending records, got ${summary.pending}`);
if (summary.approved !== 1) throw new Error(`Expected 1 approved record, got ${summary.approved}`);
if (summary.rejected !== 1) throw new Error(`Expected 1 rejected record, got ${summary.rejected}`);

console.log('panelAppointmentRecords tests passed');
