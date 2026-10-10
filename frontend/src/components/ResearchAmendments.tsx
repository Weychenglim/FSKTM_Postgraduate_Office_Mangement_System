import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/apiClient';
import { cancelResearchAmendment, correctResearchProfile, decideResearchAmendment, getResearchAmendmentOptions, getResearchAmendments, submitResearchAmendment } from '../services/researchAmendmentsApi';
import type { ResearchAmendment, ResearchAmendmentOptions, ResearchRevision, ResearchSnapshot } from '../services/researchAmendmentsApi';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import type { UserRole } from '../types/auth';

const inputClass = 'form-control form-control-sm mt-1';
const date = (value: string) => new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const words = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
type Action = 'APPROVE' | 'REJECT' | 'CANCEL';

function Comparison({ before, after, changedOnly = false, approved = false, afterLabel, initialRecord = false }: { before: ResearchSnapshot; after: ResearchSnapshot; changedOnly?: boolean; approved?: boolean; afterLabel?: string; initialRecord?: boolean }) {
  if (initialRecord) return <dl className="space-y-4">{(['programme', 'title', 'abstract'] as const).map(field => <div key={field} className="space-y-2">
    <dt className="card-value">{words(field)}</dt>
    <dd className="card-description whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-slate-700">{after[field] || 'Not recorded'}</dd>
  </div>)}</dl>;
  if (changedOnly) return <div className="space-y-4">{(['programme', 'title', 'abstract'] as const).filter(field => before[field] !== after[field]).map(field => <div key={field} className="space-y-2">
    <h4 className="card-value">{words(field)}</h4>
    <dl className={`grid gap-3 ${field === 'abstract' ? '' : 'sm:grid-cols-2'}`}>{[before, after].map((value, index) => <div key={index} className="rounded-lg bg-slate-50 p-3">
      <dt className="card-label">{index ? afterLabel ?? (approved ? 'Approved' : 'Proposed') : 'Previously'}</dt>
      <dd className="card-description mt-2 whitespace-pre-wrap break-words text-slate-700">{value[field] || 'Not recorded'}</dd>
    </div>)}</dl>
  </div>)}</div>;
  return <div className="grid gap-3 sm:grid-cols-2">{[before, after].map((value, index) => <div key={index} className="card-description rounded-lg bg-slate-50 p-3">
    <h4 className="card-value">{index ? 'Proposed / recorded after' : 'Before'}</h4>
    <p className="card-value mt-2"><span className="card-label">Programme:</span> {value.programme || 'Not recorded'}</p>
    <p className="card-value mt-2"><span className="card-label">Title:</span> {value.title || 'Not recorded'}</p>
    <p className="card-description mt-2 whitespace-pre-wrap text-slate-700"><span className="card-label">Abstract:</span> {value.abstract || 'Not recorded'}</p>
  </div>)}</div>;
}

function TransferTeamSnapshot({ row }: { row: ResearchAmendment }) {
  const team = row.teamSnapshot;
  return <>{row.kind === 'TRANSFER' ? <div className="card-description rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"><p className="card-value text-amber-900">Supervisory team retained on transfer</p><p>Primary supervisor: {team?.primary?.name ?? 'None recorded'}</p><p>Co-supervisors: {team?.coSupervisors?.map(member => member.name).join(', ') || 'None recorded'}</p><p>Panel: {team?.panel?.map(member => member.name).join(', ') || 'None recorded'}</p><p className="mt-2">Existing appointments keep their current workload slots; the transfer adds no new allocation.</p>{row.unfinishedTaskCount !== null ? <p>{row.unfinishedTaskCount} unfinished evaluation tasks remain assigned to their current evaluators.</p> : <p>Historical team snapshot. Current task counts are outside your access.</p>}</div> : null}</>;
}

