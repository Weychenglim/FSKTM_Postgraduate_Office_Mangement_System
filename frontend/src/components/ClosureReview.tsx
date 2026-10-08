import { ClosurePreviewSession } from '../utils/closurePreview';
import React, { useEffect, useRef, useState } from 'react';
import type { ClosureApproval, ClosurePreview } from '../types/marks';
import { getClosurePreview } from '../services/marksCompletionApi';
import { ApiError } from '../services/apiClient';
import { PortalButton } from './PortalPrimitives';

export function ClosureSummary({ preview }: { preview: ClosurePreview }) {
  return <section aria-label="Closure preview" className="space-y-3 text-sm">
    <h3 className="font-bold">Unfinished marks review</h3>
    <p>Closing preserves existing marks. Only separately granted completion windows allow eligible unfinished tasks to continue.</p>
    <div className="overflow-auto"><table className="w-full text-left"><thead><tr>{['Period','Submitted','Not started','Draft','Paused','Active windows','Unfinished'].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead>
    <tbody>{[...preview.periods, { ...preview.totals, periodId: -1, name: 'Total' }].map(row=><tr key={row.periodId}><th className="p-2">{row.name}</th>{[row.submitted,row.notStarted,row.draft,row.paused,row.activeWindows,row.unfinished].map((count,i)=><td className="p-2" key={i}>{count}</td>)}</tr>)}</tbody></table></div>
  </section>;
}
export function ClosureReview({ kind, id, disabled, onConfirm }: { kind: 'semester' | 'handover' | 'period'; id: number; disabled: boolean; onConfirm: (approval: ClosureApproval) => Promise<void> }) {
  const session = useRef(new ClosurePreviewSession());
  const [preview,setPreview]=useState<ClosurePreview|null>(null);
  const [acknowledged,setAcknowledged]=useState(false);
  const [revision,setRevision]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    let current=true; const generation = session.current.begin(); setPreview(null); setAcknowledged(false); setError('');
    getClosurePreview(kind,id).then(value=>{if(current && session.current.accept(generation, value))setPreview(value)}).catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'Unable to load closure preview.');});
    return ()=>{current=false;session.current.invalidate();};
  },[kind,id,revision]);
  const confirm=async()=>{
    if(!preview || busy || disabled || (preview.requiresAcknowledgement && !acknowledged))return;
    const approval=session.current.approval(preview,acknowledged);
    if(!approval)return;
    session.current.invalidate();
    setBusy(true);setError('');
    try { await onConfirm(approval); setPreview(null); }
    catch(reason){setPreview(null);setAcknowledged(false);setError(reason instanceof ApiError && reason.status===409?'The preview changed. Refresh and review it again.':reason instanceof Error?reason.message:'Unable to complete transition.');}
    finally{setBusy(false);}
  };
  return <div className="my-4 space-y-4 border-y border-slate-200 py-4">
    {error?<p role="alert" className="text-red-700">{error}</p>:null}
    {preview?<><ClosureSummary preview={preview}/>{preview.requiresAcknowledgement?<label className="flex gap-2 text-sm"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)} disabled={busy}/>I acknowledge the unfinished tasks and active completion windows shown above.</label>:null}</>:!error?<p>Loading closure preview…</p>:null}
    <div className="flex gap-2"><PortalButton disabled={busy} onClick={()=>{session.current.invalidate();setPreview(null);setAcknowledged(false);setRevision(v=>v+1);}}>Refresh preview</PortalButton><PortalButton variant="primary" disabled={disabled||busy||!preview||(preview.requiresAcknowledgement&&!acknowledged)} onClick={()=>void confirm()}>Confirm closure / handover</PortalButton></div>
  </div>;
}
