import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/apiClient';
import { cancelResearchAmendment, correctResearchProfile, decideResearchAmendment, getResearchAmendmentOptions, getResearchAmendments, submitResearchAmendment } from '../services/researchAmendmentsApi';
import type { ResearchAmendment, ResearchAmendmentOptions, ResearchRevision, ResearchSnapshot } from '../services/researchAmendmentsApi';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';

const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-navy';
const date = (value: string) => new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const words = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
type Action = 'APPROVE' | 'REJECT' | 'CANCEL';

function Comparison({ before, after }: { before: ResearchSnapshot; after: ResearchSnapshot }) {
  return <div className="grid gap-3 sm:grid-cols-2">{[before, after].map((value, index) => <div key={index} className="rounded-lg bg-slate-50 p-3 text-sm">
    <h4 className="font-semibold text-brand-navy">{index ? 'Proposed / recorded after' : 'Before'}</h4>
    <p className="mt-2"><strong>Programme:</strong> {value.programme || 'Not recorded'}</p>
    <p className="mt-2"><strong>Title:</strong> {value.title || 'Not recorded'}</p>
    <p className="mt-2 whitespace-pre-wrap"><strong>Abstract:</strong> {value.abstract || 'Not recorded'}</p>
  </div>)}</div>;
}

export function ResearchAmendmentCard({ row, busy, onAction }: { row: ResearchAmendment; busy: boolean; onAction: (row: ResearchAmendment, action: Action) => void }) {
  const team = row.teamSnapshot;
  return <article className="space-y-3 rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold text-brand-navy">{row.kind === 'TRANSFER' ? 'Programme transfer' : 'Research amendment'} #{row.id}</h3><p className="text-xs text-slate-500">{row.studentName} · {row.matricNo}</p></div><StatusBadge tone={row.status === 'APPROVED' ? 'success' : row.status.startsWith('PENDING') ? 'warning' : 'neutral'}>{row.stageLabel}</StatusBadge></div>
    <Comparison before={row.before} after={row.after} />
    <p className="whitespace-pre-wrap text-sm"><strong>Reason:</strong> {row.reason}</p>
    {row.kind === 'TRANSFER' ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-semibold">Supervisory team retained on transfer</p><p>Primary supervisor: {team?.primary?.name ?? 'None recorded'}</p><p>Co-supervisors: {team?.coSupervisors?.map(member => member.name).join(', ') || 'None recorded'}</p><p>Panel: {team?.panel?.map(member => member.name).join(', ') || 'None recorded'}</p><p className="mt-2">Existing appointments keep their current workload slots; the transfer adds no new allocation.</p>{row.unfinishedTaskCount !== null ? <p>{row.unfinishedTaskCount} unfinished evaluation tasks remain assigned to their current evaluators.</p> : <p>Historical team snapshot. Current task counts are outside your access.</p>}</div> : null}
    <div className="flex flex-wrap gap-2">{row.canDecide ? <><PortalButton size="sm" variant="primary" disabled={busy} onClick={() => onAction(row, 'APPROVE')}>{row.status === 'PENDING_SUPERVISOR' ? 'Endorse' : 'Approve'}</PortalButton><PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'REJECT')}>Reject</PortalButton></> : null}{row.canCancel ? <PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'CANCEL')}>Cancel request</PortalButton> : null}</div>
    <details><summary className="cursor-pointer text-sm font-semibold">Request history ({row.events.length})</summary><ol className="mt-2 space-y-3 text-xs text-slate-600">{row.events.map(event => <li key={event.id}><p className="font-semibold">{words(event.action)} · {event.actorName} · {date(event.createdAt)} (Malaysia)</p><p>{words(event.previousStatus || 'Created')} → {words(event.newStatus)}</p>{event.reason ? <p className="whitespace-pre-wrap">{event.reason}</p> : null}{event.retainTeam ? <p>Existing supervisory team and unfinished evaluation tasks acknowledged.</p> : null}</li>)}</ol></details>
  </article>;
}