export function ResearchAmendmentCard({ row, busy, onAction, studentView = false, lecturerView = false }: { row: ResearchAmendment; busy: boolean; onAction: (row: ResearchAmendment, action: Action) => void; studentView?: boolean; lecturerView?: boolean }) {
  if (studentView || lecturerView) {
    const titleChanged = row.before.title !== row.after.title;
    const abstractChanged = row.before.abstract !== row.after.abstract;
    const heading = row.kind === 'TRANSFER' ? 'Programme transfer' : titleChanged && abstractChanged ? 'Title and abstract change' : titleChanged ? 'Title change' : abstractChanged ? 'Abstract change' : 'Research change';
    return <article className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="section-label">{heading}</h3>{lecturerView ? <p className="card-description mt-1">{row.studentName} · {row.matricNo}</p> : null}<p className="card-description mt-1">Request #{row.id} · Submitted {date(row.createdAt)} (Malaysia)</p></div><StatusBadge tone={row.status === 'APPROVED' ? 'success' : row.status.startsWith('PENDING') ? 'warning' : 'neutral'}>{row.stageLabel}</StatusBadge></div>
      <details><summary className="card-value cursor-pointer text-blue-600">View details</summary><div className="mt-4 space-y-4">
        <Comparison before={row.before} after={row.after} changedOnly approved={row.status === 'APPROVED'} />
        <p className="card-description whitespace-pre-wrap"><span className="card-label">Reason:</span> {row.reason}</p>
        {lecturerView ? <TransferTeamSnapshot row={row} /> : null}
        <div><h4 className="card-value">Approval history</h4><p className="card-description mt-1">Recorded submissions and decisions for this request.</p><ol className="card-description mt-3 space-y-3 border-l border-slate-200 pl-3">{row.events.map(event => <li key={event.id}><p className="card-value">{words(event.action)} · {event.actorName}</p><p>{date(event.createdAt)} (Malaysia)</p>{lecturerView ? <p>{words(event.previousStatus || 'Created')} → {words(event.newStatus)}</p> : null}{lecturerView && event.retainTeam ? <p>Existing supervisory team and unfinished evaluation tasks acknowledged.</p> : null}{event.reason ? <p className="mt-1 whitespace-pre-wrap">{event.reason}</p> : null}</li>)}</ol></div>
        {lecturerView && row.canDecide ? <div className="flex flex-wrap gap-2"><PortalButton size="sm" variant="primary" disabled={busy} onClick={() => onAction(row, 'APPROVE')}>{row.status === 'PENDING_SUPERVISOR' ? 'Endorse' : 'Approve'}</PortalButton><PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'REJECT')}>Reject</PortalButton></div> : null}
        {row.canCancel ? <PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'CANCEL')}>Cancel request</PortalButton> : null}
      </div></details>
    </article>;
  }
  return <article className="space-y-3 rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap justify-between gap-2"><div><h3 className="section-label">{row.kind === 'TRANSFER' ? 'Programme transfer' : 'Research amendment'} #{row.id}</h3><p className="card-description">{row.studentName} · {row.matricNo}</p></div><StatusBadge tone={row.status === 'APPROVED' ? 'success' : row.status.startsWith('PENDING') ? 'warning' : 'neutral'}>{row.stageLabel}</StatusBadge></div>
    <Comparison before={row.before} after={row.after} />
    <p className="card-description whitespace-pre-wrap"><span className="card-label">Reason:</span> {row.reason}</p>
    <TransferTeamSnapshot row={row} />
    <div className="flex flex-wrap gap-2">{row.canDecide ? <><PortalButton size="sm" variant="primary" disabled={busy} onClick={() => onAction(row, 'APPROVE')}>{row.status === 'PENDING_SUPERVISOR' ? 'Endorse' : 'Approve'}</PortalButton><PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'REJECT')}>Reject</PortalButton></> : null}{row.canCancel ? <PortalButton size="sm" disabled={busy} onClick={() => onAction(row, 'CANCEL')}>Cancel request</PortalButton> : null}</div>
    <details><summary className="card-value cursor-pointer">Request history ({row.events.length})</summary><ol className="card-description mt-2 space-y-3">{row.events.map(event => <li key={event.id}><p className="card-value">{words(event.action)} · {event.actorName} · {date(event.createdAt)} (Malaysia)</p><p>{words(event.previousStatus || 'Created')} → {words(event.newStatus)}</p>{event.reason ? <p className="card-description whitespace-pre-wrap">{event.reason}</p> : null}{event.retainTeam ? <p>Existing supervisory team and unfinished evaluation tasks acknowledged.</p> : null}</li>)}</ol></details>
  </article>;
}

export function ResearchRevisionCard({ revision, studentView = false, lecturerView = false }: { revision: ResearchRevision; studentView?: boolean; lecturerView?: boolean }) {
  const compactView = studentView || lecturerView;
  return <article className={compactView ? 'space-y-3 rounded-xl border border-slate-200 p-4' : 'space-y-2 rounded-xl border border-slate-200 p-3'}>
    <div className="space-y-1">
      <h3 className={compactView ? 'section-label' : 'card-value'}>{compactView && revision.kind === 'BASELINE' ? 'Initial record' : `Revision ${revision.revision} · ${words(revision.kind)}`}{!studentView && revision.studentName ? ` · ${revision.studentName}` : ''}</h3>
      <p className="card-description">{revision.actorName} · {date(revision.createdAt)} (Malaysia)</p>
    </div>
    <Comparison before={revision.before} after={revision.after} changedOnly={compactView} initialRecord={compactView && revision.kind === 'BASELINE'} afterLabel="Recorded" />
    {revision.reason ? <p className="card-description whitespace-pre-wrap">{revision.reason}</p> : null}
  </article>;
}

