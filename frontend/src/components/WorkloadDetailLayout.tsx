import React from 'react';
import {Gauge, UserRound, type LucideIcon} from 'lucide-react';
import {AppointmentIcon} from './AppointmentPrimitives';
import {IconHeading} from './IconHeading';
import {PortalCard, ProgressBar, StatusBadge} from './PortalPrimitives';

type Tone = React.ComponentProps<typeof StatusBadge>['tone'];
export const workloadBody = 'text-sm font-normal leading-6 text-slate-800 [overflow-wrap:anywhere]';

export function WorkloadFact({label, children}: {label:string; children:React.ReactNode}) {
  return <div className="min-w-0 space-y-2"><dt className="text-xs font-medium leading-5 text-slate-500">{label}</dt><dd className={workloadBody}>{children}</dd></div>;
}

export function WorkloadDetailSection({title, icon, count, children}: {title:string; icon:LucideIcon; count?:number; children:React.ReactNode}) {
  return <PortalCard padding="lg" role="region" aria-label={title}>
    <IconHeading title={<>{title}{count !== undefined ? <span className="ml-2 text-sm font-normal text-slate-500">{count}</span> : null}</>} titleClassName="text-base font-semibold leading-6 text-brand-navy" icon={<AppointmentIcon icon={icon} tone="info"/>}/>
    <div className="mt-6">{children}</div>
  </PortalCard>;
}

export function WorkloadLecturerOverview({name, status, tone, children}: {name:string; status:string; tone:Tone; children:React.ReactNode}) {
  return <WorkloadDetailSection title="Lecturer overview" icon={UserRound}>
    <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-lg font-semibold leading-7 text-brand-navy [overflow-wrap:anywhere]">{name}</h3><StatusBadge tone={tone}>{status}</StatusBadge></div>
    <dl className="mt-5 grid gap-x-8 gap-y-5 border-t border-slate-100 pt-5 sm:grid-cols-2">{children}</dl>
  </WorkloadDetailSection>;
}

export function WorkloadCapacityUsage({configured, used, limit, available, utilization, tone, usedLabel, capacityLabel, breakdown, hint}: {
  configured:boolean; used:number; limit:number; available:number|null|undefined; utilization:number; tone:Tone;
  usedLabel:string; capacityLabel:string; breakdown:React.ReactNode; hint:string;
}) {
  return <WorkloadDetailSection title="Capacity usage" icon={Gauge}>
    <dl className="grid grid-cols-2 gap-6">
      <div className="space-y-2"><dt className="text-xs font-medium leading-5 text-slate-500">{usedLabel}</dt><dd className="text-2xl font-semibold leading-8 text-brand-navy">{used}{configured ? <span className="text-base font-normal text-slate-500"> / {limit}</span> : null}</dd></div>
      <div className="space-y-2"><dt className="text-xs font-medium leading-5 text-slate-500">Available slots</dt><dd className={configured && available != null ? 'text-2xl font-semibold leading-8 text-brand-navy' : workloadBody}>{configured ? available ?? 'Not recorded' : 'Not configured'}</dd></div>
    </dl>
    {configured ? <div className="mt-5 space-y-3"><div className="flex flex-wrap justify-between gap-x-5 gap-y-2 text-xs leading-5 text-slate-600"><p>{capacityLabel}: {limit}</p><p>Capacity utilization: {utilization}%</p></div><ProgressBar value={used} max={limit} tone={tone}/></div> : <p className="mt-5 text-sm leading-6 text-slate-600">Current semester capacity is not configured. Availability and utilization cannot be determined from a missing plan.</p>}
    <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">{breakdown}</dl>
    <p className="mt-5 text-xs leading-6 text-slate-500">{hint}</p>
  </WorkloadDetailSection>;
}
