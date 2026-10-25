export interface FormFeedbackState { message:string; fields:Record<string,string>; }

/** Map only explicit server field keys. Never infer fields from message text. */
export function readFormFeedback(error:unknown,fallback:string,fieldMap:Record<string,string>={}):FormFeedbackState {
  const fields:Record<string,string>={};
  const messages:string[]=[];
  if(error && typeof error==='object' && 'status' in error && [400,409].includes(Number(error.status)) && 'body' in error && error.body && typeof error.body==='object' && !Array.isArray(error.body)) {
    for(const [key,value] of Object.entries(error.body)) {
      const message=typeof value==='string'?value:Array.isArray(value)?value.filter(item=>typeof item==='string').join(' '):'';
      if(!message)continue;
      if(fieldMap[key])fields[fieldMap[key]]=message;
      else messages.push(message);
    }
  }
  return {message:messages.join(' ') || (Object.keys(fields).length?'Correct the highlighted fields, then save again.':fallback),fields};
}

/** Correcting one input must not erase errors on other inputs. */
export function clearFeedbackFields(feedback:FormFeedbackState|null,keys:string[]):FormFeedbackState|null {
  if(!feedback || !keys.some(key=>key in feedback.fields))return feedback;
  const fields={...feedback.fields};keys.forEach(key=>delete fields[key]);
  return Object.keys(fields).length||feedback.message!=='Correct the highlighted fields, then save again.'?{...feedback,fields}:null;
}

export function focusFeedback(feedback:FormFeedbackState,ids:Record<string,string>,summaryId:string) {
  // A save may still be disabling its fieldset when React commits the notice.
  // Wait for the control to be enabled rather than dropping the focus request.
  const focus=(attempt=0)=>{
    const id=Object.keys(feedback.fields).map(key=>ids[key]).find(Boolean)??summaryId;
    const target=document.getElementById(id);
    if(target&&!target.matches(':disabled'))target.focus();
    else if(attempt<5)setTimeout(()=>focus(attempt+1),20);
  };
  setTimeout(()=>focus(),0);
}
