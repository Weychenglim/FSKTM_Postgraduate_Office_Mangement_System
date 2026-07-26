/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Download, 
  Eye, 
  Plus, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Mail,
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
import { canStudentCancelSupervisorApplication } from '../utils/workflowTracking';
import { SupervisorApplicationWorkflowStatus, SupervisorWorkflowEvent } from '../types';

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

  useEffect(() => {
    getMySupervisorApplications()
      .then((records) => {
        setApplications(records.map(toStudentSupervisorApplication));
        setApprovedApplication(records.find((record) => record.status === 'APPROVED') || null);
      })
      .catch(() => setApplications([]));
  }, []);

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
      id: app.id,
      supervisor: app.supervisor,
      title: app.title,
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

  const handleDownloadLetter = (docName: string) => {
    alert(`Downloading Official Confirmation Letter: ${docName}`);
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
              {approvedApplication ? 'Approved research supervision' : 'Awaiting appointment'}
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
            onClick={() => handleDownloadLetter(`Supervisor_Appointment_${approvedApplication?.proposedSupervisorId}.pdf`)}
            variant="primary"
            size="md"
            icon={Download}
            fullWidth
          >
            Download Letter
          </PortalButton>
          
          <PortalButton
            type="button"
            disabled={!approvedApplication}
            onClick={() => {
              if (!approvedApplication) return;
              onNavigateToApplication?.(String(approvedApplication.id));
            }}
            variant="secondary"
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
            Eligibility Status
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Your current Credit hours and CGPA meet the minimum faculty requirements for supervisor appointment.
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
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-none">Submitted Date</span>
                    <span className="text-xs font-bold text-slate-700 block font-mono">
                      {activeDetailAp.submittedDate || '15 Nov 2025'}
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

                {/* Workflow Timeline Section */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mt-1 select-none">
                    Progress Timeline
                  </span>

                  <div className="relative pl-7 space-y-8 py-2">
                    {/* Continuous vertical timeline connector line */}
                    <div className="absolute left-3 top-4 bottom-4 w-[2px] bg-slate-200" />

                    {/* Timeline Step 1: Application Submitted */}
                    <div className="relative text-left">
                      {/* Step Indicator status icon inside timeline */}
                      <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs z-10">
                        <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 leading-tight">
                          Application Submitted
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium font-mono mt-0.5 select-all">
                          {activeDetailAp.step1Date || '15 Nov 2025, 09:30 AM'}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Step 2: Supervisor Review */}
                    <div className="relative text-left">
                      {/* State-dependent styling for Step 2 */}
                      {activeDetailAp.status === 'APPROVED' ? (
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs z-10">
                          <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : activeDetailAp.status === 'RETURNED' ? (
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs z-10">
                          <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        /* Pending review (Active Highlighted Step) */
                        <div className="absolute -left-[29px] top bg-white -mt-0.5 w-6 h-6 rounded-full border-4 border-brand-navy flex items-center justify-center shadow-xs z-10">
                          <StatusDot tone="brand" className="w-2 h-2 bg-brand-navy" />
                        </div>
                      )}

                      <div className="pl-0.5">
                        <h4 className={`text-xs font-black leading-tight ${
                          activeDetailAp.status === 'PENDING REVIEW' ? 'text-slate-800' : 'text-slate-800'
                        }`}>
                          Supervisor Review
                        </h4>
                        <p className={`text-[11px] font-medium mt-0.5 leading-normal ${
                          activeDetailAp.status === 'PENDING REVIEW' 
                            ? 'text-slate-500' 
                            : 'text-slate-500'
                        }`}>
                          {activeDetailAp.status === 'APPROVED' ? (
                            <span>Approved by {activeDetailAp.supervisor}</span>
                          ) : activeDetailAp.status === 'RETURNED' ? (
                            <span>Reviewed by {activeDetailAp.supervisor}</span>
                          ) : (
                            <span>Awaiting response from {activeDetailAp.supervisor}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Step 3: Programme Coordinator Approval */}
                    <div className="relative text-left">
                      {/* State-dependent styling for Step 3 */}
                      {activeDetailAp.status === 'APPROVED' ? (
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs z-10">
                          <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : activeDetailAp.status === 'RETURNED' ? (
                        /* Current point of friction: Returned with feedback comments */
                        <div className="absolute -left-[29px] top bg-white -mt-0.5 w-6 h-6 rounded-full border-4 border-orange-500 flex items-center justify-center shadow-xs z-10">
                          <StatusDot tone="warning" className="w-2 h-2 bg-orange-500" />
                        </div>
                      ) : (
                        /* Muted future Pending indicator */
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-[#f0f5ff] text-[#a5b4fc] border border-slate-200/60 flex items-center justify-center text-[10px] font-black z-10 select-none">
                          3
                        </div>
                      )}

                      <div>
                        <h4 className={`text-xs font-black leading-tight ${
                          activeDetailAp.status === 'APPROVED' ? 'text-slate-800' :
                          activeDetailAp.status === 'RETURNED' ? 'text-orange-600' : 'text-slate-400'
                        }`}>
                          Programme Coordinator Approval
                        </h4>
                        <p className={`text-[11px] font-medium mt-0.5 leading-normal ${
                          activeDetailAp.status === 'APPROVED' ? 'text-slate-500' :
                          activeDetailAp.status === 'RETURNED' ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {activeDetailAp.status === 'APPROVED' ? (
                            <span>Approved by Postgraduate Coordinator</span>
                          ) : activeDetailAp.status === 'RETURNED' ? (
                            <span>Returned: &ldquo;Please restructure the research scope section and select standard methodologies.&rdquo;</span>
                          ) : (
                            <span>Pending</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Step 4: Letter Generated */}
                    <div className="relative text-left">
                      {/* State-dependent styling for Step 4 */}
                      {activeDetailAp.status === 'APPROVED' ? (
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs z-10">
                          <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        /* Muted future Pending indicator */
                        <div className="absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full bg-[#f0f5ff] text-[#a5b4fc] border border-slate-200/60 flex items-center justify-center text-[10px] font-black z-10 select-none">
                          4
                        </div>
                      )}

                      <div>
                        <h4 className={`text-xs font-black leading-tight ${
                          activeDetailAp.status === 'APPROVED' ? 'text-slate-800' : 'text-slate-400'
                        }`}>
                          Letter Generated
                        </h4>
                        <p className={`text-[11px] font-medium mt-0.5 leading-normal ${
                          activeDetailAp.status === 'APPROVED' ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {activeDetailAp.status === 'APPROVED' ? (
                            <span>Official appointment letter generated &amp; signed off</span>
                          ) : (
                            <span>Pending</span>
                          )}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

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

              {/* Drawer Sticky Footer Actions Block */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-2 shrink-0 select-none">
                <PortalButton
                  type="button"
                  onClick={() => alert(`Downloading documents package for: ${activeDetailAp.id}`)}
                  variant="secondary"
                  size="md"
                  icon={Download}
                  fullWidth
                >
                  Download Submitted Documents
                </PortalButton>

                <PortalButton
                  type="button"
                  onClick={() => {
                    if (activeDetailAp.status === 'RETURNED') {
                      alert('Feedback comments:\n"Returned on 15 Oct 2025. Reason: The research proposal title requires a simplified scope. Consider focus on modern evaluation schemas rather than standard database pipelines alone."');
                    } else {
                      alert('Feedback comments:\n"No active system discrepancies found. Approved automatically upon coordinator review."');
                    }
                  }}
                  variant="secondary"
                  size="md"
                  icon={Mail}
                  fullWidth
                >
                  View Comments
                </PortalButton>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
