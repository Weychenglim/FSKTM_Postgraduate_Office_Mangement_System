import type {AcademicSemester} from '../types/academicSemester';
import type {ActiveSemesterTimeline} from '../types/timeline';
import {canManagePeriodSemester,loadPeriodTimeline} from '../utils/operationalPeriodAccess';

export function resolvePeriodSemester(semesters:AcademicSemester[],search:string):AcademicSemester|null {
  const eligible=semesters.filter(semester=>canManagePeriodSemester(semester.lifecycleStatus));
  const params=new URLSearchParams(search);
  if(params.has('semester')) {
    const value=params.get('semester')??'';
    return /^[1-9]\d*$/.test(value)?eligible.find(semester=>semester.id===Number(value))??null:null;
  }
  return eligible.find(semester=>semester.effectiveStatus==='ACTIVE')??eligible[0]??null;
}

export async function loadPeriodCalendarEntries(semester:AcademicSemester,read:(id:number)=>Promise<ActiveSemesterTimeline>) {
  return (await loadPeriodCalendar(semester,read)).entries;
}

export async function loadPeriodCalendar(semester:AcademicSemester,read:(id:number)=>Promise<ActiveSemesterTimeline>) {
  const [timeline]=await loadPeriodTimeline(semester.id,semester.lifecycleStatus,read,async()=>[]);
  if(timeline?.available&&timeline.semesterId!==semester.id) throw new Error('The calendar does not belong to the selected semester. Reload before linking an event.');
  return {available:!!timeline?.available,entries:timeline?.available?timeline.levels.flatMap(group=>group.entries):[]};
}

export function parsePeriodAnchor(hash:string):{kind:'appointment'|'marks';id:number}|null {
  const match=/^#(operational|marks)-period-([1-9]\d*)$/.exec(hash);
  return match?{kind:match[1]==='marks'?'marks':'appointment',id:Number(match[2])}:null;
}
