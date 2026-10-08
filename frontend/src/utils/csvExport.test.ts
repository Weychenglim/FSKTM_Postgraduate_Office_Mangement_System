import assert from 'node:assert/strict';
import { buildCsv } from './csvExport';

const cases: Array<[string | number | boolean | null | undefined, string]> = [
  ['=1+1', "'=1+1"],
  ['+1', "'+1"],
  ['-1+2', "'-1+2"],
  ['@SUM(A1)', "'@SUM(A1)"],
  ['  =1+1', "'  =1+1"],
  ['\t=1+1', "'\t=1+1"],
  ['\r\n+1', '"\'\r\n+1"'],
  ['\u0000\u001f=1+1', "'\u0000\u001f=1+1"],
  ['\uFEFF=1+1', "'\uFEFF=1+1"],
  ['=HYPERLINK("url","label")', '"\'=HYPERLINK(""url"",""label"")"'],
  ['ordinary, "quoted" text', '"ordinary, ""quoted"" text"'],
  ['123', '123'], ['00123', '00123'], ['hello', 'hello'],
  [-42, '-42'], [2.5, '2.5'], [0, '0'], [true, 'true'],
  [null, ''], [undefined, ''],
];

for (const [value, expected] of cases) {
  assert.equal(buildCsv([value], [{ header: 'Value', value: (row) => row }]), `Value\r\n${expected}`);
}
assert.equal(buildCsv([], [{ header: '=1+1', value: () => '' }]), "'=1+1");
console.log('CSV export safety tests passed');