export function ResearchAmendmentForm({ options, busy, onSave }: { options: ResearchAmendmentOptions; busy: boolean; onSave: (kind: 'RESEARCH' | 'TRANSFER' | 'CORRECTION', values: { title: string; abstract: string; destinationProgramme: string; reason: string }) => void }) {
  const [kind, setKind] = useState<'RESEARCH' | 'TRANSFER' | 'CORRECTION'>(options.canSubmitResearch ? 'RESEARCH' : 'CORRECTION');
  const [title, setTitle] = useState(options.profile?.title ?? '');
  const [abstract, setAbstract] = useState(options.profile?.abstract ?? '');
  const [destinationProgramme, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [unchanged, setUnchanged] = useState(false);
  if (!options.profile || !(options.canSubmitResearch || options.canCorrect || options.canTransfer)) return null;
  const allowed = kind === 'RESEARCH' ? options.canSubmitResearch : kind === 'CORRECTION' ? options.canCorrect : options.canTransfer;
  const valid = allowed && reason.trim() && (kind === 'TRANSFER' ? destinationProgramme : title.trim() && abstract.trim() && (kind !== 'CORRECTION' || unchanged));
  return <form className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4" onSubmit={event => { event.preventDefault(); if (valid && !busy) onSave(kind, { title: title.trim(), abstract: abstract.trim(), destinationProgramme, reason: reason.trim() }); }}>
    <h3 className="font-semibold text-brand-navy">Request a change</h3>
    <label className="block text-sm">Change type<select className={inputClass} disabled={busy} value={kind} onChange={event => setKind(event.target.value as typeof kind)}>{options.canSubmitResearch ? <option value="RESEARCH">Research title / abstract amendment</option> : null}{options.canCorrect ? <option value="CORRECTION">Typographical correction</option> : null}{options.canTransfer ? <option value="TRANSFER">Programme transfer</option> : null}</select></label>
    {kind === 'TRANSFER' ? <label className="block text-sm">Destination programme<select required className={inputClass} value={destinationProgramme} disabled={busy} onChange={event => setDestination(event.target.value)}><option value="">Select destination programme</option>{options.programmes.filter(programme => programme !== options.profile?.programme).map(programme => <option key={programme}>{programme}</option>)}</select></label> : <><label className="block text-sm">Research title<input required className={inputClass} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label><label className="block text-sm">Research abstract<textarea required rows={5} className={inputClass} value={abstract} disabled={busy} onChange={event => setAbstract(event.target.value)} /></label></>}
    <label className="block text-sm">Reason<textarea required rows={2} className={inputClass} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></label>
    {kind === 'CORRECTION' ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" required disabled={busy} checked={unchanged} onChange={event => setUnchanged(event.target.checked)} />I confirm this corrects typography only and does not change the research meaning.</label> : <p className="text-xs text-slate-600">{kind === 'RESEARCH' ? 'The primary supervisor endorses the request before the programme coordinator makes the final decision.' : 'The source programme coordinator reviews first, followed by the destination programme coordinator. Both must acknowledge the existing team and unfinished tasks.'}</p>}
    <PortalButton type="submit" variant="primary" isLoading={busy} disabled={!valid}>{kind === 'CORRECTION' ? 'Save audited correction' : 'Submit request'}</PortalButton>
  </form>;
}

export function ResearchAmendments({ onChanged }: { onChanged?: () => void }) {
  const [options, setOptions] = useState<ResearchAmendmentOptions | null>(null);
  const [rows, setRows] = useState<ResearchAmendment[]>([]);
  const [revisions, setRevisions] = useState<ResearchRevision[]>([]);
  const [studentId, setStudentId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ row: ResearchAmendment; action: Action } | null>(null);
  const [reason, setReason] = useState('');
  const [retainTeam, setRetainTeam] = useState(false);
  const version = useRef(0);
  const mutating = useRef(false);
  const load = useCallback(async () => {
    const token = ++version.current;
    setLoading(true); setError(null);
    try { const [nextOptions, data] = await Promise.all([getResearchAmendmentOptions(studentId), getResearchAmendments(studentId)]); if (token === version.current) { setOptions(nextOptions); setRows(data.requests); setRevisions(data.revisions); } }
    catch (failure) { if (token === version.current) { setOptions(null); setRows([]); setRevisions([]); setError(failure instanceof Error ? failure.message : 'Research changes could not be loaded.'); } }
    finally { if (token === version.current) setLoading(false); }
  }, [studentId]);
  useEffect(() => { void load(); return () => { version.current += 1; }; }, [load]);
  const run = async (operation: () => Promise<unknown>) => {
    if (mutating.current) return;
    mutating.current = true; setBusy(true); setNotice(null);
    try { await operation(); setEdit(null); setNotice('Research change recorded.'); onChanged?.(); await load(); }
    catch (failure) { setNotice(failure instanceof Error ? failure.message : 'The change could not be saved.'); if (failure instanceof ApiError && failure.status === 409) { setEdit(null); await load(); } }
    finally { mutating.current = false; setBusy(false); }
  };
  return <section className="mt-6 space-y-4 border-t border-slate-200 pt-5" aria-label="Research amendments and programme transfers">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-brand-navy">Research amendments and programme transfers</h2><PortalButton size="sm" disabled={loading || busy} onClick={() => void load()}>Refresh research changes</PortalButton></div>
    {notice ? <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm">{notice}</p> : null}
    {loading ? <LoadingState message="Loading research changes…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : options ? <>
      {options.students.length > 0 && !options.canSubmitResearch ? <label className="block text-sm font-medium">Student<select className={inputClass} value={studentId ?? ''} disabled={busy} onChange={event => { setStudentId(event.target.value ? Number(event.target.value) : undefined); setEdit(null); }}><option value="">Select a student to view their profile and history</option>{options.students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.matricNo} · {student.programme}</option>)}</select></label> : null}
      <ResearchAmendmentForm key={`${options.profile?.studentId}-${options.profile?.revision}`} options={options} busy={busy} onSave={(kind, values) => void run(() => kind === 'CORRECTION' ? correctResearchProfile({ studentId: options.profile!.studentId, title: values.title, abstract: values.abstract, reason: values.reason, meaningUnchanged: true, expectedRevision: options.profile!.revision }) : submitResearchAmendment({ kind, ...(kind === 'TRANSFER' ? { studentId: options.profile!.studentId, destinationProgramme: values.destinationProgramme } : { title: values.title, abstract: values.abstract }), reason: values.reason }))} />
      {edit ? <form className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4" onSubmit={event => { event.preventDefault(); if (edit.action !== 'APPROVE' && !reason.trim()) return; if (edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement && !retainTeam) return; void run(() => edit.action === 'CANCEL' ? cancelResearchAmendment(edit.row.id, reason.trim()) : decideResearchAmendment(edit.row.id, { decision: edit.action, expectedStatus: edit.row.status, reason: reason.trim(), ...(retainTeam ? { retainTeam: true } : {}) })); }}>
        <h3 className="font-semibold">{edit.action === 'CANCEL' ? 'Cancel request' : edit.action === 'APPROVE' && edit.row.status === 'PENDING_SUPERVISOR' ? 'Endorse request' : `${words(edit.action)} request`} #{edit.row.id} · {edit.row.studentName}</h3>
        <label className="block text-sm">{edit.action === 'APPROVE' ? 'Decision note (optional)' : 'Reason (required)'}<textarea className={inputClass} required={edit.action !== 'APPROVE'} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
        {edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement ? <label className="flex items-start gap-2 text-sm"><input required type="checkbox" checked={retainTeam} disabled={busy} onChange={event => setRetainTeam(event.target.checked)} />I acknowledge retention of the existing primary supervisor, co-supervisors, panel and {edit.row.unfinishedTaskCount} unfinished evaluation tasks shown in this request.</label> : null}
        <div className="flex gap-2"><PortalButton type="submit" variant="primary" isLoading={busy} disabled={(edit.action !== 'APPROVE' && !reason.trim()) || (edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement && !retainTeam)}>Confirm decision</PortalButton><PortalButton type="button" disabled={busy} onClick={() => setEdit(null)}>Back</PortalButton></div>
      </form> : null}
      {rows.map(row => <ResearchAmendmentCard key={row.id} row={row} busy={busy} onAction={(selected, action) => { setEdit({ row: selected, action }); setReason(''); setRetainTeam(false); setNotice(null); }} />)}
      {!rows.length ? <p className="text-sm text-slate-500">No research amendment or transfer requests to display.</p> : null}
      {revisions.length ? <details><summary className="cursor-pointer text-sm font-semibold">Research revision history ({revisions.length})</summary><div className="mt-3 space-y-3">{revisions.map(revision => <article key={revision.id} className="space-y-2 rounded-xl border border-slate-200 p-3"><h3 className="text-sm font-semibold">Revision {revision.revision} · {words(revision.kind)}{revision.studentName ? ` · ${revision.studentName}` : ''}</h3><p className="text-xs text-slate-500">{revision.actorName} · {date(revision.createdAt)} (Malaysia)</p><Comparison before={revision.before} after={revision.after} /><p className="whitespace-pre-wrap text-sm">{revision.reason}</p></article>)}</div></details> : null}
    </> : null}
  </section>;
}
