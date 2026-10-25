import { MarksHeading } from './MarksPrimitives';
import { DecisionDialog } from './DecisionDialog';
import type { DecisionOutcome } from '../utils/decisionSubmission';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Save, UserRound } from 'lucide-react';

import { RecordPage } from './RecordPage';
import {FormFeedback} from './FormFeedback';
import {focusFeedback, readFormFeedback, type FormFeedbackState} from '../utils/formFeedback';
import type { EvaluationTask } from '../types';
import {
  PortalButton,
  PortalCard,
  StatusBadge,
} from './PortalPrimitives';

interface MarkEntryDetailProps {
  task: EvaluationTask;
  backLabel?: string;
  onBack: () => void;
  onReload?: () => Promise<unknown>;
  onSave: (updatedTask: EvaluationTask) => void | Promise<void>;
  onSubmit: (updatedTask: EvaluationTask) => void | DecisionOutcome | Promise<void | DecisionOutcome>;
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
  onReload,
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
  const [submitted, setSubmitted] = useState(task.status === 'SUBMITTED');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<FormFeedbackState | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const savingRef = useRef(false);
  const initial = useRef(JSON.stringify({ values, comments }));
  const dirty = JSON.stringify({ values, comments }) !== initial.current;
  const save = async (submit: boolean) => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setSaveFeedback(null);
    try {
      const outcome = await (submit ? onSubmit(buildTask('SUBMITTED')) : onSave(buildTask('DRAFT SAVED')));
      if (submit) setSubmitted(true);
      else {
        initial.current = JSON.stringify({ values, comments });
        setDraftSaved(true);
      }
      return outcome;
    }
    catch (error) {
      // Confirmation failures remain in DecisionDialog; draft saves stay with the editor.
      if (submit) throw error;
      const feedback = readFormFeedback(error, error instanceof Error ? error.message : 'The mark draft could not be saved. Try again.');
      setSaveFeedback(feedback);
      focusFeedback(feedback, {}, 'mark-draft-save-feedback');
      return false;
    }
    finally { savingRef.current = false; setSaving(false); }
  };
  const isReadOnly = submitted || task.canEdit !== true;

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
        subtitle="Score the assigned rubric and save or submit your evaluation."
        backLabel={backLabel}
        onBack={onBack}
        pageKey={`marks-entry:${task.id}`} dirty={!isReadOnly && dirty} busy={saving}
        metadata={<p className="card-description">Marking as <strong className="font-semibold text-slate-800">{evaluatorRoleLabel(task)}</strong></p>}
        actions={(
          <StatusBadge tone={submitted ? 'success' : isReadOnly ? 'neutral' : 'info'}>
            {submitted ? 'Submitted' : isReadOnly ? 'Read only' : evaluatorRoleLabel(task)}
          </StatusBadge>
        )}
      >


    <fieldset id="mark-entry-detail-page" disabled={saving} className="marks-workspace space-y-6 text-left">
      <DecisionDialog isOpen={confirmOpen} decisionKey={task.id} kind="confirmation"
        title="Submit and lock marks?" context={<p>{task.studentName} · {task.studentId} · {evaluatorRoleLabel(task)}</p>}
        message="Submitted marks lock immediately. Authorized Office staff can reopen them only while the period is open."
        confirmLabel="Submit and lock marks" cancelLabel="Review again" tone="warning"
        canConfirm={!isReadOnly && task.canSubmit === true && errors.length === 0} busy={saving}
        successMessage="Marks submitted and locked." onReload={onReload} onConfirm={() => save(true)} onClose={() => setConfirmOpen(false)} />

      {task.periodEffectiveStatus ? <p className="card-description text-slate-600">Period: {task.periodEffectiveStatus}</p> : null}
      {task.completionWindow ? <p className="card-description text-sky-800">Completion window · {task.completionWindow.status} · Due {new Date(task.effectiveDueAt || task.completionWindow.deadline).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} (Malaysia)</p> : null}
      {isReadOnly && !submitted ? <p className="card-description text-slate-600">This task is currently read only.</p> : null}
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
              <MarksHeading icon={UserRound}>{task.studentName}</MarksHeading>
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
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="section-label">{component.name}</h3>
                        {component.description ? <p className="card-description mt-1">{component.description}</p> : null}
                      </div>
                    </div>
                    <label htmlFor={`marks-feedback-${task.id}-${component.id}`} className="form-label mt-4 block">Component feedback</label>
                    <textarea
                      id={`marks-feedback-${task.id}-${component.id}`}
                      aria-label={`Component feedback for ${component.name}`}
                      disabled={isReadOnly}
                      value={values[component.id]?.feedback || ''}
                      onChange={(event) => setValues((current) => ({
                        ...current,
                        [component.id]: {
                          ...current[component.id],
                          feedback: event.target.value,
                        },
                      }))}
                      className="form-control mt-2 min-h-[82px]"
                    />
                  </div>
                  <label className="space-y-2">
                    <span className="form-label">
                      Marks / {component.maxMarks}
                    </span>
                    <input
                      aria-label={`Marks / ${component.maxMarks} for ${component.name}`}
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
              <label htmlFor={`marks-comments-${task.id}`} className="form-label">
                Overall comments
              </label>
              <textarea
                id={`marks-comments-${task.id}`}
                disabled={isReadOnly}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                className="form-control mt-2 min-h-[96px]"
              />
            </div>
          </PortalCard>

          <aside className="space-y-5 xl:sticky xl:top-6">
            <PortalCard padding="lg" className="rounded-2xl">
              <p className="card-label">Calculated total</p>
              <p className="mt-2 card-metric">
                {total.toFixed(2)}
                <span className="text-sm text-slate-400"> / {maximum.toFixed(2)}</span>
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
                <FormFeedback id="mark-draft-save-feedback" title="Draft wasn’t saved" feedback={saveFeedback}/>
                {dirty || draftSaved ? <p role="status" className="card-description">{dirty ? 'Unsaved changes' : 'Draft saved'}</p> : null}
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
                  aria-describedby={task.canSubmit !== true ? `marks-submit-help-${task.id}` : undefined}
                  onClick={requestSubmission}
                >
                  Submit marks
                </PortalButton>
                {task.canSubmit !== true ? <p id={`marks-submit-help-${task.id}`} className="card-description">Submission is unavailable for this task. You can still save a draft.</p> : null}
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </fieldset>
    </RecordPage>
  );
};
