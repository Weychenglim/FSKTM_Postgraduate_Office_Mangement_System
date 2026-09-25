/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Plus,
  Save,
  Settings2,
  XCircle,
} from 'lucide-react';

import {
  archiveEvaluationPeriod,
  closeEvaluationPeriod,
  createEvaluationPeriod,
  getEvaluationPeriod,
  getEvaluationPeriods,
  getMarksProgrammeOptions,
  getEvaluationRecipientPreview,
  getAcademicSemesters,
  getRubricVersions,
  publishEvaluationPeriod,
  updateEvaluationPeriod,
} from '../services';
import type {
  EvaluationPeriodOption,
  EvaluationRecipientPreview,
  AcademicSemester,
  RubricVersion,
} from '../types';
import {
  formatPeriodStatus,
  marksMutationErrorMessage,
  toDateTimeLocalValue,
  validatePeriodTargeting,
  formatPeriodTargeting,
  canPublishPeriodPreview,
  type PeriodPreviewApproval,
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
  onManageSemesters: () => void;
}

type PeriodForm = {
  name: string;
  semesterId: string;
  rubricId: string;
  opensAt: string;
  closesAt: string;
  programmeScope: '' | 'ALL' | 'SELECTED';
  programmes: string[];
  evaluatorRoles: Array<'SUPERVISOR' | 'PANEL'>;
};

const EMPTY_FORM: PeriodForm = {
  name: '',
  semesterId: '',
  rubricId: '',
  opensAt: '',
  closesAt: '',
  programmeScope: '',
  programmes: [],
  evaluatorRoles: [],
};

const periodToForm = (period: EvaluationPeriodOption): PeriodForm => ({
  name: period.name,
  semesterId: period.semesterId ? String(period.semesterId) : '',
  rubricId: String(period.rubricId),
  opensAt: toDateTimeLocalValue(period.opensAt),
  closesAt: toDateTimeLocalValue(period.closesAt),
  programmeScope: period.programmeScope || 'ALL',
  programmes: period.programmes || [],
  evaluatorRoles: period.evaluatorRoles || ['SUPERVISOR', 'PANEL'],
});

