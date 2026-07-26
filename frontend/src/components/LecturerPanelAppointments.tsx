/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PortalToast, ProgressBar, StatusBadge } from './PortalPrimitives';
import { EmptyState, LoadingState, ErrorState } from './StateViews';
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
  SubmittedRecommendation,
} from '../types';
import {
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
  rejectPanelRecommendation,
  rejectPanelRecommendationByCoordinator,
} from '../services';
import {
  PANEL_RECOMMENDATION_STATUS_LABELS,
  PanelRecommendationReviewerRole,
  canReviewPanelRecommendation,
  canCreatePanelRecommendation,
} from '../utils/panelRecommendationWorkflow';
import { PanelRecommendationRecordsTable } from './PanelRecommendationRecordsTable';
import { WorkflowAuditLog } from './WorkflowAuditLog';
import { compareLongestWaiting, formatWaitingText } from '../utils/workflowAgeing';

// ==================== SUB-COMPONENTS & TYPES ====================

// PanelAssignment, PanelRecommendationDraft and SubmittedRecommendation now
// live in src/types.

const RECOMMENDATION_STUDENT = {
  studentId: 'MEA2209841',
  studentName: 'Ahmad Luqman',
  programme: 'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
  intake: 'Sem 1 2025/2026',
  supervisor: 'Dr. Siti Noor',
  initials: 'AL',
  proposedTopic: 'Optimizing Generative Adversarial Networks for Low-Resource Languages',
  area: 'Artificial Intelligence',
  abstract: 'This research explores novel architectural improvements for GANs to improve synthetic data quality in languages with limited linguistic resources, aiming to enhance machine translation and speech recognition accuracy in indigenous contexts.',
};

type RecommendationStudent = typeof RECOMMENDATION_STUDENT;

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
  if (status === 'CANCELLED_BY_SUPERVISOR') return 'neutral' as const;
  return 'info' as const;
};

type PanelProgressItemStatus = 'completed' | 'active' | 'pending' | 'rejected';

interface PanelProgressItem {
  id: string;
  label: string;
  subtext?: string;
  status: PanelProgressItemStatus;
}

