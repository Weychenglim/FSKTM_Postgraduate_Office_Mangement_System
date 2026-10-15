import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Lecturer final submission propagates failures and preserves its record host',()=>{
 const source=readFileSync(new URL('./LecturerMarksEntry.tsx',import.meta.url),'utf8');
 const submit=source.slice(source.indexOf('onSubmit={'),source.indexOf('\n          />',source.indexOf('onSubmit={')));
 assert.match(submit,/completeDecision\(/);
 assert.doesNotMatch(submit,/catch\s*\(|setActiveFormTask\(null\)|triggerToast/);
 assert.match(source,/onReload=/);
});
test('Office refresh retains the shared host and fails closed on denied access',()=>{
 const source=readFileSync(new URL('./MarkEntryRecordDetail.tsx',import.meta.url),'utf8');
 assert.match(source,/key=\{record\.recordId\}/);
 assert.match(source,/if \(loading && !record\)/);
 assert.match(source,/if \(!record\)/);
 assert.match(source,/if \(propagateError\) throw loadError/);
 assert.match(source,/loadError\.status === 403 \|\| loadError\.status === 404/);
 assert.match(source,/canCorrect: false, canReopen: false, version: null/);
 assert.doesNotMatch(source,/setNotice\(message\)/);
});
