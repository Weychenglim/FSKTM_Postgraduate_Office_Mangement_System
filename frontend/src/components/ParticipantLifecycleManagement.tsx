import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, History, RefreshCw, Search, ShieldAlert, ShieldCheck, UserRoundCheck } from 'lucide-react';
import type {
  ParticipantLifecycleListResponse,
  ParticipantLifecycleRecord,
  ParticipantLifecycleStatus,
  ParticipantPendingWork,
  ParticipantType,
} from '../types';
import {
  cancelParticipantPendingWork,
  getParticipant,
  getParticipants,
  transitionParticipant,
} from '../services';
import {
  allowedParticipantTransitions,
  lifecycleLabel,
  participantConflictMessage,
} from '../utils/participantLifecycle';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';

interface ParticipantLifecycleManagementProps {
  onBack: () => void;
  onOpenReconciliation?: () => void;
}

const statusTone = (status: ParticipantLifecycleStatus) => {
  if (status === 'ACTIVE') return 'success' as const;
  if (status === 'DEFERRED' || status === 'RETIRING') return 'warning' as const;
  if (status === 'WITHDRAWN' || status === 'RETIRED') return 'danger' as const;
  return 'neutral' as const;
};

const formatDateTime = (value: string | null) => value
  ? new Date(value).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not changed';