const getPanelRecommendationProgressItems = (
  recommendation: PanelRecommendationDraft,
): PanelProgressItem[] => {
  const status = recommendation.status;
  const panelAccepted =
    status === 'PENDING_COORDINATOR' ||
    status === 'APPROVED' ||
    status === 'REJECTED_BY_COORDINATOR';
  const panelRejected = status === 'REJECTED_BY_PANEL';
  const cancelled = status === 'CANCELLED_BY_SUPERVISOR';
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
      subtext: cancelled
        ? recommendation.cancellationReason || 'Recommendation cancelled by supervisor'
        : panelRejected
        ? 'Selected panel rejected this recommendation'
        : panelAccepted
        ? 'Selected panel accepted'
        : 'Awaiting selected panel decision',
      status: cancelled || panelRejected ? 'rejected' : panelAccepted ? 'completed' : status === 'SUBMITTED_TO_PANEL' ? 'active' : 'pending',
    },
    {
      id: 'coordinator',
      label: 'Programme Coordinator Confirmation',
      subtext: cancelled
        ? 'Not reached because the supervisor cancelled the recommendation'
        : coordinatorRejected
        ? 'Programme Coordinator rejected this recommendation'
        : coordinatorCompleted
        ? 'Programme Coordinator confirmed'
        : coordinatorActive
        ? 'Awaiting Programme Coordinator confirmation'
        : 'Pending selected panel acceptance',
      status: coordinatorRejected
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
          ? recommendation.cancellationReason || 'Cancelled by supervisor'
          : status === 'APPROVED'
          ? 'Recommendation completed'
          : panelRejected || coordinatorRejected
          ? 'Recommendation closed'
          : 'Pending Programme Coordinator confirmation',
      status: status === 'APPROVED' ? 'completed' : cancelled || panelRejected || coordinatorRejected ? 'rejected' : 'pending',
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
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200 block" />
              )}
            </div>
            {!isLast && <div className={`w-[2px] h-10 -mb-4 mt-1 grow ${lineClass}`} />}
          </div>

          <div className="pt-0.5 space-y-0.5 select-none">
            <h5 className={`text-xs font-extrabold ${item.status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
              {item.label}
            </h5>
            {item.subtext && (
              <p className={`text-[10px] font-bold ${item.status === 'pending' ? 'text-slate-350' : 'text-slate-400'}`}>
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
}

const PanelRecommendationReviewDrawer: React.FC<PanelRecommendationReviewDrawerProps> = ({
  isOpen,
  onClose,
  recommendation,
  reviewerRole,
  onAccept,
  onReject,
  readOnly = false,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  useEffect(() => {
    setRejectionReason('');
    setRejectionError(null);
  }, [recommendation?.id, isOpen]);

  if (!isOpen || !recommendation) return null;

  const canAct = !readOnly && canReviewPanelRecommendation(recommendation.status, reviewerRole);
  const reviewerLabel =
    readOnly
      ? 'Recommendation Record'
      : reviewerRole === 'SELECTED_PANEL'
      ? 'Selected Panel Review'
      : reviewerRole === 'PROGRAMME_COORDINATOR'
      ? 'Programme Coordinator Review'
      : 'Supervisor Tracking View';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900"
          onClick={onClose}
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="fixed inset-y-0 right-0 w-screen max-w-md bg-white shadow-sm z-50 border-l border-slate-100 flex flex-col overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white select-none shrink-0">
            <div>
              <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider">
                {reviewerLabel}
              </h3>
              <p className="text-[11px] text-slate-400 font-bold mt-1">
                Panel recommendation confirmation route
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100/80 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                <h4 className="text-sm font-black text-brand-navy leading-snug">
                  {recommendation.studentName}
                </h4>
                <p className="text-[12px] text-slate-500 font-extrabold mt-0.5 leading-none">
                  {recommendation.programme}
                </p>
                <p className="text-[11px] text-slate-400 font-bold mt-1 leading-none">
                  Submitted: {recommendation.submittedDate}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                Recommended Panel Member
              </span>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-xs font-black text-brand-navy">{recommendation.recommendedMember}</p>
                <p className="text-[10px] font-mono text-slate-400 font-bold mt-1">
                  {recommendation.recommendedMemberId}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                Research Topic
              </span>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-600 leading-relaxed">
                {recommendation.proposedTopic}
              </div>
            </div>

            <div className="space-y-2 text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                Justification
              </span>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-600 leading-relaxed">
                {recommendation.justification || 'No justification notes were saved.'}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-y border-slate-100 py-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Current Status
                </span>
                <StatusBadge tone={getRecommendationTone(recommendation.status)} dot>
                  {PANEL_RECOMMENDATION_STATUS_LABELS[recommendation.status]}
                </StatusBadge>
              </div>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
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
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                Request Progress
              </span>
              <PanelRecommendationProgressTimeline
                items={getPanelRecommendationProgressItems(recommendation)}
              />
            </div>

            <WorkflowAuditLog events={recommendation.workflow} />

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
                  <p className={`text-[10px] font-semibold leading-relaxed ${rejectionError ? 'text-rose-600' : 'text-slate-400'}`}>
                    {rejectionError || 'A reason is required before rejecting this panel recommendation.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface LecturerPanelAppointmentsProps {
  currentUser?: DemoUser | null;
  initialRecommendationId?: string;
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
  
  const [selectedRecommendation, setSelectedRecommendation] = useState<PanelRecommendationDraft | null>(null);
  const [selectedReviewerRole, setSelectedReviewerRole] = useState<PanelRecommendationReviewerRole>('SUPERVISOR');
  const [selectedRecommendationReadOnly, setSelectedRecommendationReadOnly] = useState(false);
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
  // history loaded from appointmentsApi (mock-backed today).
  const [assignments, setAssignments] = useState<PanelAssignment[]>([]);
  const [submittedRecs, setSubmittedRecs] = useState<PanelRecommendationDraft[]>([]);
  const [panelReviewQueue, setPanelReviewQueue] = useState<PanelRecommendationDraft[]>([]);
  const [coordinatorReviewQueue, setCoordinatorReviewQueue] = useState<PanelRecommendationDraft[]>([]);
  const [coordinatorWorkspace, setCoordinatorWorkspace] = useState<CoordinatorPanelWorkspace | null>(null);
  const [reviewedRequests, setReviewedRequests] = useState<PanelRecommendationDraft[]>([]);
  const [panelRecommendations, setPanelRecommendations] = useState<SubmittedRecommendation[]>([]);
  const [panelCandidates, setPanelCandidates] = useState<PanelCandidate[]>([]);
  const [eligibleSupervisees, setEligibleSupervisees] = useState<PanelRecommendationSupervisee[]>([]);
  const [selectedSuperviseeId, setSelectedSuperviseeId] = useState<string | null>(null);
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
        ]);

    load
      .then((result) => {
        if (isCoordinator) {
          const [workspace] = result as [CoordinatorPanelWorkspace];
          setAssignments([]);
          setSubmittedRecs([]);
          setPanelRecommendations([]);
          setPanelCandidates([]);
          setEligibleSupervisees([]);
          setSelectedSuperviseeId(null);
          setPanelReviewQueue([]);
          setReviewedRequests([]);
          setCoordinatorWorkspace(workspace);
          setCoordinatorReviewQueue(workspace.queue);
          return;
        }

        const [asg, drafts, recs, panelQueue, history, eligibleSupervisees, candidates] = result as [
          PanelAssignment[],
          PanelRecommendationDraft[],
          SubmittedRecommendation[],
          PanelRecommendationDraft[],
          PanelRecommendationDraft[],
          Awaited<ReturnType<typeof getEligiblePanelSupervisees>>,
          PanelCandidate[],
        ];
        setAssignments(asg);
        setSubmittedRecs(drafts);
        setPanelRecommendations(recs);
        setPanelCandidates(candidates);
        setPanelReviewQueue(panelQueue);
        setCoordinatorReviewQueue([]);
        setCoordinatorWorkspace(null);
        setReviewedRequests(history);
        setEligibleSupervisees(eligibleSupervisees);
        setSelectedSuperviseeId((currentId) => {
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
  }, [isCoordinator]);

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

  // Merge the lecturer's own drafts with the submitted-recommendation history so
  // newly recommended items appear immediately at the top of the table.
  const combinedRecommendations = useMemo(() => {
    const customList = submittedRecs
      .filter(r => r.studentId !== 'MEA2400712' && r.studentId !== '17204561')
      .map((r, i) => ({
        id: r.id !== undefined ? `REC-${String(r.id).padStart(4, '0')}` : `REC-2026-${String(100 + i).slice(1)}`,
        recommendationId: r.id,
        studentName: r.studentName,
        studentId: r.studentId,
        researchTitle: r.proposedTopic,
        recommendedPanel: r.recommendedMember,
        recommendedPanelId: r.recommendedMemberId,
        date: r.submittedDate,
        status: (r.status === 'APPROVED'
          ? 'Approved'
          : r.status === 'CANCELLED_BY_SUPERVISOR'
          ? 'Cancelled'
          : r.status === 'REJECTED_BY_PANEL' || r.status === 'REJECTED_BY_COORDINATOR'
          ? 'Rejected'
          : 'Pending Approval') as SubmittedRecommendation['status'],
        workflowStatus: r.status,
        semester: r.semester || 'Sem 1 2025/2026',
        programme: r.programme,
        researchArea: r.researchArea,
        abstract: r.abstract ?? recommendationStudent?.abstract ?? '',
        justification: r.justification,
        rejectionReason: r.rejectionReason,
        submittedAt: r.submittedAt,
        panelDecisionAt: r.panelDecisionAt,
        coordinatorDecisionAt: r.coordinatorDecisionAt,
        cancelledAt: r.cancelledAt,
        cancellationReason: r.cancellationReason,
        workflow: r.workflow,
        waitingSince: r.waitingSince,
        waitingDays: r.waitingDays,
        waitingOn: r.waitingOn,
      }));

    const seen = new Set<string>();
    return [...customList, ...panelRecommendations].filter((recommendation) => {
      const key = [
        recommendation.studentId,
        recommendation.recommendedPanel,
        recommendation.date,
        recommendation.status,
      ].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [submittedRecs, panelRecommendations, recommendationStudent?.abstract]);

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

  const canRecommendForStudent = recommendationStudent
    ? canCreatePanelRecommendation(submittedRecs, recommendationStudent.studentId)
    : false;

  const createRecommendation = async (
    notes: string,
    candidateId: string,
  ) => {
    if (!recommendationStudent) {
      triggerToast('No supervisee is available for panel recommendation.');
      return;
    }

    if (!canRecommendForStudent) {
      triggerToast(`A ${currentRecommendation ? PANEL_RECOMMENDATION_STATUS_LABELS[currentRecommendation.status] : 'current'} recommendation already exists for ${recommendationStudent.studentName}.`);
      return;
    }

    try {
      const newRec = await createPanelRecommendationApi({
        studentId: recommendationStudent.studentId,
        recommendedMemberId: candidateId,
        justification: notes,
        status: 'SUBMITTED_TO_PANEL',
      });

      setSubmittedRecs([newRec, ...submittedRecs]);
      setIsRecommendDrawerOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      triggerToast(`Recommendation submitted to selected panel member ${newRec.recommendedMember}.`);
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : 'Failed to save panel recommendation.');
    }
  };

  const activeRecommendationsCount = submittedRecs.filter(isPendingPanelRecommendation).length;
  const activeAssignmentsCount = assignments.length;
  // Use workloadLimit from panelCandidates if current user is found, otherwise default to 10.
  const currentUserCandidate = panelCandidates.find(c => c.name === currentUser?.fullName);
  const workloadLimit = currentUserCandidate ? currentUserCandidate.workloadLimit : 10;
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
    }
  };

  const handleReviewReject = async (recommendation: PanelRecommendationDraft, reason: string) => {
    if (recommendation.id === undefined) {
      triggerToast('This recommendation cannot be updated because it has no backend ID.');
      return;
    }

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
    }
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

  return (
    <div id="lecturer-panel-module-container" className="space-y-8 animate-fade-in text-left">
      
      <PortalToast message={toastText} />

      {/* RENDER LAYOUT 1: MAIN LISTING PORTAL VIEW */}
      {routeView === 'list' && (
        <div id="main-panel-listing-view" className="space-y-8">
          
          <PageHeader
            title={isCoordinator ? 'Panel Recommendation Coordinator Review' : 'Panel Appointments'}
            subtitle={
              isCoordinator
                ? coordinatorWorkspace?.programme
                  ? `Confirm recommendations and monitor panel workflow records for ${coordinatorWorkspace.programme}.`
                  : 'No managed programme is assigned to this coordinator account.'
                : 'Recommend panel members for your supervisees and view students assigned to you as panel member.'
            }
            subtitleClassName="leading-relaxed max-w-4xl"
            className="select-none"
          />

          {/* TWO DYNAMIC WORKLOAD CARDS */}
          {!isCoordinator ? (
          <div id="panel-metrics-summary-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
            
            {/* CARD 1: PANEL WORKLOAD */}
            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-auto relative overflow-hidden group hover:border-[#cbd5e1] transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                    Panel Workload
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 block pt-0.5 uppercase tracking-wider">
                    Academic Year 2025/2026
                  </span>
                </div>
                <StatusBadge tone="success" dot pulse className="px-3 py-1 text-[9px]">
                  AVAILABLE
                </StatusBadge>
              </div>

              <div className="mt-5">
                <div className="text-3xl font-black text-brand-navy tracking-tight">
                  {activeAssignmentsCount} <span className="text-slate-300 font-medium">/ {workloadLimit} Assignments</span>
                </div>
                <ProgressBar value={activeAssignmentsCount} max={workloadLimit} tone="info" trackClassName="h-2.5 mt-4 bg-slate-100 border border-slate-200/40" />
              </div>
            </div>

            {/* CARD 2: PENDING RECOMMENDATIONS */}
            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-auto relative overflow-hidden group hover:border-[#cbd5e1] transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                    Pending Recommendations
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-blue-200 bg-blue-50 text-blue-600">
                  {activeRecommendationsCount} ACTIVE
                </span>
              </div>

              <div className="mt-4 flex gap-3.5 items-center">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/50 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-[11.5px] text-slate-500 font-semibold leading-normal text-left max-w-sm">
                  Submitted panel recommendations wait for selected panel acceptance before programme coordinator review.
                </p>
              </div>
            </div>

          </div>
          ) : (
            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                  Pending Coordinator Reviews
                </span>
                <p className="text-xs font-semibold text-slate-500 mt-2">
                  {coordinatorWorkspace?.programme
                    ? `Recommendations for ${coordinatorWorkspace.programme} that passed selected panel acceptance.`
                    : 'No programme is assigned. Approval records are protected until an assignment is configured.'}
                </p>
              </div>
              <span className="text-3xl font-black text-brand-navy tracking-tight">
                {coordinatorWorkspace?.pendingCount ?? 0}
              </span>
            </div>
          )}

          {/* DYNAMIC LISTING CONTAINER SECTION: PANEL RECOMMENDATIONS */}
          {!isCoordinator && (
          <div id="panel-supervisors-recommendations-layout" className="space-y-4">
            <div className="flex justify-between items-center select-none font-sans">
              <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider block text-left">
                Panel Recommendations for My Supervisees
              </h3>

              <button
                onClick={onNavigateToSubmitted}
                className="inline-flex items-center gap-2 text-xs font-black text-brand-navy hover:text-slate-800 tracking-wide uppercase px-4 py-2 bg-white border border-slate-200 hover:border-slate-350 shadow-3xs rounded-xl transition-all cursor-pointer"
              >
                <span>View Submitted Recommendations</span>
              </button>
            </div>

            {eligibleSupervisees.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Select Supervisee
                    </span>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      Choose which supervised student to submit or review a panel recommendation for.
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                    {eligibleSupervisees.length} Students
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {eligibleSupervisees.map((student) => {
                    const isSelected = recommendationStudent?.studentId === student.studentId;
                    const recommendation = submittedRecs.find((item) => item.studentId === student.studentId);
                    const statusText = recommendation
                      ? PANEL_RECOMMENDATION_STATUS_LABELS[recommendation.status]
                      : student.canRecommend
                      ? 'Recommendation Needed'
                      : 'Recommendation Active';

                    return (
                      <button
                        key={student.studentId}
                        type="button"
                        onClick={() => setSelectedSuperviseeId(student.studentId)}
                        className={`text-left rounded-xl border px-4 py-3 transition-all ${
                          isSelected
                            ? 'border-brand-navy bg-slate-50 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-brand-navy leading-snug truncate">
                              {student.studentName}
                            </p>
                            <p className="text-[10px] font-mono font-bold text-slate-400 mt-1">
                              {student.studentId}
                            </p>
                          </div>
                          <StatusBadge
                            tone={recommendation ? getRecommendationTone(recommendation.status) : student.canRecommend ? 'warning' : 'info'}
                            dot
                            className="text-[8px] px-2 py-0.5 shrink-0"
                          >
                            {statusText}
                          </StatusBadge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold mt-2 line-clamp-2">
                          {student.proposedTopic}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-Layout Cards Box row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {!recommendationStudent ? (
                <div className="lg:col-span-2 bg-white border border-[#e2e8f0]/40 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center select-none space-y-3 min-h-[220px]">
                  <div className="w-12 h-12 rounded-full border border-slate-150 flex items-center justify-center bg-slate-50 text-slate-400">
                    <Check className="w-5 h-5 text-slate-400 stroke-[2.2]" />
                  </div>
                  <p className="text-slate-400 font-bold text-xs max-w-sm">
                    No supervisees need panel recommendations from this account right now.
                  </p>
                </div>
              ) : (
              <>
              {/* Left Recommendation Required Student info */}
              <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-all relative">
                
                {/* Header status bar */}
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 bg-indigo-50 text-brand-navy font-black text-xs rounded-full flex items-center justify-center border border-indigo-100">
                        {recommendationStudent.initials}
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-black text-brand-navy leading-snug">
                          {recommendationStudent.studentName}
                        </h4>
                        <span className="font-mono text-[10px] text-slate-410 text-slate-400 font-extrabold block">
                          {recommendationStudent.studentId}
                        </span>
                      </div>
                    </div>

                    <StatusBadge
                      tone={currentRecommendation ? getRecommendationTone(currentRecommendation.status) : 'warning'}
                      dot
                      className="text-[9px] px-3 py-1"
                    >
                      {currentRecommendation
                        ? PANEL_RECOMMENDATION_STATUS_LABELS[currentRecommendation.status]
                        : 'Recommendation Needed'}
                    </StatusBadge>
                  </div>

                  {/* Program Intake Info Grid */}
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                        PROGRAMME
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 block mt-1">
                        {recommendationStudent.programme}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                        INTAKE
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 block mt-1">
                        {recommendationStudent.intake}
                      </span>
                    </div>
                  </div>

                  {/* Research Title Abstract line */}
                  <div className="mt-5 space-y-1 bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 text-left">
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider text-slate-400 block leading-none select-none">
                      PROPOSED RESEARCH TOPIC
                    </span>
                    <p className="text-xs font-extrabold text-brand-navy leading-relaxed italic mt-1.5 font-sans">
                      "{recommendationStudent.proposedTopic}"
                    </p>
                  </div>
                </div>

                {/* Confirm recommend member action button */}
                <button
                  onClick={() => {
                    if (!canRecommendForStudent) {
                      triggerToast(`This student already has a ${currentRecommendation ? PANEL_RECOMMENDATION_STATUS_LABELS[currentRecommendation.status] : 'current'} recommendation.`);
                      return;
                    }
                    setIsRecommendDrawerOpen(true);
                  }}
                  disabled={!canRecommendForStudent}
                  className="w-full mt-6 py-3.5 bg-brand-navy text-white hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-sm select-none cursor-pointer text-center"
                >
                  {canRecommendForStudent ? 'Recommend Panel Member' : 'Recommendation Already Active'}
                </button>
              </div>

              {/* Right Empty placeholder card matches mock design */}
              <div className="bg-white border border-[#e2e8f0]/40 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center select-none space-y-3 min-h-[310px]">
                <div className="w-12 h-12 rounded-full border border-slate-150 flex items-center justify-center bg-slate-50 text-slate-400">
                  <Check className="w-5 h-5 text-slate-400 stroke-[2.2]" />
                </div>
              <p className="text-slate-400 font-bold text-xs max-w-xs">
                  Select another supervisee above to review or submit their panel recommendation.
                </p>
              </div>
              </>
              )}

            </div>
          </div>
          )}

          {/* ROLE REVIEW QUEUE */}
          <div id="panel-role-review-queue" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider">
                  {isCoordinator ? 'Programme Coordinator Review Queue' : 'Selected Panel Review Queue'}
                </h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-1 leading-none select-none">
                  {isCoordinator
                    ? 'Final decisions are available only after selected panel acceptance.'
                    : 'Panel nominations assigned to you for acceptance or rejection.'}
                </p>
              </div>

              {!isCoordinator && (
                <button
                  type="button"
                  onClick={onNavigateToReviewed}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-brand-navy shadow-3xs transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span>Reviewed Requests</span>
                </button>
              )}
            </div>

            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs">
              <div className="overflow-x-auto">
                <table className="data-table min-w-[860px] text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
                      <th className="py-4 px-6">Student</th>
                      <th className="py-4 px-6">Selected Panel</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Waiting</th>
                      <th className="py-4 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-brand-navy">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-0">
                          <LoadingState message="Loading review queue…" />
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={5} className="p-0">
                          <ErrorState message={error} onRetry={loadData} />
                        </td>
                      </tr>
                    ) : activeReviewQueue.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest">
                          No panel recommendations require your decision right now.
                        </td>
                      </tr>
                    ) : (
                      activeReviewQueue.map((recommendation) => (
                        <tr key={`review-${recommendation.id ?? recommendation.studentId}`} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-5 px-6">
                            <span className="font-extrabold text-brand-navy block">
                              {recommendation.studentName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold block mt-0.5">
                              {recommendation.studentId}
                            </span>
                          </td>
                          <td className="py-5 px-6">
                            <span className="font-extrabold text-slate-700 block">
                              {recommendation.recommendedMember}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold block mt-0.5">
                              {recommendation.recommendedMemberId}
                            </span>
                          </td>
                          <td className="py-5 px-6">
                            <StatusBadge
                              tone={getRecommendationTone(recommendation.status)}
                              dot
                              className="text-[9px] px-2.5 py-0.5"
                            >
                              {PANEL_RECOMMENDATION_STATUS_LABELS[recommendation.status]}
                            </StatusBadge>
                          </td>
                          <td className="py-5 px-6 text-[11px] font-bold text-slate-500">
                            {formatWaitingText(recommendation)}
                          </td>
                          <td className="py-5 px-6 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onNavigateToDossier?.(recommendation.studentId)}
                                className="text-[9px] font-black uppercase text-blue-700 hover:underline"
                              >
                                View Dossier
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
          </div>

          {isCoordinator && (
            <PanelRecommendationRecordsTable
              title="Programme Panel Recommendation Records"
              subtitle={coordinatorWorkspace?.programme
                ? `Read-only lifecycle records for ${coordinatorWorkspace.programme}. Approval actions remain in the queue above.`
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
          <div id="panel-assignments-roster" className="space-y-4">
            
            {/* Header info */}
            <div>
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider">
                    My Panel Assignments
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-450 text-slate-400 mt-1 leading-none select-none">
                    Students where you have been assigned as the panel member.
                  </p>
                </div>

                <button 
                  onClick={() => triggerToast('Assignments lookup filters applied.')}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer shadow-3xs"
                  title="Filter Assignments"
                >
                  <Filter className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Table data shell */}
            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs text-left font-sans">
              <div className="overflow-x-auto">
                  <table className="data-table min-w-[850px] text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
                      <th className="py-4 px-6">STUDENT ID</th>
                      <th className="py-4 px-6">STUDENT NAME</th>
                      <th className="py-4 px-6">RESEARCH TITLE</th>
                      <th className="py-4 px-6">SUPERVISOR</th>
                      <th className="py-4 px-6">APPT. DATE</th>
                      <th className="py-4 px-6">STATUS</th>
                      <th className="py-4 px-6 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-brand-navy">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <LoadingState message="Loading panel assignments…" />
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <ErrorState message={error} onRetry={loadData} />
                        </td>
                      </tr>
                    ) : assignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                          No panel assignments yet.
                        </td>
                      </tr>
                    ) : (
                      assignments.map((asg) => (
                      <tr key={asg.studentId} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-5 px-6 font-mono font-black text-slate-550 select-all shrink-0">
                          {asg.studentId}
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3 select-all">
                            <div className="w-7 h-7 bg-slate-100 text-slate-700 font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-3xs">
                              {asg.initials}
                            </div>
                            <span className="font-extrabold text-brand-navy block">
                              {asg.studentName}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-6 font-semibold text-slate-500 max-w-[260px] truncate select-all" title={asg.researchTitle}>
                          {asg.researchTitle}
                        </td>
                        <td className="py-5 px-6 font-black text-slate-700">
                          {asg.supervisor}
                        </td>
                        <td className="py-5 px-6 font-extrabold text-slate-400">
                          {asg.appointmentDate}
                        </td>
                        <td className="py-5 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                            {asg.status}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onNavigateToDossier?.(asg.studentId)}
                              className="text-[9px] font-black uppercase text-blue-700 hover:underline"
                            >
                              View Dossier
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

          </div>
          )}

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
            subtitle="Recommendations you accepted or rejected as the selected panel lecturer, including their later coordinator outcome."
            backLabel="Back to Panel Appointments"
            onBack={navigateToList}
            className="select-none"
          />
          <PanelRecommendationRecordsTable
            title="Reviewed Requests"
            subtitle="Use this page as your read-only history for selected-panel decisions already made."
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
        <LoadingState message="Loading panel assignment…" />
      )}

      {routeView === 'assignmentDetail' && !loading && error && (
        <ErrorState message={error} onRetry={loadData} />
      )}

      {routeView === 'assignmentDetail' && selectedAssignment && (
        <PanelAssignmentDetail
          assignment={selectedAssignment}
          onBack={navigateToList}
          onOpenMarksEntry={() => {
            triggerToast(`Redirecting to Marks Entry dashboard to grade candidate: ${selectedAssignment.studentName}.`);
          }}
        />
      )}

      {routeView === 'assignmentDetail' && !loading && !error && !selectedAssignment && (
        <EmptyState
          title="Panel assignment not found"
          description="The requested panel assignment does not exist or is no longer available."
          actionLabel="Back to Panel Appointments"
          onAction={navigateToList}
        />
      )}

      {/* RIGHT SLIDING DRAWER: RECOMMEND PANEL MEMBER DRAWER */}
      {recommendationStudent && (
        <RecommendPanelMemberDrawer
          isOpen={isRecommendDrawerOpen}
          onClose={() => setIsRecommendDrawerOpen(false)}
          student={recommendationStudent}
          candidates={panelCandidates}
          onSubmit={(notes, candidateId) => {
            createRecommendation(notes, candidateId);
          }}
        />
      )}

      <PanelRecommendationReviewDrawer
        isOpen={selectedRecommendation !== null}
        onClose={() => {
          setSelectedRecommendation(null);
          setSelectedRecommendationReadOnly(false);
        }}
        recommendation={selectedRecommendation}
        reviewerRole={selectedReviewerRole}
        onAccept={handleReviewAccept}
        onReject={handleReviewReject}
        readOnly={selectedRecommendationReadOnly}
      />

    </div>
  );
};
