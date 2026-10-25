import React from 'react';
import {SemesterDateRange} from './SemesterDateRange';
import {DashboardSemesterSummary} from './DashboardSemesterSummary';
import { getActiveAcademicSemester } from '../services';
import { APP_ROUTES } from '../constants/routes';
import { useOfficeRead } from './useOfficeRead';
import { PortalButton, StatusBadge, getStatusBadgeTone } from './PortalPrimitives';
import { formatSemesterLifecycle } from '../utils/academicSemesters';

export function OfficeSemesterContext({onNavigate,compact=false}:{onNavigate:(route:string)=>void;compact?:boolean}) {
  const read=useOfficeRead(getActiveAcademicSemester), semester=read.data?.semester;
  if(compact)return <DashboardSemesterSummary
    semester={!read.error&&!read.loading ? semester??null : null}
    message={read.loading?'Loading semester…':read.error?'Semester could not be loaded':'No effective active semester'}
    actions={read.error ? <PortalButton size="sm" onClick={read.reload}>Retry semester</PortalButton> : undefined}
  />;
  return <section className="office-context" aria-label="Active academic semester">
    <div className="min-w-0"><p className="card-label">Active academic semester</p><p className="card-value mt-1">{read.loading?'Loading semester…':read.error?'Semester could not be loaded':semester?.label??'No effective active semester'}</p>{semester&&!read.error&&!read.loading&&<SemesterDateRange startsOn={semester.startsOn} endsOn={semester.endsOn}/>}{!read.loading&&!read.error&&!semester&&<p className="card-description">Review Academic semesters before opening new workflows.</p>}</div>
    <div className="flex items-center gap-3">{semester&&!read.error&&!read.loading&&<StatusBadge tone={getStatusBadgeTone(semester.effectiveStatus)}>{formatSemesterLifecycle(semester.effectiveStatus)}</StatusBadge>}{read.error&&<PortalButton size="sm" onClick={read.reload}>Retry semester</PortalButton>}<PortalButton size="sm" onClick={()=>onNavigate(APP_ROUTES.dashboardSemesters)}>Manage semester</PortalButton></div>
  </section>;
}
