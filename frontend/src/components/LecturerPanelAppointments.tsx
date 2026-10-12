import { RecordPage } from './RecordPage';
import { useSearchParams } from 'react-router';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { coordinatorProgrammeNames } from '../utils/coordinatorDelegations';
import {
  Users, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  FileText, 
  SlidersHorizontal,
  Mail, 
  Phone,
  Bookmark,
  ArrowLeft,
  X,
  Bell,
  HelpCircle,
  LogOut,
  Settings as SettingsIcon,
  Search,
  MessageSquareCode,
  FolderMinus,
  MailOpen,
  Megaphone,
  Award,
  Filter,
  Check,
  Building,
  Download,
  Eye,
  Info,
  Calendar,
  AlertTriangle,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PortalButton, PortalToast, ProgressBar, StatusBadge } from './PortalPrimitives';
import { EmptyState, LoadingState, ErrorState } from './StateViews';
import { AppointmentSection, AppointmentSummaryCard, AppointmentMemberCard } from './AppointmentPrimitives';
import { LecturerAppointmentGuidance } from './LecturerAppointmentGuidance';
import { RecommendPanelMemberDrawer } from './RecommendPanelMemberDrawer';
import { SubmittedRecommendationsPage } from './SubmittedRecommendationsPage';
import { PanelAssignmentDetail } from './PanelAssignmentDetail';
import {
  DemoUser,
  CoordinatorPanelWorkspace,
  PanelAssignment,
  PanelCandidate,
  PanelRecommendationDraft,
  PanelRecommendationSupervisee,
  PanelWorkloadSummary,
  SubmittedRecommendation,
} from '../types';
import {
  ApiError,
  acceptPanelRecommendation,
  approvePanelRecommendationByCoordinator,
  cancelPanelRecommendation,
  createPanelRecommendation as createPanelRecommendationApi,
  getCoordinatorPanelWorkspace,
  getEligiblePanelSupervisees,
  getPanelCandidates,
  getPanelAssignments,
  getPanelRecommendationDrafts,
  getPanelRecommendations,
  getPanelReviewQueue,
  getPanelReviewHistory,
  getOwnPanelWorkload,
  rejectPanelRecommendation,
  rejectPanelRecommendationByCoordinator,
  endPanelAppointment,
} from '../services';
import {
  PANEL_RECOMMENDATION_STATUS_LABELS,
  PanelRecommendationReviewerRole,
  canReviewPanelRecommendation,
  canCreatePanelRecommendation,
  mergeSubmittedPanelHistory,
} from '../utils/panelRecommendationWorkflow';
import { PanelRecommendationRecordsTable } from './PanelRecommendationRecordsTable';
import { WorkflowAuditLog } from './WorkflowAuditLog';
import { compareLongestWaiting, formatWaitingText } from '../utils/workflowAgeing';
import { AppointmentEndControl } from './AppointmentEndControl';
import { capacityStateLabel } from '../utils/lecturerCapacity';

// ==================== SUB-COMPONENTS & TYPES ====================

// PanelAssignment, PanelRecommendationDraft and SubmittedRecommendation now
// live in src/types.

interface RecommendationStudent {
  studentId: string;
  studentName: string;
  programme: string;
  intake: string;
  supervisor: string;
  initials: string;
  proposedTopic: string;
  area: string;
  abstract: string;
}

export function LecturerPanelSuperviseeCard({ student, status, tone, canRecommend, replacement, onRecommend }: {
  student: RecommendationStudent; status: string; tone: React.ComponentProps<typeof StatusBadge>['tone']; canRecommend: boolean; replacement: boolean; onRecommend: () => void;
}) {
  return <AppointmentMemberCard label="Supervisee" name={student.studentName} status={status} tone={tone}
    actions={<PortalButton size="sm" variant="primary" disabled={!canRecommend} onClick={onRecommend}>{canRecommend ? replacement ? 'Replace Panel Member' : 'Recommend Panel Member' : 'Recommendation Already Active'}</PortalButton>}>
    <p className="card-description">{student.studentId}</p>
    <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="card-label">Programme</dt><dd className="card-description">{student.programme}</dd></div><div><dt className="card-label">Semester</dt><dd className="card-description">{student.intake}</dd></div></dl>
    <div className="rounded-lg bg-slate-50 p-3"><p className="card-label">Current research title</p><p className="card-value mt-1 break-words">{student.proposedTopic}</p></div>
  </AppointmentMemberCard>;
}

const toRecommendationStudent = (student: PanelRecommendationSupervisee): RecommendationStudent => ({
  studentId: student.studentId,
  studentName: student.studentName,
  programme: student.programme,
  intake: student.semester,
  supervisor: student.supervisorName,
  initials: getInitials(student.studentName),
  proposedTopic: student.proposedTopic,
  area: student.researchArea,
  abstract: student.abstract,
});

const getInitials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const isPendingPanelRecommendation = (recommendation: PanelRecommendationDraft) =>
  recommendation.status === 'SUBMITTED_TO_PANEL' ||
  recommendation.status === 'PENDING_COORDINATOR';

const getRecommendationTone = (status: PanelRecommendationDraft['status']) => {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED_BY_PANEL' || status === 'REJECTED_BY_COORDINATOR') return 'danger' as const;
  if (status === 'CANCELLED_BY_SUPERVISOR' || status === 'CANCELLED_BY_OFFICE') return 'neutral' as const;
  return 'info' as const;
};

type PanelProgressItemStatus = 'completed' | 'active' | 'pending' | 'rejected' | 'cancelled';

interface PanelProgressItem {
  id: string;
  label: string;
  subtext?: string;
  status: PanelProgressItemStatus;
}

