import {SupervisorRequestDisclosure} from './SupervisorRequestFields';
import React from 'react';
import {CalendarDays,History} from 'lucide-react';
import {SupervisionDetailSection} from './SupervisionDetailLayout';
import {RequestDetailActions} from './RequestDetailPrimitives';

/** The same hierarchy for Supervisor and Panel appointment sidebars. */
export function AppointmentRecordSection({children,actions,history}:{children:React.ReactNode;actions?:React.ReactNode;history?:React.ReactNode}) {
  return <SupervisionDetailSection title="Appointment record" icon={CalendarDays}>
    {children}
    {actions?<SupervisorRequestDisclosure title="Manage appointment"><RequestDetailActions>{actions}</RequestDetailActions></SupervisorRequestDisclosure>:null}
    {history?<div className="border-t border-slate-100 pt-6">{history}</div>:null}
  </SupervisionDetailSection>;
}

export function AppointmentHistoryCard({children}:{children:React.ReactNode}) {
  return <div data-appointment-history><SupervisionDetailSection title="Appointment changes" icon={History} contentClassName="mt-4 min-w-0">
    <div className="min-w-0 [&>details:first-child]:border-t-0 [&>div:first-child>details]:border-t-0">{children}</div>
  </SupervisionDetailSection></div>;
}
