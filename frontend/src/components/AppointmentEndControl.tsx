import React, { useState } from 'react';
import { CircleStop, X } from 'lucide-react';

import type { AppointmentEndOutcome } from '../types';
import { PortalButton, PortalConfirmModal } from './PortalPrimitives';


type DirectOutcome = Exclude<AppointmentEndOutcome, 'REPLACED'>;

interface AppointmentEndControlProps {
  label: string;
  onSubmit: (outcome: DirectOutcome, reason: string) => Promise<void>;
}

export const AppointmentEndControl: React.FC<AppointmentEndControlProps> = ({
  label,
  onSubmit,
}) => {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<DirectOutcome>('COMPLETED');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setConfirming(false);
    setReason('');
    setError(null);
  };

  const requestConfirmation = () => {
    if (!reason.trim()) {
      setError('A lifecycle reason is required.');
      return;
    }
    setError(null);
    setConfirming(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(outcome, reason.trim());
      setOpen(false);
      setConfirming(false);
      setReason('');
      setError(null);
    } catch (failure) {
      setConfirming(false);
      setError(failure instanceof Error ? failure.message : 'The appointment could not be ended.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <PortalButton variant="danger" icon={CircleStop} onClick={() => setOpen(true)}>
        End Appointment
      </PortalButton>
    );
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-3 min-w-[280px]">
      <PortalConfirmModal
        isOpen={confirming}
        title={`End ${label}?`}
        message="This takes effect immediately, releases active workload, and retires unfinished official Marks tasks. The audit history remains available."
        confirmLabel="End Appointment"
        tone="danger"
        isLoading={submitting}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-rose-800">End {label}</p>
        <button type="button" aria-label="Close end appointment control" onClick={close}>
          <X className="w-4 h-4 text-rose-600" />
        </button>
      </div>
      <select
        value={outcome}
        onChange={(event) => setOutcome(event.target.value as DirectOutcome)}
        className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
      >
        <option value="COMPLETED">Completed</option>
        <option value="WITHDRAWN">Withdrawn</option>
        <option value="OTHER">Other</option>
      </select>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        placeholder="Record the faculty decision and context"
        className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
      />
      {error && <p className="text-[11px] font-bold text-rose-700">{error}</p>}
      <PortalButton variant="dangerSolid" size="sm" onClick={requestConfirmation}>
        Review Closure
      </PortalButton>
    </div>
  );
};