export const getPanelRecommendationProgressItems = (
  recommendation: PanelRecommendationDraft,
): PanelProgressItem[] => {
  const status = recommendation.status;
  const panelAccepted =
    recommendation.selectedPanelDecision === 'ACCEPTED' ||
    status === 'PENDING_COORDINATOR' ||
    status === 'APPROVED' ||
    status === 'REJECTED_BY_COORDINATOR';
  const panelRejected = status === 'REJECTED_BY_PANEL';
  const cancelled = status === 'CANCELLED_BY_SUPERVISOR' || status === 'CANCELLED_BY_OFFICE';
  const coordinatorActive = status === 'PENDING_COORDINATOR';
  const coordinatorCompleted = status === 'APPROVED';
  const coordinatorRejected = status === 'REJECTED_BY_COORDINATOR';

  return [
    {
      id: 'submitted',
      label: 'Recommendation Submitted',
      subtext: recommendation.submittedDate,
      status: 'completed',
    },
    {
      id: 'panel',
      label: 'Selected Panel Review',
      subtext: cancelled && !panelAccepted
        ? recommendation.cancellationReason || PANEL_RECOMMENDATION_STATUS_LABELS[status]
        : panelRejected
        ? 'Selected panel rejected this recommendation'
        : panelAccepted
        ? 'Selected panel accepted'
        : 'Awaiting selected panel decision',
      status: panelAccepted ? 'completed' : cancelled ? 'cancelled' : panelRejected ? 'rejected' : status === 'SUBMITTED_TO_PANEL' ? 'active' : 'pending',
    },
    {
      id: 'coordinator',
      label: 'Programme Coordinator Confirmation',
      subtext: cancelled
        ? 'Recommendation cancelled before final approval'
        : coordinatorRejected
        ? 'Programme Coordinator rejected this recommendation'
        : coordinatorCompleted
        ? 'Programme Coordinator confirmed'
        : coordinatorActive
        ? 'Awaiting Programme Coordinator confirmation'
        : 'Pending selected panel acceptance',
      status: cancelled && panelAccepted
        ? 'cancelled'
        : coordinatorRejected
        ? 'rejected'
        : coordinatorCompleted
        ? 'completed'
        : coordinatorActive
        ? 'active'
        : 'pending',
    },
    {
      id: 'final',
      label: cancelled ? 'Recommendation Cancelled' : status === 'APPROVED' ? 'Panel Appointment Confirmed' : 'Appointed Panel',
      subtext:
        cancelled
          ? recommendation.cancellationReason || PANEL_RECOMMENDATION_STATUS_LABELS[status]
          : status === 'APPROVED'
          ? 'Recommendation completed'
          : panelRejected || coordinatorRejected
          ? 'Recommendation closed'
          : 'Pending Programme Coordinator confirmation',
      status: status === 'APPROVED' ? 'completed' : cancelled ? 'cancelled' : panelRejected || coordinatorRejected ? 'rejected' : 'pending',
    },
  ];
};

