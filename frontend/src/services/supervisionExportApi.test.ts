import assert from 'node:assert/strict';
import { downloadSupervisionWorkbook } from './supervisionExportApi';

const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;
const create = URL.createObjectURL;
const revoke = URL.revokeObjectURL;
const downloads: string[] = [];
let endpoint = '';
let fail = false;
let revoked = 0;
globalThis.fetch = async input => {
  endpoint = String(input);
  return fail ? new Response(JSON.stringify({detail:'Access denied'}), {status:403,headers:{'Content-Type':'application/json'}})
    : new Response(new Blob(['workbook'], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
};
globalThis.document = {body:{appendChild(){}},createElement:()=>({href:'',download:'',click(){downloads.push(this.download);},remove(){}})} as unknown as Document;
URL.createObjectURL = () => 'blob:supervision';
URL.revokeObjectURL = () => { revoked++; };
try {
  await downloadSupervisionWorkbook('Office Staff/Admin', {q:'A & B',programme:'Computing',semester:'Semester 1 2026/2027',supervisor:23,page:3,size:10,view:'supervisors'});
  const url = new URL(endpoint, 'http://localhost');
  assert.equal(url.pathname, '/api/appointments/office-workspace/supervision-export/');
  assert.equal(url.searchParams.get('q'), 'A & B');
  assert.equal(url.searchParams.get('programme'), 'Computing');
  assert.equal(url.searchParams.get('semester'), 'Semester 1 2026/2027');
  assert.equal(url.searchParams.get('supervisor'), '23');
  assert.equal(url.searchParams.has('page'), false);
  assert.equal(url.searchParams.has('size'), false);
  assert.equal(url.searchParams.has('view'), false);
  assert.deepEqual(downloads, ['supervision_lecturer_23.xlsx']);
  assert.equal(revoked, 1);
  await downloadSupervisionWorkbook('Programme Coordinator', {});
  assert.equal(new URL(endpoint,'http://localhost').pathname, '/api/appointments/coordinator-workspace/supervision-export/');
  assert.equal(downloads[1], 'supervision_list.xlsx');
  fail = true;
  await assert.rejects(downloadSupervisionWorkbook('Office Staff/Admin', {}), /Access denied/);
  assert.equal(downloads.length, 2, 'Failed responses never create a downloaded workbook');
} finally {
  globalThis.fetch = originalFetch;
  globalThis.document = originalDocument;
  URL.createObjectURL = create;
  URL.revokeObjectURL = revoke;
}
console.log('Supervision workbooks retain filters and role scopes, ignore pagination and reject failed downloads');
