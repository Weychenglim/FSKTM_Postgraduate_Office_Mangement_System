import {malaysiaDeadline} from './malaysiaDateTime';

/** Import calendar days only; required time fields remain under the user's control. */
export function importEventDays(start:string,end:string,opensAt:string,closesAt:string) {
  return {opensAt:`${start}T${opensAt.split('T')[1]??''}`,closesAt:`${end}T${closesAt.split('T')[1]??''}`};
}

export function extensionImpact(period:{lifecycleStatus:string;opensAt:string;closesAt:string}|undefined,enforced:boolean,scope:'everyone'|'selected',deadline:string,now=Date.now()) {
  if(scope==='selected')return 'Only the selected people receive extra time. The general deadline and linked timeline remain unchanged.';
  let next=NaN;
  try{if(deadline)next=new Date(malaysiaDeadline(deadline)).getTime();}catch{/* Incomplete form values cannot imply reopening. */}
  if(period?.lifecycleStatus==='PUBLISHED'&&enforced&&new Date(period.opensAt).getTime()<=now&&new Date(period.closesAt).getTime()<now&&next>now&&next>new Date(period.closesAt).getTime())return 'This will reopen submissions for the programmes covered by this window until the new deadline. Normal eligibility rules still apply.';
  return enforced?'The new common deadline applies to everyone covered by this window. Normal eligibility rules still apply.':'The common deadline changes, but date restrictions remain disabled. These dates will not restrict new submissions.';
}
