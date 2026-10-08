import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { UserRole } from '../types/auth';
import type { CapacityPolicy, CapacityReassessment, CapacityReassessmentWorkspace, CapacitySemester } from '../types/capacityReassessment';
import { authorizeCapacityReassessment, getCapacityReassessments, revokeCapacityReassessment, runCapacityReassessmentAction } from '../services/capacityReassessmentsApi';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

const words = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
const date = (value: string) => new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const kinds = { SUPERVISOR: 'Supervisor', CO_SUPERVISOR: 'Co-supervisor', PANEL: 'Panel' };
type Action = 'authorize' | 'revoke';

function Policy({ policy }: { policy: CapacityPolicy | null }) {
  if (!policy) return <p className="text-sm text-slate-500">Capacity policy unavailable</p>;
  return <div className="space-y-1 text-sm">
    <p>{policy.planId === null ? 'No published plan' : `Plan #${policy.planId} · version ${policy.planVersion ?? 'not recorded'}`}</p>
    <p>{policy.activeLoad} active · {policy.reservedLoad} reserved · limit {policy.limit ?? 'unconfigured'}</p>
    <p>{words(policy.state)}{policy.unavailableUntil ? ` until ${policy.unavailableUntil}` : ''}</p>
  </div>;
}

export function CapacityReassessmentCard({ row, activeSemester, office, busy, onAction }: {
  row: CapacityReassessment; activeSemester: CapacitySemester | null; office: boolean; busy: boolean; onAction: (row: CapacityReassessment, action: Action) => void;
}) {
  return <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold text-brand-navy">{kinds[row.kind]} #{row.id} · {row.candidate.name}</h4><p className="text-xs text-slate-500">{row.student.name} · {row.student.matricNo} · {row.student.programme}</p></div><StatusBadge tone="neutral">{words(row.status)}</StatusBadge></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1 rounded-lg bg-slate-50 p-3"><h5 className="text-sm font-semibold">Original semester</h5><p className="text-sm">{row.originalSemester ? `${row.originalSemester.label} · ${words(row.originalSemester.lifecycleStatus)}` : 'Not recorded'}</p><Policy policy={row.originalCapacity} /></div>
      <div className="space-y-1 rounded-lg bg-slate-50 p-3"><h5 className="text-sm font-semibold">Current active semester</h5><p className="text-sm">{activeSemester?.label ?? 'No active semester'}</p><Policy policy={row.currentCapacity} /></div>
    </div>
    {row.authorization ? <div className="space-y-1 text-sm"><p><strong>Authorization:</strong> {words(row.authorization.state)} · {row.authorization.targetSemester.label}</p><p className="whitespace-pre-wrap">{row.authorization.reason}</p>{row.authorization.state === 'STALE' ? <p className="rounded-lg bg-amber-50 p-2 text-amber-900">This authorization is no longer usable. Only pending requests from closed semesters can receive a new authorization for the current active semester.</p> : null}</div> : <p className="text-sm text-slate-500">No capacity reassessment authorization.</p>}
    {office ? <div className="flex flex-wrap gap-2">{row.canAuthorize ? <PortalButton size="sm" disabled={busy || !activeSemester} onClick={() => onAction(row, 'authorize')}>Authorize reassessment</PortalButton> : null}{row.canRevoke ? <PortalButton size="sm" variant="danger" disabled={busy} onClick={() => onAction(row, 'revoke')}>Revoke authorization</PortalButton> : null}</div> : null}
    {row.history.length ? <details className="text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Authorization history ({row.history.length})</summary><ol className="mt-3 space-y-3 border-l border-slate-200 pl-3">{row.history.map(event => <li key={event.id} className="space-y-1"><p className="font-semibold">{words(event.action)} · {event.actorName} · {words(event.actorRole)} · {date(event.createdAt)}</p><p>Target semester: {event.targetSemester?.label ?? 'Not recorded'}</p><p className="whitespace-pre-wrap">{event.reason}</p><Policy policy={event.policy} /></li>)}</ol></details> : null}
  </article>;
}

export function CapacityReassessments({ role, onChanged }: { role?: UserRole; onChanged?: () => void }) {
  // Do not mount the data-loading workspace for roles outside the staff scope.
  if (role !== 'Office Staff/Admin' && role !== 'Programme Coordinator') return null;
  return <CapacityReassessmentWorkspaceView office={role === 'Office Staff/Admin'} onChanged={onChanged} />;
}

function CapacityReassessmentWorkspaceView({ office, onChanged }: { office: boolean; onChanged?: () => void }) {
  const [workspace, setWorkspace] = useState<CapacityReassessmentWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ row: CapacityReassessment; action: Action; semester: CapacitySemester | null } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const version = useRef(0);
  const mutating = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const load = useCallback(async () => {
    const token = ++version.current;
    setLoading(true); setError(null);
    try { const result = await getCapacityReassessments(); if (version.current === token) setWorkspace(result); }
    catch (failure) { if (version.current === token) { setWorkspace(null); setError(failure instanceof Error ? failure.message : 'Capacity reassessments could not be loaded.'); } }
    finally { if (version.current === token) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { version.current += 1; }; }, [load]);
  useEffect(() => { if (edit) { form.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); form.current?.querySelector('textarea')?.focus({ preventScroll: true }); } }, [edit]);
  const save = async () => {
    if (!office || !edit || !reason.trim() || mutating.current) return;
    const { row, action, semester } = edit;
    if (action === 'authorize' && (!row.canAuthorize || !semester) || action === 'revoke' && (!row.canRevoke || !row.authorization)) return;
    mutating.current = true; setBusy(true); setNotice(null);
    try {
      const result = await runCapacityReassessmentAction(() => action === 'authorize'
        ? authorizeCapacityReassessment(row.kind, row.id, { reason: reason.trim(), expectedStatus: row.status, expectedActiveSemesterId: semester!.id, expectedAuthorizationId: row.authorization?.id ?? null, expectedEventId: row.latestEventId })
        : revokeCapacityReassessment(row.kind, row.id, { reason: reason.trim(), expectedStatus: row.status, expectedAuthorizationId: row.authorization!.id, expectedEventId: row.latestEventId }), load);
      setNotice(result.message);
      if (result.ok || result.conflict) { setEdit(null); setReason(''); }
      if (result.ok) onChanged?.();
    } finally { mutating.current = false; setBusy(false); }
  };
  const query = search.trim().toLowerCase();
  const rows = workspace?.requests.filter(row => `${row.student.name} ${row.student.matricNo} ${row.student.programme} ${row.candidate.name}`.toLowerCase().includes(query)) ?? [];
  const pageCount = Math.max(1, Math.ceil(rows.length / 8));
  const currentPage = Math.min(page, pageCount);
  return <section className="space-y-3 border-t border-slate-200 pt-5" aria-label="Carryover capacity reassessment">
    <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-base font-bold text-brand-navy">Carryover capacity reassessment</h3><PortalButton size="sm" disabled={busy || loading} onClick={() => { setEdit(null); setReason(''); void load(); }}>Refresh reassessments</PortalButton></div>
    <p className="text-sm text-slate-600">Office may authorize pending requests from closed semesters to use the current active semester’s capacity policy. This does not approve an appointment or add capacity. The original semester and approval stage remain unchanged; eligibility and workload limits are checked again at approval.</p>
    {!office ? <p className="text-xs text-slate-500">Read-only history for students in your authorized programme scope.</p> : null}
    {notice ? <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm">{notice}</p> : null}
    {edit ? <form ref={form} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4" onSubmit={event => { event.preventDefault(); void save(); }}>
      <h4 className="font-semibold">{edit.action === 'authorize' ? 'Authorize reassessment' : 'Revoke authorization'} · {kinds[edit.row.kind]} #{edit.row.id} · {edit.row.student.name}</h4>
      <p className="text-sm">Original semester: {edit.row.originalSemester?.label ?? 'Not recorded'}. {edit.action === 'authorize' ? `Capacity target: ${edit.semester?.label ?? 'No active semester'}.` : `Revoking target: ${edit.row.authorization?.targetSemester.label ?? 'Not recorded'}.`}</p>
      <label className="block text-sm font-medium">Reason<textarea required rows={3} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" /></label>
      <div className="flex gap-2"><PortalButton type="submit" variant="primary" disabled={!reason.trim() || loading || !!error} isLoading={busy}>{edit.action === 'authorize' ? 'Confirm authorization' : 'Confirm revocation'}</PortalButton><PortalButton disabled={busy} onClick={() => { setEdit(null); setReason(''); }}>Cancel</PortalButton></div>
    </form> : null}
    {loading ? <LoadingState message="Loading capacity reassessments…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : workspace ? <>
      {!workspace.activeSemester ? <p className="text-sm text-amber-900">No effective active semester is available. New authorizations cannot be granted.</p> : null}
      {workspace.requests.length > 1 ? <label className="block text-sm font-medium">Find a carryover request<input type="search" value={search} placeholder="Student, matric number, programme or candidate" onChange={event => { setSearch(event.target.value); setPage(1); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></label> : null}
      {rows.slice((currentPage - 1) * 8, currentPage * 8).map(row => <CapacityReassessmentCard key={`${row.kind}-${row.id}`} row={row} activeSemester={workspace.activeSemester} office={office} busy={busy} onAction={(row, action) => { setEdit({ row, action, semester: workspace.activeSemester }); setReason(''); setNotice(null); }} />)}
      {!rows.length ? <EmptyState title={query ? 'No matching carryover requests' : 'No carryover requests'} description="Eligible pending requests and recorded authorization history will appear here." /> : null}
      {rows.length > 8 ? <div className="flex items-center justify-between text-xs"><PortalButton size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</PortalButton><span>Page {currentPage} of {pageCount}</span><PortalButton size="sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</PortalButton></div> : null}
    </> : null}
  </section>;
}
