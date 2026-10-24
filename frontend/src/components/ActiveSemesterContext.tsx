import React, {useEffect, useState} from 'react';
import {Settings2} from 'lucide-react';
import {getActiveAcademicSemester} from '../services';
import type {AcademicSemester} from '../types';
import {PortalButton} from './PortalPrimitives';
import {DashboardSemesterSummary} from './DashboardSemesterSummary';

interface ActiveSemesterContextProps { onManage?: () => void; }

export const ActiveSemesterContext: React.FC<ActiveSemesterContextProps> = ({onManage}) => {
  const [semester, setSemester] = useState<AcademicSemester | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    getActiveAcademicSemester()
      .then(response => { if (active) setSemester(response.semester); })
      .catch(() => { if (active) setSemester(null); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  return <DashboardSemesterSummary
    semester={semester}
    message={!loaded ? 'Loading semester…' : 'No active semester'}
    actions={onManage ? <PortalButton icon={Settings2} variant="secondary" onClick={onManage}>Manage</PortalButton> : undefined}
  />;
};
