import {request} from './apiClient';
import type {SemesterTimelineEntry,TimelineLevel,TimelineRole} from '../types/timeline';
import {toMalaysiaDateTimeLocalValue} from '../utils/malaysiaDateTime';

/** The existing timeline endpoint validates and saves the event and owner atomically. */
export async function createPeriodCalendarEvent(value:{semesterId:number;kind:'appointment'|'marks';periodId:number;title:string;level:TimelineLevel;targetRoles:TimelineRole[];opensAt:string;closesAt:string}) {
 const start=toMalaysiaDateTimeLocalValue(value.opensAt),end=toMalaysiaDateTimeLocalValue(value.closesAt);
 if(!value.title.trim()||!value.targetRoles.length||!start||!end||new Date(value.closesAt)<new Date(value.opensAt))throw new Error('Review the event title, audience and period dates before saving.');
 return request<SemesterTimelineEntry>('/dashboard/timeline/entries/',{method:'POST',body:JSON.stringify({semesterId:value.semesterId,level:value.level,title:value.title.trim(),detail:value.title.trim(),action:value.targetRoles.join(' / '),deadlineStart:start.slice(0,10),deadlineEnd:end.slice(0,10),targetRoles:value.targetRoles,operationalPeriodId:value.kind==='appointment'?value.periodId:null,marksPeriodId:value.kind==='marks'?value.periodId:null})});
}
