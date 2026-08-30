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
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadRubrics = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError(marksMutationErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    void loadRubrics();
  }, []);

  const selectRubric = async (rubric: RubricVersion) => {
    setError(null);
    try {
      const detail = await getRubricVersion(rubric.id);
      setSelected(detail);
      setRubricForm({
        familyCode: detail.familyCode,
        name: detail.name,
        description: detail.description,
        targetMark: detail.targetMark,
      });
      setComponentForm(EMPTY_COMPONENT);
      setCreatingFamily(false);
    } catch (loadError) {
      setError(marksMutationErrorMessage(loadError));
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
    setError(null);
  };

  const saveRubric = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
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
      setError(marksMutationErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const cloneSelected = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
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
      setError(marksMutationErrorMessage(cloneError));
    } finally {
      setSaving(false);
    }
  };

  const editComponent = (component: RubricComponent) => {
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
    if (!selected) return;
    setSaving(true);
    setError(null);
    const payload = {
      code: componentForm.code,
      name: componentForm.name,
      description: componentForm.description,
      maxMarks: componentForm.maxMarks,
      required: componentForm.required,
      isActive: componentForm.isActive,
      displayOrder: Number(componentForm.displayOrder),
    };
    try {
      if (componentForm.id) {
        await updateRubricComponent(selected.id, componentForm.id, payload);
      } else {
        await createRubricComponent(selected.id, payload);
      }
      const refreshed = await getRubricVersion(selected.id);
      replaceRubric(refreshed);
      setComponentForm({
        ...EMPTY_COMPONENT,
        displayOrder: String(refreshed.components.length + 1),
      });
      showToast(componentForm.id ? 'Rubric component updated.' : 'Rubric component added.');
    } catch (componentError) {
      setError(marksMutationErrorMessage(componentError));
    } finally {
      setSaving(false);
    }
  };

  const deactivateComponent = async (component: RubricComponent) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await updateRubricComponent(
        selected.id,
        Number(component.id),
        { isActive: false },
      );
      const refreshed = await getRubricVersion(selected.id);
      replaceRubric(refreshed);
      showToast('Rubric component deactivated.');
    } catch (componentError) {
      setError(marksMutationErrorMessage(componentError));
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
    <div id="rubric-version-management" className="space-y-7 animate-fade-in">
      <PortalToast message={toast} />
      <PageHeader
        title="Rubric Version Management"
        subtitle="Maintain faculty-wide marking criteria without changing the meaning of historical submissions."
        backLabel="Back to Marks & Evaluation Management"
        onBack={onBack}
        actions={(
          <PortalButton icon={Plus} variant="primary" onClick={beginFamily}>
            New rubric family
          </PortalButton>
        )}
      />

      {error ? <ErrorState message={error} onRetry={loadRubrics} /> : null}

      {loading ? (
        <LoadingState message="Loading rubric versions..." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
          <section className="space-y-4" aria-label="Rubric version families">
            {familyGroups.length === 0 ? (
              <EmptyState
                title="No rubric versions"
                description="Create a rubric family, then add its assessment components."
              />
            ) : familyGroups.map(([familyCode, versions]) => (
              <div key={familyCode} className="border border-slate-200 bg-white p-4 rounded-lg">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">
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
                        <p className="mt-2 truncate text-xs font-semibold text-slate-600">
                          {rubric.name}
                        </p>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </section>

          <div className="space-y-6">
            <PortalCard padding="lg" className="rounded-lg">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-brand-navy">
                    {creatingFamily ? 'Create rubric family' : selected?.name || 'Select a rubric'}
                  </h2>
                  {selected ? (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
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

              {(creatingFamily || selected) ? (
                <form onSubmit={saveRubric} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-xs font-bold text-slate-700">
                    Family code
                    <input
                      required
                      disabled={!creatingFamily}
                      value={rubricForm.familyCode}
                      onChange={(event) => setRubricForm((current) => ({ ...current, familyCode: event.target.value }))}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Target mark
                    <input
                      required
                      type="number"
                      min="1"
                      step="0.01"
                      disabled={Boolean(selected?.isLocked)}
                      value={rubricForm.targetMark}
                      onChange={(event) => setRubricForm((current) => ({ ...current, targetMark: event.target.value }))}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700 md:col-span-2">
                    Name
                    <input
                      required
                      disabled={Boolean(selected?.isLocked)}
                      value={rubricForm.name}
                      onChange={(event) => setRubricForm((current) => ({ ...current, name: event.target.value }))}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700 md:col-span-2">
                    Description
                    <textarea
                      rows={3}
                      disabled={Boolean(selected?.isLocked)}
                      value={rubricForm.description}
                      onChange={(event) => setRubricForm((current) => ({ ...current, description: event.target.value }))}
                      className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                    />
                  </label>
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
                    <h2 className="text-sm font-extrabold text-brand-navy">Assessment components</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {selected.componentTotal} of {selected.targetMark} marks configured
                    </p>
                  </div>
                  {selected.isReady ? (
                    <StatusBadge tone="success" icon={CheckCircle2}>Balanced</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning" icon={XCircle}>Target mismatch</StatusBadge>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table min-w-[700px]">
                    <thead>
                      <tr className="data-thead">
                        <th className="data-th">Order</th>
                        <th className="data-th">Component</th>
                        <th className="data-th">Maximum</th>
                        <th className="data-th">Required</th>
                        <th className="data-th">Status</th>
                        <th className="data-th text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.components.map((component) => (
                        <tr key={component.id}>
                          <td className="data-td">{component.displayOrder}</td>
                          <td className="data-td">
                            <span className="block font-bold text-slate-800">{component.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{component.code}</span>
                          </td>
                          <td className="data-td font-bold">{component.maxMarks}</td>
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
                      <h3 className="text-xs font-extrabold uppercase text-slate-600">
                        {componentForm.id ? 'Edit component' : 'Add component'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <input
                        required
                        placeholder="Code"
                        value={componentForm.code}
                        onChange={(event) => setComponentForm((current) => ({ ...current, code: event.target.value }))}
                        className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs"
                      />
                      <input
                        required
                        placeholder="Component name"
                        value={componentForm.name}
                        onChange={(event) => setComponentForm((current) => ({ ...current, name: event.target.value }))}
                        className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs"
                      />
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Maximum mark"
                        value={componentForm.maxMarks}
                        onChange={(event) => setComponentForm((current) => ({ ...current, maxMarks: event.target.value }))}
                        className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs"
                      />
                      <input
                        required
                        type="number"
                        min="0"
                        placeholder="Display order"
                        value={componentForm.displayOrder}
                        onChange={(event) => setComponentForm((current) => ({ ...current, displayOrder: event.target.value }))}
                        className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs"
                      />
                      <textarea
                        rows={2}
                        placeholder="Description"
                        value={componentForm.description}
                        onChange={(event) => setComponentForm((current) => ({ ...current, description: event.target.value }))}
                        className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs md:col-span-2 xl:col-span-3"
                      />
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={componentForm.required}
                          onChange={(event) => setComponentForm((current) => ({ ...current, required: event.target.checked }))}
                          className="h-4 w-4 accent-brand-navy"
                        />
                        Required
                      </label>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <PortalButton type="submit" icon={Save} variant="primary" isLoading={saving}>
                        {componentForm.id ? 'Save component' : 'Add component'}
                      </PortalButton>
                      {componentForm.id ? (
                        <PortalButton variant="ghost" onClick={() => setComponentForm(EMPTY_COMPONENT)}>
                          Cancel
                        </PortalButton>
                      ) : null}
                    </div>
                  </form>
                ) : null}
              </PortalCard>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
