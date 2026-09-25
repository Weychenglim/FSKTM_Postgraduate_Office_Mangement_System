import React, { useEffect, useState } from 'react';
import { CalendarRange, Settings2 } from 'lucide-react';

import { getActiveAcademicSemester } from '../services';
import type { AcademicSemester } from '../types';
import { formatSemesterLifecycle } from '../utils/academicSemesters';
import { PortalButton, StatusBadge, getStatusBadgeTone } from './PortalPrimitives';

interface ActiveSemesterContextProps {
  onManage?: () => void;
}

export const ActiveSemesterContext: React.FC<ActiveSemesterContextProps> = ({ onManage }) => {
  const [semester, setSemester] = useState<AcademicSemester | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getActiveAcademicSemester()
      .then((response) => {
        if (active) setSemester(response.semester);
      })
      .catch(() => {
        if (active) setSemester(null);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 border-y border-slate-200 bg-white px-4 py-3">
      <CalendarRange className="h-5 w-5 text-sky-700" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase text-slate-500">Academic semester</p>
        <p className="truncate text-sm font-bold text-slate-900">
          {!loaded ? 'Loading semester...' : semester?.label ?? 'No active semester'}
        </p>
      </div>
      {semester ? (
        <StatusBadge
          tone={getStatusBadgeTone(semester.effectiveStatus)}
        >
          {formatSemesterLifecycle(semester.effectiveStatus)}
        </StatusBadge>
      ) : null}
      {onManage ? (
        <PortalButton icon={Settings2} variant="secondary" onClick={onManage}>
          Manage
        </PortalButton>
      ) : null}
    </div>
  );
};
