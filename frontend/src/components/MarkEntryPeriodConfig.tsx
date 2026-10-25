import { MarksHeading } from './MarksPrimitives';
import { PortalSelect } from './PortalSelect';
import { ClosureReview } from './ClosureReview';
import type { ClosureApproval } from '../types/marks';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { APP_ROUTES } from '../constants/routes';
import {
  Archive,
  ArrowLeft,
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
import { malaysiaDeadline, formatMalaysiaDateTime as displayDateTime } from '../utils/malaysiaDateTime';
import {parseMarksPeriodContext} from '../utils/periodPresentation';
import {ApiError} from '../services/apiClient';
import {AlertMessage} from './AlertMessage';
import {FieldError,FormFeedback} from './FormFeedback';
import {clearFeedbackFields,focusFeedback,readFormFeedback,type FormFeedbackState} from '../utils/formFeedback';

interface MarkEntryPeriodConfigProps {
  onBack: () => void;
  onManageSemesters: () => void;
  onManageTimeline?: (period?:Pick<EvaluationPeriodOption,'id'|'semesterId'>) => void;
  contextSearch?: string;
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
const PERIOD_FIELDS=Object.fromEntries(['name','semesterId','rubricId','opensAt','closesAt','programmeScope','programmes','evaluatorRoles'].map(key=>[key,{id:`marks-period-${key}`,label:({name:'Period name',semesterId:'Academic semester',rubricId:'Rubric version',opensAt:'Opens at',closesAt:'Closes at',programmeScope:'Programme scope',programmes:'Programmes',evaluatorRoles:'Evaluator roles'} as Record<string,string>)[key]}]));
const PERIOD_FIELD_MAP=Object.fromEntries(Object.keys(PERIOD_FIELDS).map(key=>[key,key]));
const PERIOD_IDS=Object.fromEntries(Object.entries(PERIOD_FIELDS).map(([key,value])=>[key,value.id]));

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
    <h3 className="section-label">Recipient preview</h3>
    <p className="card-description">Recipient estimate as of {displayDateTime(preview.generatedAt)}; tasks are created when you publish.</p>
    <p className="card-description">Eligible students and appointments added later are included automatically while the published period remains scheduled or open.</p>
    <p className="card-description">{preview.totals.students} students · {preview.totals.supervisor} Supervisor · {preview.totals.panel} Panel · {preview.totals.total} tasks ({preview.totals.existing} existing, {preview.totals.new} new)</p>
    {preview.missingAppointments.supervisor > 0 || preview.missingAppointments.panel > 0 ? <>
      <p className="card-description">{preview.missingAppointments.supervisor} students missing a supervisor · {preview.missingAppointments.panel} students missing a panel</p>
      <p className="card-description">Missing counts include students without an eligible appointment or required research profile, for the selected programmes and roles.</p>
    </> : null}
    {preview.totals.total === 0 ? <p role="alert" className="card-description rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">No recipients currently match this period. Publishing will create no tasks now; later eligible appointments may add tasks automatically.</p> : null}
    {preview.recipients.length > 0 ? <div role="region" aria-label="Recipient preview results" tabIndex={0} className="max-h-80 overflow-auto focus-visible:outline-2 focus-visible:outline-blue-600">
      <table className="w-full text-left">
        <caption className="sr-only">Estimated evaluation recipients before publication</caption>
        <thead><tr>{['Student', 'Programme', 'Evaluator', 'Role', 'Task'].map((label) => <th scope="col" key={label} className="p-2 text-xs font-extrabold">{label}</th>)}</tr></thead>
        <tbody>{preview.recipients.map((recipient, index) => <tr key={`${recipient.matricNo}-${recipient.evaluatorId}-${recipient.evaluatorRole}-${index}`} className="border-t border-slate-100">
          <td className="p-2 text-xs font-semibold">{recipient.studentName}<span className="card-description block">{recipient.matricNo}</span></td>
          <td className="p-2 text-xs font-semibold">{recipient.programme || 'Unspecified'}</td>
          <td className="p-2 text-xs font-semibold">{recipient.evaluatorName}</td>
          <td className="p-2 text-xs font-semibold">{recipient.evaluatorRole === 'SUPERVISOR' ? 'Supervisor' : 'Panel'}</td>
          <td className="p-2 text-xs font-semibold">{recipient.taskStatus === 'EXISTING' ? 'Existing' : 'New'}</td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </section>
);

export function MarksPeriodDeadlineControls({value,onChange,editable,onManageTimeline,error}: {
  value:string;onChange:(value:string)=>void;editable:boolean;onManageTimeline?:()=>void;error?:string;
}) {
  return <div className="space-y-3"><label className="form-label block">Closes at (Malaysia, UTC+08:00)
    <input id="marks-period-closesAt" aria-invalid={!!error} aria-describedby={error?'marks-period-closesAt-error':undefined} required type="datetime-local" disabled={!editable} value={value} onChange={event=>onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100 font-sans not-italic normal-case tracking-normal text-xs font-bold"/>
    <FieldError id="marks-period-closesAt-error" message={error}/>
  </label>{!editable?<><p className="card-description">Manage period extensions and personal extra time from Periods &amp; deadlines.</p>{onManageTimeline?<PortalButton onClick={onManageTimeline}>Manage deadlines in Periods &amp; deadlines</PortalButton>:null}</>:null}</div>;
}

export const MarkEntryPeriodConfig: React.FC<MarkEntryPeriodConfigProps> = ({
  onBack,
  onManageSemesters,
  onManageTimeline,
  contextSearch='',
}) => {
  const context=parseMarksPeriodContext(contextSearch);
  const contextScope=useRef(contextSearch);contextScope.current=contextSearch;
  const [contextSemester,setContextSemester]=useState<AcademicSemester|null>(null);
  const [contextBlocked,setContextBlocked]=useState(false);
  const contextRequest=useRef(0);
  const [periods, setPeriods] = useState<EvaluationPeriodOption[]>([]);
  const [rubrics, setRubrics] = useState<RubricVersion[]>([]);
  const [semesters, setSemesters] = useState<AcademicSemester[]>([]);
  const [selected, setSelected] = useState<EvaluationPeriodOption | null>(null);
  const [form, setForm] = useState<PeriodForm>(EMPTY_FORM);
  const [programmeOptions, setProgrammeOptions] = useState<string[]>([]);
  const [preview, setPreview] = useState<(EvaluationRecipientPreview & PeriodPreviewApproval) | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const selectionRequest = useRef(0);
  const previewRequest = useRef(0);
  const invalidatePreview = () => { previewRequest.current += 1; setPreview(null); setPreviewLoading(false); setPreviewError(null); };
  const updateForm = (change: React.SetStateAction<PeriodForm>) => { invalidatePreview();const next=typeof change==='function'?change(form):change;setForm(next);const changed=Object.keys(next).filter(key=>JSON.stringify(next[key as keyof PeriodForm])!==JSON.stringify(form[key as keyof PeriodForm]));setFormFeedback(current=>clearFeedbackFields(current,changed)); };
  const [reason, setReason] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archivedAvailable, setArchivedAvailable] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const editorHeading = useRef<HTMLDivElement>(null);
  const [detailFocusRequest, setDetailFocusRequest] = useState(0);
  const listRegion = useRef<HTMLElement>(null);
  const [listFocusRequest, setListFocusRequest] = useState(0);
  const periodNameInput = useRef<HTMLInputElement>(null);
  const [newDraftFocusRequest, setNewDraftFocusRequest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionError,setSelectionError]=useState<string|null>(null);
  const [selectionTarget,setSelectionTarget]=useState<EvaluationPeriodOption|null>(null);
  const [formFeedback,setFormFeedback]=useState<FormFeedbackState|null>(null);
  const [actionError,setActionError]=useState<string|null>(null);
  const [savedReadBlocked,setSavedReadBlocked]=useState(false);
  const fieldProps=(key:string)=>({id:PERIOD_FIELDS[key].id,'aria-invalid':!!formFeedback?.fields[key],'aria-describedby':formFeedback?.fields[key]?`${PERIOD_FIELDS[key].id}-error`:undefined});
  const fieldError=(key:string)=><FieldError id={`${PERIOD_FIELDS[key].id}-error`} message={formFeedback?.fields[key]}/>;
  const report=(feedback:FormFeedbackState)=>{setFormFeedback(feedback);focusFeedback(feedback,PERIOD_IDS,'marks-period-save-feedback');};
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadWorkspace = useCallback(async () => {
    const requestId=++contextRequest.current;
    selectionRequest.current+=1;
    setSelecting(false);
    setLoading(true);
    setError(null);
    setContextBlocked(false);
    try {
      if(context.invalid)throw new ApiError('The requested evaluation context is invalid. Return to Periods & deadlines and open the configuration again.',400);
      const includesArchives = includeArchived || !!context.periodId;
      const [periodRows, rubricRows, semesterRows, programmes, archiveRows] = await Promise.all([
        getEvaluationPeriods(includesArchives),
        getRubricVersions(),
        getAcademicSemesters(),
        getMarksProgrammeOptions(),
        includesArchives ? Promise.resolve(null) : getEvaluationPeriods(true),
      ]);
      if(requestId!==contextRequest.current)return;
      const requestedSemester=context.semesterId?semesterRows.find(row=>row.id===context.semesterId):null;
      if(context.semesterId&&!requestedSemester)throw new ApiError('The requested academic semester is unavailable. Return to Periods & deadlines to choose another semester.',400);
      const requestedPeriod=context.periodId?periodRows.find(row=>row.id===context.periodId&&row.semesterId===context.semesterId):null;
      if(context.periodId&&!requestedPeriod)throw new ApiError('The requested evaluation period does not belong to this semester or is unavailable. Return to Periods & deadlines.',400);
      setContextSemester(requestedSemester??null);
      if(context.semesterId)setSelected(current=>current?.semesterId===context.semesterId?current:null);
      setProgrammeOptions(programmes);
      setArchivedAvailable((archiveRows ?? periodRows).some(period => period.lifecycleStatus === 'ARCHIVED' && (!context.semesterId || period.semesterId === context.semesterId)));
      invalidatePreview();
      setPeriods(periodRows.filter(row => (!context.semesterId || row.semesterId === context.semesterId) && (includeArchived || row.lifecycleStatus !== 'ARCHIVED')));
      setRubrics(rubricRows);
      const editableSemesters = semesterRows.filter((semester) => (
        semester.lifecycleStatus === 'DRAFT' || semester.lifecycleStatus === 'ACTIVE'
      ));
      setSemesters(editableSemesters);
      setForm((current) => (
        context.semesterId?(current.semesterId===String(context.semesterId)?current:{...EMPTY_FORM,semesterId:String(context.semesterId)}):current.semesterId
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
      if(requestedPeriod&&!(selected?.id===requestedPeriod.id&&selected.semesterId===context.semesterId)){
        const detail=await getEvaluationPeriod(requestedPeriod.id);
        if(detail.semesterId!==context.semesterId)throw new ApiError('The evaluation period context changed. Return to Periods & deadlines and reload.',400);
        if(requestId!==contextRequest.current)return;
        setSelected(detail);setForm(periodToForm(detail));setReason('');
        setEditorOpen(true);
      } else if (selected) {
        const refreshed = periodRows.find((period) => period.id === selected.id&&(!context.semesterId||period.semesterId===context.semesterId));
        if (!refreshed) {
          setSelected(null);
          setEditorOpen(false);
          setForm({...EMPTY_FORM,semesterId:context.semesterId?String(context.semesterId):''});
        }
      }
    } catch (loadError) {
      if(requestId!==contextRequest.current)return;
      setError(marksMutationErrorMessage(loadError));
      if(contextSearch)setContextBlocked(true);
    } finally {
      if(requestId===contextRequest.current)setLoading(false);
    }
  }, [includeArchived, selected,contextSearch]);

  useEffect(() => {
    setEditorOpen(false);
    void loadWorkspace();
    return()=>{contextRequest.current+=1;selectionRequest.current+=1;};
  }, [includeArchived,contextSearch]);

  const readyRubrics = useMemo(
    () => rubrics.filter((rubric) => rubric.isActive && rubric.isReady),
    [rubrics],
  );

  const beginNew = () => {
    setFormFeedback(null);setActionError(null);setSelectionError(null);setSelectionTarget(null);setSavedReadBlocked(false);
    selectionRequest.current += 1;
    setSelecting(false);
    invalidatePreview();
    setSelected(null);
    setForm({
      ...EMPTY_FORM,
      semesterId: String(
        context.semesterId??semesters.find((semester) => semester.effectiveStatus === 'ACTIVE')?.id
        ?? semesters[0]?.id
        ?? '',
      ),
      rubricId: readyRubrics[0] ? String(readyRubrics[0].id) : '',
    });
    setReason('');
    setError(null);
    setEditorOpen(true);
    setNewDraftFocusRequest(request => request + 1);
  };

  useEffect(() => {
    if (newDraftFocusRequest === 0) return;
    periodNameInput.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    periodNameInput.current?.focus({ preventScroll: true });
  }, [newDraftFocusRequest]);

  useEffect(() => {
    if (detailFocusRequest === 0) return;
    editorHeading.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    editorHeading.current?.focus({ preventScroll: true });
  }, [detailFocusRequest]);

  const returnToList = () => {
    invalidatePreview();
    setEditorOpen(false);
    setListFocusRequest(request => request + 1);
  };

  useEffect(() => {
    if (listFocusRequest === 0) return;
    listRegion.current?.focus();
  }, [listFocusRequest]);

  const selectPeriod = async (period: EvaluationPeriodOption) => {
    setSelectionTarget(period);
    const requestId = ++selectionRequest.current;
    const requestedScope=contextSearch;
    invalidatePreview();
    setSelecting(true);
    setSelectionError(null);setFormFeedback(null);setActionError(null);
    try {
      const detail = await getEvaluationPeriod(period.id);
      if (requestId !== selectionRequest.current||requestedScope!==contextScope.current) return;
      if(context.semesterId&&detail.semesterId!==context.semesterId){const message='The evaluation period no longer belongs to the selected semester. Return to Periods & deadlines and reload.';setContextBlocked(true);setError(message);throw new ApiError(message,409);}
      setSelected(detail);
      setSavedReadBlocked(false);
      setForm(periodToForm(detail));
      setReason('');
      setEditorOpen(true);
      setDetailFocusRequest(request => request + 1);
    } catch (loadError) {
      if (requestId === selectionRequest.current) setSelectionError(marksMutationErrorMessage(loadError));
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
    setEditorOpen(true);
    if (updated.lifecycleStatus === 'ARCHIVED') setArchivedAvailable(true);
  };

  const savePeriod = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || selecting || loading || contextBlocked || savedReadBlocked || (selected && selected.lifecycleStatus !== 'DRAFT')) return;
    const requestedScope=contextSearch;
    const targetingError = validatePeriodTargeting(form);
    if (targetingError) { const key=!form.programmeScope?'programmeScope':form.programmeScope==='SELECTED'&&!form.programmes.length?'programmes':'evaluatorRoles';report({message:'Correct the highlighted fields, then save again.',fields:{[key]:targetingError}});return; }
    invalidatePreview();
    setSaving(true);
    setFormFeedback(null);setActionError(null);
    let committed=false;
    try {
      const payload = {
        name: form.name.trim(),
        semesterId: Number(form.semesterId),
        rubricId: Number(form.rubricId),
        opensAt: form.opensAt ? malaysiaDeadline(form.opensAt) : null,
        closesAt: form.closesAt ? malaysiaDeadline(form.closesAt) : null,
        programmeScope: form.programmeScope as 'ALL' | 'SELECTED',
        programmes: form.programmeScope === 'SELECTED' ? form.programmes : [],
        evaluatorRoles: form.evaluatorRoles,
      };
      const updated = selected
        ? await updateEvaluationPeriod(
            selected.id,
            payload,
          )
        : await createEvaluationPeriod(payload);
      if(requestedScope!==contextScope.current)return;
      replacePeriod(updated);
      committed=true;
      setSavedReadBlocked(true);
      const detail=await getEvaluationPeriod(updated.id);
      if(requestedScope!==contextScope.current)return;
      replacePeriod(detail);
      setSavedReadBlocked(false);
      setReason('');
      showToast(selected ? 'Period changes saved.' : 'Draft period created.');
    } catch (saveError) {
      if(requestedScope===contextScope.current&&!committed)report(readFormFeedback(saveError,marksMutationErrorMessage(saveError),PERIOD_FIELD_MAP));
    } finally {
      setSaving(false);
    }
  };

  const runTransition = async (
    action: 'publish' | 'close' | 'archive',
    approval?: ClosureApproval,
  ) => {
    if (!selected || saving || selecting || savedReadBlocked) return;
    const requestedScope=contextSearch;
    if (action === 'publish' && !canPublish) return;
    invalidatePreview();
    setSaving(true);
    setActionError(null);
    let committed=false;
    try {
      const updated = action === 'publish'
        ? await publishEvaluationPeriod(selected.id)
        : action === 'close'
          ? await closeEvaluationPeriod(selected.id, reason, approval)
          : await archiveEvaluationPeriod(selected.id, reason);
      if(requestedScope!==contextScope.current)return;
      replacePeriod(updated);committed=true;setSavedReadBlocked(true);
      const detail=await getEvaluationPeriod(updated.id);
      if(requestedScope!==contextScope.current)return;
      replacePeriod(detail);
      setSavedReadBlocked(false);
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
        setEditorOpen(false);
        setForm({...EMPTY_FORM,semesterId:context.semesterId?String(context.semesterId):''});
      }
    } catch (transitionError) {
      if(requestedScope===contextScope.current&&!approval&&!committed)setActionError(marksMutationErrorMessage(transitionError));
      if (approval&&!committed) throw transitionError;
    } finally {
      setSaving(false);
    }
  };

  const draftEditable = (!selected || selected.lifecycleStatus === 'DRAFT')&&(!contextSemester||['DRAFT','ACTIVE'].includes(contextSemester.lifecycleStatus));
  const published = selected?.lifecycleStatus === 'PUBLISHED';
  const closed = selected?.lifecycleStatus === 'CLOSED';
  const formSnapshot = JSON.stringify(form);
  const savedFormSnapshot = selected ? JSON.stringify(periodToForm(selected)) : '';
  const hasUnsavedChanges = formSnapshot !== savedFormSnapshot;
  const canPublish = !saving && !selecting && !previewLoading && canPublishPeriodPreview(selected, formSnapshot, savedFormSnapshot, preview);
  const selectableProgrammes = [...new Set([...programmeOptions, ...form.programmes])].sort();

  const loadRecipientPreview = async () => {
    if (!selected || hasUnsavedChanges || saving || selecting || savedReadBlocked) return;
    const requestId = ++previewRequest.current;
    setPreview(null);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      // Refresh the saved configuration first, so another office edit cannot be
      // silently approved using this screen's previous draft values.
      const detail = await getEvaluationPeriod(selected.id);
      if (requestId !== previewRequest.current) return;
      if (JSON.stringify(detail) !== JSON.stringify(selected)) {
        replacePeriod(detail);
        setActionError('The saved period changed. Review its current configuration and recipient preview before publishing.');
        return;
      }
      const result = await getEvaluationRecipientPreview(selected.id);
      if (requestId !== previewRequest.current) return;
      setPreview({ ...result, formSnapshot, periodSnapshot: JSON.stringify(detail) });
    } catch (previewError) {
      if (requestId === previewRequest.current) setPreviewError(marksMutationErrorMessage(previewError));
    } finally {
      if (requestId === previewRequest.current) setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!editorOpen || selected?.lifecycleStatus !== 'DRAFT' || hasUnsavedChanges || saving || selecting || loading) return;
    void loadRecipientPreview();
    return () => { previewRequest.current += 1; };
  }, [editorOpen, selected, formSnapshot, hasUnsavedChanges, saving, selecting, loading, includeArchived]);

  const emptyList = !editorOpen && !loading && !error && !contextBlocked && periods.length === 0;
  const newPeriodDisabled = saving || loading || contextBlocked || savedReadBlocked || !!contextSemester && !['DRAFT', 'ACTIVE'].includes(contextSemester.lifecycleStatus);

  return (
    <div id="mark-entry-period-configuration" className="marks-workspace space-y-7 animate-fade-in">
      <PortalToast message={toast} tone="success" />
      <PageHeader
        title="Mark Entry Periods"
        subtitle="Set evaluation dates, rubrics and recipients."
        backLabel="Back to Marks overview"
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
            {!emptyList ? <PortalButton icon={Plus} variant="primary" onClick={beginNew} disabled={newPeriodDisabled}>
              New period
            </PortalButton> : null}
          </>
        )}
      />

      {error ? <ErrorState compact title={contextBlocked?'Evaluation context needs review':'Couldn’t load evaluation configuration'} message={error} onRetry={loadWorkspace} /> : null}

      {contextSemester?<div className="rounded-lg border border-slate-200 bg-white p-4"><p className="card-value">{contextSemester.label}</p><p className="card-description mt-1">Opened from Periods &amp; deadlines. Evaluation periods below are limited to this semester.</p></div>:null}

      {!editorOpen && (!emptyList || archivedAvailable) ? <div id="evaluation-period-list-toolbar" role="group" aria-label="Evaluation period list options" className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <h2 className="section-label">Evaluation periods</h2>
        {archivedAvailable ? <label className="card-description flex min-h-10 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={includeArchived}
            disabled={saving || selecting}
            onChange={(event) => setIncludeArchived(event.target.checked)}
            className="h-4 w-4 accent-brand-navy"
          />
          Include archived periods
        </label> : null}
        {includeArchived ? <p className="card-caption">Archived periods are read-only.</p> : null}
      </div> : null}

      {loading ? (
        <LoadingState message="Loading evaluation periods..." />
      ) : contextBlocked||error?null:(
        <div>
          {!editorOpen ? <section ref={listRegion} tabIndex={-1} className="space-y-3" aria-label="Configured evaluation periods">
            {selecting ? <p role="status" className="card-description">Opening period…</p> : null}
            {selectionError?<ErrorState compact title="Couldn’t open the selected period" message={selectionError} onRetry={selectionTarget?()=>void selectPeriod(selectionTarget):undefined}/>:null}
            {periods.length === 0 ? (
              <PortalCard data-period-empty padding="none" className="rounded-lg">
                <EmptyState
                  icon={CalendarClock}
                  title={archivedAvailable ? 'No current evaluation periods' : 'No evaluation periods yet'}
                  description={archivedAvailable ? 'Include archived periods to view previous configurations.' : newPeriodDisabled ? 'No periods are configured. This semester is read-only.' : 'Create your first period to prepare marks entry.'}
                  actionLabel={newPeriodDisabled ? undefined : 'New period'}
                  onAction={beginNew}
                  className="px-6"
                />
              </PortalCard>
            ) : periods.map((period) => (
              <button
                key={period.id}
                type="button"
                disabled={saving}
                aria-busy={selecting && selectionTarget?.id === period.id}
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
                    <p className="card-description mt-1">
                      {period.semester} · {period.rubricName}
                    </p>
                    <p className="card-description mt-1">{formatPeriodTargeting(period)}</p>
                  </div>
                  <StatusBadge tone={getStatusBadgeTone(period.effectiveStatus)} dot>
                    {period.lifecycleStatus === 'PUBLISHED' ? `Published · ${formatPeriodStatus(period.effectiveStatus)}` : formatPeriodStatus(period.lifecycleStatus)}
                  </StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="block card-label">Opens</span>
                    <span className="font-semibold text-slate-700">{displayDateTime(period.opensAt)}</span>
                  </div>
                  <div>
                    <span className="block card-label">Closes</span>
                    <span className="font-semibold text-slate-700">{displayDateTime(period.closesAt)}</span>
                  </div>
                  <div>
                    <span className="block card-label">Tasks</span>
                    <span className="font-semibold text-slate-700">{period.taskTotals.total}</span>
                  </div>
                  <div>
                    <span className="block card-label">Submitted</span>
                    <span className="font-semibold text-slate-700">{period.taskTotals.submitted}</span>
                  </div>
                </div>
              </button>
            ))}
          </section> : (

          <PortalCard padding="lg" className="period-config-editor min-w-0 rounded-lg">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div ref={editorHeading} tabIndex={-1}>
                <MarksHeading icon={CalendarClock}>{selected ? 'Period configuration' : 'New draft period'}</MarksHeading>
                <p className="card-description mt-1">
                  {selected && !draftEditable ? 'Published periods lock their dates, recipients and rubric. Manage extensions in Periods & deadlines.' : 'Saving a draft does not open marks entry.'}
                </p>
                {selected ? <p className="card-value mt-2">{formatPeriodTargeting(selected)}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
              {selected ? (
                <StatusBadge tone={getStatusBadgeTone(selected.effectiveStatus)}>
                  {formatPeriodStatus(selected.effectiveStatus)}
                </StatusBadge>
              ) : null}
              <PortalButton icon={ArrowLeft} variant="secondary" disabled={saving || selecting} onClick={returnToList}>Back to period list</PortalButton>
              </div>
            </div>

            {savedReadBlocked?<AlertMessage type="warning" title="Changes saved; refresh required" message="The saved period could not be refreshed. Reload its current configuration before another change." actions={selected?<PortalButton disabled={selecting} onClick={()=>void selectPeriod(selected)}>Reload saved period</PortalButton>:undefined}/>:null}
            <form onSubmit={savePeriod} className="feedback-fields space-y-4">
              <fieldset disabled={saving || selecting || savedReadBlocked} className="space-y-6">
              <div className="period-config-identity">
              <label className="form-label block">
                Period name
                <input
                  required
                  ref={periodNameInput}
                  {...fieldProps('name')}
                  disabled={!draftEditable}
                  value={form.name}
                  onChange={(event) => updateForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                />
                {fieldError('name')}
              </label>
              <label className="form-label block">
                Academic semester
                <PortalSelect
                  {...fieldProps('semesterId')}
                  disabled={!!context.semesterId||!draftEditable}
                  required
                  value={form.semesterId}
                  onChange={(event) => updateForm((current) => ({ ...current, semesterId: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                >
                  <option value="">Select a Draft or Active semester</option>
                  {contextSemester&&!semesters.some(row=>row.id===contextSemester.id)?<option value={contextSemester.id}>{contextSemester.label}</option>:null}
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.label}
                    </option>
                  ))}
                </PortalSelect>
                {fieldError('semesterId')}
              </label>
              <label className="form-label block period-config-rubric">
                Rubric version
                <PortalSelect
                  required
                  {...fieldProps('rubricId')}
                  disabled={!draftEditable}
                  value={form.rubricId}
                  onChange={(event) => updateForm((current) => ({ ...current, rubricId: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                >
                  <option value="">Select a ready rubric</option>
                  {readyRubrics.map((rubric) => (
                    <option key={rubric.id} value={rubric.id}>
                      {rubric.name} · v{rubric.version} · {rubric.targetMark} marks
                    </option>
                  ))}
                </PortalSelect>
                {fieldError('rubricId')}
                {draftEditable && readyRubrics.length === 0 ? <span className="card-description mt-2 block">No ready rubric available. <Link to={APP_ROUTES.marksRubrics} className="font-semibold text-blue-700 hover:underline">Configure a rubric</Link> before creating this period.</span> : null}
              </label>
              </div>
              <div className="period-config-targets">
              <fieldset {...fieldProps('programmeScope')} tabIndex={-1} disabled={!draftEditable} className="space-y-3 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-xs font-bold text-slate-700">Programme scope</legend>
                {(['ALL', 'SELECTED'] as const).map((scope) => <label key={scope} className="card-description flex items-center gap-2">
                  <input type="radio" name="programmeScope" value={scope} required checked={form.programmeScope === scope} onChange={() => updateForm((current) => ({ ...current, programmeScope: scope }))} />
                  {scope === 'ALL' ? 'All programmes (including future programmes)' : 'Selected programmes'}
                </label>)}
                {fieldError('programmeScope')}
                {form.programmeScope === 'SELECTED' ? <div {...fieldProps('programmes')} tabIndex={-1} className="max-h-48 space-y-2 overflow-auto border-t border-slate-100 pt-3">
                  {selectableProgrammes.map((programme) => <label key={programme} className="card-description flex items-center gap-2">
                    <input type="checkbox" checked={form.programmes.includes(programme)} onChange={(event) => updateForm((current) => ({ ...current, programmes: event.target.checked ? [...current.programmes, programme] : current.programmes.filter((value) => value !== programme) }))} />
                    {programme}
                  </label>)}
                  {!selectableProgrammes.length ? <p className="card-description">No programmes are available. Add programme data to student records first.</p> : null}
                  {form.programmes.length === 0 ? <p className="card-description">Choose at least one programme.</p> : null}
                  {fieldError('programmes')}
                </div> : null}
              </fieldset>
              <fieldset {...fieldProps('evaluatorRoles')} tabIndex={-1} disabled={!draftEditable} className="space-y-3 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-xs font-bold text-slate-700">Evaluator roles</legend>
                {(['SUPERVISOR', 'PANEL'] as const).map((role) => <label key={role} className="card-description flex items-center gap-2">
                  <input type="checkbox" checked={form.evaluatorRoles.includes(role)} onChange={(event) => updateForm((current) => ({ ...current, evaluatorRoles: event.target.checked ? [...current.evaluatorRoles, role] : current.evaluatorRoles.filter((value) => value !== role) }))} />
                  {role === 'SUPERVISOR' ? 'Supervisor' : 'Panel'}
                </label>)}
                <p className="card-description">Selected roles share this rubric.</p>
                {fieldError('evaluatorRoles')}
              </fieldset>
              </div>
              <div className="period-config-dates">
                <label className="form-label block">
                  Opens at (Malaysia, UTC+08:00)
                  <input
                    required
                    {...fieldProps('opensAt')}
                    type="datetime-local"
                    disabled={!draftEditable}
                    value={form.opensAt}
                    onChange={(event) => updateForm((current) => ({ ...current, opensAt: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                  />
                  {fieldError('opensAt')}
                </label>
                <MarksPeriodDeadlineControls error={formFeedback?.fields.closesAt} value={form.closesAt} editable={draftEditable} onChange={value=>updateForm(current=>({...current,closesAt:value}))} onManageTimeline={onManageTimeline?()=>onManageTimeline(selected??undefined):undefined}/>
              </div>

              {published || closed ? (
                <label className="form-label block">
                  Reason
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    placeholder={published ? 'Required for early closure' : 'Required to archive this period'}
                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                  />
                </label>
              ) : null}

              {selected?.lifecycleStatus === 'DRAFT' ? <div className="space-y-3 border-t border-slate-100 pt-4">
                {hasUnsavedChanges ? <p role="status" className="card-value text-amber-800">Save your unsaved changes before reviewing recipients.</p> : null}
                {previewLoading ? <p role="status" className="card-description">Loading recipient preview…</p> : null}
                {previewError ? <ErrorState compact title="Couldn’t verify recipients" message={previewError} onRetry={() => void loadRecipientPreview()} /> : null}
                {preview && canPublish ? <MarkEntryRecipientPreview preview={preview} /> : null}
              </div> : null}

              <FormFeedback id="marks-period-save-feedback" feedback={formFeedback} fields={PERIOD_FIELDS}/>
              {actionError?<AlertMessage type="error" title="Period wasn’t changed" message={actionError}/>:null}
              {selected?.lifecycleStatus === 'DRAFT' ? <p className="card-description">Publishing opens mark entry only during the configured dates.</p> : null}
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                {draftEditable ? (
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

            {published && selected ? <ClosureReview key={selected.id} kind="period" id={selected.id} disabled={saving || selecting || !reason.trim() || hasUnsavedChanges} onConfirm={approval => runTransition('close', approval)} /> : null}
            {selected?.auditEvents?.length ? (
              <div className="mt-7 border-t border-slate-100 pt-5">
                <h3 className="section-label flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  Configuration history
                </h3>
                <div className="mt-3 space-y-3">
                  {selected.auditEvents.map((event) => (
                    <div key={event.id} className="border-l-2 border-slate-200 pl-3 text-xs">
                      <p className="card-value">{event.action}</p>
                      <p className="card-description mt-0.5">
                        {event.actorName} · {displayDateTime(event.createdAt)}
                      </p>
                      {event.reason ? <p className="card-description mt-1">{event.reason}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </PortalCard>
          )}
        </div>
      )}

    </div>
  );
};