const PanelRecommendationProgressTimeline: React.FC<{ items: PanelProgressItem[] }> = ({ items }) => (
  <div className="space-y-4">
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      const toneClass =
        item.status === 'completed'
          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
          : item.status === 'active'
          ? 'bg-brand-navy text-white border-brand-navy ring-4 ring-slate-100'
          : item.status === 'rejected'
          ? 'bg-rose-50 text-rose-600 border-rose-200'
          : item.status === 'cancelled'
          ? 'bg-slate-100 text-slate-600 border-slate-300'
          : 'bg-white text-slate-300 border-slate-200';
      const lineClass =
        item.status === 'completed'
          ? 'bg-emerald-100'
          : item.status === 'rejected'
          ? 'bg-rose-100'
          : 'bg-slate-100';

      return (
        <div key={item.id} className="relative flex gap-4 text-left group">
          <div className="flex flex-col items-center shrink-0">
            <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center border font-sans text-[10px] font-bold ${toneClass}`}>
              {item.status === 'completed' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3.5]" />
              ) : item.status === 'active' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-white block animate-pulse" />
              ) : item.status === 'rejected' ? (
                <X className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
              ) : item.status === 'cancelled' ? (
                <X className="w-3.5 h-3.5 text-slate-600 stroke-[3]" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200 block" />
              )}
            </div>
            {!isLast && <div className={`w-[2px] h-10 -mb-4 mt-1 grow ${lineClass}`} />}
          </div>

          <div className="pt-0.5 space-y-0.5 select-none">
            <h5 className={`section-label ${item.status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
              {item.label}
            </h5>
            {item.subtext && (
              <p className={`card-caption ${item.status === 'pending' ? 'text-slate-350' : 'text-slate-400'}`}>
                {item.subtext}
              </p>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

interface PanelRecommendationReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: PanelRecommendationDraft | null;
  reviewerRole: PanelRecommendationReviewerRole;
  onAccept?: (recommendation: PanelRecommendationDraft) => void;
  onReject?: (recommendation: PanelRecommendationDraft, reason: string) => void;
  readOnly?: boolean;
  routed?: boolean;
  busy?: boolean;
  onAppointmentEnded?: () => Promise<void>;
}

const PanelRecommendationReviewDrawer: React.FC<PanelRecommendationReviewDrawerProps> = ({
  isOpen,
  onClose,
  recommendation,
  reviewerRole,
  onAccept,
  onReject,
  readOnly = false,
  routed = false,
  busy = false,
  onAppointmentEnded,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  useEffect(() => {
    setRejectionReason('');
    setRejectionError(null);
  }, [recommendation?.id, isOpen]);

  if (!isOpen || !recommendation) return null;

  const canAct = !readOnly
    && recommendation.participantEligible !== false
    && canReviewPanelRecommendation(recommendation.status, reviewerRole);
  const reviewerLabel =
    readOnly
      ? 'Recommendation Record'
      : reviewerRole === 'SELECTED_PANEL'
      ? 'Selected Panel Review'
      : reviewerRole === 'PROGRAMME_COORDINATOR'
      ? 'Programme Coordinator Review'
      : 'Supervisor Tracking View';

  return <RecordPage title="Panel recommendation" subtitle={reviewerLabel} backLabel="Back to Panel Appointments" onBack={onClose} pageKey={routed ? undefined : `panel-review:${recommendation.id}`} dirty={!!rejectionReason.trim()} busy={busy}>{requestBack => <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex gap-4 items-center py-4 border-b border-slate-100 select-none">
              <div className="w-14 h-14 bg-slate-100 text-slate-500 font-black text-sm rounded-full flex items-center justify-center tracking-widest shrink-0 border border-slate-200">
                {recommendation.studentName
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="text-left">
                <h4 className="section-label leading-snug">
                  {recommendation.studentName}
                </h4>
                <p className="card-description mt-0.5">
                  {recommendation.programme}
                </p>
                <p className="card-description mt-1">
                  Submitted: {recommendation.submittedDate}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <span className="card-label text-slate-400 block leading-none">
                Recommended Panel Member
              </span>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="card-value text-brand-navy">{recommendation.recommendedMember}</p>
                <p className="text-[10px] font-mono text-slate-400 font-bold mt-1">
                  {recommendation.recommendedMemberId}
                </p>
                {recommendation.unavailableUntil && (
                  <p className="card-description mt-2 text-amber-700">
                    Unavailable for new appointments until {recommendation.unavailableUntil}. This persisted review remains in the queue.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-left">
              <span className="card-label text-slate-400 block leading-none">
                Research Topic
              </span>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl card-description text-slate-600">
                {recommendation.proposedTopic}
              </div>
            </div>

            <div className="space-y-2 text-left">
              <span className="card-label text-slate-400 block leading-none">
                Justification
              </span>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl card-description text-slate-600">
                {recommendation.justification || 'No justification notes were saved.'}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-y border-slate-100 py-5">
              <div className="flex items-center justify-between gap-4">
                <span className="card-label text-slate-400">
                  Current Status
                </span>
                <StatusBadge tone={getRecommendationTone(recommendation.status)} dot>
                  {PANEL_RECOMMENDATION_STATUS_LABELS[recommendation.status]}
                </StatusBadge>
              </div>
              <p className="card-description">
                {readOnly
                  ? 'This is a read-only workflow record. Completed decisions remain available for audit and tracking.'
                  : reviewerRole === 'SUPERVISOR'
                  ? 'As the supervisor who submitted this recommendation, you can only track the confirmation progress here. The selected panel member and Programme Coordinator must make their own decisions from their own review queues.'
                  : canAct
                  ? 'This recommendation is awaiting your decision.'
                  : 'This recommendation is not currently assigned to your review step.'}
              </p>
            </div>

            <div className="space-y-3 text-left">
              <span className="card-label text-slate-400 block leading-none">
                Request Progress
              </span>
              <PanelRecommendationProgressTimeline
                items={getPanelRecommendationProgressItems(recommendation)}
              />
            </div>

            <WorkflowAuditLog events={recommendation.workflow} />

            {reviewerRole === 'PROGRAMME_COORDINATOR'
              && recommendation.appointmentLifecycle?.status === 'ACTIVE'
              && (
                <AppointmentEndControl
                  label="Panel appointment"
                  onSubmit={async (outcome, reason) => {
                    await endPanelAppointment(
                      recommendation.appointmentLifecycle!.appointmentId,
                      outcome,
                      reason,
                    );
                    await onAppointmentEnded?.();
                  }}
                />
              )}

            {recommendation.participantEligible === false && (
              <p className="card-description rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                This Student is {recommendation.participantLifecycleStatus?.toLowerCase()}; the recommendation is retained as read-only until eligible.
              </p>
            )}

            {canAct && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onAccept?.(recommendation)}
                    className="w-full py-4 bg-brand-navy hover:bg-slate-900 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer text-center"
                  >
                    {reviewerRole === 'SELECTED_PANEL' ? 'Accept Panel Nomination' : 'Confirm Panel Appointment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!rejectionReason.trim()) {
                        setRejectionError('A reason is required before rejecting this panel recommendation.');
                        return;
                      }
                      setRejectionError(null);
                      onReject?.(recommendation, rejectionReason.trim());
                    }}
                    className="w-full py-3.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer text-center"
                  >
                    {reviewerRole === 'SELECTED_PANEL' ? 'Reject Panel Nomination' : 'Reject Recommendation'}
                  </button>
                </div>

                <div className="space-y-1.5 text-left">
                  <span className="form-label block">REASON FOR REJECTION</span>
                  <textarea
                    className={`form-control form-control-md min-h-[124px] ${rejectionError ? 'border-rose-200 bg-rose-50/30' : ''}`}
                    placeholder="Enter reason..."
                    value={rejectionReason}
                    onChange={(event) => {
                      setRejectionReason(event.target.value);
                      if (rejectionError) setRejectionError(null);
                    }}
                  />
                  <p className={`card-description ${rejectionError ? 'text-rose-600' : 'text-slate-400'}`}>
                    {rejectionError || 'A reason is required before rejecting this panel recommendation.'}
                  </p>
                </div>
              </div>
            )}
          </section>}</RecordPage>;
};

interface LecturerPanelAppointmentsProps {
  currentUser?: DemoUser | null;
  initialRecommendationId?: string;
  initialSuperviseeId?: string;
  routeView?: 'list' | 'submitted' | 'reviewed' | 'assignmentDetail';
  routeAssignmentStudentId?: string;
  onNavigateToList?: () => void;
  onNavigateToSubmitted?: () => void;
  onNavigateToReviewed?: () => void;
  onNavigateToAssignment?: (studentId: string) => void;
  onNavigateToDossier?: (studentId: string) => void;
}

export const LecturerPanelAppointments: React.FC<LecturerPanelAppointmentsProps> = ({
  currentUser,
  initialRecommendationId,
  initialSuperviseeId,
  routeView = 'list',
  routeAssignmentStudentId,
  onNavigateToList,
  onNavigateToSubmitted,
  onNavigateToReviewed,
  onNavigateToAssignment,
  onNavigateToDossier,
}) => {
  // Right Drawer state
  const [isRecommendDrawerOpen, setIsRecommendDrawerOpen] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const mutation = useRef(false);
  const openedInitialSupervisee = useRef<string | null>(null);
  
  const [selectedRecommendation, setSelectedRecommendation] = useState<PanelRecommendationDraft | null>(null);
  const [selectedReviewerRole, setSelectedReviewerRole] = useState<PanelRecommendationReviewerRole>('SUPERVISOR');
  const [selectedRecommendationReadOnly, setSelectedRecommendationReadOnly] = useState(false);
  const previousRoutedRecommendation = useRef(initialRecommendationId);
  useEffect(() => {
    if (previousRoutedRecommendation.current && !initialRecommendationId) { setSelectedRecommendation(null); setSelectedRecommendationReadOnly(false); }
    previousRoutedRecommendation.current = initialRecommendationId;
  }, [initialRecommendationId]);
  const isCoordinator = currentUser?.role === 'Programme Coordinator';

  // Toast Notification
  const [toastText, setToastText] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastText(msg);
    setTimeout(() => {
      setToastText(null);
    }, 4500);
  };

  // Panel assignments, recommendation drafts, and the submitted-recommendation
  // History is loaded from the persisted appointment API.
  const [assignments, setAssignments] = useState<PanelAssignment[]>([]);
  const [submittedRecs, setSubmittedRecs] = useState<PanelRecommendationDraft[]>([]);
  const [panelReviewQueue, setPanelReviewQueue] = useState<PanelRecommendationDraft[]>([]);
  const [coordinatorReviewQueue, setCoordinatorReviewQueue] = useState<PanelRecommendationDraft[]>([]);
  const [coordinatorWorkspace, setCoordinatorWorkspace] = useState<CoordinatorPanelWorkspace | null>(null);
  const coordinatorProgrammeLabel = coordinatorProgrammeNames(coordinatorWorkspace).join(', ');
  const [reviewedRequests, setReviewedRequests] = useState<PanelRecommendationDraft[]>([]);
  const [panelRecommendations, setPanelRecommendations] = useState<SubmittedRecommendation[]>([]);
  const [panelCandidates, setPanelCandidates] = useState<PanelCandidate[]>([]);
  const [ownPanelCapacity, setOwnPanelCapacity] = useState<PanelWorkloadSummary | null>(null);
  const [eligibleSupervisees, setEligibleSupervisees] = useState<PanelRecommendationSupervisee[]>([]);
  const [selectedSuperviseeId, setSelectedSuperviseeId] = useState<string | null>(null);
  const [listParams, setListParams] = useSearchParams();
  const assignmentSearch = listParams.get('q') ?? '';
  const setAssignmentSearch = (value: string) => setListParams(current => { const next = new URLSearchParams(current); if (value) next.set('q', value); else next.delete('q'); return next; }, { replace: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    const load = isCoordinator
      ? Promise.all([getCoordinatorPanelWorkspace()])
      : Promise.all([
          getPanelAssignments(),
          getPanelRecommendationDrafts(),
          getPanelRecommendations(),
          getPanelReviewQueue(),
          getPanelReviewHistory(),
          getEligiblePanelSupervisees(),
          getPanelCandidates(),
          getOwnPanelWorkload(),
        ]);

    load
      .then((result) => {
        if (isCoordinator) {
          const [workspace] = result as [CoordinatorPanelWorkspace];
          setAssignments([]);
          setSubmittedRecs([]);
          setPanelRecommendations([]);
          setPanelCandidates([]);
          setOwnPanelCapacity(null);
          setEligibleSupervisees([]);
          setSelectedSuperviseeId(null);
          setPanelReviewQueue([]);
          setReviewedRequests([]);
          setCoordinatorWorkspace(workspace);
          setCoordinatorReviewQueue(workspace.queue);
          return;
        }

        const [asg, drafts, recs, panelQueue, history, eligibleSupervisees, candidates, workload] = result as [
          PanelAssignment[],
          PanelRecommendationDraft[],
          SubmittedRecommendation[],
          PanelRecommendationDraft[],
          PanelRecommendationDraft[],
          Awaited<ReturnType<typeof getEligiblePanelSupervisees>>,
          PanelCandidate[],
          PanelWorkloadSummary,
        ];
        setAssignments(asg);
        setSubmittedRecs(drafts);
        setPanelRecommendations(recs);
        setPanelCandidates(candidates);
        setOwnPanelCapacity(workload);
        setPanelReviewQueue(panelQueue);
        setCoordinatorReviewQueue([]);
        setCoordinatorWorkspace(null);
        setReviewedRequests(history);
        setEligibleSupervisees(eligibleSupervisees);
        setSelectedSuperviseeId((currentId) => {
          if (
            initialSuperviseeId
            && eligibleSupervisees.some((student) => student.studentId === initialSuperviseeId)
          ) {
            return initialSuperviseeId;
          }
          if (currentId && eligibleSupervisees.some((student) => student.studentId === currentId)) {
            return currentId;
          }
          return eligibleSupervisees.find((student) => student.canRecommend)?.studentId
            ?? eligibleSupervisees[0]?.studentId
            ?? null;
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load panel appointments.'))
      .finally(() => setLoading(false));
  }, [initialSuperviseeId, isCoordinator]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!initialRecommendationId) return;
    const recommendation = [
      ...submittedRecs,
      ...panelReviewQueue,
      ...coordinatorReviewQueue,
      ...reviewedRequests,
      ...(coordinatorWorkspace?.records ?? []),
    ].find((item) => String(item.id) === String(initialRecommendationId));
    if (!recommendation) return;
    setSelectedRecommendation(recommendation);
    const isSelectedPanel =
      recommendation.recommendedMemberId === currentUser?.staffId;
    const role: PanelRecommendationReviewerRole = isCoordinator
      ? 'PROGRAMME_COORDINATOR'
      : isSelectedPanel
      ? 'SELECTED_PANEL'
      : 'SUPERVISOR';
    setSelectedReviewerRole(role);
    setSelectedRecommendationReadOnly(
      !canReviewPanelRecommendation(recommendation.status, role),
    );
  }, [
    initialRecommendationId,
    submittedRecs,
    panelReviewQueue,
    coordinatorReviewQueue,
    reviewedRequests,
    coordinatorWorkspace,
    isCoordinator,
    currentUser?.staffId,
  ]);

  const selectedSupervisee = useMemo(
    () => eligibleSupervisees.find((student) => student.studentId === selectedSuperviseeId)
      ?? eligibleSupervisees.find((student) => student.canRecommend)
      ?? eligibleSupervisees[0]
      ?? null,
    [eligibleSupervisees, selectedSuperviseeId],
  );

  const recommendationStudent = useMemo(
    () => selectedSupervisee ? toRecommendationStudent(selectedSupervisee) : null,
    [selectedSupervisee],
  );
  const replacementAssignment = selectedSupervisee?.panelAppointmentId
    ? selectedSupervisee
    : null;

  // Merge the lecturer's own drafts with the submitted-recommendation history so
  // newly recommended items appear immediately at the top of the table.
  const combinedRecommendations = useMemo(() => {
    const customList = submittedRecs
      .map((r) => ({
        id: r.id !== undefined
          ? `REC-${String(r.id).padStart(4, '0')}`
          : `STUDENT-${r.studentId}`,
        recommendationId: r.id,
        studentName: r.studentName,
        studentId: r.studentId,
        researchTitle: r.proposedTopic,
        recommendedPanel: r.recommendedMember,
        recommendedPanelId: r.recommendedMemberId,
        date: r.submittedDate,
        status: (r.status === 'APPROVED'
          ? 'Approved'
          : r.status === 'CANCELLED_BY_SUPERVISOR' || r.status === 'CANCELLED_BY_OFFICE'
          ? 'Cancelled'
          : r.status === 'REJECTED_BY_PANEL' || r.status === 'REJECTED_BY_COORDINATOR'
          ? 'Rejected'
          : 'Pending Approval') as SubmittedRecommendation['status'],
        workflowStatus: r.status,
        semester: r.semester || '',
        programme: r.programme,
        researchArea: r.researchArea,
        abstract: r.abstract ?? '',
        justification: r.justification,
        rejectionReason: r.rejectionReason,
        submittedAt: r.submittedAt,
        panelDecisionAt: r.panelDecisionAt,
        selectedPanelDecision: r.selectedPanelDecision,
        coordinatorDecisionAt: r.coordinatorDecisionAt,
        cancelledAt: r.cancelledAt,
        cancellationReason: r.cancellationReason,
        workflow: r.workflow,
        waitingSince: r.waitingSince,
        waitingDays: r.waitingDays,
        waitingOn: r.waitingOn,
      }));

    return mergeSubmittedPanelHistory(customList, panelRecommendations);
  }, [submittedRecs, panelRecommendations]);

  const currentRecommendation = useMemo(
    () => recommendationStudent
      ? submittedRecs.find((recommendation) => recommendation.studentId === recommendationStudent.studentId) ?? null
      : null,
    [submittedRecs, recommendationStudent],
  );

  const selectedAssignment = useMemo(
    () => routeAssignmentStudentId
      ? assignments.find((assignment) => String(assignment.studentId) === String(routeAssignmentStudentId)) ?? null
      : null,
    [assignments, routeAssignmentStudentId],
  );

  const navigateToList = onNavigateToList ?? (() => undefined);

  const canRecommendForStudent = Boolean(
    recommendationStudent && selectedSupervisee?.canRecommend,
  );

  useEffect(() => {
    if (
      routeView !== 'list'
      || !initialSuperviseeId
      || recommendationStudent?.studentId !== initialSuperviseeId
      || !canRecommendForStudent
      || openedInitialSupervisee.current === initialSuperviseeId
    ) return;
    openedInitialSupervisee.current = initialSuperviseeId;
    setIsRecommendDrawerOpen(true);
  }, [
    canRecommendForStudent,
    initialSuperviseeId,
    recommendationStudent?.studentId,
    routeView,
  ]);

  const createRecommendation = async (
    notes: string,
    candidateId: string,
    replacementReason: string,
  ) => {
    if (!recommendationStudent) {
      triggerToast('No supervisee is available for panel recommendation.');
      return;
    }

    if (!canRecommendForStudent) {
      triggerToast(`A ${currentRecommendation ? PANEL_RECOMMENDATION_STATUS_LABELS[currentRecommendation.status] : 'current'} recommendation already exists for ${recommendationStudent.studentName}.`);
      return;
    }

    if (mutation.current) return;
    mutation.current = true; setMutationBusy(true);
    try {
      const newRec = await createPanelRecommendationApi({
        studentId: recommendationStudent.studentId,
        recommendedMemberId: candidateId,
        justification: notes,
        status: 'SUBMITTED_TO_PANEL',
        replacesAppointmentId: replacementAssignment?.panelAppointmentId ?? null,
        replacementReason: replacementAssignment ? replacementReason : null,
      });

      setSubmittedRecs([newRec, ...submittedRecs]);
      setIsRecommendDrawerOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      triggerToast(`Recommendation submitted to selected panel member ${newRec.recommendedMember}.`);
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : 'Failed to save panel recommendation.');
    } finally { mutation.current = false; setMutationBusy(false); }
  };

  const activeRecommendationsCount = submittedRecs.filter(isPendingPanelRecommendation).length;
  const visibleAssignments = assignments.filter(assignment => [assignment.studentId, assignment.studentName, assignment.researchTitle, assignment.supervisor].join(' ').toLowerCase().includes(assignmentSearch.trim().toLowerCase()));
  const activeAssignmentsCount = ownPanelCapacity?.workloadCount ?? assignments.length;
  const workloadLimit = ownPanelCapacity?.workloadLimit ?? 0;
  const activeReviewQueue = useMemo(
    () => [...(isCoordinator ? coordinatorReviewQueue : panelReviewQueue)]
      .sort(compareLongestWaiting),
    [coordinatorReviewQueue, isCoordinator, panelReviewQueue],
  );
  const activeReviewRole: PanelRecommendationReviewerRole = isCoordinator
    ? 'PROGRAMME_COORDINATOR'
    : 'SELECTED_PANEL';

  const handleReviewAccept = async (recommendation: PanelRecommendationDraft) => {
    if (recommendation.id === undefined) {
      triggerToast('This recommendation cannot be updated because it has no backend ID.');
      return;
    }

    if (mutation.current) return;
    mutation.current = true; setMutationBusy(true);
    try {
      const updated = selectedReviewerRole === 'PROGRAMME_COORDINATOR'
        ? await approvePanelRecommendationByCoordinator(recommendation.id)
        : await acceptPanelRecommendation(recommendation.id);

      setSubmittedRecs((items) => items.map((item) => item.id === updated.id ? updated : item));
      setPanelReviewQueue((items) => items.filter((item) => item.id !== updated.id));
      setCoordinatorReviewQueue((items) => items.filter((item) => item.id !== updated.id));
      setSelectedRecommendation(updated);
      triggerToast(
        selectedReviewerRole === 'PROGRAMME_COORDINATOR'
          ? 'Panel appointment confirmed by Programme Coordinator.'
          : 'Panel nomination accepted and routed to Programme Coordinator.',
      );
      loadData();
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : 'Failed to update panel recommendation.');
      if (e instanceof ApiError && e.status === 409) loadData();
    } finally { mutation.current = false; setMutationBusy(false); }
  };

  const handleReviewReject = async (recommendation: PanelRecommendationDraft, reason: string) => {
    if (recommendation.id === undefined) {
      triggerToast('This recommendation cannot be updated because it has no backend ID.');
      return;
    }

    if (mutation.current) return;
    mutation.current = true; setMutationBusy(true);
    try {
      const updated = selectedReviewerRole === 'PROGRAMME_COORDINATOR'
        ? await rejectPanelRecommendationByCoordinator(recommendation.id, reason)
        : await rejectPanelRecommendation(recommendation.id, reason);

      setSubmittedRecs((items) => items.map((item) => item.id === updated.id ? updated : item));
      setPanelReviewQueue((items) => items.filter((item) => item.id !== updated.id));
      setCoordinatorReviewQueue((items) => items.filter((item) => item.id !== updated.id));
      setSelectedRecommendation(updated);
      triggerToast(
        selectedReviewerRole === 'PROGRAMME_COORDINATOR'
          ? 'Panel recommendation rejected by Programme Coordinator.'
          : 'Panel nomination rejected.',
      );
      loadData();
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : 'Failed to update panel recommendation.');
    } finally { mutation.current = false; setMutationBusy(false); }
  };

  const handleCancelRecommendation = async (
    recommendation: SubmittedRecommendation,
    reason: string,
  ) => {
    if (recommendation.recommendationId === undefined) {
      throw new Error('This recommendation cannot be cancelled because it has no backend ID.');
    }

    const updated = await cancelPanelRecommendation(recommendation.recommendationId, reason);
    setSubmittedRecs((items) => items.map((item) => item.id === updated.id ? updated : item));
    setPanelRecommendations((items) => items.map((item) =>
      item.recommendationId === updated.id
        ? {
            ...item,
            status: 'Cancelled',
            workflowStatus: updated.status,
            cancelledAt: updated.cancelledAt,
            cancellationReason: updated.cancellationReason,
          }
        : item,
    ));
    triggerToast('Panel recommendation cancelled. The reserved panel workload has been released.');
    await loadData();
  };

  if (initialRecommendationId && !selectedRecommendation) return <RecordPage title="Panel recommendation" backLabel="Back to Panel Appointments" onBack={navigateToList}>
    {loading ? <LoadingState message="Loading panel recommendation…" /> : error ? <ErrorState message={error} onRetry={loadData} /> : <EmptyState title="Recommendation not found" description="This recommendation does not exist or is outside your access." />}
  </RecordPage>;

  return (
    <div id="lecturer-panel-module-container" className="space-y-6 text-left pb-12">
      
      <PortalToast message={toastText} />

      {/* RENDER LAYOUT 1: MAIN LISTING PORTAL VIEW */}
      {routeView === 'list' && (
        <div id="main-panel-listing-view" className="space-y-6">
          
          <PageHeader
            title={isCoordinator ? 'Panel Recommendation Coordinator Review' : 'Panel Appointments'}
            subtitle={
              isCoordinator
                ? coordinatorProgrammeLabel
                  ? `Confirm recommendations and monitor panel workflow records for ${coordinatorProgrammeLabel}.`
                  : 'No managed programme is assigned to this coordinator account.'
                : 'Recommend panel members for your supervisees and view students assigned to you as panel member.'
            }
            subtitleClassName="leading-relaxed max-w-4xl"
            className="select-none"
            actions={<PortalButton size="sm" icon={RefreshCw} disabled={loading} onClick={loadData}>Refresh appointments</PortalButton>}
          />

          {loading ? <LoadingState message="Loading panel appointments…" /> : error ? <ErrorState message={error} onRetry={loadData} /> : <>
          {!isCoordinator ? (
            <div id="panel-metrics-summary-grid" className="grid gap-5 md:grid-cols-2">
              <AppointmentSummaryCard title="Panel Workload" value={activeAssignmentsCount}
                progress={{ current: activeAssignmentsCount, max: workloadLimit }}
                badge={ownPanelCapacity?.capacityState ? capacityStateLabel(ownPanelCapacity.capacityState) : 'Not configured'}
                tone={ownPanelCapacity?.selectable ? 'success' : 'warning'}
                description={`${ownPanelCapacity?.semesterCode ?? 'No active semester'} · ${ownPanelCapacity?.capacityPlanVersion ? `Plan v${ownPanelCapacity.capacityPlanVersion}` : 'Plan not configured'}${ownPanelCapacity?.unavailableUntil ? ` · Unavailable until ${ownPanelCapacity.unavailableUntil}` : ''} · Includes assignments and reservations.`} />
              <AppointmentSummaryCard title="Pending Panel Reviews" value={activeReviewQueue.length}
                badge={activeReviewQueue.length ? 'Review needed' : 'Up to date'} tone={activeReviewQueue.length ? 'warning' : 'success'}
                description={`${activeRecommendationsCount} nominations you submitted are awaiting a decision.`} />
            </div>
          ) : <AppointmentSummaryCard title="Pending Coordinator Reviews" value={coordinatorWorkspace?.pendingCount ?? 0}
            description={coordinatorProgrammeLabel ? `Recommendations for ${coordinatorProgrammeLabel} that passed selected panel acceptance.` : 'No programme is assigned. Approval records are protected until an assignment is configured.'} />}

          {/* ROLE REVIEW QUEUE */}
          <AppointmentSection id="panel-role-review-queue" title={isCoordinator ? 'Programme Coordinator Review Queue' : 'Selected Panel Review Queue'}
            description={isCoordinator ? 'Final decisions are available only after selected panel acceptance.' : 'Panel nominations assigned to you for acceptance or rejection.'}
            actions={!isCoordinator ? <PortalButton size="sm" onClick={onNavigateToReviewed}>Reviewed Requests</PortalButton> : undefined}>
            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs">
              <div className="overflow-x-auto">
                <table className="data-table min-w-[860px] text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
                      <th className="data-th py-4 px-6">Student</th>
                      <th className="data-th py-4 px-6">Selected Panel</th>
                      <th className="data-th py-4 px-6">Status</th>
                      <th className="data-th py-4 px-6">Waiting</th>
                      <th className="data-th py-4 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-brand-navy">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="card-description p-0">
                          <LoadingState message="Loading review queue…" />
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={5} className="card-description p-0">
                          <ErrorState message={error} onRetry={loadData} />
                        </td>
                      </tr>
                    ) : activeReviewQueue.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="card-description py-10 text-center text-slate-400">
                          No panel recommendations require your decision right now.
                        </td>
                      </tr>
                    ) : (
                      activeReviewQueue.map((recommendation) => (
                        <tr key={`review-${recommendation.id ?? recommendation.studentId}`} className="hover:bg-slate-50/40 transition-colors">
                          <td className="data-td py-5 px-6">
                            <span className="card-value text-brand-navy block">
                              {recommendation.studentName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold block mt-0.5">
                              {recommendation.studentId}
                            </span>
                          </td>
                          <td className="data-td py-5 px-6">
                            <span className="card-value text-slate-700 block">
                              {recommendation.recommendedMember}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold block mt-0.5">
                              {recommendation.recommendedMemberId}
                            </span>
                          </td>
                          <td className="data-td py-5 px-6">
                            <StatusBadge
                              tone={getRecommendationTone(recommendation.status)}
                              dot
                              className="text-[9px] px-2.5 py-0.5"
                            >
                              {PANEL_RECOMMENDATION_STATUS_LABELS[recommendation.status]}
                            </StatusBadge>
                          </td>
                          <td className="data-td-strong py-5 px-6 text-slate-500">
                            {formatWaitingText(recommendation)}
                          </td>
                          <td className="data-td py-5 px-6 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onNavigateToDossier?.(recommendation.studentId)}
                                className="text-[9px] font-black uppercase text-blue-700 hover:underline"
                              >
                                View student record
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReviewerRole(activeReviewRole);
                                  setSelectedRecommendationReadOnly(false);
                                  setSelectedRecommendation(recommendation);
                                }}
                                className="inline-flex items-center gap-1.5 bg-brand-navy hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all select-none cursor-pointer shadow-3xs border border-brand-navy"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Review</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </AppointmentSection>

          {!isCoordinator && (
            <AppointmentSection id="panel-supervisors-recommendations-layout" title="Panel Recommendations for My Supervisees"
              description="Choose a supervisee to nominate a Panel member or request a replacement."
              actions={<PortalButton size="sm" onClick={onNavigateToSubmitted}>View Submitted Recommendations</PortalButton>}>
              {eligibleSupervisees.length > 0 ? <>
                <label className="form-label block">Select Supervisee
                  <select className="form-control form-control-sm mt-1" value={selectedSuperviseeId ?? ''} onChange={event => setSelectedSuperviseeId(event.target.value)}>
                    {eligibleSupervisees.map(student => <option key={student.studentId} value={student.studentId}>{student.studentName} · {student.studentId}</option>)}
                  </select>
                </label>
                {recommendationStudent && <LecturerPanelSuperviseeCard student={recommendationStudent}
                  status={currentRecommendation ? PANEL_RECOMMENDATION_STATUS_LABELS[currentRecommendation.status] : selectedSupervisee?.panelAppointmentId ? 'Panel Active' : 'Recommendation Needed'}
                  tone={currentRecommendation ? getRecommendationTone(currentRecommendation.status) : selectedSupervisee?.panelAppointmentId ? 'success' : 'warning'}
                  canRecommend={canRecommendForStudent} replacement={Boolean(replacementAssignment)} onRecommend={() => setIsRecommendDrawerOpen(true)} />}
              </> : <EmptyState title="No supervisees available for Panel nomination" description="Students with active primary supervision will appear here." />}
            </AppointmentSection>
          )}

          {isCoordinator && (
            <PanelRecommendationRecordsTable
              title="Programme Panel Recommendation Records"
              subtitle={coordinatorProgrammeLabel
                ? `Read-only lifecycle records for ${coordinatorProgrammeLabel}. Approval actions remain in the queue above.`
                : 'No programme records can be displayed until a managed programme is assigned.'}
              records={coordinatorWorkspace?.records ?? []}
              showSupervisor
              onViewDossier={(recommendation) => onNavigateToDossier?.(recommendation.studentId)}
              onView={(recommendation) => {
                setSelectedReviewerRole('PROGRAMME_COORDINATOR');
                setSelectedRecommendationReadOnly(true);
                setSelectedRecommendation(recommendation);
              }}
            />
          )}

          {/* MY PANEL ASSIGNMENTS DATA SECTION */}
          {!isCoordinator && (
          <AppointmentSection id="panel-assignments-roster" title="My Panel Assignments" description="Students where you have been assigned as the Panel member.">
            {assignments.length > 1 && <label className="form-label block">Find a Panel assignment<input type="search" className="form-control form-control-sm mt-1" placeholder="Name, student ID, research title or supervisor" value={assignmentSearch} onChange={event => setAssignmentSearch(event.target.value)} /></label>}
            {/* Table data shell */}
            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs text-left font-sans">
              <div className="overflow-x-auto">
                  <table className="data-table min-w-[850px] text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
                      <th className="data-th py-4 px-6">STUDENT ID</th>
                      <th className="data-th py-4 px-6">STUDENT NAME</th>
                      <th className="data-th py-4 px-6">RESEARCH TITLE</th>
                      <th className="data-th py-4 px-6">SUPERVISOR</th>
                      <th className="data-th py-4 px-6">APPT. DATE</th>
                      <th className="data-th py-4 px-6">STATUS</th>
                      <th className="data-th py-4 px-6 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-brand-navy">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="card-description p-0">
                          <LoadingState message="Loading panel assignments…" />
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={7} className="card-description p-0">
                          <ErrorState message={error} onRetry={loadData} />
                        </td>
                      </tr>
                    ) : visibleAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="card-description py-12 text-center text-slate-400">
                          {assignmentSearch.trim() ? 'No matching Panel assignments.' : 'No panel assignments yet.'}
                        </td>
                      </tr>
                    ) : (
                      visibleAssignments.map((asg) => (
                      <tr key={asg.studentId} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-5 px-6 font-mono font-black text-slate-550 select-all shrink-0">
                          {asg.studentId}
                        </td>
                        <td className="data-td py-5 px-6">
                          <div className="flex items-center gap-3 select-all">
                            <div className="w-7 h-7 bg-slate-100 text-slate-700 font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-3xs">
                              {asg.initials}
                            </div>
                            <span className="card-value text-brand-navy block">
                              {asg.studentName}
                            </span>
                          </div>
                        </td>
                        <td className="data-td py-5 px-6 text-slate-500 max-w-[260px] truncate select-all" title={asg.researchTitle}>
                          {asg.researchTitle}
                        </td>
                        <td className="data-td-strong py-5 px-6 text-slate-700">
                          {asg.supervisor}
                        </td>
                        <td className="data-td-strong py-5 px-6 text-slate-400">
                          {asg.appointmentDate}
                        </td>
                        <td className="data-td py-5 px-6">
                          <StatusBadge tone={asg.status === 'ACTIVE' ? 'success' : asg.status === 'COMPLETED' ? 'neutral' : 'warning'}>{asg.status}</StatusBadge>
                        </td>
                        <td className="data-td py-5 px-6 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onNavigateToDossier?.(asg.studentId)}
                              className="text-[9px] font-black uppercase text-blue-700 hover:underline"
                            >
                              View student record
                            </button>
                            <button
                              onClick={() => onNavigateToAssignment?.(asg.studentId)}
                              className="inline-flex items-center gap-1 bg-brand-navy hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all select-none cursor-pointer shadow-3xs border border-brand-navy"
                            >
                              <span>View Assignment</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </AppointmentSection>
          )}
          </>}
          {!isCoordinator && <LecturerAppointmentGuidance module="panel" />}
        </div>
      )}

      {/* RENDER LAYOUT 2: SUBMITTED RECOMMENDATIONS HISTORY */}
      {routeView === 'submitted' && (
        <SubmittedRecommendationsPage
          onBack={navigateToList}
          recommendations={combinedRecommendations}
          onCancelRecommendation={handleCancelRecommendation}
        />
      )}

      {/* RENDER LAYOUT 3: SELECTED PANEL REVIEWED REQUESTS HISTORY */}
      {routeView === 'reviewed' && !isCoordinator && (
        <div id="reviewed-panel-requests-page" className="space-y-6">
          <PageHeader
            title="Reviewed Requests"
            subtitle="Your selected-panel decisions and cancelled requests, including their later coordinator outcome."
            backLabel="Back to Panel Appointments"
            onBack={navigateToList}
            className="select-none"
          />
          <PanelRecommendationRecordsTable
            title="Reviewed Requests"
            subtitle="Read-only history of selected-panel decisions and requests cancelled before a decision."
            records={reviewedRequests}
            onViewDossier={(recommendation) => onNavigateToDossier?.(recommendation.studentId)}
            onView={(recommendation) => {
              setSelectedReviewerRole('SELECTED_PANEL');
              setSelectedRecommendationReadOnly(true);
              setSelectedRecommendation(recommendation);
            }}
          />
        </div>
      )}

      {/* RENDER LAYOUT 3: PANEL ASSIGNMENT DETAIL PAGE */}
      {routeView === 'assignmentDetail' && loading && (
        <RecordPage title="Panel Assignment Detail" backLabel="Back to Panel Appointments" onBack={navigateToList}><LoadingState message="Loading panel assignment…" /></RecordPage>
      )}

      {routeView === 'assignmentDetail' && !loading && error && (
        <RecordPage title="Panel Assignment Detail" backLabel="Back to Panel Appointments" onBack={navigateToList}><ErrorState message={error} onRetry={loadData} /></RecordPage>
      )}

      {routeView === 'assignmentDetail' && !loading && !error && selectedAssignment && (
        <PanelAssignmentDetail
          assignment={selectedAssignment}
          onBack={navigateToList}
          onOpenMarksEntry={() => {
            triggerToast(`Redirecting to Marks Entry dashboard to grade candidate: ${selectedAssignment.studentName}.`);
          }}
        />
      )}

      {routeView === 'assignmentDetail' && !loading && !error && !selectedAssignment && (
        <RecordPage title="Panel Assignment Detail" backLabel="Back to Panel Appointments" onBack={navigateToList}><EmptyState
          title="Panel assignment not found"
          description="The requested panel assignment does not exist or is no longer available."
        /></RecordPage>
      )}

      {/* RIGHT SLIDING DRAWER: RECOMMEND PANEL MEMBER DRAWER */}
      {recommendationStudent && (
        <RecommendPanelMemberDrawer
          isOpen={isRecommendDrawerOpen}
          busy={mutationBusy}
          onClose={() => setIsRecommendDrawerOpen(false)}
          student={recommendationStudent}
          candidates={panelCandidates.filter(
            (candidate) => candidate.staffId !== replacementAssignment?.currentPanelMemberId,
          )}
          replacementMember={replacementAssignment?.currentPanelMember}
          onSubmit={(notes, candidateId, replacementReason) => {
            createRecommendation(notes, candidateId, replacementReason);
          }}
        />
      )}

      <PanelRecommendationReviewDrawer
        isOpen={selectedRecommendation !== null}
        routed={!!initialRecommendationId}
        busy={mutationBusy}
        onClose={() => {
          setSelectedRecommendation(null);
          setSelectedRecommendationReadOnly(false);
          if (initialRecommendationId) navigateToList();
        }}
        recommendation={selectedRecommendation}
        reviewerRole={selectedReviewerRole}
        onAccept={handleReviewAccept}
        onReject={handleReviewReject}
        readOnly={selectedRecommendationReadOnly}
        onAppointmentEnded={async () => {
          setSelectedRecommendation(null);
          setSelectedRecommendationReadOnly(false);
          await loadData();
          triggerToast('Panel appointment ended. Workload and records were refreshed.');
        }}
      />

    </div>
  );
};
