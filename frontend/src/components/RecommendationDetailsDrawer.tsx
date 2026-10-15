import { RecordPage } from './RecordPage';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelRecommendationStatus, SubmittedRecommendation } from '../types';
import {PortalButton} from './PortalPrimitives';
import {DecisionDialog} from './DecisionDialog';
import type {DecisionOutcome} from '../utils/decisionSubmission';
import { WorkflowAuditLog } from './WorkflowAuditLog';

interface RecommendationDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: SubmittedRecommendation | null;
  onCancelRecommendation?: (recommendation: SubmittedRecommendation, reason: string) => Promise<void | DecisionOutcome> | void;
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
  CANCELLED_BY_OFFICE: 'Cancelled by Office',
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

export const buildTimeline = (recommendation: SubmittedRecommendation): TimelineItem[] => {
  const status = inferWorkflowStatus(recommendation);
  const submittedAt = formatDateTime(recommendation.submittedAt) || recommendation.date;
  const panelDecisionAt = formatDateTime(recommendation.panelDecisionAt);
  const coordinatorDecisionAt = formatDateTime(recommendation.coordinatorDecisionAt);
  const panelAccepted =
    recommendation.selectedPanelDecision === 'ACCEPTED' ||
    status === 'PENDING_COORDINATOR' ||
    status === 'APPROVED' ||
    status === 'REJECTED_BY_COORDINATOR';
  const panelRejected = status === 'REJECTED_BY_PANEL';
  const coordinatorActive = status === 'PENDING_COORDINATOR';
  const coordinatorRejected = status === 'REJECTED_BY_COORDINATOR';
  const cancelled = status === 'CANCELLED_BY_SUPERVISOR' || status === 'CANCELLED_BY_OFFICE';
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
      label: cancelled && !panelAccepted ? STATUS_LABELS[status] : 'Selected Panel Review',
      detail: cancelled && !panelAccepted
        ? cancelledAt || recommendation.cancellationReason || 'Cancelled before the selected panel took action'
        : panelRejected
        ? panelDecisionAt || recommendation.rejectionReason || 'Rejected by selected panel member'
        : panelAccepted
        ? panelDecisionAt || 'Selected panel member accepted'
        : 'Awaiting selected panel member decision',
      state: panelAccepted ? 'completed' : cancelled ? 'cancelled' : panelRejected ? 'rejected' : status === 'SUBMITTED_TO_PANEL' ? 'active' : 'pending',
    },
    {
      id: 'coordinator',
      label: 'Programme Coordinator Confirmation',
      detail: cancelled
        ? panelAccepted ? 'Recommendation cancelled before Programme Coordinator confirmation' : 'Not reached because the recommendation was cancelled'
        : coordinatorRejected
        ? coordinatorDecisionAt || recommendation.rejectionReason || 'Rejected by Programme Coordinator'
        : status === 'APPROVED'
        ? coordinatorDecisionAt || 'Confirmed by Programme Coordinator'
        : coordinatorActive
        ? 'Awaiting Programme Coordinator confirmation'
        : 'Pending selected panel acceptance',
      state: cancelled && panelAccepted
        ? 'cancelled'
        : coordinatorRejected
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
          ? recommendation.cancellationReason || STATUS_LABELS[status]
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

  const performCancellation=async()=>{
    if(!onCancelRecommendation||!cancellationReason.trim())return false;
    setIsCancelling(true);
    try {return await onCancelRecommendation(recommendation,cancellationReason.trim());}
    finally {setIsCancelling(false);}
  };
  const handleCancel=()=>{setCancellationReason('');setIsCancelConfirmOpen(true);};

  if (!isOpen) return null;
  return <RecordPage title="Panel recommendation" backLabel="Back to Submitted recommendations" onBack={onClose} pageKey={`panel-history:${recommendation.id}`} dirty={!!cancellationReason.trim()} busy={isCancelling}><section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"><DecisionDialog isOpen={isCancelConfirmOpen} decisionKey={recommendation.id} title="Cancel Panel recommendation?"
      context={<>{recommendation.studentName} · {recommendation.programme}</>} kind="confirmation" tone="danger"
      message="This closes the pending recommendation and releases its reserved Panel workload. Its history remains available."
      confirmLabel="Cancel recommendation" cancelLabel="Keep recommendation" busy={isCancelling} dirty={!!cancellationReason.trim()} canConfirm={!!cancellationReason.trim()}
      successMessage="Panel recommendation cancelled." onConfirm={performCancellation}
      onClose={()=>{setIsCancelConfirmOpen(false);setCancellationReason('');setCancellationError(null);}}>
      <label className="form-label block">Cancellation reason<textarea required className="form-control form-control-md mt-2 min-h-28" value={cancellationReason} onChange={event=>setCancellationReason(event.target.value)}/></label>
    </DecisionDialog>
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-3xs flex gap-4 items-center">
                <div className="w-[52px] h-[52px] rounded-xl bg-brand-navy text-white font-black text-sm flex items-center justify-center shrink-0 tracking-wider shadow-sm select-none">
                  {getInitials(recommendation.studentName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="section-heading text-brand-navy leading-tight">
                    {recommendation.studentName}
                  </h3>
                  <div className="card-description text-slate-500 mt-1 space-y-0.5">
                    <p className="font-mono text-brand-navy/85">ID: {recommendation.studentId}</p>
                    <p className="text-slate-400">
                      {recommendation.programme || 'Programme not recorded'} - {recommendation.semester}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1.5 select-none">
                  <span className="section-label text-blue-600 uppercase tracking-widest block">
                    Research Information
                  </span>
                </div>
                <div className="bg-[#f8fafc]/50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <div className="space-y-1">
                    <span className="card-label text-slate-400 block uppercase tracking-wider">
                      Proposed Research Title
                    </span>
                    <h4 className="section-label leading-relaxed italic pr-2">
                      "{recommendation.researchTitle}"
                    </h4>
                  </div>
                  <div className="space-y-1">
                    <span className="card-label text-slate-400 block uppercase tracking-wider">
                      Research Area
                    </span>
                    <span className="inline-block text-xs font-black text-slate-800 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                      {researchArea}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="card-label text-slate-400 block uppercase tracking-wider">
                      Abstract Snippet
                    </span>
                    <p className="card-description text-justify">
                      {abstractText}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1.5 select-none">
                  <span className="section-label text-blue-600 uppercase tracking-widest block">
                    Recommended Panel Member
                  </span>
                </div>
                <div className="relative bg-[#f8fafc]/50 border border-[#2563eb]/20 rounded-2xl p-5 shadow-3xs overflow-hidden">
                  <div className="flex gap-4">
                    <div className="w-[42px] h-[42px] rounded-xl bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb] font-black text-[11px] flex items-center justify-center shrink-0 select-none">
                      {getInitials(recommendation.recommendedPanel)}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <h4 className="section-label leading-tight">
                        {recommendation.recommendedPanel}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 mt-3.5 pt-3.5 border-t border-slate-200/55">
                        <div className="space-y-0.5">
                          <span className="card-label text-slate-400 block uppercase tracking-wider">
                            Staff ID
                          </span>
                          <span className="card-value text-slate-700 block">
                            {recommendation.recommendedPanelId || 'Not recorded'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="card-label text-slate-400 block uppercase tracking-wider">
                            Current Stage
                          </span>
                          <span className="card-value text-slate-700 block">
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
                    <span className="section-label text-blue-600 uppercase tracking-widest block">
                      Submission Info
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="card-label text-slate-400 block uppercase tracking-wider">
                        ID
                      </span>
                      <span className="card-value font-mono text-brand-navy block mt-0.5 select-all">
                        {recommendation.id}
                      </span>
                    </div>
                    <div>
                      <span className="card-label text-slate-400 block uppercase tracking-wider">
                        Submitted On
                      </span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">
                        {submittedOn}
                      </span>
                    </div>
                    <div>
                      <span className="card-label text-slate-400 block uppercase tracking-wider">
                        Current Status
                      </span>
                      <span className={`inline-flex mt-1.5 px-2.5 py-1 border rounded text-[9px] font-black uppercase tracking-wider select-none ${getStatusBadgeClass(recommendation.status)}`}>
                        {STATUS_LABELS[workflowStatus] || recommendation.status}
                      </span>
                    </div>
                    {recommendation.rejectionReason && (
                      <div>
                        <span className="card-label text-slate-400 block uppercase tracking-wider">
                          Rejection Reason
                        </span>
                        <p className="card-description text-rose-600 leading-relaxed mt-1">
                          {recommendation.rejectionReason}
                        </p>
                      </div>
                    )}
                    {recommendation.cancellationReason && (
                      <div>
                        <span className="card-label text-slate-400 block uppercase tracking-wider">
                          Cancellation Reason
                        </span>
                        <p className="card-description mt-1">
                          {recommendation.cancellationReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="border-b border-slate-100 pb-1.5 select-none">
                    <span className="section-label text-blue-600 uppercase tracking-widest block">
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
                            <h5 className={`card-value ${item.state === 'pending' ? 'text-slate-400' : 'text-brand-navy'}`}>
                              {item.label}
                            </h5>
                            <p className={`card-caption ${item.state === 'active' ? 'text-blue-600' : item.state === 'rejected' ? 'text-rose-500' : item.state === 'cancelled' ? 'text-slate-600' : 'text-slate-400'}`}>
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
                  <span className="section-label text-blue-600 uppercase tracking-widest block">
                    Supervisor Justification
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative">
                  <p className="card-description text-justify italic">
                    "{lecturerNotes}"
                  </p>
                </div>
              </div>

              <WorkflowAuditLog events={recommendation.workflow} />

              {canCancel && (
                <PortalButton variant="danger" disabled={isCancelling} onClick={handleCancel}>Cancel recommendation</PortalButton>
              )}
            </section></RecordPage>;
};
