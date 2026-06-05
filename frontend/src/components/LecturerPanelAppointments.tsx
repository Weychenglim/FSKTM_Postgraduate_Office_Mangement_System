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
  CheckSquare,
  Award,
  Filter,
  Check,
  Building,
  Download,
  Eye,
  Info,
  Calendar,
  AlertTriangle,
  Send,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PortalToast, ProgressBar, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { RecommendPanelMemberDrawer } from './RecommendPanelMemberDrawer';
import { SubmittedRecommendationsPage } from './SubmittedRecommendationsPage';
import { PanelAssignmentDetail } from './PanelAssignmentDetail';
import { PanelAssignment, PanelRecommendationDraft, SubmittedRecommendation } from '../types';
import { getPanelAssignments, getPanelRecommendationDrafts, getPanelRecommendations } from '../services';
import {
  PANEL_RECOMMENDATION_STATUS_LABELS,
  PanelRecommendationReviewerRole,
  canReviewPanelRecommendation,
  canCreatePanelRecommendation,
} from '../utils/panelRecommendationWorkflow';

// ==================== SUB-COMPONENTS & TYPES ====================

// PanelAssignment, PanelRecommendationDraft and SubmittedRecommendation now
// live in src/types.

const RECOMMENDATION_STUDENT = {
  studentId: 'MEA2209841',
  studentName: 'Ahmad Luqman',
  programme: 'MSc. Computer Science',
  intake: 'Sem 1 2025/2026',
  supervisor: 'Dr. Siti Noor',
  initials: 'AL',
  proposedTopic: 'Optimizing Generative Adversarial Networks for Low-Resource Languages',
  area: 'Artificial Intelligence',
  abstract: 'This research explores novel architectural improvements for GANs to improve synthetic data quality in languages with limited linguistic resources, aiming to enhance machine translation and speech recognition accuracy in indigenous contexts.',
};

const PANEL_CANDIDATES = {
  amina: {
    name: 'Assoc. Prof. Dr. Amina Malik',
    lecturerId: 'A004812',
  },
  siti: {
    name: 'Dr. Siti Noor',
    lecturerId: 'A004918',
  },
  robert: {
    name: 'Dr. Robert Chen',
    lecturerId: 'A002931',
  },
  aris: {
    name: 'Dr. Aris Ghaffar',
    lecturerId: 'A003328',
  },
} as const;

const getPanelCandidate = (candidateId: string) =>
  PANEL_CANDIDATES[candidateId as keyof typeof PANEL_CANDIDATES] ?? PANEL_CANDIDATES.aris;

const isPendingPanelRecommendation = (recommendation: PanelRecommendationDraft) =>
  recommendation.status === 'SUBMITTED_TO_PANEL' ||
  recommendation.status === 'ACCEPTED_BY_PANEL' ||
  recommendation.status === 'PENDING_COORDINATOR';

const getRecommendationTone = (status: PanelRecommendationDraft['status']) => {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED_BY_PANEL' || status === 'REJECTED_BY_COORDINATOR') return 'danger' as const;
  if (status === 'DRAFT') return 'warning' as const;
  return 'info' as const;
};

const getPanelReviewText = (status: PanelRecommendationDraft['status']) => {
  if (status === 'DRAFT') return 'Not submitted to selected panel yet.';
  if (status === 'SUBMITTED_TO_PANEL') return 'Waiting for selected panel member response.';
  if (status === 'REJECTED_BY_PANEL') return 'Rejected by selected panel member.';
  return 'Selected panel member accepted.';
};