export const MarkEntryRecipientPreview: React.FC<{ preview: EvaluationRecipientPreview }> = ({ preview }) => (
  <section aria-label="Recipient preview" className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-xs text-slate-700">
    <h3 className="font-extrabold text-brand-navy">Recipient preview</h3>
    <p>Generated {displayDateTime(preview.generatedAt)}. This is a read-only estimate and does not reserve recipients or create tasks.</p>
    <p>Eligible students and appointments added later are included automatically while the published period remains scheduled or open.</p>
    <p className="font-bold">{preview.totals.students} students · {preview.totals.supervisor} Supervisor · {preview.totals.panel} Panel · {preview.totals.total} tasks ({preview.totals.existing} existing, {preview.totals.new} new)</p>
    <p>{preview.missingAppointments.supervisor} students missing a supervisor · {preview.missingAppointments.panel} students missing a panel</p>
    <p className="text-slate-500">Missing counts include students in the selected programmes without an eligible role appointment or required research profile. Unselected roles are excluded.</p>
    {preview.totals.total === 0 ? <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">No recipients currently match this period. Publishing will create no tasks now; later eligible appointments may add tasks automatically.</p> : null}
    {preview.recipients.length > 0 ? <div className="max-h-80 overflow-auto">
      <table className="w-full text-left">
        <thead><tr>{['Student', 'Programme', 'Evaluator', 'Role', 'Task'].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>{preview.recipients.map((recipient, index) => <tr key={`${recipient.matricNo}-${recipient.evaluatorId}-${recipient.evaluatorRole}-${index}`} className="border-t border-slate-100">
          <td className="p-2">{recipient.studentName}<span className="block text-slate-500">{recipient.matricNo}</span></td>
          <td className="p-2">{recipient.programme || 'Unspecified'}</td>
          <td className="p-2">{recipient.evaluatorName}</td>
          <td className="p-2">{recipient.evaluatorRole === 'SUPERVISOR' ? 'Supervisor' : 'Panel'}</td>
          <td className="p-2">{recipient.taskStatus === 'EXISTING' ? 'Existing' : 'New'}</td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </section>
);

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
  onManageSemesters,
}) => {
  const [periods, setPeriods] = useState<EvaluationPeriodOption[]>([]);
  const [rubrics, setRubrics] = useState<RubricVersion[]>([]);
  const [semesters, setSemesters] = useState<AcademicSemester[]>([]);
  const [selected, setSelected] = useState<EvaluationPeriodOption | null>(null);
  const [form, setForm] = useState<PeriodForm>(EMPTY_FORM);
  const [programmeOptions, setProgrammeOptions] = useState<string[]>([]);
  const [preview, setPreview] = useState<(EvaluationRecipientPreview & PeriodPreviewApproval) | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const selectionRequest = useRef(0);
  const previewRequest = useRef(0);
  const invalidatePreview = () => { previewRequest.current += 1; setPreview(null); setPreviewLoading(false); };
  const updateForm = (change: React.SetStateAction<PeriodForm>) => { invalidatePreview(); setForm(change); };
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
      const [periodRows, rubricRows, semesterRows, programmes] = await Promise.all([
        getEvaluationPeriods(includeArchived),
        getRubricVersions(),
        getAcademicSemesters(),
        getMarksProgrammeOptions(),
      ]);
      setProgrammeOptions(programmes);
      invalidatePreview();
      setPeriods(periodRows);
      setRubrics(rubricRows);
      const editableSemesters = semesterRows.filter((semester) => (
        semester.lifecycleStatus === 'DRAFT' || semester.lifecycleStatus === 'ACTIVE'
      ));
      setSemesters(editableSemesters);
      setForm((current) => (
        current.semesterId
          ? current
          : {
              ...current,
              semesterId: String(
                editableSemesters.find((semester) => semester.effectiveStatus === 'ACTIVE')?.id
                ?? editableSemesters[0]?.id
                ?? '',
              ),
            }
      ));
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
    selectionRequest.current += 1;
    setSelecting(false);
    invalidatePreview();
    setSelected(null);
    setForm({
      ...EMPTY_FORM,
      semesterId: String(
        semesters.find((semester) => semester.effectiveStatus === 'ACTIVE')?.id
        ?? semesters[0]?.id
        ?? '',
      ),
      rubricId: readyRubrics[0] ? String(readyRubrics[0].id) : '',
    });
    setReason('');
    setError(null);
  };

  const selectPeriod = async (period: EvaluationPeriodOption) => {
    const requestId = ++selectionRequest.current;
    invalidatePreview();
    setSelecting(true);
    setError(null);
    try {
      const detail = await getEvaluationPeriod(period.id);
      if (requestId !== selectionRequest.current) return;
      setSelected(detail);
      setForm(periodToForm(detail));
      setReason('');
    } catch (loadError) {
      if (requestId === selectionRequest.current) setError(marksMutationErrorMessage(loadError));
    } finally {
      if (requestId === selectionRequest.current) setSelecting(false);
    }
  };

  const replacePeriod = (updated: EvaluationPeriodOption) => {
    invalidatePreview();
    setPeriods((current) => {
      const exists = current.some((period) => period.id === updated.id);
      return exists
        ? current.map((period) => period.id === updated.id ? updated : period)
        : [updated, ...current];
    });
    setSelected(updated);
    setForm(periodToForm(updated));
  };

  const savePeriod = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || selecting) return;
    const targetingError = validatePeriodTargeting(form);
    if (targetingError) { setError(targetingError); return; }
    invalidatePreview();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        semesterId: Number(form.semesterId),
        rubricId: Number(form.rubricId),
        opensAt: form.opensAt ? new Date(form.opensAt).toISOString() : null,
        closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : null,
        programmeScope: form.programmeScope as 'ALL' | 'SELECTED',
        programmes: form.programmeScope === 'SELECTED' ? form.programmes : [],
        evaluatorRoles: form.evaluatorRoles,
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
    if (!selected || saving || selecting) return;
    if (action === 'publish' && !canPublish) return;
    invalidatePreview();
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
  const formSnapshot = JSON.stringify(form);
  const savedFormSnapshot = selected ? JSON.stringify(periodToForm(selected)) : '';
  const hasUnsavedChanges = formSnapshot !== savedFormSnapshot;
  const canPublish = !saving && !selecting && !previewLoading && canPublishPeriodPreview(selected, formSnapshot, savedFormSnapshot, preview);
  const selectableProgrammes = [...new Set([...programmeOptions, ...form.programmes])].sort();

  const refreshPreview = async () => {
    if (!selected || hasUnsavedChanges || saving || selecting) return;
    const requestId = ++previewRequest.current;
    setPreview(null);
    setPreviewLoading(true);
    setError(null);
    try {
      // Refresh the saved configuration first, so another office edit cannot be
      // silently approved using this screen's previous draft values.
      const detail = await getEvaluationPeriod(selected.id);
      if (requestId !== previewRequest.current) return;
      if (JSON.stringify(detail) !== JSON.stringify(selected)) {
        replacePeriod(detail);
        setError('The saved period changed. Review its configuration and refresh the recipient preview.');
        return;
      }
      const result = await getEvaluationRecipientPreview(selected.id);
      if (requestId !== previewRequest.current) return;
      setPreview({ ...result, formSnapshot, periodSnapshot: JSON.stringify(detail) });
    } catch (previewError) {
      if (requestId === previewRequest.current) setError(marksMutationErrorMessage(previewError));
    } finally {
      if (requestId === previewRequest.current) setPreviewLoading(false);
    }
  };

  return (
    <div id="mark-entry-period-configuration" className="space-y-7 animate-fade-in">
      <PortalToast message={toast} />
      <PageHeader
        title="Mark Entry Periods"
        subtitle="Configure evaluation windows by programme and evaluator role, and control when lecturers may save or submit marks."
        backLabel="Back to Marks & Evaluation Management"
        onBack={onBack}
        actions={(
          <>
            <PortalButton
              icon={Settings2}
              variant="secondary"
              onClick={onManageSemesters}
            >
              Manage semesters
            </PortalButton>
            <PortalButton icon={Plus} variant="primary" onClick={beginNew} disabled={saving}>
              New period
            </PortalButton>
          </>
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
            disabled={saving || selecting}
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
                disabled={saving}
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
                    <p className="mt-1 text-xs text-slate-600">{formatPeriodTargeting(period)}</p>
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
                  Published periods lock their identity, programme targets, evaluator roles and rubric version.
                </p>
                {selected ? <p className="mt-2 text-xs font-bold text-slate-700">{formatPeriodTargeting(selected)}</p> : null}
              </div>
              {selected ? (
                <StatusBadge tone={getStatusBadgeTone(selected.effectiveStatus)}>
                  {formatPeriodStatus(selected.effectiveStatus)}
                </StatusBadge>
              ) : null}
            </div>

            <form onSubmit={savePeriod} className="space-y-4">
              <fieldset disabled={saving || selecting} className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Period name
                <input
                  required
                  disabled={!draftEditable}
                  value={form.name}
                  onChange={(event) => updateForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Academic semester
                <select
                  required
                  disabled={!draftEditable}
                  value={form.semesterId}
                  onChange={(event) => updateForm((current) => ({ ...current, semesterId: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                >
                  <option value="">Select a Draft or Active semester</option>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Rubric version
                <select
                  required
                  disabled={!draftEditable}
                  value={form.rubricId}
                  onChange={(event) => updateForm((current) => ({ ...current, rubricId: event.target.value }))}
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
              <fieldset disabled={!draftEditable} className="space-y-3 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-xs font-bold text-slate-700">Programme scope</legend>
                {(['ALL', 'SELECTED'] as const).map((scope) => <label key={scope} className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="radio" name="programmeScope" value={scope} required checked={form.programmeScope === scope} onChange={() => updateForm((current) => ({ ...current, programmeScope: scope }))} />
                  {scope === 'ALL' ? 'All programmes (including future programmes)' : 'Selected programmes'}
                </label>)}
                {form.programmeScope === 'SELECTED' ? <div className="max-h-48 space-y-2 overflow-auto border-t border-slate-100 pt-3">
                  {selectableProgrammes.map((programme) => <label key={programme} className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={form.programmes.includes(programme)} onChange={(event) => updateForm((current) => ({ ...current, programmes: event.target.checked ? [...current.programmes, programme] : current.programmes.filter((value) => value !== programme) }))} />
                    {programme}
                  </label>)}
                  {!selectableProgrammes.length ? <p className="text-xs text-slate-500">No programmes are available. Add programme data to student records first.</p> : null}
                  <p className="text-xs text-slate-500">Choose at least one programme.</p>
                </div> : null}
              </fieldset>
              <fieldset disabled={!draftEditable} className="space-y-3 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-xs font-bold text-slate-700">Evaluator roles</legend>
                {(['SUPERVISOR', 'PANEL'] as const).map((role) => <label key={role} className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={form.evaluatorRoles.includes(role)} onChange={(event) => updateForm((current) => ({ ...current, evaluatorRoles: event.target.checked ? [...current.evaluatorRoles, role] : current.evaluatorRoles.filter((value) => value !== role) }))} />
                  {role === 'SUPERVISOR' ? 'Supervisor' : 'Panel'}
                </label>)}
                <p className="text-xs text-slate-500">Choose one or both roles. The same rubric applies to all selected roles.</p>
              </fieldset>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs font-bold text-slate-700">
                  Opens at
                  <input
                    required
                    type="datetime-local"
                    disabled={!draftEditable}
                    value={form.opensAt}
                    onChange={(event) => updateForm((current) => ({ ...current, opensAt: event.target.value }))}
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
                    onChange={(event) => updateForm((current) => ({ ...current, closesAt: event.target.value }))}
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

              {selected?.lifecycleStatus === 'DRAFT' ? <div className="space-y-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-600">Save changes, then refresh and review recipients before publishing.</p>
                {hasUnsavedChanges ? <p role="status" className="text-xs font-bold text-amber-800">Save your unsaved changes before reviewing recipients.</p> : null}
                <PortalButton variant="secondary" disabled={hasUnsavedChanges || previewLoading} isLoading={previewLoading} onClick={() => void refreshPreview()}>Refresh recipient preview</PortalButton>
                {preview && canPublish ? <MarkEntryRecipientPreview preview={preview} /> : null}
              </div> : null}

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
                    disabled={!canPublish}
                    onClick={() => void runTransition('publish')}
                  >
                    Confirm and publish
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
              </fieldset>
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
