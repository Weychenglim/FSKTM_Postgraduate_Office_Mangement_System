import { PanelWorkloadRecord } from '../types';
import { getPanelWorkloadSummary, getPanelWorkloadUtilization } from './panelWorkloadRecords';

const rows: PanelWorkloadRecord[] = [
  {
    id: 'L1',
    name: 'Available Lecturer',
    department: 'Data Science',
    currentStudents: 2,
    workloadLimit: 5,
    availability: 'Available',
    initials: 'AL',
    confirmedAppointments: 2,
    pendingNominations: 0,
    workloadItems: [],
  },
  {
    id: 'L2',
    name: 'Near Lecturer',
    department: 'Software Engineering',
    currentStudents: 4,
    workloadLimit: 5,
    availability: 'Near Limit',
    initials: 'NL',
    confirmedAppointments: 2,
    pendingNominations: 2,
    workloadItems: [],
  },
  {
    id: 'L3',
    name: 'Full Lecturer',
    department: 'Artificial Intelligence',
    currentStudents: 5,
    workloadLimit: 5,
    availability: 'Full Load',
    initials: 'FL',
    confirmedAppointments: 1,
    pendingNominations: 4,
    workloadItems: [],
  },
];

const summary = getPanelWorkloadSummary(rows);

if (summary.totalPanels !== 3) throw new Error(`Expected 3 panels, got ${summary.totalPanels}`);
if (summary.available !== 1) throw new Error(`Expected 1 available, got ${summary.available}`);
if (summary.nearLimit !== 1) throw new Error(`Expected 1 near limit, got ${summary.nearLimit}`);
if (summary.fullLoad !== 1) throw new Error(`Expected 1 full load, got ${summary.fullLoad}`);

if (getPanelWorkloadUtilization({ ...rows[0], currentStudents: 6, workloadLimit: 5 }) !== 100) {
  throw new Error('Utilization should clamp overloaded panel members to 100%.');
}

if (getPanelWorkloadUtilization({ ...rows[0], currentStudents: 2, workloadLimit: 0 }) !== 0) {
  throw new Error('Utilization should be 0% when workload limit is zero.');
}

console.log('panelWorkloadRecords tests passed');
