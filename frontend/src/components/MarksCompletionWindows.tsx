import { DecisionDialog } from './DecisionDialog';
import { completeDecision } from '../utils/decisionSubmission';
import React, { useEffect, useRef, useState } from 'react';
import type { CompletionWindow, EvaluationPreviewTask } from '../types/marks';
import { grantCompletionWindows, getCompletionWindows, revokeCompletionWindow } from '../services/marksCompletionApi';
import { PortalButton } from './PortalPrimitives';
import { malaysiaDeadline, formatMalaysiaDateTime as date } from '../utils/malaysiaDateTime';

export { malaysiaDeadline } from '../utils/malaysiaDateTime';
export function CompletionWindowHistory({ windows, onRevoke }: { windows: CompletionWindow[]; onRevoke: (window: CompletionWindow) => void }) {
  return <div className="divide-y divide-slate-200">{windows.length ? windows.map(window => <article key={window.id} className="space-y-1 py-3 text-sm">
    <p className="card-value">{window.status} · Due {date(window.deadline)}</p>
    <p className="card-description">{window.reason}</p><p className="card-description">Granted by {window.grantedBy.name} · {date(window.createdAt)}</p>
    {window.supersedesId ? <p className="card-description">Replaces window #{window.supersedesId}</p> : null}
    {window.revokedAt ? <p className="card-description">Revoked {date(window.revokedAt)} · {window.revocationReason}</p> : null}
    {window.canRevoke ? <PortalButton onClick={() => onRevoke(window)}>Revoke window</PortalButton> : null}
  </article>) : <p className="card-description">No completion windows for this task.</p>}</div>;
}
export function MarksCompletionWindows({ tasks, onChanged }: { tasks: EvaluationPreviewTask[]; onChanged: () => Promise<void> }) {
  const [confirmationKey,setConfirmationKey] = useState('');
  const committed=useRef(false);
  const [confirmation,setConfirmation] = useState<'grant'|'revoke'|null>(null);
  const [selected,setSelected] = useState<number[]>([]);
  const [deadline,setDeadline] = useState('');
  const [reason,setReason] = useState('');
  const [historyTask,setHistoryTask] = useState<number|null>(null);
  const [windows,setWindows] = useState<CompletionWindow[]>([]);
  const [revoke,setRevoke] = useState<CompletionWindow|null>(null);
  const [revokeReason,setRevokeReason] = useState('');
  const [busy,setBusy] = useState(false);
  const [historyLoading,setHistoryLoading] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const requestId=useRef(0);
  useEffect(()=>{setSelected(ids=>ids.filter(id=>tasks.some(task=>task.taskId===id && task.canGrantCompletionWindow)));},[tasks]);
  const loadHistory=async(id:number,propagateError=false)=>{
    const current=++requestId.current;setHistoryTask(id);setWindows([]);if(!propagateError)setRevoke(null);setHistoryLoading(true);setError('');
    try{const result=await getCompletionWindows(id);if(current===requestId.current)setWindows(result.windows);}
    catch(error){if(current===requestId.current)setError(error instanceof Error?error.message:'Unable to load history.');if(propagateError)throw error;}
    finally{if(current===requestId.current)setHistoryLoading(false);}
  };
  useEffect(()=>()=>{requestId.current+=1;},[]);
  const refresh=async()=>{await onChanged();if(historyTask)await loadHistory(historyTask,true);};
  const grant=async()=>{
    if(busy||!selected.length||!reason.trim())return false;
    const due=malaysiaDeadline(deadline);
    if(new Date(due).getTime()<=Date.now())throw new Error('Deadline must be in the future.');
    setBusy(true);
    try{return await completeDecision(async()=>{
      await grantCompletionWindows({taskIds:selected,deadline:due,reason:reason.trim()});
      committed.current=true;
    },refresh);}finally{setBusy(false);}
  };
  const revokeWindow=async()=>{
    if(!revoke||!revokeReason.trim()||busy)return false;
    setBusy(true);
    try{return await completeDecision(async()=>{
      await revokeCompletionWindow(revoke.id,revokeReason.trim());committed.current=true;
    },refresh);}finally{setBusy(false);}
  };
  return <section aria-label="Completion windows" className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
    <DecisionDialog isOpen={confirmation!==null} kind="confirmation" decisionKey={confirmationKey}
      title={confirmation==='revoke'?'Revoke this completion window?':'Grant these completion windows?'}
      context={<p>{confirmation==='grant'?tasks.filter(task=>selected.includes(task.taskId!)).map(task=>`${task.studentName} · ${task.panelMember}`).join('; '):tasks.find(task=>task.taskId===historyTask)?.studentName}</p>}
      message={confirmation==='revoke'?<><p>The evaluator loses this completion window. The period remains closed.</p><p>Reason: {revokeReason}</p></>:<><p>Allow {selected.length} selected unfinished task(s) until {deadline} (Malaysia). Existing active windows are replaced; the period remains closed.</p><p>Reason: {reason}</p></>}
      confirmLabel={confirmation==='revoke'?'Revoke completion window':'Grant completion windows'} tone="warning"
      successMessage={confirmation==='revoke'?'Completion window revoked.':'Completion windows granted.'}
      onConfirm={confirmation==='revoke'?revokeWindow:grant} onClose={()=>{if(committed.current){if(confirmation==='grant'){setSelected([]);setReason('');setDeadline('');}else{setRevoke(null);setRevokeReason('');}}committed.current=false;setConfirmation(null);}} busy={busy} onReload={refresh}/>
    <h2 className="section-label">Task completion windows</h2>
    <p className="card-description">Allow selected eligible unfinished tasks to finish by a specific deadline. The period remains closed. A new grant replaces an existing active window for the same task.</p>
    {error?<p role="alert" className="card-description text-red-700">{error}</p>:null}{notice?<p role="status" className="card-description text-green-700">{notice}</p>:null}
    <div className="max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2 text-[10px] font-extrabold">Select</th><th className="text-[10px] font-extrabold">Task</th><th className="text-[10px] font-extrabold">Status</th><th className="text-[10px] font-extrabold">History</th></tr></thead><tbody>
      {tasks.filter(task=>task.taskId).map(task=><tr key={task.taskId} className="border-t border-slate-100"><td className="p-2 text-xs font-semibold"><input type="checkbox" aria-label={`Select ${task.studentName}, ${task.panelMember}`} disabled={busy||!task.canGrantCompletionWindow} checked={selected.includes(task.taskId!)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,task.taskId!]:ids.filter(id=>id!==task.taskId))}/></td><td className="text-xs font-semibold">{task.studentName} · {task.panelMember}<span className="card-description block">{task.evaluatorRoleLabel || task.evaluatorRole} · {task.semester}</span></td><td className="text-xs font-semibold">{task.status}{task.completionWindow?<span className="card-description block">Window: {task.completionWindow.status}</span>:null}</td><td className="text-xs font-semibold"><PortalButton disabled={busy} onClick={()=>void loadHistory(task.taskId!)}>History</PortalButton></td></tr>)}
    </tbody></table></div>
    <div className="grid gap-3 md:grid-cols-2"><label className="form-label">Deadline (Malaysia, UTC+08:00)<input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)} disabled={busy} className="form-control mt-1"/></label><label className="form-label">Reason<textarea value={reason} onChange={e=>setReason(e.target.value)} disabled={busy} className="form-control mt-1"/></label></div>
    <PortalButton variant="primary" disabled={busy||!selected.length||!deadline||!reason.trim()} onClick={()=>{committed.current=false;setConfirmationKey(selected.join(','));setConfirmation('grant');}}>Grant to {selected.length} selected task(s)</PortalButton>
    {historyTask?<div className="border-t pt-4"><h3 className="section-label">Completion history · Task #{historyTask}</h3>{historyLoading?<p className="card-description">Loading history…</p>:<CompletionWindowHistory windows={windows} onRevoke={window=>{setRevoke(window);setRevokeReason('');}}/>}{revoke?<div className="mt-3 space-y-2"><label className="form-label block">Reason for revocation<textarea className="form-control mt-1" value={revokeReason} onChange={e=>setRevokeReason(e.target.value)} disabled={busy}/></label><PortalButton disabled={busy||!revokeReason.trim()} onClick={()=>{committed.current=false;setConfirmationKey(String(revoke?.id));setConfirmation('revoke');}}>Confirm revocation</PortalButton><PortalButton disabled={busy} onClick={()=>setRevoke(null)}>Cancel</PortalButton></div>:null}</div>:null}
  </section>;
}
