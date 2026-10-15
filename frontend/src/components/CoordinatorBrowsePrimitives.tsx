import { useReturnToFocusReload } from '../utils/returnToFocus';
import {useStaffSupervisorBrowse} from './StaffSupervisorBrowseContext';
import React, { useEffect, useRef, useState } from 'react';
import { useListState } from './ListState';
import { PortalButton } from './PortalPrimitives';
import { requestStatusLabel } from '../utils/lecturerRequests';
import { WorkspacePagination } from './RequestWorkspacePrimitives';
import type { BrowsePage, BrowseParams } from '../services/coordinatorWorkspaceApi';

export function useCoordinatorFilters(key: string, initialSort = 'waiting', initial: BrowseParams = {}) {
  const [q, setQ] = useListState(key, 'search', String(initial.q ?? ''));
  const [programme, setProgramme] = useListState(key, 'programme', String(initial.programme ?? ''));
  const [semester, setSemester] = useListState(key, 'semester', String(initial.semester ?? ''));
  const [type, setType] = useListState(key, 'type', 'all');
  const [status, setStatus] = useListState(key, 'status', '');
  const [from, setFrom] = useListState(key, 'from', '');
  const [to, setTo] = useListState(key, 'to', '');
  const [sort, setSort] = useListState(key, 'sort', initialSort);
  const [page, setPage] = useListState(key, 'page', 1);
  const [size, setSize] = useListState(key, 'size', 10);
  const change = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };
  const reset = () => { setQ(''); setProgramme(''); setSemester(''); setType('all'); setStatus(''); setFrom(''); setTo(''); setPage(1); };
  return { q, programme, semester, type, status, from, to, sort, page, size, setPage, setSize, setStatus, setFrom, setTo, setSort, change, setQ, setProgramme, setSemester, setType, reset,
    params: {q, programme, semester, type, status, from, to, sort, page, size} as BrowseParams };
}
export type CoordinatorFilters = ReturnType<typeof useCoordinatorFilters>;
export type CoordinatorFilterControls = Pick<CoordinatorFilters, 'q'|'programme'|'semester'|'type'|'status'|'from'|'to'|'sort'|'setPage'|'setStatus'|'setFrom'|'setTo'|'setSort'|'change'|'setQ'|'setProgramme'|'setSemester'|'setType'|'reset'>;
export function CoordinatorFiltersBar({ filters: f, facets, history = false, requests = false, typeOptions, searchLabel = 'Find a request', searchPlaceholder = 'Student, matric number or supervisor', typeLabel = 'Request type', semesterLabel='Semester', dateLabel, sortOptions, includeStatusAndDates = true, statusLabel = requestStatusLabel }: { filters: CoordinatorFilterControls; facets?: BrowsePage<unknown>['facets']; history?: boolean; requests?: boolean; typeOptions?: [string,string][]; searchLabel?: string; searchPlaceholder?: string; typeLabel?: string; semesterLabel?:string; dateLabel?: string; sortOptions?: [string,string][]; includeStatusAndDates?: boolean; statusLabel?: (value: string) => string }) {
  const {office}=useStaffSupervisorBrowse();
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="form-label min-w-0">{searchLabel}<input className="form-control form-control-sm mt-1" type="search" value={f.q} placeholder={searchPlaceholder} onChange={event => f.change(f.setQ)(event.target.value)} /></label>
      <label className="form-label min-w-0">Programme<select className="form-control form-control-sm mt-1" value={f.programme} onChange={e => f.change(f.setProgramme)(e.target.value)}><option value="">{office?"All programmes":"All managed programmes"}</option>{facets?.programmes.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="form-label min-w-0">{semesterLabel}<select className="form-control form-control-sm mt-1" value={f.semester} onChange={e => f.change(f.setSemester)(e.target.value)}><option value="">All {semesterLabel==='Semester'?'semesters':'intake semesters'}</option>{facets?.semesters.map(value => <option key={value}>{value}</option>)}</select></label>
      {typeOptions ? <label className="form-label min-w-0">{typeLabel}<select className="form-control form-control-sm mt-1" value={f.type} onChange={e => f.change(f.setType)(e.target.value)}>{typeOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}
      {includeStatusAndDates ? <>
        <label className="form-label min-w-0">Status<select className="form-control form-control-sm mt-1" value={f.status} onChange={e => f.change(f.setStatus)(e.target.value)}><option value="">All statuses</option>{facets?.statuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>
        <label className="form-label min-w-0">{dateLabel ?? (history ? 'Outcome' : 'Submitted')} on or after<input type="date" className="form-control form-control-sm mt-1" value={f.from} onChange={e => f.change(f.setFrom)(e.target.value)} /></label>
        <label className="form-label min-w-0">{dateLabel ?? (history ? 'Outcome' : 'Submitted')} on or before<input type="date" className="form-control form-control-sm mt-1" value={f.to} onChange={e => f.change(f.setTo)(e.target.value)} /></label>
      </> : null}
      <label className="form-label min-w-0">Sort by<select className="form-control form-control-sm mt-1" value={f.sort} onChange={e => {f.setSort(e.target.value);f.setPage(1);}}>{sortOptions ? sortOptions.map(([value,label]) => <option value={value} key={value}>{label}</option>) : <>{requests && !history ? <option value="waiting">Longest waiting at this stage</option> : null}<option value="newest">{history ? 'Recently recorded' : 'Newest first'}</option><option value="oldest">Oldest first</option></>}</select></label>
    </div>
    <div className="mt-3 flex justify-end"><PortalButton size="sm" onClick={f.reset}>Clear filters</PortalButton></div>
  </div>;
}
export function useCoordinatorPage<T>(loader: (params: BrowseParams) => Promise<BrowsePage<T>>, params: BrowseParams, refreshVersion = 0, enabled = true) {
  const [data, setData] = useState<BrowsePage<T> | null>(null), [loading,setLoading] = useState(true), [error,setError] = useState<string | null>(null), [retry,setRetry] = useState(0);
  const version = useRef(0); const serialized = JSON.stringify(params);
  useEffect(() => { if (!enabled) {setLoading(false);return;} const token = ++version.current; setLoading(true); setError(null); const timer = window.setTimeout(() => {
    loader(JSON.parse(serialized)).then(result => { if(token === version.current) setData(result); }).catch(reason => { if(token === version.current) {setData(null);setError(reason instanceof Error ? reason.message : 'Records could not be loaded.');} }).finally(() => {if(token === version.current)setLoading(false);});
  },150); return () => {window.clearTimeout(timer);version.current += 1;}; }, [loader,serialized,refreshVersion,retry,enabled]);
  useReturnToFocusReload(() => setRetry(value => value + 1), enabled && !loading);
  return {data,loading,error,reload:()=>setRetry(value=>value+1)};
}
export function CoordinatorPageFooter({data,filters,noun}: {data: BrowsePage<unknown> | null; filters: CoordinatorFilters; noun:string}) {
 return data ? <WorkspacePagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} noun={noun} onPage={filters.setPage} onPageSize={size=>{filters.setSize(size);filters.setPage(1);}} /> : null;
}
export function CoordinatorDataTable({ label, columns, rows }: {label:string; columns:string[];rows:{key:string|number;cells:React.ReactNode[]}[]}) {
 return <table aria-label={label} role="table" className="data-table block table-fixed lg:table"><thead role="rowgroup" className="hidden lg:table-header-group"><tr role="row" className="data-thead">{columns.map(column=><th role="columnheader" scope="col" className="data-th" key={column}>{column}</th>)}</tr></thead><tbody role="rowgroup" className="block space-y-3 lg:table-row-group lg:space-y-0">{rows.map(row=><tr role="row" className="data-row grid grid-cols-2 rounded-xl border border-slate-200 lg:table-row lg:rounded-none lg:border-x-0 lg:border-t-0" key={row.key}>{row.cells.map((cell,index)=><td role="cell" key={columns[index]} className={`${index===0?'data-td-strong':'data-td'} block min-w-0 break-words lg:table-cell ${index===0||index===row.cells.length-1?'col-span-2':''}`}><span className="card-label mb-1 block lg:hidden">{columns[index]}</span>{cell}</td>)}</tr>)}</tbody></table>;
}
