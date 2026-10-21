import React from 'react';
import {ChevronRight} from 'lucide-react';
import type {OperationalActivity,OperationalPeriodsResponse} from '../types/operationalPeriods';
import type {EvaluationPeriodOption} from '../types/marks';
import {windowScheduleLabel} from '../utils/periodPresentation';
import {CoordinatorDataTable} from './CoordinatorBrowsePrimitives';
import {OfficeToolSection} from './OfficeToolPrimitives';
import {StatusBadge} from './PortalPrimitives';

export type PeriodActivity=OperationalActivity|'MARKS';
export const periodActivityName=(value:PeriodActivity)=>value==='SUPERVISOR_APPLICATION'?'Supervisor applications':value==='PANEL_RECOMMENDATION'?'Panel recommendations':'Marks evaluations';
export const periodActivities:PeriodActivity[]=['SUPERVISOR_APPLICATION','PANEL_RECOMMENDATION','MARKS'];

export function PeriodActivityOverview({data,marks,selected,busy,onSelect}:{data:OperationalPeriodsResponse;marks:EvaluationPeriodOption[];selected:PeriodActivity;busy:boolean;onSelect:(activity:PeriodActivity)=>void}) {
 return <OfficeToolSection title="Submission overview" description="Review each activity, then open its windows and settings.">
  <div className="period-overview-table p-4 sm:p-5"><CoordinatorDataTable label="Submission activity overview" columns={['Activity','Submission rules','Schedule','Action']} rows={periodActivities.map(activity=>({key:activity,cells:[
   <div><p className="card-value">{periodActivityName(activity)}</p><p className="card-description mt-1">{activity==='SUPERVISOR_APPLICATION'?'Student applications':activity==='PANEL_RECOMMENDATION'?'Supervisor recommendations':'Assigned lecturer evaluations'}</p></div>,
   <StatusBadge tone={activity==='MARKS'?'neutral':data.enforcement[activity]?'success':'warning'}>{activity==='MARKS'?'Evaluation rules':data.enforcement[activity]?'Dates enforced':'Dates not enforced'}</StatusBadge>,
   <span className="card-value">{windowScheduleLabel(activity==='MARKS'?marks:data.periods.filter(period=>period.activity===activity))}</span>,
   <button type="button" disabled={busy} aria-label={`View ${periodActivityName(activity)}`} aria-current={selected===activity?'true':undefined} aria-controls={`period-panel-${activity}`} className="period-overview-link" onClick={()=>onSelect(activity)}>{selected===activity?'Viewing':'View'}<ChevronRight size={14} aria-hidden="true"/></button>,
  ]}))}/></div>
 </OfficeToolSection>;
}
