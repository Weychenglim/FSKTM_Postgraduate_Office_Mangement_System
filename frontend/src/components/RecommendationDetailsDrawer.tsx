/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelRecommendationStatus, SubmittedRecommendation } from '../types';
import { PortalConfirmModal } from './PortalPrimitives';
import { WorkflowAuditLog } from './WorkflowAuditLog';

interface RecommendationDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: SubmittedRecommendation | null;
  onCancelRecommendation?: (recommendation: SubmittedRecommendation, reason: string) => Promise<void> | void;
}

type TimelineItemState = 'completed' | 'active' | 'pending' | 'rejected' | 'cancelled';

interface TimelineItem {
  id: string;
  label: string;
  detail: string;
  state: TimelineItemState;
}

const STATUS_LABELS: Record<PanelRecommendationStatus, string> = {
  SUBMITTED_TO_PANEL: 'Submitted to Panel',
  REJECTED_BY_PANEL: 'Rejected by Panel',
  PENDING_COORDINATOR: 'Pending Coordinator',
  REJECTED_BY_COORDINATOR: 'Rejected by Coordinator',
  APPROVED: 'Confirmed',
  CANCELLED_BY_SUPERVISOR: 'Cancelled by Supervisor',
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const inferWorkflowStatus = (recommendation: SubmittedRecommendation): PanelRecommendationStatus => {
  if (recommendation.workflowStatus) return recommendation.workflowStatus;
  if (recommendation.status === 'Approved') return 'APPROVED';
  if (recommendation.status === 'Rejected') return 'REJECTED_BY_COORDINATOR';
  if (recommendation.status === 'Cancelled') return 'CANCELLED_BY_SUPERVISOR';
  return 'SUBMITTED_TO_PANEL';
};

const buildTimeline = (recommendation: SubmittedRecommendation): TimelineItem[] => {
  const status = inferWorkflowStatus(recommendation);
  const submittedAt = formatDateTime(recommendation.submittedAt) || recommendation.date;
  const panelDecisionAt = formatDateTime(recommendation.panelDecisionAt);
  const coordinatorDecisionAt = formatDateTime(recommendation.coordinatorDecisionAt);
  const panelAccepted =
    status === 'PENDING_COORDINATOR' ||
    status === 'APPROVED' ||
    status === 'REJECTED_BY_COORDINATOR';
  const panelRejected = status === 'REJECTED_BY_PANEL';
  const coordinatorActive = status === 'PENDING_COORDINATOR';
  const coordinatorRejected = status === 'REJECTED_BY_COORDINATOR';
  const cancelled = status === 'CANCELLED_BY_SUPERVISOR';
  const cancelledAt = formatDateTime(recommendation.cancelledAt);

  return [
    {
      id: 'submitted',
      label: 'Recommendation Submitted',
      detail: submittedAt,
      state: 'completed',
    },
    {
      id: 'panel',
      label: cancelled ? 'Cancelled by Supervisor' : 'Selected Panel Review',
      detail: cancelled
        ? cancelledAt || recommendation.cancellationReason || 'Cancelled before the selected panel took action'
        : panelRejected
        ? panelDecisionAt || recommendation.rejectionReason || 'Rejected by selected panel member'
        : panelAccepted
        ? panelDecisionAt || 'Selected panel member accepted'
        : 'Awaiting selected panel member decision',
      state: cancelled ? 'cancelled' : panelRejected ? 'rejected' : panelAccepted ? 'completed' : status === 'SUBMITTED_TO_PANEL' ? 'active' : 'pending',
    },
    {
      id: 'coordinator',
      label: 'Programme Coordinator Confirmation',
      detail: cancelled
        ? 'Not reached because the recommendation was cancelled'
        : coordinatorRejected
        ? coordinatorDecisionAt || recommendation.rejectionReason || 'Rejected by Programme Coordinator'
        : status === 'APPROVED'
        ? coordinatorDecisionAt || 'Confirmed by Programme Coordinator'
        : coordinatorActive
        ? 'Awaiting Programme Coordinator confirmation'
        : 'Pending selected panel acceptance',
      state: coordinatorRejected
        ? 'rejected'
        : status === 'APPROVED'
        ? 'completed'
        : coordinatorActive
        ? 'active'
        : 'pending',
    },
    {
      id: 'final',
      label: cancelled ? 'Recommendation Closed' : status === 'APPROVED' ? 'Panel Appointment Confirmed' : 'Appointed Panel',
      detail:
        cancelled
          ? recommendation.cancellationReason || 'Cancelled by supervisor'
          : status === 'APPROVED'
          ? coordinatorDecisionAt || 'Appointment record created'
          : panelRejected || coordinatorRejected
          ? 'Recommendation closed'
          : 'Pending Programme Coordinator confirmation',
      state: status === 'APPROVED' ? 'completed' : cancelled ? 'cancelled' : panelRejected || coordinatorRejected ? 'rejected' : 'pending',
    },
  ];
};

const getStatusBadgeClass = (status: SubmittedRecommendation['status']) => {
  if (status === 'Approved') return 'bg-[#e6fbf2] text-[#00a15c] border-[#bef5db]';
  if (status === 'Rejected') return 'bg-rose-50 text-rose-600 border-rose-100';
  if (status === 'Cancelled') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-[#eff6ff] text-blue-600 border-blue-100';
};

const TimelineMarker: React.FC<{ state: TimelineItemState }> = ({ state }) => {
  const className =
    state === 'completed'
      ? 'bg-[#00a15c] text-white border-[#00a15c]'
      : state === 'active'
      ? 'bg-brand-navy text-white border-brand-navy ring-4 ring-slate-100'
      : state === 'rejected'
      ? 'bg-rose-50 text-rose-600 border-rose-200'
      : state === 'cancelled'
      ? 'bg-slate-100 text-slate-600 border-slate-300'
      : 'bg-white text-slate-300 border-slate-200';

  return (
    <div className={`z-10 w-5 h-5 rounded-full border flex items-center justify-center ${className}`}>
      {state === 'completed' ? (
        <Check className="w-3 h-3 stroke-[3.5]" />
      ) : state === 'active' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-white block" />
      ) : state === 'rejected' || state === 'cancelled' ? (
        <X className="w-3 h-3 stroke-[3]" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-slate-200 block" />
      )}
    </div>
  );
};

export const RecommendationDetailsDrawer: React.FC<RecommendationDetailsDrawerProps> = ({
  isOpen,
  onClose,
  recommendation,
  onCancelRecommendation,
}) => {
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  if (!recommendation) return null;

  const workflowStatus = inferWorkflowStatus(recommendation);
  const timeline = buildTimeline(recommendation);
  const submittedOn = formatDateTime(recommendation.submittedAt) || recommendation.date;
  const abstractText = recommendation.abstract || 'No abstract snippet was recorded for this recommendation.';
  const researchArea = recommendation.researchArea || 'Not recorded';
  const lecturerNotes = recommendation.justification || 'No supervisor justification was saved for this recommendation.';
  const canCancel =
    Boolean(onCancelRecommendation) &&
    workflowStatus === 'SUBMITTED_TO_PANEL';

  const performCancellation = async () => {
    if (!recommendation) return;
    const reason = cancellationReason.trim();
    setIsCancelling(true);
    setCancellationError(null);
    try {
      await onCancelRecommendation?.(recommendation, reason);
      setCancellationReason('');
      setIsCancelConfirmOpen(false);
      onClose();
    } catch (error) {
      setCancellationError(error instanceof Error ? error.message : 'Failed to cancel the recommendation.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancel = () => {
    const reason = cancellationReason.trim();
    if (!reason) {
      setCancellationError('Please provide a cancellation reason.');
      return;
    }
    setCancellationError(null);
    setIsCancelConfirmOpen(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <PortalConfirmModal
            isOpen={isCancelConfirmOpen}
            title="Cancel panel recommendation?"
            message="This workflow attempt will be closed permanently and cannot be restored. A replacement recommendation can be submitted later if needed."
            confirmLabel="Cancel Recommendation"
            cancelLabel="Keep Recommendation"
            tone="danger"
            isLoading={isCancelling}
            onConfirm={performCancellation}
            onCancel={() => setIsCancelConfirmOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-brand-navy z-[80] cursor-default"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 210 }}
            className="fixed top-0 right-0 h-screen w-full max-w-xl bg-white border-l border-slate-100 shadow-sm z-[90] flex flex-col justify-between"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center select-none bg-slate-50/50">
              <div>
                <h2 className="text-base font-black text-brand-navy tracking-tight">
                  Recommendation Details
                </h2>
                <p className="text-[11px] text-slate-400 font-bold mt-1">
                  Confirmation route and submitted panel recommendation record
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 hover:text-rose-500 text-slate-400 transition cursor-pointer flex items-center justify-center shadow-3xs"
                title="Close details"
              >
                <X className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 font-sans text-left text-xs">
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-3xs flex gap-4 items-center">
                <div className="w-[52px] h-[52px] rounded-xl bg-brand-navy text-white font-black text-sm flex items-center justify-center shrink-0 tracking-wider shadow-sm select-none">
                  {getInitials(recommendation.studentName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[17px] font-black text-brand-navy leading-tight">
                    {recommendation.studentName}
                  </h3>
                  <div className="text-slate-500 font-bold text-[10.5px] mt-1 space-y-0.5">
                    <p className="font-mono text-brand-navy/85">ID: {recommendation.studentId}</p>
                    <p className="text-slate-400">
                      {recommendation.programme || 'Programme not recorded'} - {recommendation.semester}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1.5 select-none">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                    Research Information
                  </span>
                </div>
                <div className="bg-[#f8fafc]/50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                      Proposed Research Title
                    </span>
                    <h4 className="text-[13px] font-extrabold text-brand-navy leading-relaxed italic pr-2">
                      "{recommendation.researchTitle}"
                    </h4>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                      Research Area
                    </span>
                    <span className="inline-block text-xs font-black text-slate-800 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                      {researchArea}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                      Abstract Snippet
                    </span>
                    <p className="font-medium leading-relaxed text-[11px] text-justify text-slate-600">
                      {abstractText}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1.5 select-none">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                    Recommended Panel Member
                  </span>
                </div>
                <div className="relative bg-[#f8fafc]/50 border border-[#2563eb]/20 rounded-2xl p-5 shadow-3xs overflow-hidden">
                  <div className="flex gap-4">
                    <div className="w-[42px] h-[42px] rounded-xl bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb] font-black text-[11px] flex items-center justify-center shrink-0 select-none">
                      {getInitials(recommendation.recommendedPanel)}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <h4 className="text-sm font-extrabold text-brand-navy leading-tight">
                        {recommendation.recommendedPanel}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 mt-3.5 pt-3.5 border-t border-slate-200/55">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                            Staff ID
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 block">
                            {recommendation.recommendedPanelId || 'Not recorded'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                            Current Stage
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 block">
                            {STATUS_LABELS[workflowStatus]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                <div className="space-y-3.5">
                  <div className="border-b border-slate-100 pb-1.5 select-none">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                      Submission Info
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                        ID
                      </span>
                      <span className="text-xs font-mono font-black text-brand-navy block mt-0.5 select-all">
                        {recommendation.id}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                        Submitted On
                      </span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">
                        {submittedOn}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                        Current Status
                      </span>
                      <span className={`inline-flex mt-1.5 px-2.5 py-1 border rounded text-[9px] font-black uppercase tracking-wider select-none ${getStatusBadgeClass(recommendation.status)}`}>
                        {STATUS_LABELS[workflowStatus] || recommendation.status}
                      </span>
                    </div>
                    {recommendation.rejectionReason && (
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                          Rejection Reason
                        </span>
                        <p className="text-[11px] font-semibold text-rose-600 leading-relaxed mt-1">
                          {recommendation.rejectionReason}
                        </p>
                      </div>
                    )}
                    {recommendation.cancellationReason && (
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                          Cancellation Reason
                        </span>
                        <p className="text-[11px] font-semibold text-slate-600 leading-relaxed mt-1">
                          {recommendation.cancellationReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="border-b border-slate-100 pb-1.5 select-none">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                      Progress Timeline
                    </span>
                  </div>
                  <div className="space-y-4">
                    {timeline.map((item, index) => {
                      const isLast = index === timeline.length - 1;
                      const lineClass =
                        item.state === 'completed'
                          ? 'bg-emerald-100'
                          : item.state === 'rejected'
                          ? 'bg-rose-100'
                          : item.state === 'cancelled'
                          ? 'bg-slate-200'
                          : 'bg-slate-100';

                      return (
                        <div key={item.id} className="relative flex gap-3 text-left">
                          <div className="flex flex-col items-center shrink-0">
                            <TimelineMarker state={item.state} />
                            {!isLast && <div className={`w-[2px] h-10 -mb-4 mt-1 grow ${lineClass}`} />}
                          </div>
                          <div className="pt-0.5 space-y-0.5 select-none">
                            <h5 className={`text-[11px] font-extrabold ${item.state === 'pending' ? 'text-slate-400' : 'text-brand-navy'}`}>
                              {item.label}
                            </h5>
                            <p className={`text-[9.5px] font-bold ${item.state === 'active' ? 'text-blue-600' : item.state === 'rejected' ? 'text-rose-500' : item.state === 'cancelled' ? 'text-slate-600' : 'text-slate-400'}`}>
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pb-2">
                <div className="border-b border-slate-100 pb-1.5 select-none">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                    Supervisor Justification
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative">
                  <p className="text-slate-600 font-semibold leading-relaxed text-justify text-[11px] italic">
                    "{lecturerNotes}"
                  </p>
                </div>
              </div>

              <WorkflowAuditLog events={recommendation.workflow} />

              {canCancel && (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                      Cancel Recommendation
                    </h4>
                    <p className="mt-1 text-[10px] font-semibold leading-relaxed text-amber-800">
                      Cancellation is immediate and is only available before the selected panel member takes action.
                    </p>
                  </div>
                  <textarea
                    value={cancellationReason}
                    onChange={(event) => {
                      setCancellationReason(event.target.value);
                      if (cancellationError) setCancellationError(null);
                    }}
                    rows={3}
                    placeholder="State why this recommendation is being cancelled..."
                    className="w-full resize-none rounded-xl border border-amber-200 bg-white px-3.5 py-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-amber-400"
                  />
                  {cancellationError && (
                    <p className="text-[10px] font-bold text-rose-600">{cancellationError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel Recommendation'}
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end select-none bg-slate-50/50">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-white border border-[#e2e8f0] hover:bg-slate-50 text-slate-800 font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-3xs"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
