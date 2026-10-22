import { PortalSelect } from './PortalSelect';
import { RecordPage } from './RecordPage';
import { ClosureReview } from './ClosureReview';
import type { ClosureApproval } from '../types/marks';
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
import { formatMalaysiaDateTime } from '../utils/malaysiaDateTime';
import {OfficeToolContext, OfficeToolSection, OfficeToolViews} from './OfficeToolPrimitives';

interface AcademicSemesterManagementProps {
  onBack: () => void;
  onManageParticipants?: () => void;
  onOpenReconciliation?: () => void;
  onOpenCapacity?: (semesterId?: number) => void;
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
  onOpenCapacity,
}) => {
  const [semesters, setSemesters] = useState<AcademicSemester[]>([]);
  const [filter, setFilter] = useState<LifecycleFilter>('ALL');
  const [includeArchived, setIncludeArchived] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [detailTab, setDetailTab] = useState<'overview' | 'history'>('overview');
  const [selected, setSelected] = useState<AcademicSemester | null>(null);
  const [audits, setAudits] = useState<AcademicSemesterAudit[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditAttempt, setAuditAttempt] = useState(0);
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

  useEffect(() => {
    let current = true;
    setAudits([]);
    setAuditError(null);
    setAuditsLoading(Boolean(selected));
    if (selected) {
      getAcademicSemesterAudits(selected.id)
        .then((rows) => { if (current) setAudits(rows); })
        .catch(() => {
          if (current) setAuditError('Semester audit history could not be loaded. Try again.');
        })
        .finally(() => { if (current) setAuditsLoading(false); });
    }
    return () => { current = false; };
  }, [selected, auditAttempt]);

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
    setView('create');
    setDetailTab('overview');
    setSelected(null);
    setForm(EMPTY_FORM);
    setTransition(null);
    setReason('');
    setAudits([]);
    setError(null);
  };

  const beginEdit = (semester: AcademicSemester) => {
    setView('detail');
    setDetailTab('overview');
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
      beginEdit(saved);
      showToast(selected ? 'Draft semester updated.' : 'Draft semester created.');
    } catch (saveError) {
      setError(academicSemesterErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const runTransition = async (approval?: ClosureApproval) => {
    if (!selected || !transition || !reason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (transition === 'activate') {
        await activateAcademicSemester(selected.id, reason.trim(), approval);
      } else if (transition === 'close') {
        await closeAcademicSemester(selected.id, reason.trim(), approval);
      } else if (transition === 'archive') {
        await archiveAcademicSemester(selected.id, reason.trim());
      } else {
        await extendAcademicSemester(selected.id, extensionEnd, reason.trim());
      }
      await loadSemesters();
      if (transition === 'archive') { setView('list'); setSelected(null); }
      setTransition(null);
      setReason('');
      showToast(`Semester ${transition === 'extend' ? 'extended' : `${transition}d`}.`);
    } catch (transitionError) {
      setError(academicSemesterErrorMessage(transitionError));
      if (approval) throw transitionError;
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

  const dirty = view === 'create'
    ? JSON.stringify(form) !== JSON.stringify(EMPTY_FORM)
    : !!selected && selected.lifecycleStatus === 'DRAFT' && (form.academicSession !== selected.academicSession || form.term !== selected.term || form.startsOn !== selected.startsOn || form.endsOn !== selected.endsOn);
  if (view !== 'list') return <RecordPage title={selected ? selected.label : 'New academic semester'} subtitle={selected ? `${selected.code} · ${formatSemesterLifecycle(selected.lifecycleStatus)}` : 'Create a draft, then review readiness before activation.'} backLabel="Back to Academic Semesters"
    onBack={() => { setView('list'); setTransition(null); setReason(''); setError(null); }} pageKey="academic-semester:record" dirty={dirty || !!reason.trim() || (transition === 'extend' && extensionEnd !== selected?.endsOn)} busy={saving}>
    <PortalToast message={toast} />
    {error ? <ErrorState message={error} onRetry={loadSemesters} /> : null}
    {selected ? <OfficeToolViews<typeof detailTab> label="Semester views" value={detailTab} options={[{value:'overview',label:'Overview'},{value:'history',label:'History'}]} onChange={setDetailTab}/> : null}
    {selected?.lifecycleStatus === 'DRAFT' && onOpenCapacity ? <div className="rounded-xl border border-slate-200 p-4"><p className="card-description mb-3">Activation requires a complete Published capacity policy for this semester. Review capacity before beginning the guarded handover.</p><PortalButton icon={Gauge} onClick={() => onOpenCapacity(selected?.id)} disabled={dirty || saving}>Review lecturer capacity</PortalButton></div> : null}
      {detailTab === 'overview' && <PortalCard className="p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="card-label">Configuration</p>
            <h2 className="section-heading">
              {selected ? selected.label : 'Create draft semester'}
            </h2>
          </div>
          <CalendarRange className="h-5 w-5 text-slate-500" />
        </div>

        {selected && selected.lifecycleStatus !== 'DRAFT' ? <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="card-label">Academic session</dt><dd className="card-value mt-1">{selected.academicSession}</dd></div>
          <div><dt className="card-label">Term</dt><dd className="card-value mt-1">{selected.term === 'SEMESTER_I' ? 'Semester I' : selected.term === 'SEMESTER_II' ? 'Semester II' : 'Special semester'}</dd></div>
          <div><dt className="card-label">Starts on</dt><dd className="card-value mt-1">{displayDate(selected.startsOn)}</dd></div>
          <div><dt className="card-label">Ends on</dt><dd className="card-value mt-1">{displayDate(selected.endsOn)}</dd></div>
          <div><dt className="card-label">Lifecycle</dt><dd className="card-value mt-1">{formatSemesterLifecycle(selected.lifecycleStatus)}</dd></div>
        </dl> : <form onSubmit={saveDraft} className="grid gap-4 md:grid-cols-2">
          <label className="form-label">
            Academic session
            <input
              value={form.academicSession}
              disabled={Boolean(selected && selected.lifecycleStatus !== 'DRAFT')}
              onChange={(event) => setForm({ ...form, academicSession: event.target.value })}
              placeholder="2026/2027"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-sans not-italic normal-case tracking-normal text-xs font-bold"
            />
          </label>
          <label className="form-label">
            Term
            <PortalSelect
              value={form.term}
              disabled={Boolean(selected && selected.lifecycleStatus !== 'DRAFT')}
              onChange={(event) => setForm({ ...form, term: event.target.value as AcademicSemesterInput['term'] })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-sans not-italic normal-case tracking-normal text-xs font-bold"
            >
              <option value="SEMESTER_I">Semester I</option>
              <option value="SEMESTER_II">Semester II</option>
              <option value="SPECIAL">Special semester</option>
            </PortalSelect>
          </label>
          <label className="form-label">
            Starts on
            <input
              type="date"
              value={form.startsOn}
              disabled={Boolean(selected && selected.lifecycleStatus !== 'DRAFT')}
              onChange={(event) => setForm({ ...form, startsOn: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-sans not-italic normal-case tracking-normal text-xs font-bold"
            />
          </label>
          <label className="form-label">
            Ends on
            <input
              type="date"
              value={form.endsOn}
              disabled={Boolean(selected && selected.lifecycleStatus !== 'DRAFT')}
              onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-sans not-italic normal-case tracking-normal text-xs font-bold"
            />
          </label>
          {(!selected || selected.lifecycleStatus === 'DRAFT') ? (
            <div className="md:col-span-2">
              <PortalButton type="submit" icon={Save} variant="primary" disabled={saving}>
                {selected ? 'Save changes' : 'Create draft'}
              </PortalButton>
            </div>
          ) : null}
        </form>}

        {selected && lifecycleActions.length ? (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="card-value mb-3">Lifecycle actions</p>
            <div className="flex flex-wrap gap-2">
              {lifecycleActions.map((action) => {
                const icons = { activate: CheckCircle2, close: XCircle, archive: Archive, extend: Clock3 };
                return (
                  <PortalButton
                    key={action}
                    icon={icons[action]}
                    variant={action === 'activate' ? 'primary' : 'secondary'}
                    disabled={saving || dirty}
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
      </PortalCard>}

      {detailTab === 'overview' && transition && selected ? (
        <PortalCard className="border-sky-200 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="card-label text-sky-700">Confirm lifecycle change</p>
              <h3 className="section-label">
                {transition === 'activate' && active && active.id !== selected.id
                  ? `Hand over from ${active.label} to ${selected.label}`
                  : `${formatSemesterLifecycle(transition.toUpperCase())} ${selected.label}`}
              </h3>
            </div>
            <button type="button" title="Cancel" onClick={() => setTransition(null)} className="p-2 text-slate-500">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          {transition === 'extend' ? <p className="card-description mt-3">Extending the semester does not extend submission deadlines. Manage those through Periods &amp; deadlines.</p> : null}
          {transition === 'extend' ? (
            <label className="form-label mt-4 block">
              New end date
              <input
                type="date"
                min={selected.endsOn}
                value={extensionEnd}
                onChange={(event) => setExtensionEnd(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 md:max-w-xs font-sans not-italic normal-case tracking-normal text-xs font-bold"
              />
            </label>
          ) : null}
          <label className="form-label mt-4 block">
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-sans not-italic normal-case tracking-normal text-xs font-bold"
              placeholder="Record the operational reason for this change."
            />
          </label>
          {(transition === 'close' || transition === 'activate') ? <ClosureReview key={`${selected.id}-${transition}`} kind={transition === 'activate' ? 'handover' : 'semester'} id={selected.id} disabled={saving || !reason.trim()} onConfirm={runTransition} /> : null}
          <div className="mt-4 flex gap-2">
            {transition !== 'close' && transition !== 'activate' ? <PortalButton
              icon={transition === 'extend' ? RefreshCw : CheckCircle2}
              variant="primary"
              disabled={saving || !reason.trim() || (transition === 'extend' && extensionEnd <= selected.endsOn)}
              onClick={() => void runTransition()}
            >
              Confirm
            </PortalButton> : null}
            <PortalButton variant="secondary" onClick={() => setTransition(null)}>
              Cancel
            </PortalButton>
          </div>
        </PortalCard>
      ) : null}

      {selected && detailTab === 'history' ? (
        <section className="border-y border-slate-200 py-5">
          <h2 className="section-label">Semester audit history</h2>
          {auditsLoading ? <LoadingState message="Loading semester audit history…" />
            : auditError ? <ErrorState message={auditError} onRetry={() => setAuditAttempt((value) => value + 1)} />
            : !audits.length ? (
            <p className="card-description mt-2">No audit events are available.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-200">
              {audits.map((audit) => (
                <div key={audit.id} className="grid gap-1 py-3 md:grid-cols-[160px_1fr_180px]">
                  <p className="card-label">
                    {formatSemesterLifecycle(audit.action)}
                  </p>
                  <div>
                    <p className="card-description">{audit.reason || 'Configuration created.'}</p>
                    <p className="card-description">{audit.actor}</p>
                  </div>
                  <time className="card-caption text-slate-500 md:text-right">
                    {formatMalaysiaDateTime(audit.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
  </RecordPage>;

  return (
    <div className="office-tool-page space-y-6 animate-fade-in">
      <PortalToast message={toast} />
      <PageHeader
        className="office-tool-heading"
        title="Academic Semesters"
        subtitle="Control the faculty-wide semester used by timelines, appointment workflows, marks, and reporting."
        backLabel="Back to Dashboard"
        onBack={onBack}
        actions={(
          <>
            <PortalButton icon={Plus} variant="primary" onClick={beginCreate}>
              New semester
            </PortalButton>
          </>
        )}
      />

      {error ? <ErrorState message={error} onRetry={loadSemesters} /> : null}

      <OfficeToolContext label="Current faculty semester">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="card-label">Current faculty semester</p>
            <h2 className="section-heading mt-1 text-slate-900">
              {loading ? 'Loading current semester…' : error ? 'Current semester could not be verified' : active?.label ?? 'No effective active semester'}
            </h2>
            <p className="card-description mt-1">
              {loading ? 'Checking the faculty semester.' : error ? 'Retry the semester read to verify current scope.' : active
                ? `${displayDate(active.startsOn)} to ${displayDate(active.endsOn)}`
                : 'New workflows remain paused until a semester is activated.'}
            </p>
          </div>
          {!loading && !error && <StatusBadge
            tone={getStatusBadgeTone(active?.effectiveStatus ?? 'CLOSED')}
          >
            {formatSemesterLifecycle(active?.effectiveStatus ?? 'CLOSED')}
          </StatusBadge>}
        </div>
      </OfficeToolContext>

      <OfficeToolSection title="Semester records" description="Open a semester to review its dates, lifecycle actions and history.">
      <div className="office-tool-filters"><label className="form-label block w-full sm:max-w-sm">Semester status
        <PortalSelect className="form-control form-control-md mt-1" value={filter} onChange={event => { const value = event.target.value as LifecycleFilter; setFilter(value); setIncludeArchived(value === 'ALL' || value === 'ARCHIVED'); }}>
          <option value="ALL">All semesters, including archived</option>
          {(['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'] as const).map(value => <option key={value} value={value}>{formatSemesterLifecycle(value)}</option>)}
        </PortalSelect>
      </label></div>

      {loading ? <LoadingState message="Loading academic semesters..." /> : null}
      {!loading && !error && !visible.length ? (
        <EmptyState title="No semesters in this view" description="Create a draft semester or change the lifecycle filter." />
      ) : null}

      {!loading && !error && visible.length ? (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead className="data-thead">
              <tr>
                <th className="data-th">Semester</th>
                <th className="data-th">Dates</th>
                <th className="data-th">Status</th>
                <th className="data-th">Timeline</th>
                <th className="data-th">Marks periods</th>
                <th className="data-th">Tasks</th>
                <th className="data-th text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.map((semester) => (
                <tr key={semester.id} className="bg-white">
                  <td className="data-td">
                    <p className="card-value">{semester.label}</p>
                    <p className="font-mono text-xs text-slate-500">{semester.code}</p>
                  </td>
                  <td className="data-td">
                    {displayDate(semester.startsOn)} to {displayDate(semester.endsOn)}
                  </td>
                  <td className="data-td">
                    <StatusBadge tone={getStatusBadgeTone(semester.effectiveStatus)}>
                      {formatSemesterLifecycle(semester.effectiveStatus)}
                    </StatusBadge>
                  </td>
                  <td className="data-td">{semester.timelineCount ?? 0} version(s)</td>
                  <td className="data-td">{semester.marksPeriodCount ?? 0}</td>
                  <td className="data-td">{semester.marksTaskCount ?? 0}</td>
                  <td className="data-td text-right">
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
      </OfficeToolSection>

    </div>
  );
};
