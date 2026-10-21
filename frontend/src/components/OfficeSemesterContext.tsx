import React from 'react';
import {CalendarRange} from 'lucide-react';
import { getActiveAcademicSemester } from '../services';
import { APP_ROUTES } from '../constants/routes';
import { useOfficeRead } from './useOfficeRead';
import { PortalButton, StatusBadge, getStatusBadgeTone } from './PortalPrimitives';
import { formatSemesterLifecycle } from '../utils/academicSemesters';

export function OfficeSemesterContext({onNavigate,compact=false}:{onNavigate:(route:string)=>void;compact?:boolean}) {
  const read=useOfficeRead(getActiveAcademicSemester), semester=read.data?.semester;
  if(compact)return <section className="flex flex-wrap items-center gap-3 border-y border-slate-200 bg-white px-4 py-3" aria-label="Active academic semester"><CalendarRange className="h-5 w-5 text-sky-700" aria-hidden="true"/><div className="min-w-0 flex-1"><p className="card-label">Academic semester</p><p className="card-value truncate text-slate-900">{read.loading?'Loading semester…':read.error?'Semester could not be loaded':semester?.label??'No effective active semester'}</p></div>{semester&&!read.error&&!read.loading&&<StatusBadge tone={getStatusBadgeTone(semester.effectiveStatus)}>{formatSemesterLifecycle(semester.effectiveStatus)}</StatusBadge>}{read.error&&<PortalButton size="sm" onClick={read.reload}>Retry semester</PortalButton>}</section>;
  return <section className="office-context" aria-label="Active academic semester">
    <div className="min-w-0"><p className="card-label">Active academic semester</p><p className="card-value mt-1">{read.loading?'Loading semesterâ€¦':read.error?'Semester could not be loaded':semester?.label??'No effective active semester'}</p>{!read.loading&&!read.error&&!semester&&<p className="card-description">Review Academic semesters before opening new workflows.</p>}</div>
    <div className="flex items-center gap-3">{semester&&!read.error&&!read.loading&&<StatusBadge tone={getStatusBadgeTone(semester.effectiveStatus)}>{formatSemesterLifecycle(semester.effectiveStatus)}</StatusBadge>}{read.error&&<PortalButton size="sm" onClick={read.reload}>Retry semester</PortalButton>}<PortalButton size="sm" onClick={()=>onNavigate(APP_ROUTES.dashboardSemesters)}>Manage semester</PortalButton></div>
  </section>;
}
