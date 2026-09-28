import React, { useEffect, useRef, useState } from 'react';
import type { CompletionWindow, EvaluationPreviewTask } from '../types/marks';
import { grantCompletionWindows, getCompletionWindows, revokeCompletionWindow } from '../services/marksCompletionApi';
import { PortalButton } from './PortalPrimitives';

export function malaysiaDeadline(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a valid Malaysia date and time.');
  const parsed = new Date(`${value}:00+08:00`);
  if (!Number.isFinite(parsed.getTime()) || new Date(parsed.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16) !== value) throw new Error('Enter a valid deadline.');
  return parsed.toISOString();
}
const date = (value: string) => new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
export function CompletionWindowHistory({ windows, onRevoke }: { windows: CompletionWindow[]; onRevoke: (window: CompletionWindow) => void }) {
  return <div className="divide-y divide-slate-200">{windows.length ? windows.map(window => <article key={window.id} className="space-y-1 py-3 text-sm">
    <p className="font-bold">{window.status} · Due {date(window.deadline)} (Malaysia)</p>
    <p>{window.reason}</p><p className="text-slate-500">Granted by {window.grantedBy.name} · {date(window.createdAt)}</p>
    {window.supersedesId ? <p>Replaces window #{window.supersedesId}</p> : null}
    {window.revokedAt ? <p>Revoked {date(window.revokedAt)} · {window.revocationReason}</p> : null}
    {window.canRevoke ? <PortalButton onClick={() => onRevoke(window)}>Revoke window</PortalButton> : null}
  </article>) : <p className="text-sm text-slate-500">No completion windows for this task.</p>}</div>;
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
    <h2 className="font-bold text-brand-navy">Task completion windows</h2>
    <p className="text-sm text-slate-600">Allow selected eligible unfinished tasks to finish by a specific deadline. The period remains closed. A new grant replaces an existing active window for the same task.</p>
    {error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}{notice?<p role="status" className="text-sm text-green-700">{notice}</p>:null}
    <div className="max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Select</th><th>Task</th><th>Status</th><th>History</th></tr></thead><tbody>
      {tasks.filter(task=>task.taskId).map(task=><tr key={task.taskId} className="border-t border-slate-100"><td className="p-2"><input type="checkbox" aria-label={`Select ${task.studentName}, ${task.panelMember}`} disabled={busy||!task.canGrantCompletionWindow} checked={selected.includes(task.taskId!)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,task.taskId!]:ids.filter(id=>id!==task.taskId))}/></td><td>{task.studentName} · {task.panelMember}<span className="block text-xs text-slate-500">{task.evaluatorRoleLabel || task.evaluatorRole} · {task.semester}</span></td><td>{task.status}{task.completionWindow?<span className="block">Window: {task.completionWindow.status}</span>:null}</td><td><PortalButton disabled={busy} onClick={()=>void loadHistory(task.taskId!)}>History</PortalButton></td></tr>)}
    </tbody></table></div>
    <div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold">Deadline (Malaysia, UTC+08:00)<input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)} disabled={busy} className="form-control mt-1"/></label><label className="text-sm font-semibold">Reason<textarea value={reason} onChange={e=>setReason(e.target.value)} disabled={busy} className="form-control mt-1"/></label></div>
    <PortalButton variant="primary" disabled={busy||!selected.length||!deadline||!reason.trim()} onClick={()=>void grant()}>Grant to {selected.length} selected task(s)</PortalButton>
    {historyTask?<div className="border-t pt-4"><h3 className="font-bold">Completion history · Task #{historyTask}</h3>{historyLoading?<p>Loading history…</p>:<CompletionWindowHistory windows={windows} onRevoke={window=>{setRevoke(window);setRevokeReason('');}}/>}{revoke?<div className="mt-3 space-y-2"><label className="block text-sm">Reason for revocation<textarea className="form-control mt-1" value={revokeReason} onChange={e=>setRevokeReason(e.target.value)} disabled={busy}/></label><PortalButton disabled={busy||!revokeReason.trim()} onClick={()=>void revokeWindow()}>Confirm revocation</PortalButton><PortalButton disabled={busy} onClick={()=>setRevoke(null)}>Cancel</PortalButton></div>:null}</div>:null}
  </section>;
}
