import React from 'react';
import type {LinkedPeriodStatus as Status} from '../types/timeline';
import {StatusBadge,getStatusBadgeTone} from './PortalPrimitives';

export function LinkedPeriodStatus({status}:{status:Status}) {
  return <div className="space-y-2 text-left"><div className="flex flex-wrap gap-2"><StatusBadge tone={getStatusBadgeTone(status.lifecycleStatus)}>{status.lifecycleStatus}</StatusBadge><span className="card-description">Schedule: {status.scheduleStatus==='OPEN'?'Open':status.scheduleStatus==='UPCOMING'?'Upcoming':'Ended'}</span></div><p className="card-description">{status.datesEnforced===null?'Evaluation rules apply.':status.datesEnforced?'Activity: Dates enforced':'Activity: Dates not enforced'}</p>{status.lifecycleStatus==='DRAFT'?<p className="card-description">Draft dates do not control submissions.</p>:status.lifecycleStatus==='CLOSED'||status.lifecycleStatus==='ARCHIVED'?<p className="card-description">This window is closed.</p>:null}</div>;
}
