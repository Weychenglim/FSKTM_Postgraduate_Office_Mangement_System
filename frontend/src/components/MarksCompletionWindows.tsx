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
  const loadHistory=async(id:number)=>{
    const current=++requestId.current;setHistoryTask(id);setWindows([]);setRevoke(null);setHistoryLoading(true);setError('');
    try{const result=await getCompletionWindows(id);if(current===requestId.current)setWindows(result.windows);}
    catch(error){if(current===requestId.current)setError(error instanceof Error?error.message:'Unable to load history.');}
    finally{if(current===requestId.current)setHistoryLoading(false);}
  };
  useEffect(()=>()=>{requestId.current+=1;},[]);
  const grant=async()=>{
    if(busy||!selected.length||!reason.trim())return;
    setBusy(true);setError('');setNotice('');
    try{
      const due=malaysiaDeadline(deadline);
      if(new Date(due).getTime()<=Date.now())throw new Error('Deadline must be in the future.');
      await grantCompletionWindows({taskIds:selected,deadline:due,reason:reason.trim()});
      setSelected([]);setReason('');setDeadline('');setNotice('Completion windows granted.');
      await onChanged();if(historyTask)await loadHistory(historyTask);
    }catch(error){setError(error instanceof Error?error.message:'Unable to grant windows.');}
    finally{setBusy(false);}
  };
  const revokeWindow=async()=>{
    if(!revoke||!revokeReason.trim()||busy)return;
    setBusy(true);setError('');
    try{await revokeCompletionWindow(revoke.id,revokeReason.trim());setRevoke(null);setRevokeReason('');await onChanged();if(historyTask)await loadHistory(historyTask);setNotice('Completion window revoked.');}
    catch(error){setError(error instanceof Error?error.message:'Unable to revoke window.');}
    finally{setBusy(false);}
  };
  return <section aria-label="Completion windows" className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="section-label">Task completion windows</h2>
    <p className="card-description">Allow selected eligible unfinished tasks to finish by a specific deadline. The period remains closed. A new grant replaces an existing active window for the same task.</p>
    {error?<p role="alert" className="card-description text-red-700">{error}</p>:null}{notice?<p role="status" className="card-description text-green-700">{notice}</p>:null}
    <div className="max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2 text-[10px] font-extrabold">Select</th><th className="text-[10px] font-extrabold">Task</th><th className="text-[10px] font-extrabold">Status</th><th className="text-[10px] font-extrabold">History</th></tr></thead><tbody>
      {tasks.filter(task=>task.taskId).map(task=><tr key={task.taskId} className="border-t border-slate-100"><td className="p-2 text-xs font-semibold"><input type="checkbox" aria-label={`Select ${task.studentName}, ${task.panelMember}`} disabled={busy||!task.canGrantCompletionWindow} checked={selected.includes(task.taskId!)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,task.taskId!]:ids.filter(id=>id!==task.taskId))}/></td><td className="text-xs font-semibold">{task.studentName} · {task.panelMember}<span className="card-description block">{task.evaluatorRoleLabel || task.evaluatorRole} · {task.semester}</span></td><td className="text-xs font-semibold">{task.status}{task.completionWindow?<span className="card-description block">Window: {task.completionWindow.status}</span>:null}</td><td className="text-xs font-semibold"><PortalButton disabled={busy} onClick={()=>void loadHistory(task.taskId!)}>History</PortalButton></td></tr>)}
    </tbody></table></div>
    <div className="grid gap-3 md:grid-cols-2"><label className="form-label">Deadline (Malaysia, UTC+08:00)<input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)} disabled={busy} className="form-control mt-1"/></label><label className="form-label">Reason<textarea value={reason} onChange={e=>setReason(e.target.value)} disabled={busy} className="form-control mt-1"/></label></div>
    <PortalButton variant="primary" disabled={busy||!selected.length||!deadline||!reason.trim()} onClick={()=>void grant()}>Grant to {selected.length} selected task(s)</PortalButton>
    {historyTask?<div className="border-t pt-4"><h3 className="section-label">Completion history · Task #{historyTask}</h3>{historyLoading?<p className="card-description">Loading history…</p>:<CompletionWindowHistory windows={windows} onRevoke={window=>{setRevoke(window);setRevokeReason('');}}/>}{revoke?<div className="mt-3 space-y-2"><label className="form-label block">Reason for revocation<textarea className="form-control mt-1" value={revokeReason} onChange={e=>setRevokeReason(e.target.value)} disabled={busy}/></label><PortalButton disabled={busy||!revokeReason.trim()} onClick={()=>void revokeWindow()}>Confirm revocation</PortalButton><PortalButton disabled={busy} onClick={()=>setRevoke(null)}>Cancel</PortalButton></div>:null}</div>:null}
  </section>;
}
