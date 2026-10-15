import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as research from './ResearchAmendments';
import * as api from '../services/researchAmendmentsApi';
import * as wrapper from './LecturerResearchWorkspace';

const options = {students:[],programmes:[],profile:null,canSubmitResearch:false,canCorrect:false,canTransfer:false};
const row: any = {id:91,kind:'RESEARCH',status:'PENDING_COORDINATOR',studentId:7,studentName:'Scoped student',matricNo:'M-91',sourceProgramme:'Programme A',destinationProgramme:'',before:{title:'Before',abstract:'Abstract',programme:'Programme A'},after:{title:'After',abstract:'Abstract',programme:'Programme A'},reason:'Reason',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-02T00:00:00Z',stageLabel:'Awaiting programme coordinator',canDecide:true,canCancel:false,requiresTeamAcknowledgement:false,teamSnapshot:{primary:null,coSupervisors:[],panel:[]},unfinishedTaskCount:0,events:[]};
const pagination = {total:51,page:3,pageSize:25,pageCount:3,reviewCount:51,facets:{programmes:['Programme A'],semesters:['2026/2027 I'],statuses:['PENDING_COORDINATOR']}};
const paged = renderToStaticMarkup(React.createElement(research.ResearchAmendmentRouteContent, {
  role:'Programme Coordinator',routeView:'list',options,rows:[row],revisions:[],busy:false,onAction:()=>{},requestForm:null,
  requestPage:3,requestPageSize:25,requestSearch:'unrelated to local rows',pagination,
} as any));
assert.match(paged, /Scoped student/, 'Server-filtered rows are not searched or sliced again on the client');
assert.match(paged, /Page 3 of 3 · 51 requests/);
assert.match(paged, /Waiting at this stage/);
assert.doesNotMatch(paged, /Needs your review/, 'Coordinator headings describe decisions');
const noDecisions = renderToStaticMarkup(React.createElement(research.ResearchAmendmentRouteContent, {role:'Programme Coordinator',routeView:'list',options,rows:[],revisions:[],busy:false,onAction:()=>{},requestForm:null,pagination:{...pagination,total:0,page:1,pageCount:1},researchFilters:{focus:'decision'}} as any));
assert.match(noDecisions, /No research change requests awaiting your decision/);
const renderHistory = (role: 'Programme Coordinator' | 'Lecturer' | 'Office Staff/Admin') => renderToStaticMarkup(React.createElement(research.ResearchAmendmentRouteContent, {role,routeView:'list',requestView:'history',options,rows:[{...row,status:'APPROVED',canDecide:false}],revisions:[],busy:false,onAction:()=>{},requestForm:null,pagination:role === 'Programme Coordinator' ? {...pagination,total:1,page:1,pageCount:1} : undefined} as any));
const coordinatorHistory = renderHistory('Programme Coordinator');
assert.match(coordinatorHistory, /<th[^>]*>Outcome recorded<\/th>/);
assert.match(coordinatorHistory, /02 Oct 2026/);
assert.doesNotMatch(coordinatorHistory, /01 Oct 2026|<th[^>]*>Submitted<\/th>/);
for (const role of ['Lecturer','Office Staff/Admin'] as const) {
  assert.match(renderHistory(role), /<th[^>]*>Submitted<\/th>/);
  assert.match(renderHistory(role), /01 Oct 2026/);
  assert.doesNotMatch(renderHistory(role), /Outcome recorded|02 Oct 2026/);
}
assert.ok('researchViewParams' in wrapper);
const viewParams = (wrapper as any).researchViewParams;
const originalParams = new URLSearchParams('view=requests&page=3&size=25&status=PENDING_COORDINATOR&from=2026-09-01&to=2026-10-10&sort=oldest&q=Title+change&programme=A&semester=2026&type=RESEARCH&focus=all');
const historyParams = viewParams(originalParams,'history',true);
for (const key of ['status','from','to','page']) assert.equal(historyParams.has(key),false,`${key} clears when Coordinator switches views`);
assert.equal(historyParams.get('view'),'history');
assert.equal(historyParams.get('sort'),'newest');
for (const key of ['q','programme','semester','type','focus','size']) assert.equal(historyParams.get(key),originalParams.get(key));
assert.equal(viewParams(historyParams,'requests',true).get('sort'),'waiting');
const legacyHistoryParams = viewParams(originalParams,'history',false);
for (const key of ['status','from','to','sort']) assert.equal(legacyHistoryParams.get(key),originalParams.get(key),'Other roles retain their previous view switching behavior');
assert.equal(originalParams.get('page'),'3','Changing view does not mutate the saved source parameters');

assert.ok('CoordinatorResearchFilters' in research);
const filters = renderToStaticMarkup(React.createElement((research as any).CoordinatorResearchFilters, {query:{view:'history',focus:'decision',sort:'newest'},pagination,onFilter:()=>{}}));
for (const value of ['Find a request','Programme','All managed programmes','Request type','Title change','Abstract change','Clear filters','Semester','Sort']) assert.ok(filters.includes(value), `Coordinator filters include ${value}`);
assert.doesNotMatch(filters, />Student<select/);
const ongoingFilters = renderToStaticMarkup(React.createElement((research as any).CoordinatorResearchFilters, {query:{view:'requests',focus:'decision'},pagination,onFilter:()=>{}}));
assert.doesNotMatch(ongoingFilters, /Needs your decision|All ongoing|More filters/);
assert.match(ongoingFilters,/Submitted on or after|Status/);
const loadingShell = renderToStaticMarkup(<research.ResearchAmendments role="Programme Coordinator" routeView="list" onResearchFilter={()=>{}} />);
assert.match(loadingShell, /Find a request|More filters/, 'Coordinator filters remain mounted while records load');

assert.ok('loadResearchAmendmentWorkspace' in api);
const urls: string[] = [];
globalThis.fetch = async (input: any) => {
  const url = String(input); urls.push(url);
  const data = url.includes('/options/') ? options : url.endsWith('/91/') ? row : {requests:[row],revisions:[],pagination};
  return new Response(JSON.stringify(data), {status:200,headers:{'Content-Type':'application/json'}});
};
const load = (api as any).loadResearchAmendmentWorkspace;
const detail = await load({coordinator:true,routeView:'detail',requestId:'91',studentId:999,pageQuery:{q:'unrelated',view:'history',page:3}});
assert.equal(detail.requests[0].id,91);
assert.equal(urls.filter(url=>url.endsWith('/91/')).length,1);
assert.equal(urls.filter(url=>/research-amendments\/\?/.test(url)).length,0, 'Exact detail does not fetch the filtered collection');
assert.ok(urls.some(url=>url.includes('minimal=true')));
urls.length=0;
await load({coordinator:true,routeView:'list',studentId:999,pageQuery:{page:3,size:25,focus:'all',view:'history',q:'Title change',programme:'Programme A'}});
const pageUrl = new URL(urls.find(url=>url.includes('page=3'))!, 'http://localhost');
assert.equal(pageUrl.searchParams.get('q'),'Title change');
assert.equal(pageUrl.searchParams.get('programme'),'Programme A');
assert.equal(pageUrl.searchParams.get('studentId'),null);
assert.equal(pageUrl.searchParams.get('focus'),'decision','Saved All ongoing context cannot widen the Coordinator list');
urls.length=0;
await load({coordinator:false,routeView:'list',studentId:7,pageQuery:{page:3}});
assert.ok(urls.some(url=>url.endsWith('/?studentId=7')));
assert.ok(urls.every(url=>!url.includes('page=')), 'Legacy roles retain student-selected requests');
assert.ok('getNextResearchAmendment' in api, 'Coordinator next navigation reads a bounded saved source queue');
const next = (api as any).getNextResearchAmendment;
const nextQueries: URLSearchParams[] = [];
const savedQueue = {page:2,size:10,view:'requests',focus:'decision',q:'Title change',programme:'Programme A',semester:'2026/2027 I',type:'TRANSFER',status:'PENDING_SOURCE_COORDINATOR',from:'2026-09-01',to:'2026-10-13',sort:'waiting'};
globalThis.fetch = async (input:any) => {
  const query = new URL(String(input),'http://localhost').searchParams; nextQueries.push(query);
  return new Response(JSON.stringify({requests:query.get('page') === '3' ? [{...row,id:93}] : [{...row,id:90},row],revisions:[],pagination:{...pagination,page:Number(query.get('page')),pageSize:10}}), {status:200,headers:{'Content-Type':'application/json'}});
};
assert.deepEqual(await next(savedQueue,90),{id:91,page:2});
assert.equal(nextQueries.length,1,'Next row on the current page uses one bounded read');
nextQueries.length=0;
const crossPage = await next(savedQueue,91);
assert.deepEqual(crossPage,{id:93,page:3});
assert.equal(nextQueries.length,2,'Last row loads at most the immediately following page');
for (const query of nextQueries) for (const [key,value] of Object.entries(savedQueue)) if(key !== 'page') assert.equal(query.get(key),String(value));
nextQueries.length=0;
assert.equal(await next(savedQueue,999),null,'An absent current row never wraps backwards to a different queue position');
assert.equal(nextQueries.length,1);
assert.equal(await next({...savedQueue,page:3},93),null,'Last record has no next request');
assert.equal(await next({...savedQueue,page:crossPage.page},crossPage.id),null,'Repeated Next continues from the new page instead of jumping backwards');
assert.ok('researchQueueReturn' in wrapper);
const returnTo = (wrapper as any).researchQueueReturn({path:'/supervisor-appointments/research-changes?'+new URLSearchParams(Object.fromEntries(Object.entries(savedQueue).map(([key,value])=>[key,String(value)]))),label:'Research changes',historyIndex:5},crossPage.page);
const restored = new URL(returnTo.path,'http://localhost').searchParams;
assert.equal(restored.get('page'),'3');
assert.equal(returnTo.historyIndex,undefined,'A changed source page is restored by URL rather than an older history entry');
for (const [key,value] of Object.entries(savedQueue)) if(key !== 'page') assert.equal(restored.get(key),String(value));
assert.ok('ResearchNextRequestControl' in research);
const nextControl = (research as any).ResearchNextRequestControl;
const availableNext = renderToStaticMarkup(React.createElement(nextControl,{nextId:93,onNext:()=>{}}));
assert.match(availableNext, /Next request/);
assert.doesNotMatch(availableNext,/disabled=""/);
for (const state of [{disabled:true},{loading:true},{nextId:null}]) assert.match(renderToStaticMarkup(React.createElement(nextControl,{nextId:93,onNext:()=>{},...state})),/disabled=""/);
console.log('Coordinator research server pagination, authoritative filters and exact detail loading passed');

const cleared = wrapper.researchFilterParams(originalParams,'clear','');
for(const key of ['q','programme','semester','type','status','from','to','page']) assert.equal(cleared.has(key),false);
assert.equal(cleared.get('size'),'25');
assert.equal(cleared.get('focus'),'all');
const focusChanged = wrapper.researchFilterParams(originalParams,'focus','all');
assert.equal(focusChanged.get('focus'),'all');
assert.equal(focusChanged.has('page'),false);