const getCoordinatorReviewText = (status: PanelRecommendationDraft['status']) => {
  if (status === 'PENDING_COORDINATOR') return 'Waiting for Programme Coordinator final review.';
  if (status === 'APPROVED') return 'Approved as final panel appointment.';
  if (status === 'REJECTED_BY_COORDINATOR') return 'Rejected by Programme Coordinator.';
  if (status === 'REJECTED_BY_PANEL') return 'Not routed because selected panel rejected.';
  return 'Not routed to coordinator yet.';
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
    status === 'ACCEPTED_BY_PANEL' ||
    status === 'PENDING_COORDINATOR' ||
    status === 'APPROVED' ||
    status === 'REJECTED_BY_COORDINATOR';
  const panelRejected = status === 'REJECTED_BY_PANEL';
  const coordinatorActive = status === 'ACCEPTED_BY_PANEL' || status === 'PENDING_COORDINATOR';
  const coordinatorCompleted = status === 'APPROVED';
  const coordinatorRejected = status === 'REJECTED_BY_COORDINATOR';

  return [
    {
      id: 'submitted',
      label: status === 'DRAFT' ? 'Recommendation Drafted' : 'Recommendation Submitted',
      subtext: status === 'DRAFT' ? 'Not submitted to selected panel yet' : recommendation.submittedDate,
      status: status === 'DRAFT' ? 'active' : 'completed',
    },
    {
      id: 'panel',
      label: 'Selected Panel Review',
      subtext: panelRejected
        ? 'Selected panel rejected this recommendation'
        : panelAccepted
        ? 'Selected panel accepted'
        : 'Awaiting selected panel decision',
      status: panelRejected ? 'rejected' : panelAccepted ? 'completed' : status === 'SUBMITTED_TO_PANEL' ? 'active' : 'pending',
    },
    {
      id: 'coordinator',
      label: 'Programme Coordinator Approval',
      subtext: coordinatorRejected
        ? 'Programme Coordinator rejected this recommendation'
        : coordinatorCompleted
        ? 'Programme Coordinator approved'
        : coordinatorActive
        ? 'Awaiting final decision'
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
      label: status === 'APPROVED' ? 'Final Panel Appointment Confirmed' : 'Final Panel Appointment',
      subtext:
        status === 'APPROVED'
          ? 'Recommendation completed'
          : panelRejected || coordinatorRejected
          ? 'Recommendation closed'
          : 'Pending final approval',
      status: status === 'APPROVED' ? 'completed' : panelRejected || coordinatorRejected ? 'rejected' : 'pending',
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
}

const PanelRecommendationReviewDrawer: React.FC<PanelRecommendationReviewDrawerProps> = ({
  isOpen,
  onClose,
  recommendation,
  reviewerRole,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');

  if (!isOpen || !recommendation) return null;

  const canAct = canReviewPanelRecommendation(recommendation.status, reviewerRole);
  const reviewerLabel =
    reviewerRole === 'SELECTED_PANEL'
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
                Panel recommendation approval route
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
                {reviewerRole === 'SUPERVISOR'
                  ? 'As the supervisor who submitted this recommendation, you can only track the approval progress here. The selected panel member and Programme Coordinator must make their own decisions from their own review queues.'
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

            {canAct && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    className="w-full py-4 bg-brand-navy hover:bg-slate-900 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer text-center"
                  >
                    {reviewerRole === 'SELECTED_PANEL' ? 'Accept Panel Nomination' : 'Approve Recommendation'}
                  </button>
                  <button
                    type="button"
                    className="w-full py-3.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer text-center"
                  >
                    {reviewerRole === 'SELECTED_PANEL' ? 'Reject Panel Nomination' : 'Reject Recommendation'}
                  </button>
                </div>

                <div className="space-y-1.5 text-left">
                  <span className="form-label block">REASON FOR REJECTION</span>
                  <textarea
                    className="form-control form-control-md min-h-[124px]"
                    placeholder="Enter reason..."
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    A reason is required before rejecting this panel recommendation.
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

export const LecturerPanelAppointments: React.FC = () => {
  // Navigation states: 'list' | 'submitted' | 'detail'
  const [panelView, setPanelView] = useState<'list' | 'submitted' | 'detail'>('list');
  
  // Right Drawer state
  const [isRecommendDrawerOpen, setIsRecommendDrawerOpen] = useState(false);
  
  // Active selected panel assignment record.
  const [selectedAssignment, setSelectedAssignment] = useState<PanelAssignment | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<PanelRecommendationDraft | null>(null);

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
  const [panelRecommendations, setPanelRecommendations] = useState<SubmittedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getPanelAssignments(), getPanelRecommendationDrafts(), getPanelRecommendations()])
      .then(([asg, drafts, recs]) => {
        setAssignments(asg);
        setSubmittedRecs(drafts);
        setPanelRecommendations(recs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load panel appointments.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Merge the lecturer's own drafts with the submitted-recommendation history so
  // newly recommended items appear immediately at the top of the table.
  const combinedRecommendations = useMemo(() => {
    const customList = submittedRecs
      .filter(r => r.studentId !== 'MEA2400712' && r.studentId !== '17204561')
      .map((r, i) => ({
        id: `REC-2026-${String(100 + i).slice(1)}`,
        studentName: r.studentName,
        studentId: r.studentId,
        researchTitle: r.proposedTopic,
        recommendedPanel: r.recommendedMember,
        date: r.submittedDate,
        status: (r.status === 'APPROVED'
          ? 'Approved'
          : r.status === 'REJECTED_BY_PANEL' || r.status === 'REJECTED_BY_COORDINATOR'
          ? 'Rejected'
          : 'Pending Approval') as 'Approved' | 'Pending Approval' | 'Rejected',
        semester: 'Sem 1 2025/2026',
        programme: r.programme,
        abstract: RECOMMENDATION_STUDENT.abstract,
        justification: r.justification,
      }));

    return [...customList, ...panelRecommendations];
  }, [submittedRecs, panelRecommendations]);

  const currentRecommendation = useMemo(
    () => submittedRecs.find((recommendation) => recommendation.studentId === RECOMMENDATION_STUDENT.studentId) ?? null,
    [submittedRecs],
  );

  const canRecommendForStudent = canCreatePanelRecommendation(submittedRecs, RECOMMENDATION_STUDENT.studentId);

  const createRecommendation = (
    notes: string,
    candidateId: string,
    status: PanelRecommendationDraft['status'],
  ) => {
    if (!canRecommendForStudent) {
      triggerToast(`A ${currentRecommendation ? PANEL_RECOMMENDATION_STATUS_LABELS[currentRecommendation.status] : 'current'} recommendation already exists for ${RECOMMENDATION_STUDENT.studentName}.`);
      return;
    }

    const candidate = getPanelCandidate(candidateId);
    const newRec: PanelRecommendationDraft = {
      studentId: RECOMMENDATION_STUDENT.studentId,
      studentName: RECOMMENDATION_STUDENT.studentName,
      programme: RECOMMENDATION_STUDENT.programme,
      proposedTopic: RECOMMENDATION_STUDENT.proposedTopic,
      recommendedMember: candidate.name,
      recommendedMemberId: candidate.lecturerId,
      submittedDate: '04 Jun 2026',
      status,
      justification: notes,
    };

    setSubmittedRecs([newRec, ...submittedRecs]);
    setIsRecommendDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    triggerToast(
      status === 'DRAFT'
        ? `Draft saved for ${newRec.studentName}.`
        : `Recommendation submitted to selected panel member ${newRec.recommendedMember}.`,
    );
  };

  const activeRecommendationsCount = submittedRecs.filter(isPendingPanelRecommendation).length;

  return (
    <div id="lecturer-panel-module-container" className="space-y-8 animate-fade-in text-left">
      
      <PortalToast message={toastText} />

      {/* RENDER LAYOUT 1: MAIN LISTING PORTAL VIEW */}
      {panelView === 'list' && (
        <div id="main-panel-listing-view" className="space-y-8">
          
          <PageHeader
            title="Panel Appointments"
            subtitle="Recommend panel members for your supervisees and view students assigned to you as panel member."
            subtitleClassName="leading-relaxed max-w-4xl"
            className="select-none"
          />

          {/* TWO DYNAMIC WORKLOAD CARDS */}
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
                  2 <span className="text-slate-300 font-medium">/ 5 Assignments</span>
                </div>
                <ProgressBar value={2} max={5} tone="info" trackClassName="h-2.5 mt-4 bg-slate-100 border border-slate-200/40" />
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

          {/* DYNAMIC LISTING CONTAINER SECTION: PANEL RECOMMENDATIONS */}
          <div id="panel-supervisors-recommendations-layout" className="space-y-4">
            <div className="flex justify-between items-center select-none font-sans">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider block text-left">
                  Panel Recommendations for My Supervisees
                </h3>
                <span className="bg-blue-600 border border-blue-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg">
                  {canRecommendForStudent ? '1 ACTION' : PANEL_RECOMMENDATION_STATUS_LABELS[currentRecommendation?.status ?? 'DRAFT']}
                </span>
              </div>

              <button
                onClick={() => setPanelView('submitted')}
                className="inline-flex items-center gap-2 text-xs font-black text-brand-navy hover:text-slate-800 tracking-wide uppercase px-4 py-2 bg-white border border-slate-200 hover:border-slate-350 shadow-3xs rounded-xl transition-all cursor-pointer"
              >
                <span>View Submitted Recommendations</span>
              </button>
            </div>

            {/* Sub-Layout Cards Box row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              
              {/* Left Recommendation Required Student info */}
              <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-all relative">
                
                {/* Header status bar */}
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 bg-indigo-50 text-brand-navy font-black text-xs rounded-full flex items-center justify-center border border-indigo-100">
                        AL
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-black text-brand-navy leading-snug">
                          {RECOMMENDATION_STUDENT.studentName}
                        </h4>
                        <span className="font-mono text-[10px] text-slate-410 text-slate-400 font-extrabold block">
                          {RECOMMENDATION_STUDENT.studentId}
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
                        {RECOMMENDATION_STUDENT.programme}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                        INTAKE
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 block mt-1">
                        {RECOMMENDATION_STUDENT.intake}
                      </span>
                    </div>
                  </div>

                  {/* Research Title Abstract line */}
                  <div className="mt-5 space-y-1 bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 text-left">
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider text-slate-400 block leading-none select-none">
                      PROPOSED RESEARCH TOPIC
                    </span>
                    <p className="text-xs font-extrabold text-brand-navy leading-relaxed italic mt-1.5 font-sans">
                      "{RECOMMENDATION_STUDENT.proposedTopic}"
                    </p>
                  </div>
                </div>

                {/* Confirm recommend member action button */}
                <button
                  onClick={() => {
                    if (!canRecommendForStudent) {
                      triggerToast(`This student already has a ${PANEL_RECOMMENDATION_STATUS_LABELS[currentRecommendation?.status ?? 'DRAFT']} recommendation.`);
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
                  No other supervisees need panel recommendations right now.
                </p>
              </div>

            </div>
          </div>

          {/* APPROVAL FLOW QUEUE */}
          <div id="panel-recommendation-approval-flow" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider">
                  Recommendation Approval Flow
                </h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-1 leading-none select-none">
                  Supervisor tracking view only. Selected panel member decision comes first, followed by Programme Coordinator final review.
                </p>
              </div>
            </div>

            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs">
              <div className="overflow-x-auto">
                <table className="data-table min-w-[920px] text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
                      <th className="py-4 px-6">Student</th>
                      <th className="py-4 px-6">Selected Panel</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Panel Review</th>
                      <th className="py-4 px-6">Coordinator Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-brand-navy">
                    {submittedRecs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest">
                          No panel recommendations have been drafted or submitted yet.
                        </td>
                      </tr>
                    ) : (
                      submittedRecs.map((recommendation) => (
                        <tr key={`${recommendation.studentId}-${recommendation.recommendedMemberId}`} className="hover:bg-slate-50/40 transition-colors align-top">
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
                            {recommendation.rejectionReason && (
                              <p className="text-[10px] font-semibold text-rose-600 mt-2 leading-relaxed">
                                Reason: {recommendation.rejectionReason}
                              </p>
                            )}
                          </td>
                          <td className="py-5 px-6 min-w-[260px]">
                            <span
                              className={`text-[11px] font-bold leading-relaxed ${
                                recommendation.status === 'REJECTED_BY_PANEL'
                                  ? 'text-rose-600'
                                  : recommendation.status === 'SUBMITTED_TO_PANEL' || recommendation.status === 'DRAFT'
                                  ? 'text-slate-400'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {getPanelReviewText(recommendation.status)}
                            </span>
                          </td>
                          <td className="py-5 px-6 min-w-[230px]">
                            <div className="space-y-3">
                              <span
                                className={`text-[11px] font-bold leading-relaxed block ${
                                  recommendation.status === 'REJECTED_BY_COORDINATOR'
                                    ? 'text-rose-600'
                                    : recommendation.status === 'APPROVED'
                                    ? 'text-emerald-600'
                                    : 'text-slate-400'
                                }`}
                              >
                                {getCoordinatorReviewText(recommendation.status)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedRecommendation(recommendation)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-800 transition cursor-pointer font-black text-[10px] uppercase tracking-wider shadow-3xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span>View Flow</span>
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

          {/* MY PANEL ASSIGNMENTS DATA SECTION */}
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
                  onClick={() => alert("Assignments lookup filters applied.")}
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
                          <button
                            onClick={() => {
                              setSelectedAssignment(asg);
                              setPanelView('detail');
                            }}
                            className="inline-flex items-center gap-1 bg-brand-navy hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all select-none cursor-pointer shadow-3xs border border-brand-navy"
                          >
                            <span>View Assignment</span>
                          </button>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* RENDER LAYOUT 2: SUBMITTED RECOMMENDATIONS HISTORY */}
      {panelView === 'submitted' && (
        <SubmittedRecommendationsPage
          onBack={() => setPanelView('list')}
          recommendations={combinedRecommendations}
        />
      )}

      {/* RENDER LAYOUT 3: PANEL ASSIGNMENT DETAIL PAGE */}
      {panelView === 'detail' && selectedAssignment && (
        <PanelAssignmentDetail
          assignment={selectedAssignment}
          onBack={() => {
            setSelectedAssignment(null);
            setPanelView('list');
          }}
          onOpenMarksEntry={() => {
            alert(`Redirecting to Marks Entry dashboard to grade candidate: ${selectedAssignment.studentName}.`);
          }}
        />
      )}

      {/* RIGHT SLIDING DRAWER: RECOMMEND PANEL MEMBER DRAWER */}
      <RecommendPanelMemberDrawer
        isOpen={isRecommendDrawerOpen}
        onClose={() => setIsRecommendDrawerOpen(false)}
        student={RECOMMENDATION_STUDENT}
        onSubmit={(notes, candidateId) => {
          createRecommendation(notes, candidateId, 'SUBMITTED_TO_PANEL');
        }}
        onSaveDraft={(notes, candidateId) => {
          createRecommendation(notes, candidateId, 'DRAFT');
        }}
      />

      <PanelRecommendationReviewDrawer
        isOpen={selectedRecommendation !== null}
        onClose={() => setSelectedRecommendation(null)}
        recommendation={selectedRecommendation}
        reviewerRole="SUPERVISOR"
      />

    </div>
  );
};
