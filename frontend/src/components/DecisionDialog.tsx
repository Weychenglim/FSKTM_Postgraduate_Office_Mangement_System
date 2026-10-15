import React, {useEffect, useRef, useState} from 'react';
import {PortalModal, useModalTitle} from './PortalModal';
import {PortalButton, PortalToast} from './PortalPrimitives';
import {useRecordDraft} from './RecordDraft';
import {useDecisionFeedback} from './DecisionFeedback';
import {createDecisionSubmission, decisionFailure, type DecisionOutcome} from '../utils/decisionSubmission';

export interface DecisionDialogProps {
  isOpen: boolean;
  decisionKey?: string | number;
  title: string;
  context?: React.ReactNode;
  message: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  kind?: 'review' | 'confirmation';
  tone?: 'info' | 'warning' | 'danger';
  canConfirm?: boolean;
  busy?: boolean;
  dirty?: boolean;
  successMessage: string;
  onClose: () => void;
  onConfirm: () => Promise<void | false | DecisionOutcome> | void;
  onReload?: () => Promise<unknown>;
}

/** Keep this host mounted after closure so the single outcome toast stays visible. */
export function DecisionDialog({isOpen, decisionKey, title, context, message, children, confirmLabel,
  cancelLabel='Back', kind='review', tone='info', canConfirm=true, busy=false, dirty=false,
  successMessage, onClose, onConfirm, onReload}: DecisionDialogProps) {
  const titleId = useModalTitle();
  const feedback = useDecisionFeedback();
  const submission = useRef(createDecisionSubmission()).current;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [notice, setNotice] = useState<{message: string; tone: 'success' | 'warning'} | null>(null);
  const mounted = useRef(true);
  const lastIdentity = useRef(decisionKey ?? title);
  const identity = isOpen ? decisionKey ?? title : lastIdentity.current;
  lastIdentity.current = identity;
  const scope = `${isOpen}:${identity}`;
  const latestScope = useRef(scope); latestScope.current = scope;
  const pending = busy || saving;
  useRecordDraft(isOpen && dirty, isOpen && pending);
  useEffect(() => { mounted.current=true; return () => { mounted.current=false; }; }, []);
  useEffect(() => {
    setError(''); setBlocked(false); setDiscard(false); submission.clearBlock();
  }, [identity, submission]);
  useEffect(() => {setDiscard(false); if(isOpen)setNotice(null);}, [isOpen]);

  const requestClose = () => {
    if (pending || submission.isBusy()) return;
    if (dirty) setDiscard(true); else onClose();
  };
  const confirm = async () => {
    if (!isOpen || pending || submission.isBusy() || submission.isBlocked() || blocked || discard || !canConfirm) return;
    const operationScope = scope;
    setSaving(true); setError('');
    try {
      const result = await submission.run(async () => onConfirm());
      if (!result.started || result.value === false) return;
      const refreshFailed = result.value && result.value.refreshFailed;
      const savedMessage = (result.value && result.value.successMessage) || successMessage;
      const outcome = {tone: refreshFailed ? 'warning' as const : 'success' as const, message: refreshFailed
        ? `${savedMessage} The latest record could not be loaded. Reload it before another action.` : savedMessage};
      if (feedback) feedback(outcome.message, outcome.tone);
      else if (mounted.current && latestScope.current === operationScope) setNotice(outcome);
      if (mounted.current && latestScope.current === operationScope) onClose();
    } catch (failure) {
      if (mounted.current && latestScope.current === operationScope) {
        const outcome = decisionFailure(failure);
        setError(outcome.message); setBlocked(outcome.blocked);
      }
    } finally { if (mounted.current) setSaving(false); }
  };
  const reload = async () => {
    if (!onReload || pending || submission.isBusy()) return;
    setSaving(true);
    try { await onReload(); if (mounted.current) {submission.clearBlock(); setBlocked(false); setError(''); onClose();} }
    catch (failure) { if (mounted.current) setError(decisionFailure(failure).message); }
    finally { if (mounted.current) setSaving(false); }
  };

  return <>
    <PortalToast message={notice?.message ?? null} tone={notice?.tone} onClose={() => setNotice(null)}/>
    <PortalModal isOpen={isOpen} onClose={requestClose} busy={pending} labelledBy={titleId} className="max-w-lg p-6 md:p-8">
      <form onSubmit={event => {event.preventDefault(); void confirm();}} className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">{kind==='review' ? 'Review decision' : 'Confirm your action'}</p>
          <h2 id={titleId} className="text-lg font-semibold leading-snug text-brand-navy">{title}</h2>
          {context ? <div className="text-sm font-semibold leading-relaxed text-brand-navy break-words">{context}</div> : null}
        </div>
        <div className="text-xs font-normal leading-relaxed text-slate-700">{message}</div>
        {children ? <fieldset disabled={pending || blocked} className="space-y-4">{children}</fieldset> : null}
        {error ? <div role="alert" className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs leading-relaxed text-rose-800">
          <p>{error}</p>{blocked ? <p>Review the latest record and your access before making another decision.</p> : null}
        </div> : null}
        {discard ? <div role="alert" className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-normal leading-relaxed text-amber-900">Discard the information entered in this dialog?</p>
          <div className="flex flex-wrap justify-end gap-3"><PortalButton type="button" autoFocus onClick={() => setDiscard(false)}>Keep editing</PortalButton><PortalButton type="button" variant="danger" onClick={onClose}>Discard changes</PortalButton></div>
        </div> : <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <PortalButton type="button" disabled={pending} onClick={requestClose}>{cancelLabel}</PortalButton>
          {blocked ? onReload ? <PortalButton type="button" isLoading={saving} disabled={busy} onClick={() => void reload()}>Review latest record</PortalButton> : null
            : <PortalButton type="submit" variant={tone==='danger' ? 'dangerSolid' : 'primary'} isLoading={pending} disabled={!canConfirm || pending}>{confirmLabel}</PortalButton>}
        </div>}
      </form>
    </PortalModal>
  </>;
}
