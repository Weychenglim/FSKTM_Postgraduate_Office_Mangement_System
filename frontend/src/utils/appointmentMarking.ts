import type {EvaluationTask} from '../types';
import {markingRole} from './lecturerMarking';

export interface AppointmentMarkingTarget {studentId:string;role:'SUPERVISOR'|'PANEL';taskId?:number}
export function appointmentMarkingShortcut(tasks:EvaluationTask[],studentId:string,role:AppointmentMarkingTarget['role']) {
  const matches=tasks.filter(task=>task.studentId===studentId && markingRole(task)===role && (task.status==='SUBMITTED'||!task.taskLifecycleStatus||task.taskLifecycleStatus==='ACTIVE'));
  if(!matches.length)return null;
  const single=matches.length===1?matches[0]:null;
  return {label:!single?'View marking tasks':single.status==='SUBMITTED'?'View submitted marks':single.canEdit!==true?'View marking task':single.status==='DRAFT SAVED'?'Continue marking':'Enter marks',target:{studentId,role,...(single?.id?{taskId:single.id}:{})} satisfies AppointmentMarkingTarget};
}
export function appointmentMarkingRoute(target:AppointmentMarkingTarget):string {
  const params=new URLSearchParams({student:target.studentId,role:target.role});
  if(target.taskId)params.set('task',String(target.taskId));
  return `/marks?${params}`;
}
export function parseAppointmentMarkingTarget(search:string):AppointmentMarkingTarget|null {
  const params=new URLSearchParams(search),studentId=params.get('student')?.trim(),role=params.get('role'),rawTask=params.get('task');
  if(!studentId||!['SUPERVISOR','PANEL'].includes(role??'')||(rawTask!==null&&(!/^\d+$/.test(rawTask)||!Number.isSafeInteger(Number(rawTask))||Number(rawTask)<1)))return null;
  return {studentId,role:role as AppointmentMarkingTarget['role'],...(rawTask!==null?{taskId:Number(rawTask)}:{})};
}

export function mergeMarkingTasks(active:EvaluationTask[],submitted:EvaluationTask[]):EvaluationTask[] {
  const tasks=new Map<number|string,EvaluationTask>();
  for(const task of [...submitted,...active])tasks.set(task.id??`${task.studentId}:${markingRole(task)}:${task.periodId}`,task);
  return [...tasks.values()];
}
