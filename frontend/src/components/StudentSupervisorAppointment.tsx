/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { 
  Users, 
  Eye, 
  Plus, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  Layers,
  FileText,
  Building,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SupervisorAppointmentApplicationPage } from './SupervisorAppointmentApplicationPage';
import { StudentSupervisorApplication, SupervisorApplicationRecord } from '../types';
import {
  cancelSupervisorApplication,
  formatSupervisorWaiting,
  getMySupervisorApplications,
  toStudentSupervisorApplication,
} from '../services';
import { PageHeader, PortalButton, PortalConfirmModal, StatusBadge, StatusDot, getStatusBadgeTone } from './PortalPrimitives';
import { WorkflowAuditLog } from './WorkflowAuditLog';
import { ErrorState, LoadingState } from './StateViews';
import { canStudentCancelSupervisorApplication } from '../utils/workflowTracking';
import { SupervisorApplicationWorkflowStatus, SupervisorWorkflowEvent } from '../types';
import { SupervisorDocumentsList } from './SupervisorDocumentsList';

interface StudentSupervisorAppointmentProps {
  onShowFAQChatbot?: () => void;
  initialApplicationId?: string;
  routeView?: 'overview' | 'newApplication';
  onNavigateToList?: () => void;
  onNavigateToNewApplication?: () => void;
  onNavigateToApplication?: (applicationId: string) => void;
}

type SupervisorApplicationDetail = StudentSupervisorApplication & {
  email?: string;
  dept?: string;
  reg?: string;
  refId?: string;
  submittedDate?: string;
  step1Date?: string;
  history?: { step: string; date: string; status: string }[];
  applicationId?: number;
  workflowStatus?: SupervisorApplicationWorkflowStatus;
  workflow?: SupervisorWorkflowEvent[];
  cancellationReason?: string;
  rejectionReason?: string;
  documents: StudentSupervisorApplication['documents'];
};

