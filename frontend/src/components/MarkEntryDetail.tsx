/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Save } from 'lucide-react';

import { RecordPage } from './RecordPage';
import type { EvaluationTask } from '../types';
import {
  PortalButton,
  PortalConfirmModal,
  PortalCard,
  StatusBadge,
} from './PortalPrimitives';

interface MarkEntryDetailProps {
  task: EvaluationTask;
  backLabel?: string;
  onBack: () => void;
  onSave: (updatedTask: EvaluationTask) => void | Promise<void>;
  onSubmit: (updatedTask: EvaluationTask) => void | Promise<void>;
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
  backLabel = 'Back to Marks Entry',
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
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const initial = useRef(JSON.stringify({ values, comments }));
  const dirty = JSON.stringify({ values, comments }) !== initial.current;
  const save = async (submit: boolean) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try { await (submit ? onSubmit(buildTask('SUBMITTED')) : onSave(buildTask('DRAFT SAVED'))); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const isReadOnly = task.status === 'SUBMITTED' || task.canEdit !== true;

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
    if (!isReadOnly && task.canSubmit === true && errors.length === 0) setConfirmOpen(true);
  };

  return (
      <RecordPage
        title="Mark Entry Detail"
        subtitle="Enter marks using the persisted rubric version assigned to this evaluation task."
        backLabel={backLabel}
        onBack={onBack}
        pageKey={`marks-entry:${task.id}`} dirty={!isReadOnly && dirty} busy={saving}
        actions={(
          <StatusBadge tone={task.status === 'SUBMITTED' ? 'success' : isReadOnly ? 'neutral' : 'info'}>
            {task.status === 'SUBMITTED' ? 'Submitted' : isReadOnly ? 'Read only' : evaluatorRoleLabel(task)}
          </StatusBadge>
        )}
      >


    <fieldset id="mark-entry-detail-page" disabled={saving} className="space-y-6 text-left">
      <PortalConfirmModal
        isOpen={confirmOpen}
        title="Submit and lock marks?"
        message={`You are about to finalize marks for ${task.studentName}. Submitted marks become locked immediately and can only be reopened by authorized office staff during the open period.`}
        confirmLabel="Submit marks"
        cancelLabel="Review again"
        tone="warning"
        onConfirm={() => {
          setConfirmOpen(false);
          if (!isReadOnly && task.canSubmit === true) void save(true);
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {task.periodEffectiveStatus ? <p className="card-description text-slate-600">Period: {task.periodEffectiveStatus}</p> : null}
      {task.completionWindow ? <p className="card-description text-sky-800">Completion window · {task.completionWindow.status} · Due {new Date(task.effectiveDueAt || task.completionWindow.deadline).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} (Malaysia)</p> : null}
      {isReadOnly && task.status !== 'SUBMITTED' ? <p className="card-description text-slate-600">This task is currently read only.</p> : null}
      {components.length === 0 ? (
        <PortalCard padding="lg" className="rounded-lg">
          <div className="card-description flex items-start gap-3 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>No rubric components are available for this task. Contact the postgraduate office.</p>
          </div>
        </PortalCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
          <PortalCard padding="none" className="overflow-hidden rounded-lg">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
              <h2 className="section-label">{task.studentName}</h2>
              <p className="card-description mt-1">
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
                        <h3 className="section-label">{component.name}</h3>
                        <p className="card-description mt-1">
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
                    <span className="form-label">
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
                      className="form-control text-right text-brand-navy"
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 p-6">
              <label className="form-label">
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
              <p className="card-label text-indigo-300">Calculated total</p>
              <p className="mt-2 text-4xl font-black">
                {total.toFixed(2)}
                <span className="text-sm text-slate-400"> / {maximum.toFixed(2)}</span>
              </p>
              <p className="card-description mt-4 text-slate-300">
                The backend recalculates the authoritative total when this draft is saved.
              </p>
            </PortalCard>

            {showValidation && errors.length > 0 ? (
              <PortalCard padding="md" className="rounded-lg border-amber-200 bg-amber-50">
                <div className="flex items-start gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="card-value text-amber-800">Complete the required marks</p>
                    <ul className="card-description mt-2 space-y-1 text-amber-800">
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
                  onClick={() => void save(false)}
                >
                  Save draft
                </PortalButton>
                <PortalButton
                  fullWidth
                  icon={CheckCircle2}
                  variant="primary"
                  disabled={task.canSubmit !== true}
                  onClick={requestSubmission}
                >
                  Submit marks
                </PortalButton>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </fieldset>
    </RecordPage>
  );
};
