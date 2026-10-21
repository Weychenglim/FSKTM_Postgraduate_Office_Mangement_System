import assert from 'node:assert/strict';
import { test } from 'node:test';
import ExcelJS from 'exceljs';
import { buildExcel, downloadExcel, EXCEL_MIME } from './excelExport';

test('XLSX round trip preserves literal text, numbers, identifiers and paragraphs', async () => {
  const values = ['=SUM(A1:A2)', '+formula', '@external', '-text', '00123', 'Malay 中文\nSecond paragraph', 42, false, null];
  const blob = await buildExcel(values, [{ header: 'Recorded value', value: value => value }]);
  assert.equal(blob.type, EXCEL_MIME);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 2)], [80, 75], 'XLSX is a ZIP workbook, not renamed CSV');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes));
  const sheet = workbook.getWorksheet('Records')!;
  for (let index = 0; index < values.length; index++) {
    const cell = sheet.getCell(index + 2, 1);
    assert.equal(cell.value, values[index]);
    if (typeof values[index] === 'string') assert.equal(cell.type, ExcelJS.ValueType.String);
  }
  assert.equal(sheet.getCell('A1').value, 'Recorded value');
  assert.equal(sheet.views[0].state, 'frozen');
});

test('Oversized Excel values fail explicitly instead of silently truncating records', async () => {
  await assert.rejects(buildExcel(['x'.repeat(32_768)], [{ header: 'Value', value: value => value }]), /character cell limit/);
  await assert.rejects(buildExcel(new Array(1_048_576), [{ header: 'Value', value: () => '' }]), /worksheet limits/);
});

test('Download cleanup runs even if the browser cannot start the download', async () => {
  const originalDocument = globalThis.document, originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
  let removed = false, revoked = false, filename = '';
  URL.createObjectURL = () => 'blob:excel';
  URL.revokeObjectURL = value => { assert.equal(value, 'blob:excel'); revoked = true; };
  globalThis.document = {
    createElement: () => ({ href: '', download: '', click() { filename = this.download; throw new Error('Download blocked'); } }),
    body: { appendChild() {}, removeChild() { removed = true; } },
  } as unknown as Document;
  try {
    await assert.rejects(downloadExcel('records.csv', [], [{ header: 'Value', value: () => '' }]), /Download blocked/);
    assert.equal(filename, 'records.xlsx');
    assert.ok(removed && revoked);
  } finally {
    globalThis.document = originalDocument; URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
  }
});