export const ParticipantLifecycleManagement: React.FC<ParticipantLifecycleManagementProps> = ({
  onBack,
  onOpenReconciliation,
}) => {
  const [data, setData] = useState<ParticipantLifecycleListResponse | null>(null);
  const [selected, setSelected] = useState<ParticipantLifecycleRecord | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | ParticipantType>('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [programme, setProgramme] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<ParticipantLifecycleStatus | null>(null);
  const [pendingCancellation, setPendingCancellation] = useState<ParticipantPendingWork | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (typeFilter !== 'ALL') params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (programme) params.set('programme', programme);
    if (search.trim()) params.set('search', search.trim());
    const query = params.size ? `?${params.toString()}` : '';
    try {
      const response = await getParticipants(query);
      setData(response);
      setSelected((current) => (
        current
          ? (() => {
            const record = response.records.find((candidate) => (
              candidate.participantType === current.participantType
              && candidate.identifier === current.identifier
            ));
            return record ? { ...record, audits: current.audits } : null;
          })()
          : null
      ));
    } catch (loadError) {
      setError(participantConflictMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [programme, search, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openParticipant = async (record: ParticipantLifecycleRecord) => {
    setError(null);
    try {
      setSelected(await getParticipant(record.participantType, record.identifier));
      setTargetStatus(null);
      setPendingCancellation(null);
      setReason('');
    } catch (loadError) {
      setError(participantConflictMessage(loadError));
    }
  };

  const completeOperation = async () => {
    if (!selected || !reason.trim() || (!targetStatus && !pendingCancellation)) return;
    setSaving(true);
    setError(null);
    try {
      if (targetStatus) {
        await transitionParticipant(selected.participantType, selected.identifier, {
          targetStatus,
          reason: reason.trim(),
        });
        setToast(`Lifecycle changed to ${lifecycleLabel(targetStatus)}.`);
      } else if (pendingCancellation) {
        await cancelParticipantPendingWork(
          selected.participantType,
          selected.identifier,
          pendingCancellation.recordType,
          pendingCancellation.recordId,
          reason.trim(),
        );
        setToast('Pending workflow cancelled.');
      }
      setTargetStatus(null);
      setPendingCancellation(null);
      setReason('');
      await load();
      setSelected(await getParticipant(selected.participantType, selected.identifier));
      window.setTimeout(() => setToast(null), 3200);
    } catch (operationError) {
      setError(participantConflictMessage(operationError));
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => data?.summary, [data]);
  const transitions = selected
    ? allowedParticipantTransitions(selected.participantType, selected.lifecycleStatus)
    : [];

  return (
    <div className="space-y-6 pb-16 text-left text-xs">
      <PortalToast message={toast} />
      <PageHeader
        title="Participant Lifecycle Management"
        subtitle="Manage academic eligibility while retaining complete workflow, appointment, and Marks history."
        backLabel="Back to Office Dashboard"
        onBack={onBack}
        actions={(
          <>
            {onOpenReconciliation && <PortalButton icon={ShieldAlert} onClick={onOpenReconciliation}>Reconcile Workflows</PortalButton>}
            <PortalButton icon={RefreshCw} onClick={() => void load()}>Refresh</PortalButton>
          </>
        )}
      />

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-3xs">
              <p className="text-[10px] font-extrabold uppercase text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p>
              <p className="mt-2 text-2xl font-black text-brand-navy">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-3xs">
          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-4">
            <label className="relative md:col-span-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input className="form-input w-full pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or ID" />
            </label>
            <select className="form-input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'ALL' | ParticipantType)}>
              <option value="ALL">All participants</option>
              <option value="STUDENT">Students</option>
              <option value="LECTURER">Lecturers</option>
            </select>
            <select className="form-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All lifecycle states</option>
              {['ACTIVE', 'DEFERRED', 'GRADUATED', 'WITHDRAWN', 'RETIRING', 'RETIRED'].map((status) => (
                <option key={status} value={status}>{lifecycleLabel(status)}</option>
              ))}
            </select>
            <select className="form-input" value={programme} onChange={(event) => setProgramme(event.target.value)}>
              <option value="">All programmes</option>
              {data?.availableProgrammes.map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>

          {loading ? <LoadingState message="Loading participant lifecycle records..." /> : error && !data ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : !data?.records.length ? (
            <EmptyState title="No participants match these filters" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr className="data-thead"><th className="data-th">Participant</th><th className="data-th">Type</th><th className="data-th">Lifecycle</th><th className="data-th">Blockers</th><th className="data-th text-right">Action</th></tr></thead>
                <tbody>
                  {data.records.map((record) => {
                    const blockerCount = Object.values(record.blockers).reduce((sum, value) => sum + value, 0);
                    return (
                      <tr key={`${record.participantType}-${record.identifier}`} className="data-row">
                        <td className="data-td"><strong className="block text-brand-navy">{record.name}</strong><span className="text-slate-500">{record.identifier} · {record.programme || record.department || 'Faculty-wide'}</span></td>
                        <td className="data-td">{record.participantType === 'STUDENT' ? 'Student' : 'Lecturer'}</td>
                        <td className="data-td"><StatusBadge tone={statusTone(record.lifecycleStatus)}>{lifecycleLabel(record.lifecycleStatus)}</StatusBadge></td>
                        <td className="data-td">{blockerCount}</td>
                        <td className="data-td text-right"><PortalButton size="sm" onClick={() => void openParticipant(record)}>Review</PortalButton></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-3xs">
          {!selected ? (
            <EmptyState title="Select a participant" description="Review blockers, transitions, pending workflows, and immutable audit history." icon={UserRoundCheck} />
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black text-brand-navy">{selected.name}</h2><p className="mt-1 text-slate-500">{selected.identifier} · {selected.programme || selected.department}</p></div><StatusBadge tone={statusTone(selected.lifecycleStatus)}>{lifecycleLabel(selected.lifecycleStatus)}</StatusBadge></div>
                <p className="mt-3 text-[11px] text-slate-500">Account access: <strong>{selected.accountAccess.replace('_', ' ')}</strong></p>
                <p className="text-[11px] text-slate-500">Effective: {formatDateTime(selected.changedAt)}</p>
              </div>

              <div><h3 className="text-xs font-black text-brand-navy">Blockers and active work</h3><div className="mt-2 grid grid-cols-2 gap-2">{Object.entries(selected.blockers).map(([key, value]) => <div key={key} className="rounded-md bg-slate-50 p-3"><span className="block text-[9px] font-bold uppercase text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</span><strong className="mt-1 block text-lg text-brand-navy">{value}</strong></div>)}</div></div>

              {transitions.length > 0 && <div><h3 className="text-xs font-black text-brand-navy">Lifecycle actions</h3><div className="mt-2 flex flex-wrap gap-2">{transitions.map((target) => <PortalButton key={target} size="sm" variant={target === 'WITHDRAWN' || target === 'RETIRED' ? 'danger' : 'secondary'} onClick={() => { setTargetStatus(target); setPendingCancellation(null); setReason(''); }}>{lifecycleLabel(target)}</PortalButton>)}</div></div>}

              {selected.pendingWork.length > 0 && <div><h3 className="text-xs font-black text-brand-navy">Pending work</h3><div className="mt-2 space-y-2">{selected.pendingWork.map((work) => <div key={`${work.recordType}-${work.recordId}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 p-3"><div><strong className="block text-[10px] text-brand-navy">{work.recordType.replaceAll('_', ' ')}</strong><span className="text-[10px] text-slate-500">#{work.recordId} · {work.status.replaceAll('_', ' ')}</span></div><PortalButton size="sm" variant="danger" onClick={() => { setPendingCancellation(work); setTargetStatus(null); setReason(''); }}>Cancel</PortalButton></div>)}</div></div>}

              {(targetStatus || pendingCancellation) && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><strong className="text-amber-900">{targetStatus ? `Change lifecycle to ${lifecycleLabel(targetStatus)}` : 'Cancel pending workflow'}</strong><p className="mt-1 text-[10px] text-amber-800">This operation is transactional and will be recorded in the immutable audit history.</p></div></div><textarea className="form-input mt-3 min-h-24 w-full" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mandatory reason" /><div className="mt-3 flex justify-end gap-2"><PortalButton size="sm" variant="ghost" onClick={() => { setTargetStatus(null); setPendingCancellation(null); setReason(''); }}>Cancel</PortalButton><PortalButton size="sm" variant={targetStatus === 'WITHDRAWN' || targetStatus === 'RETIRED' || pendingCancellation ? 'dangerSolid' : 'primary'} disabled={!reason.trim()} isLoading={saving} onClick={() => void completeOperation()}>Confirm</PortalButton></div></div>}

              {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700">{error}</div>}

              <div><h3 className="flex items-center gap-2 text-xs font-black text-brand-navy"><History className="h-4 w-4" />Audit history</h3>{selected.audits.length ? <ol className="mt-3 space-y-3">{selected.audits.map((audit) => <li key={audit.id} className="border-l-2 border-slate-200 pl-3"><strong className="text-[10px] text-brand-navy">{lifecycleLabel(audit.previousStatus)} to {lifecycleLabel(audit.newStatus)}</strong><p className="mt-1 text-[10px] text-slate-600">{audit.reason}</p><span className="mt-1 block text-[9px] text-slate-400">{audit.actor} · {formatDateTime(audit.createdAt)}</span></li>)}</ol> : <p className="mt-2 text-[10px] text-slate-500">No lifecycle changes recorded.</p>}</div>
              <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-emerald-800"><ShieldCheck className="h-4 w-4 shrink-0" /><p className="text-[10px]">Historical appointments, documents, workflow events, and submitted Marks remain preserved.</p></div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