export function ResearchAmendmentForm({ options, busy, onSave, studentView = false }: { options: ResearchAmendmentOptions; busy: boolean; studentView?: boolean; onSave: (kind: 'RESEARCH' | 'TRANSFER' | 'CORRECTION', values: { title: string; abstract: string; destinationProgramme: string; reason: string }) => void }) {
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
    <h3 className="section-label">Request a change</h3>
    {!studentView ? <label className="form-label block">Change type<select className={inputClass} disabled={busy} value={kind} onChange={event => setKind(event.target.value as typeof kind)}>{options.canSubmitResearch ? <option value="RESEARCH">Research title / abstract amendment</option> : null}{options.canCorrect ? <option value="CORRECTION">Typographical correction</option> : null}{options.canTransfer ? <option value="TRANSFER">Programme transfer</option> : null}</select></label> : null}
    {kind === 'TRANSFER' ? <label className="form-label block">Destination programme<select required className={inputClass} value={destinationProgramme} disabled={busy} onChange={event => setDestination(event.target.value)}><option value="">Select destination programme</option>{options.programmes.filter(programme => programme !== options.profile?.programme).map(programme => <option key={programme}>{programme}</option>)}</select></label> : <><label className="form-label block">Research title<input required className={inputClass} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label><label className="form-label block">Research abstract<textarea required rows={5} className={inputClass} value={abstract} disabled={busy} onChange={event => setAbstract(event.target.value)} /></label></>}
    <label className="form-label block">Reason<textarea required rows={2} className={inputClass} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></label>
    {kind === 'CORRECTION' ? <label className="card-description flex items-start gap-2 text-slate-700"><input type="checkbox" required disabled={busy} checked={unchanged} onChange={event => setUnchanged(event.target.checked)} />I confirm this corrects typography only and does not change the research meaning.</label> : <p className="card-description">{kind === 'RESEARCH' ? 'The primary supervisor endorses the request before the programme coordinator makes the final decision.' : 'The source programme coordinator reviews first, followed by the destination programme coordinator. Both must acknowledge the existing team and unfinished tasks.'}</p>}
    <PortalButton type="submit" variant="primary" isLoading={busy} disabled={!valid}>{kind === 'CORRECTION' ? 'Save audited correction' : 'Submit request'}</PortalButton>
  </form>;
}