export const StudentSupervisorAppointment: React.FC<StudentSupervisorAppointmentProps> = ({
  onShowFAQChatbot,
  initialApplicationId,
  routeView = 'overview',
  onNavigateToList,
  onNavigateToNewApplication,
  onNavigateToApplication,
}) => {
  const [applications, setApplications] = useState<StudentSupervisorApplication[]>([]);
  const [approvedApplication, setApprovedApplication] = useState<SupervisorApplicationRecord | null>(null);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  const loadApplications = useCallback(() => {
    setLoadingApplications(true);
    setApplicationsError(null);
    getMySupervisorApplications()
      .then((records) => {
        setApplications(records.map(toStudentSupervisorApplication));
        setApprovedApplication(records.find((record) => record.status === 'APPROVED') || null);
      })
      .catch((reason) => {
        setApplicationsError(
          reason instanceof Error
            ? reason.message
            : 'Supervisor applications could not be loaded.',
        );
      })
      .finally(() => setLoadingApplications(false));
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const [activeDetailAp, setActiveDetailAp] = useState<SupervisorApplicationDetail | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  useEffect(() => {
    if (!initialApplicationId || applications.length === 0) return;
    const app = applications.find(
      (item) => String(item.applicationId) === String(initialApplicationId),
    );
    if (!app) return;
    setActiveDetailAp({
      applicationId: app.applicationId,
      workflowStatus: app.workflowStatus,
      workflow: app.workflow,
      cancellationReason: app.cancellationReason,
      rejectionReason: app.rejectionReason,
      documents: app.documents,
      id: app.id,
      supervisor: app.supervisor,
      title: app.title,
      researchArea: app.researchArea,
      status: app.status,
      date: app.date,
      submittedDate: app.date,
      step1Date: app.date,
      waitingSince: app.waitingSince,
      waitingDays: app.waitingDays,
      waitingOn: app.waitingOn,
    });
  }, [applications, initialApplicationId]);

  const performCancelRequest = async () => {
    if (!activeDetailAp?.applicationId || !activeDetailAp.workflowStatus) return;
    const reason = cancellationReason.trim();
    setIsCancelling(true);
    setCancellationError(null);
    try {
      const updated = await cancelSupervisorApplication(activeDetailAp.applicationId, reason);
      const mapped = toStudentSupervisorApplication(updated);
      setApplications((items) =>
        items.map((item) => item.applicationId === mapped.applicationId ? mapped : item),
      );
      setActiveDetailAp(null);
      setCancellationReason('');
      setIsCancelConfirmOpen(false);
    } catch (error) {
      setCancellationError(error instanceof Error ? error.message : 'Failed to cancel the request.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelRequest = () => {
    const reason = cancellationReason.trim();
    if (!reason) {
      setCancellationError('Please provide a cancellation reason.');
      return;
    }
    setCancellationError(null);
    setIsCancelConfirmOpen(true);
  };

  const handleCreateNewApplication = () => {
    onNavigateToNewApplication?.();
  };

  const closeActiveDetail = () => {
    setActiveDetailAp(null);
    if (initialApplicationId) {
      onNavigateToList?.();
    }
  };

  if (routeView === 'newApplication') {
    return (
      <SupervisorAppointmentApplicationPage
        onBack={onNavigateToList ?? (() => undefined)}
        onSuccess={(newApp) => {
          setApplications(prev => [newApp, ...prev]);
          onNavigateToList?.();
        }}
      />
    );
  }

  if (loadingApplications) {
    return <LoadingState message="Loading supervisor appointments..." />;
  }

  if (applicationsError) {
    return (
      <ErrorState
        message={applicationsError}
        onRetry={loadApplications}
      />
    );
  }

  return (
    <div id="student-supervisor-app-workspace" className="space-y-6 text-left font-sans pb-12">
      <PortalConfirmModal
        isOpen={isCancelConfirmOpen}
        title="Cancel supervisor request?"
        message="This workflow attempt will be closed permanently and cannot be restored. You may submit a new supervisor request after cancellation."
        confirmLabel="Cancel Request"
        cancelLabel="Keep Request"
        tone="danger"
        isLoading={isCancelling}
        onConfirm={performCancelRequest}
        onCancel={() => setIsCancelConfirmOpen(false)}
      />

      
      <PageHeader
        title="Supervisor Appointment"
        subtitle="View your current supervisor details and track submitted supervisor appointment applications."
      />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION: CURRENT APPROVED SUPERVISOR CARD                        */}
      {/* ========================================================================= */}
      <div 
        id="hero-supervisor-container" 
        className="bg-white border-2 border-indigo-100 rounded-2xl shadow-3xs p-5 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden transition hover:shadow-xs"
      >
        {/* Subtle top banner strip matching university royal slate */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-navy" />

        {/* Dynamic Watermark Indicator */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-5 select-none pointer-events-none">
          <Users className="w-64 h-64 text-brand-navy" />
        </div>

        {/* Left pane: Avatar & Identity block */}
        <div className="flex items-start md:items-center gap-5 min-w-0">
          {/* Circular initials badge */}
          <div className="relative shrink-0 select-none">
            <div className="w-18 h-18 md:w-22 md:h-22 rounded-full bg-brand-navy text-white flex items-center justify-center text-xl md:text-2xl font-black shadow-sm border-3 border-indigo-50/50">
              {approvedApplication
                ? approvedApplication.proposedSupervisor.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
                : 'NA'}
            </div>
            {/* Active Status indicator badge */}
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse" />
          </div>

          <div className="space-y-1.5 min-w-0">
            {/* Head info role & Badge row */}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight block">
                {approvedApplication?.proposedSupervisor || 'No approved supervisor'}
              </h2>
              <StatusBadge tone={approvedApplication ? 'success' : 'neutral'} icon={approvedApplication ? CheckCircle : Clock}>
                {approvedApplication ? 'Approved' : 'Not appointed'}
              </StatusBadge>
            </div>

            <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Faculty of Computing & Information Technology</span>
            </p>

            <div className="pt-1.5 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest text-brand-navy/60">
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                ID: {approvedApplication?.proposedSupervisorId || 'Not available'}
              </span>
            </div>
          </div>
        </div>

        {/* Middle pane: Technical Research Area Details */}
        <div className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-6 text-left">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Research Area</span>
            </span>
            <span className="text-xs font-extrabold text-slate-800 block">
              {approvedApplication?.researchArea || (approvedApplication ? 'Not recorded' : 'Awaiting appointment')}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Appointment Date</span>
            </span>
            <span className="text-xs font-semibold text-slate-700 block font-mono">
              {approvedApplication?.coordinatorDecisionAt
                ? new Date(approvedApplication.coordinatorDecisionAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Not available'}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <BookOpen className="w-3 h-3 text-slate-400" />
              <span>Semester Allocated</span>
            </span>
            <span className="text-xs font-extrabold text-slate-800 block">
              {approvedApplication?.semester || 'Not available'}
            </span>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Current Approved Research Title</span>
            </span>
            <span className="text-xs font-extrabold text-brand-navy block italic leading-tight">
              {approvedApplication?.researchTitle || 'No approved research title'}
            </span>
          </div>
        </div>

        {/* Right pane: Action buttons stack */}
        <div className="flex flex-col gap-2 shrink-0 md:w-56">
          <PortalButton
            type="button"
            disabled={!approvedApplication}
            onClick={() => {
              if (!approvedApplication) return;
              onNavigateToApplication?.(String(approvedApplication.id));
            }}
            variant="primary"
            size="md"
            icon={Eye}
            fullWidth
          >
            View Details
          </PortalButton>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN SECTION: SUBMITTED APPLICATIONS HISTORY TABLE                    */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs">
        
        {/* Table header row */}
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-0.5 text-left select-none">
            <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider">
              Submitted Supervisor Appointment Applications
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Track historical applications and statuses
            </p>
          </div>

          <PortalButton
            type="button"
            onClick={handleCreateNewApplication}
            variant="primary"
            size="md"
            icon={Plus}
          >
            New Application
          </PortalButton>
        </div>

        {/* Data Table implementation */}
        <div className="overflow-x-auto">
              <table className="data-table min-w-[820px] text-xs">
            <thead>
              <tr className="border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase tracking-wider select-none bg-slate-50/20">
                <th className="py-4 px-6 w-32">Application ID</th>
                <th className="py-4 px-4 w-2/5">Research Title</th>
                <th className="py-4 px-4">Proposed Supervisor</th>
                <th className="py-4 px-4 w-28">Submitted Date</th>
                <th className="py-4 px-4 w-44">Waiting</th>
                <th className="py-4 px-4 w-32 text-center">Status</th>
                <th className="py-4 px-6 w-20 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-sans text-slate-700">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/30 transition">
                  {/* ID */}
                  <td className="py-4.5 px-6 font-mono font-bold text-brand-navy">
                    {app.id}
                  </td>
                  {/* Title */}
                  <td className="py-4.5 px-4 font-semibold text-slate-800 leading-relaxed">
                    {app.title}
                  </td>
                  {/* Supervisor name */}
                  <td className="py-4.5 px-4 font-extrabold text-slate-700">
                    {app.supervisor}
                  </td>
                  {/* Date */}
                  <td className="py-4.5 px-4 font-semibold text-slate-500 font-mono">
                    {app.date}
                  </td>
                  <td className="py-4.5 px-4 font-semibold text-slate-500">
                    {formatSupervisorWaiting(app)}
                  </td>
                  {/* Status chip badge */}
                  <td className="py-4.5 px-4 text-center">
                    <StatusBadge
                      tone={getStatusBadgeTone(app.status)}
                      dot
                      pulse={app.status === 'PENDING REVIEW'}
                      className="text-[9px] px-2.5 py-0.5"
                    >
                      {app.status}
                    </StatusBadge>
                  </td>
                  {/* Action Link Icon */}
                  <td className="py-4.5 px-6 text-center">
                    <PortalButton
                      type="button"
                      onClick={() => {
                        if (app.applicationId !== undefined) {
                          onNavigateToApplication?.(String(app.applicationId));
                        }
                      }}
                      variant="ghost"
                      size="icon"
                      icon={Eye}
                      title="View application metadata"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. SUPPORTING MATERIAL CARDS AT THE BOTTOM                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Eligibility Status */}
        <div className="bg-[#e0f2fe]/40 border border-sky-100 rounded-2xl p-5 shadow-3xs">
          <div className="w-10 h-10 rounded-xl bg-sky-100/70 border border-sky-200/40 flex items-center justify-center text-sky-600 mb-4">
            <Key className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Submission prerequisites
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            New applications require an active semester, supervisor capacity, and the configured supporting documents.
          </p>
        </div>

        {/* Card 2: Review Progress */}
        <div className="bg-[#f3e8ff]/40 border border-[#e9d5ff]/70 rounded-2xl p-5 shadow-3xs">
          <div className="w-10 h-10 rounded-xl bg-purple-100/70 border border-purple-200/40 flex items-center justify-center text-purple-600 mb-4">
            <Clock className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Review Progress
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Review progress follows the recorded faculty workflow. No formal turnaround target is currently configured.
          </p>
        </div>

        {/* Card 3: Need Assistance */}
        <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-55 bg-indigo-50 border border-slate-100 flex items-center justify-center text-indigo-600 mb-4">
            <HelpCircle className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Need Assistance?
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-3">
            Contact the FSKTM Office Directory or use our FAQ Chatbot for technical system issues.
          </p>
          
          <button
            type="button"
            onClick={onShowFAQChatbot}
            className="text-sky-600 hover:text-sky-800 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 group cursor-pointer"
          >
            <span>Launch FAQ Chatbot</span>
            <span className="group-hover:translate-x-0.5 transition-transform font-sans">&rarr;</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* APPROVAL WORKFLOW DRAWER (RIGHT-SIDE SLIDING PANEL OVERLAY)              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeDetailAp && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Dimmed background overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeActiveDetail}
              className="absolute inset-0 bg-brand-navy/40 backdrop-blur-3xs cursor-pointer"
            />
            
            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md md:max-w-md bg-white h-full shadow-sm border-l border-slate-100 flex flex-col text-left z-10"
            >
              
              {/* Drawer Header Area */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
                <h3 className="text-lg font-black text-brand-navy tracking-tight">
                  Approval Workflow
                </h3>
                <button
                  type="button"
                  onClick={closeActiveDetail}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title="Close Drawer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Application metadata summary card */}
                <div className="bg-[#f0f5ff]/60 border border-indigo-50/70 rounded-2xl p-4.5 space-y-3 shadow-3xs select-none">
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <div>
                      <span className="block leading-none">App ID</span>
                      <span className="block text-slate-800 font-extrabold text-xs font-mono mt-1">{activeDetailAp.id}</span>
                    </div>
                    <div>
                      <span className="block leading-none">Supervisor</span>
                      <span className="block text-slate-800 font-extrabold text-xs mt-1">{activeDetailAp.supervisor}</span>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-none">Research Title</span>
                    <span className="text-xs font-bold text-slate-800 italic leading-snug block">
                      &ldquo;{activeDetailAp.title}&rdquo;
                    </span>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-none">Research Area</span>
                    <span className="text-xs font-bold text-slate-700 block">
                      {activeDetailAp.researchArea || 'Not recorded'}
                    </span>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-none">Submitted Date</span>
                    <span className="text-xs font-bold text-slate-700 block font-mono">
                      {activeDetailAp.submittedDate || 'Not available'}
                    </span>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-none">Waiting</span>
                    <span className="text-xs font-bold text-slate-700 block">
                      {formatSupervisorWaiting(activeDetailAp)}
                    </span>
                  </div>
                </div>

                {activeDetailAp.rejectionReason && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">Decision reason</p>
                    <p className="mt-1 text-xs font-semibold text-rose-800">{activeDetailAp.rejectionReason}</p>
                  </div>
                )}

                <SupervisorDocumentsList
                  applicationId={activeDetailAp.applicationId}
                  documents={activeDetailAp.documents}
                  compact
                />

                <WorkflowAuditLog events={activeDetailAp.workflow} />

                {activeDetailAp.workflowStatus
                  && canStudentCancelSupervisorApplication(activeDetailAp.workflowStatus) && (
                  <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                        Cancel Supervisor Request
                      </h4>
                      <p className="mt-1 text-[10px] font-semibold text-amber-800">
                        This is available only before the requested supervisor takes action.
                      </p>
                    </div>
                    <textarea
                      value={cancellationReason}
                      onChange={(event) => {
                        setCancellationReason(event.target.value);
                        if (cancellationError) setCancellationError(null);
                      }}
                      rows={3}
                      placeholder="Explain why you are cancelling this request..."
                      className="w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-amber-400"
                    />
                    {cancellationError && (
                      <p className="text-[10px] font-bold text-rose-600">{cancellationError}</p>
                    )}
                    <PortalButton
                      type="button"
                      onClick={handleCancelRequest}
                      disabled={isCancelling}
                      variant="danger"
                      size="md"
                      fullWidth
                    >
                      {isCancelling ? 'Cancelling…' : 'Cancel Request'}
                    </PortalButton>
                  </div>
                )}

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
