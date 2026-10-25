import React from 'react';
import type {AcademicSemester} from '../types';
import {formatSemesterLifecycle} from '../utils/academicSemesters';
import {StatusBadge, getStatusBadgeTone} from './PortalPrimitives';
import {SemesterDateRange} from './SemesterDateRange';

/** Shared visual hierarchy for every role's dashboard semester summary. */
export function DashboardSemesterSummary({semester, message, actions}: {
  semester: AcademicSemester | null; message?: string; actions?: React.ReactNode;
}) {
  return <section aria-label="Active academic semester">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-sm font-semibold leading-6 text-slate-800 [overflow-wrap:anywhere]">{semester?.label ?? message ?? 'No active semester'}</p>
      {semester && <StatusBadge tone={getStatusBadgeTone(semester.effectiveStatus)}>{formatSemesterLifecycle(semester.effectiveStatus)}</StatusBadge>}
      {semester && <div className="basis-full sm:basis-auto sm:border-l sm:border-slate-300 sm:pl-3"><SemesterDateRange startsOn={semester.startsOn} endsOn={semester.endsOn}/></div>}
    </div>
    {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
  </section>;
}
