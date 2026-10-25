import { MarksHeading } from './MarksPrimitives';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Edit3,
  Layers3,
  Plus,
  Save,
  XCircle,
} from 'lucide-react';

import {
  cloneRubricVersion,
  createRubricComponent,
  createRubricVersion,
  getRubricVersion,
  getRubricVersions,
  updateRubricComponent,
  updateRubricVersion,
} from '../services';
import type { RubricComponent, RubricVersion } from '../types';
import {AlertMessage} from './AlertMessage';
import {FieldError, FormFeedback} from './FormFeedback';
import {clearFeedbackFields, focusFeedback, readFormFeedback, type FormFeedbackState} from '../utils/formFeedback';
import { marksMutationErrorMessage } from '../utils/marksProductionManagement';
import {
  PageHeader,
  PortalButton,
  PortalCard,
  PortalToast,
  StatusBadge,
} from './PortalPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

interface RubricsManagementViewProps {
  onBack: () => void;
}

type RubricForm = {
  familyCode: string;
  name: string;
  description: string;
  targetMark: string;
};

type ComponentForm = {
  id: number | null;
  code: string;
  name: string;
  description: string;
  maxMarks: string;
  required: boolean;
  isActive: boolean;
  displayOrder: string;
};

const RUBRIC_FIELDS = {
  familyCode: {id: 'rubric-family-code', label: 'Family code'},
  name: {id: 'rubric-name', label: 'Name'},
  description: {id: 'rubric-description', label: 'Description'},
  targetMark: {id: 'rubric-target-mark', label: 'Target mark'},
};
const COMPONENT_FIELDS = {
  code: {id: 'component-code', label: 'Code'},
  name: {id: 'component-name', label: 'Component name'},
  description: {id: 'component-description', label: 'Description'},
  maxMarks: {id: 'component-maximum', label: 'Maximum mark'},
  displayOrder: {id: 'component-order', label: 'Display order'},
};
const RUBRIC_FIELD_MAP = {family_code:'familyCode', familyCode:'familyCode', name:'name', description:'description', target_mark:'targetMark', targetMark:'targetMark'};
const COMPONENT_FIELD_MAP = {code:'code', name:'name', description:'description', max_marks:'maxMarks', maxMarks:'maxMarks', display_order:'displayOrder', displayOrder:'displayOrder'};

const EMPTY_RUBRIC: RubricForm = {
  familyCode: '',
  name: '',
  description: '',
  targetMark: '100.00',
};

const EMPTY_COMPONENT: ComponentForm = {
  id: null,
  code: '',
  name: '',
  description: '',
  maxMarks: '',
  required: true,
  isActive: true,
  displayOrder: '1',
};

