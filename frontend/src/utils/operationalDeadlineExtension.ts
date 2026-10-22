import {extendInformationalTimelineEntry,extendOperationalPeriod,grantOperationalException} from '../services/operationalPeriodsApi';
import {updateEvaluationPeriod} from '../services/marksApi';
import {grantCompletionWindows} from '../services/marksCompletionApi';
import type {OperationalExceptionCandidate} from '../types/operationalPeriods';
import {malaysiaDeadline} from './malaysiaDateTime';
export type DeadlineExtensionTarget =
  | {kind:'appointment';id:number;revision:number;closesAt:string|null}
  | {kind:'marks';id:number;closesAt:string|null;allowEveryone?:boolean}
  | {kind:'event';id:number;closesAt:string|null};
export async function submitDeadlineExtension(target:DeadlineExtensionTarget,scope:'everyone'|'selected',wallTime:string,reason:string,selection:{taskIds?:number[];candidate?:OperationalExceptionCandidate}) {
  if(!reason.trim())throw new Error('An extension reason is required.');
  if(target.kind==='marks'&&target.allowEveryone===false&&scope==='everyone')throw new Error('Use selected tasks to grant completion time without reopening this period.');
  if(target.kind==='event'){
    if(scope!=='everyone')throw new Error('Informational events can only be extended for everyone.');
    const deadlineEnd=wallTime.slice(0,10);
    malaysiaDeadline(`${deadlineEnd}T23:59`);
    if(target.closesAt&&deadlineEnd<=target.closesAt.slice(0,10))throw new Error('The new deadline must be later than the current deadline.');
    return extendInformationalTimelineEntry(target.id,{deadlineEnd,reason:reason.trim(),...(target.closesAt?{expectedDeadlineEnd:target.closesAt.slice(0,10)}:{})});
  }
  const deadline=malaysiaDeadline(wallTime);
  if(scope==='everyone'&&target.closesAt&&new Date(deadline)<=new Date(target.closesAt))throw new Error('The new deadline must be later than the current deadline.');
  if(scope==='selected') {
    if(target.kind==='marks') {
      if(!selection.taskIds?.length)throw new Error('Select at least one eligible task.');
      return grantCompletionWindows({taskIds:selection.taskIds,deadline,reason:reason.trim()});
    }
    if(target.kind==='appointment') {
      if(!selection.candidate)throw new Error('Select an eligible student and participant.');
      return grantOperationalException(target.id,{studentId:selection.candidate.studentId,participantId:selection.candidate.participantId,deadline,reason:reason.trim()});
    }
    throw new Error('Informational events can only be extended for everyone.');
  }
  if(target.kind==='marks')return updateEvaluationPeriod(target.id,{closesAt:deadline,reason:reason.trim()});
  if(target.kind==='appointment')return extendOperationalPeriod(target.id,{closesAt:deadline,reason:reason.trim(),expectedRevision:target.revision});
  throw new Error('Unsupported deadline target.');
}