export function ResearchAmendments({ onChanged, role, refreshVersion = 0 }: { onChanged?: () => void; role?: UserRole; refreshVersion?: number }) {
  const studentView = role === 'Student';
  const lecturerView = role === 'Lecturer';
  const compactView = studentView || lecturerView;
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
  const editPanel = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!compactView || !edit) return;
    editPanel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    editPanel.current?.querySelector('textarea')?.focus({ preventScroll: true });
  }, [edit, compactView]);
  const load = useCallback(async () => {
    const token = ++version.current;
    setLoading(true); setError(null);
    try { const [nextOptions, data] = await Promise.all([getResearchAmendmentOptions(studentId), getResearchAmendments(studentId)]); if (token === version.current) { setOptions(nextOptions); setRows(data.requests); setRevisions(data.revisions); } }
    catch (failure) { if (token === version.current) { setOptions(null); setRows([]); setRevisions([]); setError(failure instanceof Error ? failure.message : 'Research changes could not be loaded.'); } }
    finally { if (token === version.current) setLoading(false); }
  }, [studentId]);
  useEffect(() => { void load(); return () => { version.current += 1; }; }, [load, refreshVersion]);
  const run = async (operation: () => Promise<unknown>) => {
    if (mutating.current) return;
    mutating.current = true; setBusy(true); setNotice(null);
    try { await operation(); setEdit(null); setNotice('Research change recorded.'); onChanged?.(); await load(); }
    catch (failure) { setNotice(failure instanceof Error ? failure.message : 'The change could not be saved.'); if (failure instanceof ApiError && failure.status === 409) { setEdit(null); await load(); } }
    finally { mutating.current = false; setBusy(false); }
  };
  const requestForm = options ? <ResearchAmendmentForm key={`${options.profile?.studentId}-${options.profile?.revision}`} options={options} busy={busy} studentView={studentView} onSave={(kind, values) => void run(() => kind === 'CORRECTION' ? correctResearchProfile({ studentId: options.profile!.studentId, title: values.title, abstract: values.abstract, reason: values.reason, meaningUnchanged: true, expectedRevision: options.profile!.revision }) : submitResearchAmendment({ kind, ...(kind === 'TRANSFER' ? { studentId: options.profile!.studentId, destinationProgramme: values.destinationProgramme } : { title: values.title, abstract: values.abstract }), reason: values.reason }))} /> : null;
  return <section className={compactView ? 'space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm' : 'mt-6 space-y-4 border-t border-slate-200 pt-5'} aria-label={compactView ? 'Research change requests' : 'Research amendments and programme transfers'}>
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="section-label">{compactView ? 'Research change requests' : 'Research amendments and programme transfers'}</h2>{compactView ? <p className="card-description mt-1">{studentView ? 'Track requests to update your research title or abstract. Open a request to see what changed and who reviewed it.' : 'Review research changes for your students. Open a request to see changed fields, reasons and recorded decisions.'}</p> : null}</div><PortalButton size="sm" disabled={loading || busy} onClick={() => void load()}>Refresh research changes</PortalButton></div>
    {notice ? <p role="status" className="card-description rounded-lg bg-slate-50 p-3">{notice}</p> : null}
    {loading ? <LoadingState message="Loading research changes…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : options ? <>
      {!studentView && options.students.length > 0 && !options.canSubmitResearch ? <label className="form-label block">Student<select className={inputClass} value={studentId ?? ''} disabled={busy} onChange={event => { setStudentId(event.target.value ? Number(event.target.value) : undefined); setEdit(null); }}><option value="">Select a student to view their profile and history</option>{options.students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.matricNo} · {student.programme}</option>)}</select></label> : null}
      {studentView ? options.canSubmitResearch ? <details><summary className="card-value cursor-pointer text-blue-600">Request a research change</summary><div className="mt-3">{requestForm}</div></details> : rows.some(row => row.status.startsWith('PENDING')) ? <p className="card-description rounded-lg bg-slate-50 p-3">You have a request awaiting a decision. You can submit another after it is resolved.</p> : null : requestForm}
      {edit ? <form ref={editPanel} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4" onSubmit={event => { event.preventDefault(); if (edit.action !== 'APPROVE' && !reason.trim()) return; if (edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement && !retainTeam) return; void run(() => edit.action === 'CANCEL' ? cancelResearchAmendment(edit.row.id, reason.trim()) : decideResearchAmendment(edit.row.id, { decision: edit.action, expectedStatus: edit.row.status, reason: reason.trim(), ...(retainTeam ? { retainTeam: true } : {}) })); }}>
        <h3 className="card-value">{edit.action === 'CANCEL' ? 'Cancel request' : edit.action === 'APPROVE' && edit.row.status === 'PENDING_SUPERVISOR' ? 'Endorse request' : `${words(edit.action)} request`} #{edit.row.id} · {edit.row.studentName}</h3>
        <label className="form-label block">{edit.action === 'APPROVE' ? 'Decision note (optional)' : 'Reason (required)'}<textarea className={inputClass} required={edit.action !== 'APPROVE'} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
        {edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement ? <label className="card-description flex items-start gap-2 text-slate-700"><input required type="checkbox" checked={retainTeam} disabled={busy} onChange={event => setRetainTeam(event.target.checked)} />I acknowledge retention of the existing primary supervisor, co-supervisors, panel and {edit.row.unfinishedTaskCount} unfinished evaluation tasks shown in this request.</label> : null}
        <div className="flex gap-2"><PortalButton type="submit" variant="primary" isLoading={busy} disabled={(edit.action !== 'APPROVE' && !reason.trim()) || (edit.action === 'APPROVE' && edit.row.requiresTeamAcknowledgement && !retainTeam)}>Confirm decision</PortalButton><PortalButton type="button" disabled={busy} onClick={() => setEdit(null)}>Back</PortalButton></div>
      </form> : null}
      {rows.map(row => <ResearchAmendmentCard key={row.id} row={row} studentView={studentView} lecturerView={lecturerView} busy={busy} onAction={(selected, action) => { setEdit({ row: selected, action }); setReason(''); setRetainTeam(false); setNotice(null); }} />)}
      {!rows.length ? <p className="card-description">No research amendment or transfer requests to display.</p> : null}
      {revisions.length ? <details><summary className="card-value cursor-pointer">{compactView ? 'Research profile history' : 'Research revision history'} ({revisions.length})</summary>{studentView ? <p className="card-description mt-2">Saved research profiles, including your initial record and approved changes.</p> : null}<div className="mt-3 space-y-3">{revisions.map(revision => <ResearchRevisionCard key={revision.id} revision={revision} studentView={studentView} lecturerView={lecturerView} />)}</div></details> : null}
    </> : null}
  </section>;
}
