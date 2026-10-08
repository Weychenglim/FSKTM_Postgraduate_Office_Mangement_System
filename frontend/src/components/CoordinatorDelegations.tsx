import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CoordinatorDelegation, CoordinatorDelegationInput, CoordinatorDelegationOptions } from '../types/coordinatorDelegation';
import { createCoordinatorDelegation, getCoordinatorDelegationOptions, getCoordinatorDelegations, revokeCoordinatorDelegation } from '../services/coordinatorDelegationsApi';
import { ApiError } from '../services/apiClient';
import { malaysiaToday, validateDelegation } from '../utils/coordinatorDelegations';
import { PortalButton, StatusBadge } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';

export function CoordinatorDelegationCard({ grant, office, onRevoke }: { grant: CoordinatorDelegation; office: boolean; onRevoke: (grant: CoordinatorDelegation) => void }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold text-brand-navy">{grant.programme} · {grant.coordinator.name}</h4><StatusBadge tone={grant.status === 'ACTIVE' ? 'success' : grant.status === 'REVOKED' ? 'danger' : 'neutral'}>{grant.status}</StatusBadge></div>
    <p>{grant.startsOn} – {grant.endsOn} (inclusive, Malaysia time)</p>
    <p className="whitespace-pre-wrap">{grant.justification}</p>
    <p className="text-slate-500">Granted by {grant.grantedBy.name} · {new Date(grant.createdAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</p>
    {grant.revokedAt && <p className="text-rose-700 whitespace-pre-wrap">Revoked by {grant.revokedBy?.name ?? 'Office'} · {new Date(grant.revokedAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}: {grant.revocationReason}</p>}
    {office && grant.canRevoke && <PortalButton variant="danger" onClick={() => onRevoke(grant)}>Revoke</PortalButton>}
  </article>;
}

const blank = (): CoordinatorDelegationInput => ({ programme: '', coordinatorId: 0, startsOn: malaysiaToday(), endsOn: '', justification: '' });
const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-800';
export function CoordinatorDelegations({ office = false, regularProgramme = '', effectiveProgrammes = [], onRefreshScope }: { office?: boolean; regularProgramme?: string; effectiveProgrammes?: string[]; onRefreshScope?: () => void }) {
  const [rows, setRows] = useState<CoordinatorDelegation[]>([]);
  const [options, setOptions] = useState<CoordinatorDelegationOptions>({ programmes: [], coordinators: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState(blank);
  const [revoking, setRevoking] = useState<CoordinatorDelegation | null>(null);
  const [reason, setReason] = useState('');
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    try {
      const [grants, choices] = await Promise.all([getCoordinatorDelegations(current.signal), office ? getCoordinatorDelegationOptions(current.signal) : Promise.resolve(null)]);
      if (current.signal.aborted) return;
      setRows(grants);
      if (choices) setOptions(choices);
    } catch (failure) {
      if (!current.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load coordinator delegations.');
    } finally { if (!current.signal.aborted) setLoading(false); }
  }, [office]);
  useEffect(() => { void load(); return () => controller.current?.abort(); }, [load]);
  const cancel = () => { setCreating(false); setRevoking(null); setReason(''); setValues(blank()); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = revoking ? (!reason.trim() ? 'A revocation reason is required.' : null) : validateDelegation(values);
    if (validation) { setError(validation); return; }
    setSaving(true); setError(null); setMessage(null);
    try {
      if (revoking) await revokeCoordinatorDelegation(revoking.id, reason.trim());
      else await createCoordinatorDelegation({ ...values, justification: values.justification.trim() });
      cancel(); setMessage('Coordinator delegation saved.'); await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save the delegation.');
      if (failure instanceof ApiError && failure.status === 409) { cancel(); await load(); }
    } finally { setSaving(false); }
  };
  return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4 text-xs" aria-label="Acting coordinator delegations">
    <div className="flex flex-wrap justify-between gap-3"><h3 className="text-base font-bold text-brand-navy">{office ? 'Acting coordinator delegations' : 'My coordinator scope'}</h3><div className="flex gap-2"><PortalButton disabled={saving} onClick={() => { setError(null); if (onRefreshScope) onRefreshScope(); else void load(); }}>Refresh delegations</PortalButton>{office && !creating && !revoking && <PortalButton disabled={loading || saving} onClick={() => { setCreating(true); setError(null); }}>Grant acting access</PortalButton>}</div></div>
    {office ? <p>Grant full coordinator access to an additional programme while retaining the coordinator’s regular programme. Only one acting coordinator may cover a programme at a time. Dates are inclusive in Malaysia time. To correct a grant, revoke it and create a new one.</p> : <><p>Regular programme: <strong>{regularProgramme || 'None assigned'}</strong></p><p>Current access: <strong>{effectiveProgrammes.join(', ') || 'None assigned'}</strong></p><p>Acting access covers the full coordinator workflow during the dates below. Your regular programme is retained.</p></>}
    {error && <ErrorState message={error} />}{message && <p role="status" className="text-emerald-700">{message}</p>}
    {office && (creating || revoking) && <form onSubmit={submit} className="space-y-3 rounded-xl bg-white p-4 border border-slate-200">
      {revoking ? <><h4 className="font-bold">Revoke access to {revoking.programme} for {revoking.coordinator.name}</h4><label className="block">Revocation reason<textarea required className={fieldClass} value={reason} onChange={e => setReason(e.target.value)} disabled={saving} /></label></> : <>
        <div className="grid gap-3 sm:grid-cols-2"><label>Additional programme<select required className={fieldClass} value={values.programme} disabled={saving} onChange={e => setValues({ ...values, programme: e.target.value, coordinatorId: 0 })}><option value="">Select programme</option>{options.programmes.map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Active coordinator<select required className={fieldClass} value={values.coordinatorId || ''} disabled={saving || !values.programme} onChange={e => setValues({ ...values, coordinatorId: Number(e.target.value) })}><option value="">Select coordinator</option>{options.coordinators.filter(c => c.programme !== values.programme).map(c => <option key={c.id} value={c.id}>{c.name} · {c.programme}</option>)}</select></label>
        <label>Start date (Malaysia)<input type="date" required min={malaysiaToday()} className={fieldClass} value={values.startsOn} disabled={saving} onChange={e => setValues({ ...values, startsOn: e.target.value })} /></label>
        <label>End date (inclusive)<input type="date" required min={values.startsOn || malaysiaToday()} className={fieldClass} value={values.endsOn} disabled={saving} onChange={e => setValues({ ...values, endsOn: e.target.value })} /></label></div>
        <label className="block">Justification<textarea required className={fieldClass} value={values.justification} disabled={saving} onChange={e => setValues({ ...values, justification: e.target.value })} /></label>
      </>}
      <div className="flex gap-2"><PortalButton type="submit" variant={revoking ? 'danger' : 'primary'} isLoading={saving}>{revoking ? 'Confirm revocation' : 'Create grant'}</PortalButton><PortalButton disabled={saving} onClick={cancel}>Cancel</PortalButton></div>
    </form>}
    {loading ? <LoadingState message="Loading coordinator delegations…" /> : <><h4 className="font-bold">Current, scheduled and historical grants</h4>{rows.length === 0 ? <p>No coordinator delegations recorded.</p> : rows.map(grant => <CoordinatorDelegationCard key={grant.id} grant={{ ...grant, canRevoke: grant.canRevoke && !saving }} office={office} onRevoke={grant => { setRevoking(grant); setCreating(false); setReason(''); setError(null); }} />)}</>}
  </section>;
}
