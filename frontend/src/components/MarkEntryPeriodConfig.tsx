/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Plus,
  Save,
  XCircle,
} from 'lucide-react';

import {
  archiveEvaluationPeriod,
  closeEvaluationPeriod,
  createEvaluationPeriod,
  getEvaluationPeriod,
  getEvaluationPeriods,
  getRubricVersions,
  publishEvaluationPeriod,
  updateEvaluationPeriod,
} from '../services';
import type {
  EvaluationPeriodOption,
  RubricVersion,
} from '../types';
import {
  formatPeriodStatus,
  marksMutationErrorMessage,
  toDateTimeLocalValue,
} from '../utils/marksProductionManagement';
import {
  PageHeader,
  PortalButton,
  PortalCard,
  PortalToast,
  StatusBadge,
  getStatusBadgeTone,
} from './PortalPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

interface MarkEntryPeriodConfigProps {
  onBack: () => void;
}

type PeriodForm = {
  name: string;
  semester: string;
  rubricId: string;
  opensAt: string;
  closesAt: string;
};

const EMPTY_FORM: PeriodForm = {
  name: '',
  semester: '',
  rubricId: '',
  opensAt: '',
  closesAt: '',
};

const displayDateTime = (value: string | null) => {
  if (!value) return 'Not configured';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Invalid date';
  return parsed.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const MarkEntryPeriodConfig: React.FC<MarkEntryPeriodConfigProps> = ({
  onBack,
}) => {
  const [periods, setPeriods] = useState<EvaluationPeriodOption[]>([]);
  const [rubrics, setRubrics] = useState<RubricVersion[]>([]);
  const [selected, setSelected] = useState<EvaluationPeriodOption | null>(null);
  const [form, setForm] = useState<PeriodForm>(EMPTY_FORM);
  const [reason, setReason] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [periodRows, rubricRows] = await Promise.all([
        getEvaluationPeriods(includeArchived),
        getRubricVersions(),
      ]);
      setPeriods(periodRows);
      setRubrics(rubricRows);
      if (selected) {
        const refreshed = periodRows.find((period) => period.id === selected.id);
        if (!refreshed) {
          setSelected(null);
          setForm(EMPTY_FORM);
        }
      }
    } catch (loadError) {
      setError(marksMutationErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [includeArchived, selected]);

  useEffect(() => {
    void loadWorkspace();
  }, [includeArchived]);

  const readyRubrics = useMemo(
    () => rubrics.filter((rubric) => rubric.isActive && rubric.isReady),
    [rubrics],
  );

  const beginNew = () => {
    setSelected(null);
    setForm({
      ...EMPTY_FORM,
      rubricId: readyRubrics[0] ? String(readyRubrics[0].id) : '',
    });
    setReason('');
    setError(null);
  };

  const selectPeriod = async (period: EvaluationPeriodOption) => {
    setError(null);
    try {
      const detail = await getEvaluationPeriod(period.id);
      setSelected(detail);
      setForm({
        name: detail.name,
        semester: detail.semester,
        rubricId: String(detail.rubricId),
        opensAt: toDateTimeLocalValue(detail.opensAt),
        closesAt: toDateTimeLocalValue(detail.closesAt),
      });
      setReason('');
    } catch (loadError) {
      setError(marksMutationErrorMessage(loadError));
    }
  };

  const replacePeriod = (updated: EvaluationPeriodOption) => {
    setPeriods((current) => {
      const exists = current.some((period) => period.id === updated.id);
      return exists
        ? current.map((period) => period.id === updated.id ? updated : period)
        : [updated, ...current];
    });
    setSelected(updated);
    setForm({
      name: updated.name,
      semester: updated.semester,
      rubricId: String(updated.rubricId),
      opensAt: toDateTimeLocalValue(updated.opensAt),
      closesAt: toDateTimeLocalValue(updated.closesAt),
    });
  };

  const savePeriod = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        semester: form.semester.trim(),
        rubricId: Number(form.rubricId),
        opensAt: form.opensAt ? new Date(form.opensAt).toISOString() : null,
        closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : null,
      };
      const updated = selected
        ? await updateEvaluationPeriod(
            selected.id,
            selected.lifecycleStatus === 'PUBLISHED'
              ? { closesAt: payload.closesAt, reason }
              : payload,
          )
        : await createEvaluationPeriod(payload);
      replacePeriod(await getEvaluationPeriod(updated.id));
      setReason('');
      showToast(selected ? 'Period changes saved.' : 'Draft period created.');
    } catch (saveError) {
      setError(marksMutationErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const runTransition = async (
    action: 'publish' | 'close' | 'archive',
  ) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = action === 'publish'
        ? await publishEvaluationPeriod(selected.id)
        : action === 'close'
          ? await closeEvaluationPeriod(selected.id, reason)
          : await archiveEvaluationPeriod(selected.id, reason);
      replacePeriod(await getEvaluationPeriod(updated.id));
      setReason('');
      showToast(
        action === 'publish'
          ? 'Period published.'
          : action === 'close'
            ? 'Period closed.'
            : 'Period archived.',
      );
      if (action === 'archive' && !includeArchived) {
        setPeriods((current) => current.filter((period) => period.id !== updated.id));
        setSelected(null);
        setForm(EMPTY_FORM);
      }
    } catch (transitionError) {
      setError(marksMutationErrorMessage(transitionError));
    } finally {
      setSaving(false);
    }
  };

  const draftEditable = !selected || selected.lifecycleStatus === 'DRAFT';
  const published = selected?.lifecycleStatus === 'PUBLISHED';
  const closed = selected?.lifecycleStatus === 'CLOSED';

  return (
    <div id="mark-entry-period-configuration" className="space-y-7 animate-fade-in">
      <PortalToast message={toast} />
      <PageHeader
        title="Mark Entry Periods"
        subtitle="Configure faculty-wide evaluation windows and control when lecturers may save or submit marks."
        backLabel="Back to Marks & Evaluation Management"
        onBack={onBack}
        actions={(
          <PortalButton icon={Plus} variant="primary" onClick={beginNew}>
            New period
          </PortalButton>
        )}
      />

      {error ? <ErrorState message={error} onRetry={loadWorkspace} /> : null}

      <div className="flex items-center justify-between border-y border-slate-200 py-3">
        <p className="text-xs font-semibold text-slate-500">
          Archived periods are read-only and excluded from normal monitoring.
        </p>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
            className="h-4 w-4 accent-brand-navy"
          />
          Show archived
        </label>
      </div>

      {loading ? (
        <LoadingState message="Loading evaluation periods..." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] gap-6 items-start">
          <section className="space-y-3" aria-label="Configured evaluation periods">
            {periods.length === 0 ? (
              <EmptyState
                title="No evaluation periods"
                description="Create a draft period and select a ready rubric version."
              />
            ) : periods.map((period) => (
              <button
                key={period.id}
                type="button"
                onClick={() => void selectPeriod(period)}
                className={`w-full text-left border bg-white p-5 shadow-3xs transition-colors ${
                  selected?.id === period.id
                    ? 'border-brand-navy ring-2 ring-brand-navy/10'
                    : 'border-slate-200 hover:border-slate-300'
                } rounded-lg`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-brand-navy">{period.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {period.semester} · {period.rubricName}
                    </p>
                  </div>
                  <StatusBadge tone={getStatusBadgeTone(period.effectiveStatus)} dot>
                    {formatPeriodStatus(period.effectiveStatus)}
                  </StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase text-slate-400">Opens</span>
                    <span className="font-semibold text-slate-700">{displayDateTime(period.opensAt)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase text-slate-400">Closes</span>
                    <span className="font-semibold text-slate-700">{displayDateTime(period.closesAt)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase text-slate-400">Tasks</span>
                    <span className="font-semibold text-slate-700">{period.taskTotals.total}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase text-slate-400">Submitted</span>
                    <span className="font-semibold text-slate-700">{period.taskTotals.submitted}</span>
                  </div>
                </div>
              </button>
            ))}
          </section>

          <PortalCard padding="lg" className="rounded-lg">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-brand-navy">
                  {selected ? 'Period configuration' : 'New draft period'}
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Published periods lock their identity and rubric version.
                </p>
              </div>
              {selected ? (
                <StatusBadge tone={getStatusBadgeTone(selected.effectiveStatus)}>
                  {formatPeriodStatus(selected.effectiveStatus)}
                </StatusBadge>
              ) : null}
            </div>

            <form onSubmit={savePeriod} className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Period name
                <input
                  required
                  disabled={!draftEditable}
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Semester
                <input
                  required
                  disabled={!draftEditable}
                  value={form.semester}
                  onChange={(event) => setForm((current) => ({ ...current, semester: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Rubric version
                <select
                  required
                  disabled={!draftEditable}
                  value={form.rubricId}
                  onChange={(event) => setForm((current) => ({ ...current, rubricId: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                >
                  <option value="">Select a ready rubric</option>
                  {readyRubrics.map((rubric) => (
                    <option key={rubric.id} value={rubric.id}>
                      {rubric.name} · v{rubric.version} · {rubric.targetMark} marks
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs font-bold text-slate-700">
                  Opens at
                  <input
                    required
                    type="datetime-local"
                    disabled={!draftEditable}
                    value={form.opensAt}
                    onChange={(event) => setForm((current) => ({ ...current, opensAt: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Closes at
                  <input
                    required
                    type="datetime-local"
                    disabled={Boolean(selected && !draftEditable && !published)}
                    value={form.closesAt}
                    onChange={(event) => setForm((current) => ({ ...current, closesAt: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                  />
                </label>
              </div>

              {published || closed ? (
                <label className="block text-xs font-bold text-slate-700">
                  Reason
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    placeholder={published ? 'Required for an extension or early closure' : 'Required to archive this period'}
                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5"
                  />
                </label>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                {(draftEditable || published) ? (
                  <PortalButton
                    type="submit"
                    icon={Save}
                    variant="primary"
                    isLoading={saving}
                    disabled={!form.rubricId}
                  >
                    {selected ? 'Save changes' : 'Create draft'}
                  </PortalButton>
                ) : null}
                {selected?.lifecycleStatus === 'DRAFT' ? (
                  <PortalButton
                    icon={CheckCircle2}
                    variant="success"
                    isLoading={saving}
                    onClick={() => void runTransition('publish')}
                  >
                    Publish
                  </PortalButton>
                ) : null}
                {published ? (
                  <PortalButton
                    icon={XCircle}
                    variant="danger"
                    isLoading={saving}
                    disabled={!reason.trim()}
                    onClick={() => void runTransition('close')}
                  >
                    Close period
                  </PortalButton>
                ) : null}
                {closed ? (
                  <PortalButton
                    icon={Archive}
                    variant="secondary"
                    isLoading={saving}
                    disabled={!reason.trim()}
                    onClick={() => void runTransition('archive')}
                  >
                    Archive
                  </PortalButton>
                ) : null}
              </div>
            </form>

            {selected?.auditEvents?.length ? (
              <div className="mt-7 border-t border-slate-100 pt-5">
                <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-600">
                  <Clock3 className="h-4 w-4" />
                  Configuration history
                </h3>
                <div className="mt-3 space-y-3">
                  {selected.auditEvents.map((event) => (
                    <div key={event.id} className="border-l-2 border-slate-200 pl-3 text-xs">
                      <p className="font-bold text-slate-700">{event.action}</p>
                      <p className="mt-0.5 text-slate-500">
                        {event.actorName} · {displayDateTime(event.createdAt)}
                      </p>
                      {event.reason ? <p className="mt-1 text-slate-600">{event.reason}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </PortalCard>
        </div>
      )}

      <div className="flex items-center gap-3 border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800 rounded-lg">
        <CalendarClock className="h-4 w-4 shrink-0" />
        Lecturers can save and submit marks only while a published period is open.
      </div>
    </div>
  );
};
