import React, {useEffect, useState} from 'react';
import {useLocation, useSearchParams} from 'react-router';
import {getResearchProfiles, type ResearchProfileDirectory as Directory, type ResearchProfileQuery} from '../services/researchAmendmentsApi';
import {PortalButton} from './PortalPrimitives';
import {PortalSelect} from './PortalSelect';
import {ErrorState, LoadingState} from './StateViews';
import {WorkspaceFilterCard, WorkspacePagination, WorkspaceSectionHeader, workspacePageSize} from './RequestWorkspacePrimitives';

const filterKeys = ['profileQ', 'profileProgramme', 'profileSort', 'profilePage', 'profileSize'];
export function researchProfileDirectoryParams(current: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(current);
  if (key === 'clear') for (const field of filterKeys.filter(field => field !== 'profileSize')) next.delete(field);
  else if (value) next.set(key, value);
  else next.delete(key);
  if (key !== 'profilePage') next.delete('profilePage');
  return next;
}

export function ResearchProfileDirectory({onOpen, refreshVersion = 0}: {onOpen: (studentId: number) => void; refreshVersion?: number}) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const search = params.get('profileQ') ?? '';
  const programme = params.get('profileProgramme') ?? '';
  const sort: ResearchProfileQuery['sort'] = params.get('profileSort') === 'name_desc' ? 'name_desc' : params.get('profileSort') === 'updated' ? 'updated' : 'name';
  const page = Math.max(1, Math.floor(Number(params.get('profilePage')) || 1));
  const size = workspacePageSize(params.get('profileSize'));
  const query = JSON.stringify({q: search.trim(), programme, sort, page, size});
  const [retry, setRetry] = useState(0);
  const scope = `${query}:${refreshVersion}:${retry}`;
  const [result, setResult] = useState<{scope: string; data?: Directory; error?: string}>({scope: ''});
  const loading = result.scope !== scope;
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void getResearchProfiles(JSON.parse(query)).then(data => {
        if (active) setResult({scope, data});
      }).catch(error => {
        if (active) setResult({scope, error: error instanceof Error ? error.message : 'Student research profiles could not be loaded.'});
      });
    }, search.trim() ? 250 : 0);
    return () => {active = false; clearTimeout(timer);};
  }, [query, scope]);
  const change = (key: string, value: string) => setParams(current => researchProfileDirectoryParams(current, key, value), {replace: key !== 'profilePage', state: location.state});
  const data = result.data;
  const columns = ['Student', 'Programme', 'Research title', 'Action'];
  return <section aria-label="Research profile directory" className="appointment-workspace-card rounded-2xl border border-slate-200 bg-white shadow-sm">
    <WorkspaceSectionHeader title="Student research profiles" description="Find a student to view their current research profile and saved revisions. Only students with a saved research profile are listed." />
    <WorkspaceFilterCard onReset={() => change('clear', '')} fieldsClassName="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
      <label className="form-label min-w-0 sm:col-span-2 xl:col-span-1">Find a student<input type="search" className="form-control form-control-sm mt-1" placeholder="Student name, matric number or research title" value={search} onChange={event => change('profileQ', event.target.value)} /></label>
      <label className="form-label min-w-0">Programme<PortalSelect className="form-control form-control-sm mt-1" value={programme} onChange={event => change('profileProgramme', event.target.value)}><option value="">All programmes</option>{Array.from(new Set([...(data?.programmes ?? []), ...(programme ? [programme] : [])])).map(value => <option key={value}>{value}</option>)}</PortalSelect></label>
      <label className="form-label min-w-0">Sort by<PortalSelect className="form-control form-control-sm mt-1" value={sort} onChange={event => change('profileSort', event.target.value)}><option value="name">Student name (A–Z)</option><option value="name_desc">Student name (Z–A)</option><option value="updated">Recently updated</option></PortalSelect></label>
    </WorkspaceFilterCard>
    <div aria-live="polite" aria-busy={loading}>
      {loading ? <LoadingState message="Loading student research profiles…" /> : result.error ? <ErrorState message={result.error} onRetry={() => setRetry(value => value + 1)} /> : data?.students.length ? <div className="space-y-5">
        <table role="table" aria-label="Student research profiles" className="data-table block table-fixed lg:table">
          <colgroup className="hidden lg:table-column-group">{[25, 26, 33, 16].map((width, index) => <col key={index} style={{width: `${width}%`}} />)}</colgroup>
          <thead role="rowgroup" className="hidden lg:table-header-group"><tr role="row" className="data-thead bg-slate-50">{columns.map(column => <th role="columnheader" className="data-th" scope="col" key={column}>{column}</th>)}</tr></thead>
          <tbody role="rowgroup" className="block space-y-3 lg:table-row-group lg:space-y-0">{data.students.map(student => <tr role="row" key={student.id} className="data-row block rounded-xl border border-slate-200 py-2 lg:table-row lg:rounded-none lg:border-x-0 lg:border-t-0 lg:py-0">
            {[<><p>{student.name}</p><p className="card-caption mt-1">{student.matricNo}</p></>, student.programme || 'Not recorded', student.title || 'Research title not recorded', <PortalButton size="sm" aria-label={`View research profile for ${student.name}`} onClick={() => onOpen(student.id)}>View profile</PortalButton>].map((cell, index) => <td role="cell" key={columns[index]} className={`${index === 0 ? 'data-td-strong' : 'data-td'} block min-w-0 px-3 py-2 align-middle [overflow-wrap:anywhere] lg:table-cell lg:px-4 lg:py-4`}>
              {index === 1 || index === 2 ? <span className="card-label mb-1 block lg:hidden">{columns[index]}</span> : null}{cell}
            </td>)}
          </tr>)}</tbody>
        </table>
        <WorkspacePagination {...data.pagination} total={data.pagination.total} noun="students" onPage={value => change('profilePage', String(value))} onPageSize={value => change('profileSize', String(value))} />
      </div> : <div className="space-y-2 rounded-xl bg-slate-50 p-5"><p className="section-label">{search || programme ? 'No matching students' : 'No research profiles available'}</p><p className="card-description">{search || programme ? 'Try another name, matric number or research title, or clear the filters.' : 'Students will appear here when a research profile is saved within your access.'}</p></div>}
    </div>
  </section>;
}
