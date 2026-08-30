import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Edit3,
  Gauge,
  Plus,
  RefreshCw,
  Save,
  UsersRound,
  ShieldAlert,
  XCircle,
} from 'lucide-react';

import {
  activateAcademicSemester,
  archiveAcademicSemester,
  closeAcademicSemester,
  createAcademicSemester,
  extendAcademicSemester,
  getAcademicSemesterAudits,
  getAcademicSemesters,
  updateAcademicSemester,
} from '../services';
import type {
  AcademicSemester,
  AcademicSemesterAudit,
  AcademicSemesterInput,
  AcademicSemesterLifecycle,
} from '../types';
import {
  academicSemesterErrorMessage,
  formatSemesterLifecycle,
  isConsecutiveAcademicSession,
  validateSemesterDates,
} from '../utils/academicSemesters';
import {
  PageHeader,
  PortalButton,
  PortalCard,
  PortalToast,
  StatusBadge,
  getStatusBadgeTone,
} from './PortalPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

interface AcademicSemesterManagementProps {
  onBack: () => void;
  onManageParticipants?: () => void;
  onOpenReconciliation?: () => void;
  onOpenCapacity?: () => void;
}

type LifecycleFilter = 'ALL' | AcademicSemesterLifecycle;
type TransitionAction = 'activate' | 'close' | 'archive' | 'extend';

const EMPTY_FORM: AcademicSemesterInput = {
  academicSession: '',
  term: 'SEMESTER_I',
  startsOn: '',
  endsOn: '',
};

const displayDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const AcademicSemesterManagement: React.FC<AcademicSemesterManagementProps> = ({
  onBack,
  onManageParticipants,
  onOpenReconciliation,
  onOpenCapacity,
}) => {
  const [semesters, setSemesters] = useState<AcademicSemester[]>([]);
  const [filter, setFilter] = useState<LifecycleFilter>('ALL');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selected, setSelected] = useState<AcademicSemester | null>(null);
  const [audits, setAudits] = useState<AcademicSemesterAudit[]>([]);
  const [form, setForm] = useState<AcademicSemesterInput>(EMPTY_FORM);
  const [transition, setTransition] = useState<TransitionAction | null>(null);
  const [reason, setReason] = useState('');
  const [extensionEnd, setExtensionEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadSemesters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAcademicSemesters(includeArchived);
      setSemesters(rows);
      setSelected((current) => (
        current ? rows.find((row) => row.id === current.id) ?? null : null
      ));
    } catch (loadError) {
      setError(academicSemesterErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    void loadSemesters();
  }, [loadSemesters]);

  const active = semesters.find((semester) => semester.lifecycleStatus === 'ACTIVE') ?? null;
  const visible = useMemo(
    () => semesters.filter((semester) => filter === 'ALL' || semester.lifecycleStatus === filter),
    [filter, semesters],
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  const beginCreate = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setTransition(null);
    setReason('');
    setAudits([]);
    setError(null);
  };

  const beginEdit = (semester: AcademicSemester) => {
    setSelected(semester);
    setForm({
      academicSession: semester.academicSession,
      term: semester.term,
      startsOn: semester.startsOn,
      endsOn: semester.endsOn,
    });
    setTransition(null);
    setReason('');
    setExtensionEnd(semester.endsOn);
    getAcademicSemesterAudits(semester.id)
      .then(setAudits)
      .catch(() => setAudits([]));
  };

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isConsecutiveAcademicSession(form.academicSession)) {
      setError('Academic session must use consecutive years, for example 2026/2027.');
      return;
    }
    const dateError = validateSemesterDates(form.startsOn, form.endsOn);
    if (dateError) {
      setError(dateError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = selected
        ? await updateAcademicSemester(selected.id, form)
        : await createAcademicSemester(form);
      await loadSemesters();
      setAudits(await getAcademicSemesterAudits(selected.id));
      beginEdit(saved);
      showToast(selected ? 'Draft semester updated.' : 'Draft semester created.');
    } catch (saveError) {
      setError(academicSemesterErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const runTransition = async () => {
    if (!selected || !transition || !reason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (transition === 'activate') {
        await activateAcademicSemester(selected.id, reason.trim());
      } else if (transition === 'close') {
        await closeAcademicSemester(selected.id, reason.trim());
      } else if (transition === 'archive') {
        await archiveAcademicSemester(selected.id, reason.trim());
      } else {
        await extendAcademicSemester(selected.id, extensionEnd, reason.trim());
      }
      await loadSemesters();
      setTransition(null);
      setReason('');
      showToast(`Semester ${transition === 'extend' ? 'extended' : `${transition}d`}.`);
    } catch (transitionError) {
      setError(academicSemesterErrorMessage(transitionError));
    } finally {
      setSaving(false);
    }
  };

  const lifecycleActions = selected?.lifecycleStatus === 'DRAFT'
    ? ['activate', 'archive'] as TransitionAction[]
    : selected?.lifecycleStatus === 'ACTIVE'
      ? ['extend', 'close'] as TransitionAction[]
      : selected?.lifecycleStatus === 'CLOSED'
        ? ['archive'] as TransitionAction[]
        : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PortalToast message={toast} />
      <PageHeader
        title="Academic Semesters"
        subtitle="Control the faculty-wide semester used by timelines, appointment workflows, marks, and reporting."
        backLabel="Back to Dashboard"
        onBack={onBack}
        actions={(
          <>
            {onOpenCapacity && (
              <PortalButton icon={Gauge} onClick={onOpenCapacity}>
                Lecturer Capacity
              </PortalButton>
            )}
            {onManageParticipants && (
              <PortalButton icon={UsersRound} onClick={onManageParticipants}>
                Manage participants
              </PortalButton>
            )}
            {onOpenReconciliation && (
              <PortalButton icon={ShieldAlert} onClick={onOpenReconciliation}>
                Reconcile Workflows
              </PortalButton>
            )}
            <PortalButton icon={Plus} variant="primary" onClick={beginCreate}>
              New semester
            </PortalButton>
          </>
        )}
      />

      {error ? <ErrorState message={error} onRetry={loadSemesters} /> : null}

      <section className="border-y border-slate-200 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Current faculty semester</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {active?.label ?? 'No effective active semester'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {active
                ? `${displayDate(active.startsOn)} to ${displayDate(active.endsOn)}`
                : 'New workflows remain paused until a semester is activated.'}
            </p>
          </div>
          <StatusBadge
            tone={getStatusBadgeTone(active?.effectiveStatus ?? 'CLOSED')}
          >
            {formatSemesterLifecycle(active?.effectiveStatus ?? 'CLOSED')}
          </StatusBadge>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'] as LifecycleFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              filter === value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
            }`}
          >
            {value === 'ALL' ? 'All' : formatSemesterLifecycle(value)}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Include archived
        </label>
      </div>

      {loading ? <LoadingState message="Loading academic semesters..." /> : null}
      {!loading && !visible.length ? (
        <EmptyState title="No semesters in this view" description="Create a draft semester or change the lifecycle filter." />
      ) : null}

      {!loading && visible.length ? (
        <div className="overflow-x-auto border-y border-slate-200">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Timeline</th>
                <th className="px-4 py-3">Marks periods</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.map((semester) => (
                <tr key={semester.id} className="bg-white">
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{semester.label}</p>
                    <p className="font-mono text-xs text-slate-500">{semester.code}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {displayDate(semester.startsOn)} to {displayDate(semester.endsOn)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge tone={getStatusBadgeTone(semester.effectiveStatus)}>
                      {formatSemesterLifecycle(semester.effectiveStatus)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{semester.timelineCount ?? 0} version(s)</td>
                  <td className="px-4 py-4 text-slate-700">{semester.marksPeriodCount ?? 0}</td>
                  <td className="px-4 py-4 text-slate-700">{semester.marksTaskCount ?? 0}</td>
                  <td className="px-4 py-4 text-right">
                    <PortalButton icon={Edit3} variant="secondary" onClick={() => beginEdit(semester)}>
                      Open
                    </PortalButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <PortalCard className="p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Configuration</p>
            <h2 className="text-lg font-bold text-slate-900">
              {selected ? selected.label : 'Create draft semester'}
            </h2>
          </div>
          <CalendarRange className="h-5 w-5 text-slate-500" />
        </div>

        <form onSubmit={saveDraft} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Academic session
            <input
              value={form.academicSession}
              disabled={Boolean(selected && selected.lifecycleStatus !== 'DRAFT')}
              onChange={(event) => setForm({ ...form, academicSession: event.target.value })}
              placeholder="2026/2027"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Term
            <select
              value={form.term}
              disabled={Boolean(selected && selected.lifecycleStatus !== 'DRAFT')}
              onChange={(event) => setForm({ ...form, term: event.target.value as AcademicSemesterInput['term'] })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="SEMESTER_I">Semester I</option>
              <option value="SEMESTER_II">Semester II</option>
              <option value="SPECIAL">Special semester</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Starts on
            <input
              type="date"
              value={form.startsOn}
              disabled={Boolean(selected && selected.lifecycleStatus !== 'DRAFT')}
              onChange={(event) => setForm({ ...form, startsOn: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Ends on
            <input
              type="date"
              value={form.endsOn}
              disabled={Boolean(selected && selected.lifecycleStatus !== 'DRAFT')}
              onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          {(!selected || selected.lifecycleStatus === 'DRAFT') ? (
            <div className="md:col-span-2">
              <PortalButton type="submit" icon={Save} variant="primary" disabled={saving}>
                {selected ? 'Save changes' : 'Create draft'}
              </PortalButton>
            </div>
          ) : null}
        </form>

        {selected && lifecycleActions.length ? (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="mb-3 text-sm font-bold text-slate-900">Lifecycle actions</p>
            <div className="flex flex-wrap gap-2">
              {lifecycleActions.map((action) => {
                const icons = { activate: CheckCircle2, close: XCircle, archive: Archive, extend: Clock3 };
                return (
                  <PortalButton
                    key={action}
                    icon={icons[action]}
                    variant={action === 'activate' ? 'primary' : 'secondary'}
                    onClick={() => {
                      setTransition(action);
                      setReason('');
                      setExtensionEnd(selected.endsOn);
                    }}
                  >
                    {action === 'extend' ? 'Extend end date' : `${action[0].toUpperCase()}${action.slice(1)}`}
                  </PortalButton>
                );
              })}
            </div>
          </div>
        ) : null}
      </PortalCard>

      {transition && selected ? (
        <PortalCard className="border-sky-200 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-sky-700">Confirm lifecycle change</p>
              <h3 className="font-bold text-slate-900">
                {transition === 'activate' && active && active.id !== selected.id
                  ? `Hand over from ${active.label} to ${selected.label}`
                  : `${formatSemesterLifecycle(transition.toUpperCase())} ${selected.label}`}
              </h3>
            </div>
            <button type="button" title="Cancel" onClick={() => setTransition(null)} className="p-2 text-slate-500">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          {transition === 'extend' ? (
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              New end date
              <input
                type="date"
                min={selected.endsOn}
                value={extensionEnd}
                onChange={(event) => setExtensionEnd(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 md:max-w-xs"
              />
            </label>
          ) : null}
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="Record the operational reason for this change."
            />
          </label>
          <div className="mt-4 flex gap-2">
            <PortalButton
              icon={transition === 'extend' ? RefreshCw : CheckCircle2}
              variant="primary"
              disabled={saving || !reason.trim() || (transition === 'extend' && extensionEnd <= selected.endsOn)}
              onClick={runTransition}
            >
              Confirm
            </PortalButton>
            <PortalButton variant="secondary" onClick={() => setTransition(null)}>
              Cancel
            </PortalButton>
          </div>
        </PortalCard>
      ) : null}

      {selected ? (
        <section className="border-y border-slate-200 py-5">
          <h2 className="text-sm font-bold text-slate-900">Semester audit history</h2>
          {!audits.length ? (
            <p className="mt-2 text-sm text-slate-500">No audit events are available.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-200">
              {audits.map((audit) => (
                <div key={audit.id} className="grid gap-1 py-3 md:grid-cols-[160px_1fr_180px]">
                  <p className="text-xs font-bold uppercase text-slate-600">
                    {formatSemesterLifecycle(audit.action)}
                  </p>
                  <div>
                    <p className="text-sm text-slate-800">{audit.reason || 'Configuration created.'}</p>
                    <p className="text-xs text-slate-500">{audit.actor}</p>
                  </div>
                  <time className="text-xs text-slate-500 md:text-right">
                    {new Date(audit.createdAt).toLocaleString('en-MY')}
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
};
