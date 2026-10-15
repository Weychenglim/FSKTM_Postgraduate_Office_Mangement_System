import assert from 'node:assert/strict';
import type { BrowsePage, BrowseParams } from '../services/coordinatorWorkspaceApi';
import { exportAllOfficeAppointmentRecords, exportOfficeBrowsePage } from './officeSupervisorExports';

// Keep CSV serialization real; replace only the browser download boundary.
const downloads: { filename: string; blob: Blob }[] = [];
let pendingBlob: Blob | null = null;
const originalDocument = globalThis.document;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
const originalFetch = globalThis.fetch;
URL.createObjectURL = (blob: Blob) => { pendingBlob = blob; return 'blob:export'; };
URL.revokeObjectURL = () => {};
globalThis.document = {
  createElement: () => ({ href: '', download: '', click() { downloads.push({ filename: this.download, blob: pendingBlob! }); } }),
  body: { appendChild() {}, removeChild() {} },
} as unknown as Document;

const facets = { programmes: [], semesters: [], statuses: [] };
const rows = Array.from({ length: 103 }, (_, index) => ({ id: index + 1, name: index === 102 ? '=UNTRUSTED()' : `Student ${index + 1}` }));
const page = (params: BrowseParams): BrowsePage<typeof rows[number]> => {
  const current = Number(params.page);
  return { results: rows.slice((current - 1) * 50, current * 50), total: 103, page: current, pageSize: 50, pageCount: 3, facets };
};
const columns = [{ header: 'Student ID', value: (row: typeof rows[number]) => row.id }, { header: 'Name', value: (row: typeof rows[number]) => row.name }];

try {
  const calls: BrowseParams[] = [];
  const filters = { page: 2, size: 10, q: 'matric', programme: 'MSc', semester: '2026/2027-1', status: 'PENDING_COORDINATOR', type: 'primary', sort: 'oldest' };
  assert.equal(await exportOfficeBrowsePage('matching.csv', async params => { calls.push(params); return page(params); }, filters, columns), 103);
  assert.deepEqual(calls, [1, 2, 3].map(current => ({ ...filters, page: current, size: 50 })), 'Export fetches every matching page and retains every active filter');
  assert.equal(filters.page, 2, 'Export does not change the visible browse page');
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, 'matching.csv');
  const csv = await downloads[0].blob.text();
  assert.equal(csv.split('\r\n').length, 104, 'Includes rows beyond the current visible page');
  assert.ok(csv.endsWith("103,'=UNTRUSTED()"), 'The shared CSV formula sanitizer protects downloaded values');

  downloads.length = 0;
  await assert.rejects(exportOfficeBrowsePage('partial.csv', async params => {
    if (params.page === 3) throw new Error('Late API failure');
    return page(params);
  }, filters, columns), /Late API failure/);
  assert.equal(downloads.length, 0, 'A late fetch failure must never download partial rows');

  for (const change of ['count', 'clamped-page', 'short-page'] as const) {
    await assert.rejects(exportOfficeBrowsePage('changed.csv', async params => {
      const result = page(params);
      if (params.page === 2) {
        if (change === 'count') result.total = 102;
        if (change === 'clamped-page') result.page = 1;
        if (change === 'short-page') result.results.pop();
      }
      return result;
    }, filters, columns), /changed|complete/i);
    assert.equal(downloads.length, 0, `Does not claim a complete export after ${change}`);
  }

  // The server may clamp page size; use its stable page envelope to collect all rows.
  assert.equal(await exportOfficeBrowsePage('clamped-size.csv', async params => {
    const current = Number(params.page);
    return { results: rows.slice((current - 1) * 25, current * 25), total: 103, page: current, pageSize: 25, pageCount: 5, facets };
  }, filters, columns), 103);
  assert.equal(downloads.length, 1);
  downloads.length = 0;

  for (const pageCount of [0, 1]) {
    let emptyCalls = 0;
    assert.equal(await exportOfficeBrowsePage('empty.csv', async () => {
      emptyCalls += 1;
      return { results: [], total: 0, page: 1, pageSize: 50, pageCount, facets };
    }, filters, columns), 0, 'A valid empty backend envelope exports zero records');
    assert.equal(emptyCalls, 1, 'Empty exports request page one only');
    assert.equal(downloads.length, 1);
    assert.equal(await downloads[0].blob.text(), 'Student ID,Name', 'Empty matching exports still include column headers');
    downloads.length = 0;
  }

  for (const invalid of [
    { results: [rows[0]], total: 0, page: 1, pageSize: 50, pageCount: 0, facets },
    { results: [], total: 0, page: 2, pageSize: 50, pageCount: 0, facets },
    { results: [], total: 0, page: 1, pageSize: 50, pageCount: 2, facets },
  ]) {
    await assert.rejects(exportOfficeBrowsePage('invalid-empty.csv', async () => invalid, filters, columns), /changed|complete/i);
    assert.equal(downloads.length, 0, 'Only a page-one, genuinely empty envelope may produce a header-only file');
  }

  const urls: string[] = [];
  globalThis.fetch = async input => {
    urls.push(String(input));
    return new Response(JSON.stringify([{
      id: 9, studentId: 'M001', studentName: 'Student', programme: 'MSc', supervisor: 'Lecturer', status: 'Ended',
      waitingSince: '2026-10-01', waitingDays: 12, waitingOn: 'Coordinator',
      appointmentLifecycle: { status: 'ENDED', endOutcome: 'REPLACED', endReason: 'Old reason', endedAt: '2026-10-13', endedBy: 'Office', supersedesAppointmentId: 7, replacementAppointmentId: 10 },
      replacesAppointmentId: 6, replacementReason: 'New reason', updatedDate: '13 Oct 2026',
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  assert.equal(await exportAllOfficeAppointmentRecords(), 1);
  assert.deepEqual(urls, ['/api/appointments/supervisor/'], 'Full legacy records are loaded only when export is invoked');
  assert.equal(downloads[0].filename, 'supervisor_appointments_report.csv');
  assert.equal(await downloads[0].blob.text(), 'Student ID,Student Name,Programme,Supervisor,Status,Waiting Since,Waiting Days,Waiting On,Appointment Status,End Outcome,End Reason,Ended At,Ended By,Supersedes Appointment ID,Replacement Appointment ID,Requested Replacement Appointment ID,Replacement Reason,Updated Date\r\nM001,Student,MSc,Lecturer,Ended,2026-10-01,12,Coordinator,ENDED,REPLACED,Old reason,2026-10-13,Office,7,10,6,New reason,13 Oct 2026');
} finally {
  globalThis.document = originalDocument;
  globalThis.fetch = originalFetch;
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
}
console.log('Office exports collect all matching pages, retain legacy CSV fields and never download partial results');
