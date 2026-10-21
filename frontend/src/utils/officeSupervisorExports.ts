import { getSupervisorAppointments } from '../services/appointmentsApi';
import type { BrowsePage, BrowseParams } from '../services/coordinatorWorkspaceApi';
import type { SupervisorRecord } from '../types';
import { downloadExcel } from './excelExport';
import type { CsvColumn } from './csvExport';

export type { CsvColumn } from './csvExport';

const appointmentColumns: CsvColumn<SupervisorRecord>[] = [
  { header: 'Student ID', value: record => record.studentId },
  { header: 'Student Name', value: record => record.studentName },
  { header: 'Programme', value: record => record.programme },
  { header: 'Supervisor', value: record => record.supervisor },
  { header: 'Status', value: record => record.status },
  { header: 'Waiting Since', value: record => record.waitingSince || '' },
  { header: 'Waiting Days', value: record => record.waitingDays ?? '' },
  { header: 'Waiting On', value: record => record.waitingOn || '' },
  { header: 'Appointment Status', value: record => record.appointmentLifecycle?.status || '' },
  { header: 'End Outcome', value: record => record.appointmentLifecycle?.endOutcome || '' },
  { header: 'End Reason', value: record => record.appointmentLifecycle?.endReason || '' },
  { header: 'Ended At', value: record => record.appointmentLifecycle?.endedAt || '' },
  { header: 'Ended By', value: record => record.appointmentLifecycle?.endedBy || '' },
  { header: 'Supersedes Appointment ID', value: record => record.appointmentLifecycle?.supersedesAppointmentId ?? '' },
  { header: 'Replacement Appointment ID', value: record => record.appointmentLifecycle?.replacementAppointmentId ?? '' },
  { header: 'Requested Replacement Appointment ID', value: record => record.replacesAppointmentId ?? '' },
  { header: 'Replacement Reason', value: record => record.replacementReason || '' },
  { header: 'Updated Date', value: record => record.updatedDate },
];

/** The legacy full-record request is deliberately deferred until export. */
export async function exportAllOfficeAppointmentRecords(): Promise<number> {
  const records = await getSupervisorAppointments();
  await downloadExcel('supervisor_appointments_report.xlsx', records, appointmentColumns);
  return records.length;
}

/** Collect every matching page before creating a file; reject changing envelopes. */
export async function exportOfficeBrowsePage<T>(
  filename: string,
  loader: (params: BrowseParams) => Promise<BrowsePage<T>>,
  params: BrowseParams,
  columns: CsvColumn<T>[],
): Promise<number> {
  const filters = { ...params, size: 50 };
  const rows: T[] = [];
  let expected: Pick<BrowsePage<T>, 'total' | 'pageSize' | 'pageCount'> | null = null;
  for (let page = 1; page <= (expected?.pageCount ?? 1); page += 1) {
    const result = await loader({ ...filters, page });
    if (!Number.isSafeInteger(result.total) || result.total < 0
      || !Number.isSafeInteger(result.pageSize) || result.pageSize < 1
      || !Number.isSafeInteger(result.pageCount) || result.pageCount < 0
      || (result.total === 0
        ? result.pageCount > 1
        : result.pageCount !== Math.ceil(result.total / result.pageSize))
      || result.page !== page
      || (expected && (result.total !== expected.total || result.pageSize !== expected.pageSize || result.pageCount !== expected.pageCount))) {
      throw new Error('The matching records changed during export. Try again to download a complete file.');
    }
    expected ??= { total: result.total, pageSize: result.pageSize, pageCount: result.pageCount };
    const expectedRows = Math.min(expected.pageSize, expected.total - (page - 1) * expected.pageSize);
    if (result.results.length !== expectedRows) {
      throw new Error('A complete page could not be loaded. Try the export again.');
    }
    rows.push(...result.results);
  }
  await downloadExcel(filename, rows, columns);
  return rows.length;
}