export const RubricsManagementView: React.FC<RubricsManagementViewProps> = ({
  onBack,
}) => {
  const [rubrics, setRubrics] = useState<RubricVersion[]>([]);
  const [selected, setSelected] = useState<RubricVersion | null>(null);
  const [rubricForm, setRubricForm] = useState<RubricForm>(EMPTY_RUBRIC);
  const [componentForm, setComponentForm] = useState<ComponentForm>(EMPTY_COMPONENT);
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<{rubric: RubricVersion; message: string} | null>(null);
  const [rubricFeedback, setRubricFeedback] = useState<FormFeedbackState | null>(null);
  const [componentFeedback, setComponentFeedback] = useState<FormFeedbackState | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [componentActionError, setComponentActionError] = useState<string | null>(null);
  const [savedReadBlocked,setSavedReadBlocked]=useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadRubrics = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await getRubricVersions();
      setRubrics(rows);
      if (!selected && rows[0]) {
        setSelected(rows[0]);
        setRubricForm({
          familyCode: rows[0].familyCode,
          name: rows[0].name,
          description: rows[0].description,
          targetMark: rows[0].targetMark,
        });
      }
    } catch (loadError) {
      setLoadError(loadError instanceof Error ? loadError.message : 'Rubric versions could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    void loadRubrics();
  }, []);

  useEffect(() => {
    if (creatingFamily) document.getElementById(RUBRIC_FIELDS.familyCode.id)?.focus();
  }, [creatingFamily]);

  const selectRubric = async (rubric: RubricVersion) => {
    setSelectionError(null);
    try {
      const detail = await getRubricVersion(rubric.id);
      setSelected(detail);
      setSavedReadBlocked(false);
      setRubricForm({
        familyCode: detail.familyCode,
        name: detail.name,
        description: detail.description,
        targetMark: detail.targetMark,
      });
      setComponentForm(EMPTY_COMPONENT);
      setCreatingFamily(false);
      setRubricFeedback(null);
      setComponentFeedback(null);
      setCloneError(null);
      setComponentActionError(null);
    } catch (loadError) {
      setSelectionError({rubric, message: loadError instanceof Error ? loadError.message : 'This rubric version could not be loaded.'});
    }
  };

  const replaceRubric = (updated: RubricVersion) => {
    setRubrics((current) => {
      const exists = current.some((rubric) => rubric.id === updated.id);
      return exists
        ? current.map((rubric) => rubric.id === updated.id ? updated : rubric)
        : [updated, ...current];
    });
    setSelected(updated);
    setRubricForm({
      familyCode: updated.familyCode,
      name: updated.name,
      description: updated.description,
      targetMark: updated.targetMark,
    });
  };

  const beginFamily = () => {
    setCreatingFamily(true);
    setSelected(null);
    setRubricForm(EMPTY_RUBRIC);
    setComponentForm(EMPTY_COMPONENT);
    setRubricFeedback(null);
    setComponentFeedback(null);
    setSelectionError(null);
    setCloneError(null);
    setComponentActionError(null);
  };

  const saveRubric = async (event: React.FormEvent) => {
    event.preventDefault();
    if(saving||savedReadBlocked)return;
    setSaving(true);
    setRubricFeedback(null);
    try {
      const updated = creatingFamily
        ? await createRubricVersion(rubricForm)
        : await updateRubricVersion(selected!.id, {
            name: rubricForm.name,
            description: rubricForm.description,
            targetMark: rubricForm.targetMark,
          });
      replaceRubric(updated);
      setCreatingFamily(false);
      showToast(creatingFamily ? 'Rubric family created.' : 'Rubric version updated.');
    } catch (saveError) {
      const feedback = readFormFeedback(saveError, marksMutationErrorMessage(saveError), RUBRIC_FIELD_MAP);
      setRubricFeedback(feedback);
      focusFeedback(feedback, Object.fromEntries(Object.entries(RUBRIC_FIELDS).map(([key, field]) => [key, field.id])), 'rubric-save-feedback');
    } finally {
      setSaving(false);
    }
  };

  const cloneSelected = async () => {
    if (!selected||saving||savedReadBlocked) return;
    setSaving(true);
    setCloneError(null);
    try {
      const cloned = await cloneRubricVersion(selected.id);
      setRubrics((current) => [
        cloned,
        ...current.map((rubric) => (
          rubric.familyCode === cloned.familyCode
            ? { ...rubric, isActive: rubric.id === cloned.id }
            : rubric
        )),
      ]);
      replaceRubric(cloned);
      showToast(`Rubric version ${cloned.version} created.`);
    } catch (cloneError) {
      setCloneError(marksMutationErrorMessage(cloneError));
    } finally {
      setSaving(false);
    }
  };

  const editComponent = (component: RubricComponent) => {
    setComponentFeedback(null);
    setComponentForm({
      id: Number(component.id),
      code: component.code || '',
      name: component.name,
      description: component.description,
      maxMarks: String(component.maxMarks),
      required: component.required,
      isActive: component.isActive ?? component.status === 'ACTIVE',
      displayOrder: String(component.displayOrder ?? 0),
    });
  };

  const saveComponent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected||saving||savedReadBlocked) return;
    setSaving(true);
    setComponentFeedback(null);
    const payload = {
      code: componentForm.code,
      name: componentForm.name,
      description: componentForm.description,
      maxMarks: componentForm.maxMarks,
      required: componentForm.required,
      isActive: componentForm.isActive,
      displayOrder: Number(componentForm.displayOrder),
    };
    let committed=false;
    try {
      if (componentForm.id) {
        await updateRubricComponent(selected.id, componentForm.id, payload);
      } else {
        await createRubricComponent(selected.id, payload);
      }
      committed=true;
      const refreshed = await getRubricVersion(selected.id);
      replaceRubric(refreshed);
      setComponentForm({
        ...EMPTY_COMPONENT,
        displayOrder: String(refreshed.components.length + 1),
      });
      showToast(componentForm.id ? 'Rubric component updated.' : 'Rubric component added.');
    } catch (componentError) {
      if(committed){setSavedReadBlocked(true);return;}
      const feedback = readFormFeedback(componentError, marksMutationErrorMessage(componentError), COMPONENT_FIELD_MAP);
      setComponentFeedback(feedback);
      focusFeedback(feedback, Object.fromEntries(Object.entries(COMPONENT_FIELDS).map(([key, field]) => [key, field.id])), 'component-save-feedback');
    } finally {
      setSaving(false);
    }
  };

  const deactivateComponent = async (component: RubricComponent) => {
    if (!selected||saving||savedReadBlocked) return;
    setSaving(true);
    setComponentActionError(null);
    let committed=false;
    try {
      await updateRubricComponent(
        selected.id,
        Number(component.id),
        { isActive: false },
      );
      committed=true;
      const refreshed = await getRubricVersion(selected.id);
      replaceRubric(refreshed);
      showToast('Rubric component deactivated.');
    } catch (componentError) {
      if(committed)setSavedReadBlocked(true);else setComponentActionError(marksMutationErrorMessage(componentError));
    } finally {
      setSaving(false);
    }
  };

  const familyGroups = useMemo(() => {
    const groups = new Map<string, RubricVersion[]>();
    for (const rubric of rubrics) {
      groups.set(rubric.familyCode, [
        ...(groups.get(rubric.familyCode) || []),
        rubric,
      ]);
    }
    return [...groups.entries()];
  }, [rubrics]);

  return (
    <div id="rubric-version-management" className="marks-workspace space-y-7 animate-fade-in">
      <PortalToast message={toast} tone="success" />
      <PageHeader
        title="Rubric Version Management"
        subtitle="Manage marking criteria and assessment versions."
        backLabel="Back to Marks overview"
        onBack={onBack}
        actions={familyGroups.length > 0 || loading || loadError ? (
          <PortalButton icon={Plus} variant="primary" disabled={saving||savedReadBlocked} onClick={beginFamily}>
            New rubric family
          </PortalButton>
        ) : undefined}
      />

      {loadError ? <ErrorState compact title="Rubric versions could not be loaded" message={loadError} onRetry={loadRubrics} /> : null}
      {savedReadBlocked?<AlertMessage type="warning" title="Component saved; refresh required" message="The change was saved, but the latest rubric could not be loaded. Reload it before another change." actions={selected?<PortalButton disabled={saving} onClick={()=>void selectRubric(selected)}>Reload rubric</PortalButton>:undefined}/>:null}

      {loading ? (
        <LoadingState message="Loading rubric versions..." />
      ) : loadError?null:familyGroups.length === 0 && !creatingFamily ? (
        <PortalCard data-rubric-empty padding="lg">
          <EmptyState
            icon={Layers3}
            title="No rubric families yet"
            description="Create your first rubric family, then add its assessment components and marks."
            actionLabel="Create rubric family"
            onAction={beginFamily}
          />
        </PortalCard>
      ) : (
        <fieldset disabled={savedReadBlocked||saving} className={`feedback-fields min-w-0 grid grid-cols-1 ${familyGroups.length > 0 ? 'xl:grid-cols-[320px_minmax(0,1fr)]' : ''} gap-6 items-start`}>
          {familyGroups.length > 0 ? <section className="space-y-4" aria-label="Rubric version families">
            {selectionError ? <ErrorState compact title="Rubric version could not be loaded" message={selectionError.message} onRetry={() => selectRubric(selectionError.rubric)} /> : null}
            {familyGroups.map(([familyCode, versions]) => (
              <div key={familyCode} className="border border-slate-200 bg-white p-4 rounded-lg">
                <p className="card-label">
                  {familyCode}
                </p>
                <div className="mt-3 space-y-2">
                  {[...versions]
                    .sort((left, right) => right.version - left.version)
                    .map((rubric) => (
                      <button
                        key={rubric.id}
                        type="button"
                        onClick={() => void selectRubric(rubric)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          selected?.id === rubric.id
                            ? 'border-brand-navy bg-slate-50'
                            : 'border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-brand-navy">
                            Version {rubric.version}
                          </span>
                          <StatusBadge tone={rubric.isReady ? 'success' : 'warning'}>
                            {rubric.isReady ? 'Ready' : 'Needs work'}
                          </StatusBadge>
                        </div>
                        <p className="card-description mt-2 truncate">
                          {rubric.name}
                        </p>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </section> : null}

          <div className="space-y-6">
            <PortalCard padding="lg" className="rounded-lg">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <MarksHeading icon={Layers3}>{creatingFamily ? 'Create rubric family' : selected?.name || 'Select a rubric'}</MarksHeading>
                  {selected ? (
                    <p className="card-description mt-1">
                      {selected.familyCode} · version {selected.version}
                    </p>
                  ) : null}
                </div>
                {selected ? (
                  <div className="flex gap-2">
                    <StatusBadge tone={selected.isLocked ? 'neutral' : 'info'}>
                      {selected.isLocked ? 'Locked' : 'Editable'}
                    </StatusBadge>
                    <StatusBadge tone={selected.isReady ? 'success' : 'warning'}>
                      {selected.isReady ? 'Ready' : 'Unbalanced'}
                    </StatusBadge>
                  </div>
                ) : null}
              </div>

              {selected?.isLocked ? <p className="card-description mt-3">This version is in use. Clone a new version to change its criteria.</p> : null}
              {(creatingFamily || selected) ? (
                <form onSubmit={saveRubric} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="form-label">
                    Family code
                    <input
                      required
                      disabled={!creatingFamily}
                      id={RUBRIC_FIELDS.familyCode.id}
                      aria-invalid={rubricFeedback?.fields.familyCode ? true : undefined}
                      aria-describedby={rubricFeedback?.fields.familyCode ? `${RUBRIC_FIELDS.familyCode.id}-error` : undefined}
                      value={rubricForm.familyCode}
                      onChange={(event) => {setRubricFeedback(current => clearFeedbackFields(current, ['familyCode'])); setRubricForm((current) => ({ ...current, familyCode: event.target.value }));}}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                    />
                      <FieldError id={`${RUBRIC_FIELDS.familyCode.id}-error`} message={rubricFeedback?.fields.familyCode}/>
                  </label>
                  <label className="form-label">
                    Target mark
                    <input
                      required
                      type="number"
                      min="1"
                      step="0.01"
                      disabled={Boolean(selected?.isLocked)}
                      id={RUBRIC_FIELDS.targetMark.id}
                      aria-invalid={rubricFeedback?.fields.targetMark ? true : undefined}
                      aria-describedby={rubricFeedback?.fields.targetMark ? `${RUBRIC_FIELDS.targetMark.id}-error` : undefined}
                      value={rubricForm.targetMark}
                      onChange={(event) => {setRubricFeedback(current => clearFeedbackFields(current, ['targetMark'])); setRubricForm((current) => ({ ...current, targetMark: event.target.value }));}}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                    />
                      <FieldError id={`${RUBRIC_FIELDS.targetMark.id}-error`} message={rubricFeedback?.fields.targetMark}/>
                  </label>
                  <label className="form-label md:col-span-2">
                    Name
                    <input
                      required
                      disabled={Boolean(selected?.isLocked)}
                      id={RUBRIC_FIELDS.name.id}
                      aria-invalid={rubricFeedback?.fields.name ? true : undefined}
                      aria-describedby={rubricFeedback?.fields.name ? `${RUBRIC_FIELDS.name.id}-error` : undefined}
                      value={rubricForm.name}
                      onChange={(event) => {setRubricFeedback(current => clearFeedbackFields(current, ['name'])); setRubricForm((current) => ({ ...current, name: event.target.value }));}}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                    />
                      <FieldError id={`${RUBRIC_FIELDS.name.id}-error`} message={rubricFeedback?.fields.name}/>
                  </label>
                  <label className="form-label md:col-span-2">
                    Description
                    <textarea
                      rows={3}
                      disabled={Boolean(selected?.isLocked)}
                      id={RUBRIC_FIELDS.description.id}
                      aria-invalid={rubricFeedback?.fields.description ? true : undefined}
                      aria-describedby={rubricFeedback?.fields.description ? `${RUBRIC_FIELDS.description.id}-error` : undefined}
                      value={rubricForm.description}
                      onChange={(event) => {setRubricFeedback(current => clearFeedbackFields(current, ['description'])); setRubricForm((current) => ({ ...current, description: event.target.value }));}}
                      className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                    />
                      <FieldError id={`${RUBRIC_FIELDS.description.id}-error`} message={rubricFeedback?.fields.description}/>
                  </label>
                  <div className="md:col-span-2"><FormFeedback id="rubric-save-feedback" title="Rubric wasn’t saved" feedback={rubricFeedback} fields={RUBRIC_FIELDS}/></div>
                  {cloneError ? <div className="md:col-span-2"><AlertMessage type="error" title="New version wasn’t created" message={cloneError}/></div> : null}
                  <div className="md:col-span-2 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                    {(creatingFamily || !selected?.isLocked) ? (
                      <PortalButton type="submit" icon={Save} variant="primary" isLoading={saving}>
                        {creatingFamily ? 'Create family' : 'Save version'}
                      </PortalButton>
                    ) : null}
                    {selected?.isLocked ? (
                      <PortalButton icon={Copy} variant="soft" isLoading={saving} onClick={() => void cloneSelected()}>
                        Clone new version
                      </PortalButton>
                    ) : null}
                  </div>
                </form>
              ) : null}
            </PortalCard>

            {selected ? (
              <PortalCard padding="none" className="overflow-hidden rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <MarksHeading icon={Edit3}>Assessment components</MarksHeading>
                    <p className="card-description mt-1">
                      {selected.componentTotal} of {selected.targetMark} marks configured
                    </p>
                  </div>
                  {selected.isReady ? (
                    <StatusBadge tone="success" icon={CheckCircle2}>Balanced</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning" icon={XCircle}>Target mismatch</StatusBadge>
                  )}
                </div>
                {componentActionError ? <div className="px-5 pt-4"><AlertMessage type="error" title="Component wasn’t deactivated" message={componentActionError}/></div> : null}
                <div role="region" aria-label="Assessment components" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600">
                  <table className="data-table min-w-[700px]">
                    <caption className="sr-only">Assessment components and maximum marks for this rubric version</caption>
                    <thead>
                      <tr className="data-thead">
                        <th scope="col" className="data-th">Order</th>
                        <th scope="col" className="data-th">Component</th>
                        <th scope="col" className="data-th">Maximum</th>
                        <th scope="col" className="data-th">Required</th>
                        <th scope="col" className="data-th">Status</th>
                        <th scope="col" className="data-th text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.components.map((component) => (
                        <tr key={component.id}>
                          <td className="data-td">{component.displayOrder}</td>
                          <td className="data-td">
                            <span className="card-value block">{component.name}</span>
                            <span className="text-xs font-mono text-slate-400">{component.code}</span>
                          </td>
                          <td className="data-td-strong">{component.maxMarks}</td>
                          <td className="data-td">{component.required ? 'Yes' : 'No'}</td>
                          <td className="data-td">
                            <StatusBadge tone={(component.isActive ?? component.status === 'ACTIVE') ? 'success' : 'neutral'}>
                              {(component.isActive ?? component.status === 'ACTIVE') ? 'Active' : 'Inactive'}
                            </StatusBadge>
                          </td>
                          <td className="data-td">
                            <div className="flex justify-end gap-2">
                              <PortalButton
                                size="icon"
                                variant="ghost"
                                icon={Edit3}
                                title="Edit component"
                                disabled={selected.isLocked}
                                onClick={() => editComponent(component)}
                              />
                              {(component.isActive ?? component.status === 'ACTIVE') ? (
                                <PortalButton
                                  size="icon"
                                  variant="danger"
                                  icon={XCircle}
                                  title="Deactivate component"
                                  disabled={selected.isLocked}
                                  onClick={() => void deactivateComponent(component)}
                                />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!selected.isLocked ? (
                  <form onSubmit={saveComponent} className="border-t border-slate-100 bg-slate-50 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-slate-500" />
                      <h3 className="section-label">
                        {componentForm.id ? 'Edit component' : 'Add component'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div><label htmlFor={COMPONENT_FIELDS.code.id} className="form-label mb-2 block">Code</label><input
                        required
                        placeholder="Code"
                        id={COMPONENT_FIELDS.code.id}
                      aria-invalid={componentFeedback?.fields.code ? true : undefined}
                      aria-describedby={componentFeedback?.fields.code ? `${COMPONENT_FIELDS.code.id}-error` : undefined}
                      value={componentForm.code}
                        onChange={(event) => {setComponentFeedback(current => clearFeedbackFields(current, ['code'])); setComponentForm((current) => ({ ...current, code: event.target.value }));}}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                      />
                      <FieldError id={`${COMPONENT_FIELDS.code.id}-error`} message={componentFeedback?.fields.code}/></div>
                      <div><label htmlFor={COMPONENT_FIELDS.name.id} className="form-label mb-2 block">Component name</label><input
                        required
                        placeholder="Component name"
                        id={COMPONENT_FIELDS.name.id}
                      aria-invalid={componentFeedback?.fields.name ? true : undefined}
                      aria-describedby={componentFeedback?.fields.name ? `${COMPONENT_FIELDS.name.id}-error` : undefined}
                      value={componentForm.name}
                        onChange={(event) => {setComponentFeedback(current => clearFeedbackFields(current, ['name'])); setComponentForm((current) => ({ ...current, name: event.target.value }));}}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                      />
                      <FieldError id={`${COMPONENT_FIELDS.name.id}-error`} message={componentFeedback?.fields.name}/></div>
                      <div><label htmlFor={COMPONENT_FIELDS.maxMarks.id} className="form-label mb-2 block">Maximum mark</label><input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Maximum mark"
                        id={COMPONENT_FIELDS.maxMarks.id}
                      aria-invalid={componentFeedback?.fields.maxMarks ? true : undefined}
                      aria-describedby={componentFeedback?.fields.maxMarks ? `${COMPONENT_FIELDS.maxMarks.id}-error` : undefined}
                      value={componentForm.maxMarks}
                        onChange={(event) => {setComponentFeedback(current => clearFeedbackFields(current, ['maxMarks'])); setComponentForm((current) => ({ ...current, maxMarks: event.target.value }));}}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                      />
                      <FieldError id={`${COMPONENT_FIELDS.maxMarks.id}-error`} message={componentFeedback?.fields.maxMarks}/></div>
                      <div><label htmlFor={COMPONENT_FIELDS.displayOrder.id} className="form-label mb-2 block">Display order</label><input
                        required
                        type="number"
                        min="0"
                        placeholder="Display order"
                        id={COMPONENT_FIELDS.displayOrder.id}
                      aria-invalid={componentFeedback?.fields.displayOrder ? true : undefined}
                      aria-describedby={componentFeedback?.fields.displayOrder ? `${COMPONENT_FIELDS.displayOrder.id}-error` : undefined}
                      value={componentForm.displayOrder}
                        onChange={(event) => {setComponentFeedback(current => clearFeedbackFields(current, ['displayOrder'])); setComponentForm((current) => ({ ...current, displayOrder: event.target.value }));}}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                      />
                      <FieldError id={`${COMPONENT_FIELDS.displayOrder.id}-error`} message={componentFeedback?.fields.displayOrder}/></div>
                      <div className="md:col-span-2 xl:col-span-3"><label htmlFor={COMPONENT_FIELDS.description.id} className="form-label mb-2 block">Description</label><textarea
                        rows={2}
                        placeholder="Description"
                        id={COMPONENT_FIELDS.description.id}
                      aria-invalid={componentFeedback?.fields.description ? true : undefined}
                      aria-describedby={componentFeedback?.fields.description ? `${COMPONENT_FIELDS.description.id}-error` : undefined}
                      value={componentForm.description}
                        onChange={(event) => {setComponentFeedback(current => clearFeedbackFields(current, ['description'])); setComponentForm((current) => ({ ...current, description: event.target.value }));}}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-sans not-italic normal-case tracking-normal text-xs font-bold"
                      />
                      <FieldError id={`${COMPONENT_FIELDS.description.id}-error`} message={componentFeedback?.fields.description}/></div>
                      <label className="card-description flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={componentForm.required}
                          onChange={(event) => setComponentForm((current) => ({ ...current, required: event.target.checked }))}
                          className="h-4 w-4 accent-brand-navy"
                        />
                        Required
                      </label>
                    </div>
                    <div className="mt-4"><FormFeedback id="component-save-feedback" title="Component wasn’t saved" feedback={componentFeedback} fields={COMPONENT_FIELDS}/></div>
                    <div className="mt-4 flex gap-2">
                      <PortalButton type="submit" icon={Save} variant="primary" isLoading={saving}>
                        {componentForm.id ? 'Save component' : 'Add component'}
                      </PortalButton>
                      {componentForm.id ? (
                        <PortalButton variant="ghost" onClick={() => {setComponentForm(EMPTY_COMPONENT); setComponentFeedback(null);}}>
                          Cancel
                        </PortalButton>
                      ) : null}
                    </div>
                  </form>
                ) : null}
              </PortalCard>
            ) : null}
          </div>
        </fieldset>
      )}
    </div>
  );
};
