/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Save } from 'lucide-react';

import type { EvaluationTask } from '../types';
import {
  PageHeader,
  PortalButton,
  PortalConfirmModal,
  PortalCard,
  StatusBadge,
} from './PortalPrimitives';

interface MarkEntryDetailProps {
  task: EvaluationTask;
  onBack: () => void;
  onSave: (updatedTask: EvaluationTask) => void;
  onSubmit: (updatedTask: EvaluationTask) => void;
}

const evaluatorRoleLabel = (task: EvaluationTask): string =>
  task.evaluatorRoleLabel || (
    task.evaluatorRole === 'SUPERVISOR'
      ? 'Supervisor'
      : task.evaluatorRole === 'BACKUP'
        ? 'Backup Evaluator'
        : 'Panel Member'
  );

export const MarkEntryDetail: React.FC<MarkEntryDetailProps> = ({
  task,
  onBack,
  onSave,
  onSubmit,
}) => {
  const components = task.components || [];
  const [values, setValues] = useState(() => Object.fromEntries(
    components.map((component) => [
      component.id,
      {
        mark: component.marksAwarded === null ? '' : component.marksAwarded,
        feedback: component.feedback,
      },
    ]),
  ));
  const [comments, setComments] = useState(task.comments || '');
  const [showValidation, setShowValidation] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isReadOnly = task.status === 'SUBMITTED';

  const errors = components.flatMap((component) => {
    const raw = values[component.id]?.mark;
    if (component.required && raw === '') {
      return [`${component.name} is required.`];
    }
    if (raw === '') return [];
    const mark = Number(raw);
    if (!Number.isFinite(mark) || mark < 0 || mark > Number(component.maxMarks)) {
      return [`${component.name} must be between 0 and ${component.maxMarks}.`];
    }
    return [];
  });
  const total = components.reduce(
    (sum, component) => sum + Number(values[component.id]?.mark || 0),
    0,
  );
  const maximum = components.reduce(
    (sum, component) => sum + Number(component.maxMarks),
    0,
  );

  const buildTask = (status: EvaluationTask['status']): EvaluationTask => ({
    ...task,
    status,
    comments,
    components: components.map((component) => ({
      ...component,
      marksAwarded: values[component.id]?.mark === ''
        ? null
        : String(values[component.id]?.mark ?? 0),
      feedback: values[component.id]?.feedback || '',
    })),
  });

  const requestSubmission = () => {
    setShowValidation(true);
    if (errors.length === 0) setConfirmOpen(true);
  };

  return (
    <div id="mark-entry-detail-page" className="space-y-6 text-left">
      <PortalConfirmModal
        isOpen={confirmOpen}
        title="Submit and lock marks?"
        message={`You are about to finalize marks for ${task.studentName}. Submitted marks become locked immediately and can only be reopened by authorized office staff during the open period.`}
        confirmLabel="Submit marks"
        cancelLabel="Review again"
        tone="warning"
        onConfirm={() => {
          setConfirmOpen(false);
          onSubmit(buildTask('SUBMITTED'));
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <PageHeader
        title="Mark Entry Detail"
        subtitle="Enter marks using the persisted rubric version assigned to this evaluation task."
        backLabel="Back to Marks Entry"
        onBack={onBack}
        actions={(
          <StatusBadge tone={isReadOnly ? 'success' : 'info'}>
            {isReadOnly ? 'Submitted' : evaluatorRoleLabel(task)}
          </StatusBadge>
        )}
      />

      {components.length === 0 ? (
        <PortalCard padding="lg" className="rounded-lg">
          <div className="flex items-start gap-3 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>No rubric components are available for this task. Contact the postgraduate office.</p>
          </div>
        </PortalCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
          <PortalCard padding="none" className="overflow-hidden rounded-lg">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
              <h2 className="text-base font-extrabold text-brand-navy">{task.studentName}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {task.studentId} · {task.researchTitle}
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {components.map((component, index) => (
                <div
                  key={component.id}
                  className="grid grid-cols-1 gap-5 p-6 md:grid-cols-[minmax(0,1fr)_150px]"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-[10px] font-black text-white">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-xs font-extrabold text-brand-navy">{component.name}</h3>
                        <p className="mt-1 text-[10px] font-semibold text-slate-500">
                          {component.description || 'Configured evaluation component'}
                        </p>
                      </div>
                    </div>
                    <textarea
                      disabled={isReadOnly}
                      value={values[component.id]?.feedback || ''}
                      onChange={(event) => setValues((current) => ({
                        ...current,
                        [component.id]: {
                          ...current[component.id],
                          feedback: event.target.value,
                        },
                      }))}
                      placeholder="Evaluator feedback"
                      className="form-control mt-4 min-h-[82px]"
                    />
                  </div>
                  <label className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-400">
                      Marks / {component.maxMarks}
                    </span>
                    <input
                      disabled={isReadOnly}
                      type="number"
                      min="0"
                      max={component.maxMarks}
                      step="0.01"
                      value={values[component.id]?.mark ?? ''}
                      onChange={(event) => setValues((current) => ({
                        ...current,
                        [component.id]: {
                          ...current[component.id],
                          mark: event.target.value,
                        },
                      }))}
                      className="form-control text-right font-black text-brand-navy"
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 p-6">
              <label className="text-[9px] font-black uppercase text-slate-400">
                Overall comments
              </label>
              <textarea
                disabled={isReadOnly}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                className="form-control mt-2 min-h-[96px]"
              />
            </div>
          </PortalCard>

          <aside className="space-y-5 xl:sticky xl:top-6">
            <PortalCard padding="lg" className="rounded-lg bg-brand-navy text-white">
              <p className="text-[9px] font-black uppercase text-indigo-300">Calculated total</p>
              <p className="mt-2 text-4xl font-black">
                {total.toFixed(2)}
                <span className="text-sm text-slate-400"> / {maximum.toFixed(2)}</span>
              </p>
              <p className="mt-4 text-xs font-semibold text-slate-300">
                The backend recalculates the authoritative total when this draft is saved.
              </p>
            </PortalCard>

            {showValidation && errors.length > 0 ? (
              <PortalCard padding="md" className="rounded-lg border-amber-200 bg-amber-50">
                <div className="flex items-start gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold">Complete the required marks</p>
                    <ul className="mt-2 space-y-1 text-[11px] font-semibold">
                      {errors.map((error) => <li key={error}>{error}</li>)}
                    </ul>
                  </div>
                </div>
              </PortalCard>
            ) : null}

            {!isReadOnly ? (
              <div className="space-y-2">
                <PortalButton
                  fullWidth
                  icon={Save}
                  variant="secondary"
                  onClick={() => onSave(buildTask('DRAFT SAVED'))}
                >
                  Save draft
                </PortalButton>
                <PortalButton
                  fullWidth
                  icon={CheckCircle2}
                  variant="primary"
                  onClick={requestSubmission}
                >
                  Submit marks
                </PortalButton>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
};
