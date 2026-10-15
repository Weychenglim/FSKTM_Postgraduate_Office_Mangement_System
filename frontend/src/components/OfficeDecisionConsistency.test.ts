import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const capacitySource=readFileSync(new URL('./CapacityReassessments.tsx',import.meta.url),'utf8');
function capacitySave(operation:()=>Promise<unknown>, reload:()=>Promise<unknown>) {
 const state={closed:false}; const row={kind:'SUPERVISOR',id:7,status:'PENDING_COORDINATOR',canAuthorize:true,latestEventId:4};
 const context={office:true,edit:{row,action:'authorize',semester:{id:2}},reason:'Carryover',mutating:{current:false},setBusy(){},setWorkspace(){},setNotice(){},setEdit(){state.closed=true;},setReason(){},onChanged(){},load:reload,
  authorizeCapacityReassessment:operation,revokeCapacityReassessment:operation,workspace:{activeSemester:{id:2}},
  completeDecision:async(save:()=>Promise<unknown>,refresh:()=>Promise<unknown>)=>{await save();try{await refresh();return {};}catch{return {refreshFailed:true};}},
  runCapacityReassessmentAction:async(save:()=>Promise<unknown>,refresh:()=>Promise<unknown>)=>{try{await save();}catch{return{ok:false};}await refresh();return{ok:true};}};
 const body=capacitySource.slice(capacitySource.indexOf('  const save = async'),capacitySource.indexOf('  useEffect(() => { onBusyChange'));
 const js=ts.transpileModule(body+'\nreturn save;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return {state,save:Function(...Object.keys(context),js)(...Object.values(context))};
}
test('capacity save failure propagates and does not clear the typed decision',async()=>{const error=new Error('Denied');const {save,state}=capacitySave(async()=>{throw error;},async()=>{});await assert.rejects(save(),error);assert.equal(state.closed,false);});
test('capacity saved refresh failure returns warning without closing from callback',async()=>{const{save,state}=capacitySave(async()=>{},async()=>{throw new Error('Offline');});assert.deepEqual(await save(),{refreshFailed:true});assert.equal(state.closed,false);});
test('Office primary refresh is awaitable and supporting cancellation shares the dialog',()=>{const source=readFileSync(new URL('./OfficeSupervisorWorkspace.tsx',import.meta.url),'utf8');assert.match(source,/onProvidedRecordRefresh={reload}/);assert.match(source,/const reload=async/);assert.match(source,/<DecisionDialog/);assert.doesNotMatch(source,/const cancellationForm/);});

test('capacity authorization preserves the captured active-semester check',()=>{assert.match(capacitySource,/workspace\?\.activeSemester\?\.id !== semester.id/);assert.match(capacitySource,/expectedActiveSemesterId: semester!\.id/);assert.match(capacitySource,/expectedAuthorizationId: row\.authorization\?\.id \?\? null/);assert.match(capacitySource,/expectedEventId: row.latestEventId/);});
