import {APP_ROUTES} from '../constants/routes';
import type {OperationalPeriod} from '../types/operationalPeriods';

export function programmeWindowCoverage(periods:OperationalPeriod[],programmes:string[]) {
  const published=periods.filter(period=>period.lifecycleStatus==='PUBLISHED');
  return programmes.map(programme=>({programme,periods:published.filter(period=>period.programmeScope==='ALL'||period.programmes.some(value=>value.trim().toLowerCase()===programme.trim().toLowerCase()))}));
}

export function windowScheduleLabel(periods:Pick<OperationalPeriod,'lifecycleStatus'|'effectiveStatus'>[]) {
  if(!periods.length)return 'Not configured';
  const published=periods.filter(period=>period.lifecycleStatus==='PUBLISHED');
  if(!published.length)return periods.some(period=>period.lifecycleStatus==='DRAFT')?'Draft only':'Closed / archived';
  return [...new Set(published.map(period=>period.effectiveStatus==='OPEN'?'Open':period.effectiveStatus==='UPCOMING'?'Upcoming':period.effectiveStatus==='SCHEDULED'?'Upcoming':period.effectiveStatus==='ENDED'||period.effectiveStatus==='CLOSED'?'Ended':period.effectiveStatus.toLowerCase()))].join(' · ');
}

export const marksConfigurationRoute=(semesterId:number,periodId?:number)=>`${APP_ROUTES.marksConfig}?semester=${semesterId}${periodId?`&period=${periodId}`:''}`;

export function parseMarksPeriodContext(search:string) {
  const params=new URLSearchParams(search);
  const semester=params.get('semester'),period=params.get('period');
  const valid=(value:string|null)=>value!==null&&/^[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value));
  return {semesterId:valid(semester)?Number(semester):null,periodId:valid(period)?Number(period):null,
    invalid:(params.has('semester')&&!valid(semester))||(params.has('period')&&(!valid(period)||!valid(semester)))};
}
