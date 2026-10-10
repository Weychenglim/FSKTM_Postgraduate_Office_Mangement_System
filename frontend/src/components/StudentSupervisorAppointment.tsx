/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { 
  Users, 
  Eye, 
  Plus, 
  AlertTriangle
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
import { PageHeader, PortalButton, PortalConfirmModal, StatusBadge, getStatusBadgeTone } from './PortalPrimitives';
import { WorkflowAuditLog } from './WorkflowAuditLog';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { canStudentCancelSupervisorApplication } from '../utils/workflowTracking';
import { SupervisorApplicationWorkflowStatus, SupervisorWorkflowEvent } from '../types';
import { SupervisorDocumentsList } from './SupervisorDocumentsList';
import { SupervisoryTeamManagement } from './SupervisoryTeamManagement';
import { ResearchAmendments } from './ResearchAmendments';
import { SupervisorAppointmentGuidance } from './StudentAppointmentGuidance';

interface StudentSupervisorAppointmentProps {
  onShowFAQChatbot?: () => void;
  initialApplicationId?: string;
  routeView?: 'overview' | 'newApplication';
  onNavigateToList?: () => void;
  onNavigateToNewApplication?: () => void;
  onNavigateToApplication?: (applicationId: string) => void;
  lifecycleStatus?: string | null;
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
  lifecycleStatus,
}) => {
  const workflowEligible = !lifecycleStatus || lifecycleStatus === 'ACTIVE';
  const [applications, setApplications] = useState<StudentSupervisorApplication[]>([]);
  const [approvedApplication, setApprovedApplication] = useState<SupervisorApplicationRecord | null>(null);
  const [researchRefreshVersion, setResearchRefreshVersion] = useState(0);
  const [replacementApplication, setReplacementApplication] = useState<SupervisorApplicationRecord | null>(null);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  const loadApplications = useCallback(() => {
    setLoadingApplications(true);
    setApplicationsError(null);
    getMySupervisorApplications()
      .then((records) => {
        setApplications(records.map(toStudentSupervisorApplication));
        setApprovedApplication(records.find(
          (record) => record.status === 'APPROVED'
            && record.appointmentLifecycle?.status === 'ACTIVE',
        ) || null);
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
      unavailableUntil: app.unavailableUntil,
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
    if (!workflowEligible) {
      return (
        <div className="space-y-6">
          <PageHeader title="Supervisor Application" backLabel="Back" onBack={onNavigateToList} />
          <EmptyState
            title="Application unavailable"
            description={`Your ${lifecycleStatus?.toLowerCase()} academic status keeps this workflow read-only.`}
          />
        </div>
      );
    }
    return (
      <SupervisorAppointmentApplicationPage
        onBack={onNavigateToList ?? (() => undefined)}
        onSuccess={(newApp) => {
          setApplications(prev => [newApp, ...prev]);
          onNavigateToList?.();
        }}
        replacementApplication={replacementApplication}
      />
    );
  }

  const pageHeader = <PageHeader
    title="Supervisor Appointment"
    subtitle="See your supervisors, research change requests and previous applications."
  />;

  if (loadingApplications || applicationsError) {
    return <div id="student-supervisor-app-workspace" className="space-y-6 text-left font-sans pb-12">
      {pageHeader}
      {loadingApplications ? <LoadingState message="Loading supervisor appointments..." /> : <ErrorState message={applicationsError!} onRetry={loadApplications} />}
    </div>;
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

      
      {pageHeader}
      <SupervisoryTeamManagement role="Student" onRefresh={loadApplications} refreshVersion={researchRefreshVersion} studentActions={approvedApplication ? <>
        <PortalButton size="sm" variant="primary" icon={Eye} onClick={() => onNavigateToApplication?.(String(approvedApplication.id))}>View appointment</PortalButton>
        <PortalButton size="sm" icon={Users} disabled={!workflowEligible} onClick={() => { setReplacementApplication(approvedApplication); onNavigateToNewApplication?.(); }}>Change Supervisor</PortalButton>
      </> : undefined} />
      <ResearchAmendments role="Student" onChanged={() => setResearchRefreshVersion(value => value + 1)} />

      {/* ========================================================================= */}
      {/* PREVIOUS SUPERVISOR APPLICATIONS                    */}
      {/* ========================================================================= */}
      <section aria-label="Previous applications" className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs">
        
        {/* Application history header */}
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-0.5 text-left select-none">
            <h2 className="section-label">
              Previous applications
            </h2>
            <p className="card-caption">
              Your submitted supervisor requests and their outcomes.
            </p>
          </div>

          {!approvedApplication && workflowEligible && (
            <PortalButton
              type="button"
              onClick={() => {
                setReplacementApplication(null);
                handleCreateNewApplication();
              }}
              variant="primary"
              size="md"
              icon={Plus}
            >
              New Application
            </PortalButton>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {applications.map(app => <article key={app.id} className="flex flex-col items-start justify-between gap-3 px-6 py-4 sm:flex-row">
            <div className="min-w-0 w-full space-y-1 sm:w-auto sm:flex-1">
              <h3 className="card-value font-mono">{app.id}</h3>
              <p className="card-value break-words">{app.title}</p>
              <p className="card-description">{app.supervisor} · Submitted {app.date}</p>
              {formatSupervisorWaiting(app) !== '-' ? <p className="card-description">{formatSupervisorWaiting(app)}</p> : null}
              {app.unavailableUntil ? <p className="card-description text-amber-700">Unavailable for new appointments until {app.unavailableUntil}</p> : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <StatusBadge tone={getStatusBadgeTone(app.status)} dot pulse={app.status === 'PENDING REVIEW'}>{app.status}</StatusBadge>
              <PortalButton size="sm" icon={Eye} onClick={() => { if (app.applicationId !== undefined) onNavigateToApplication?.(String(app.applicationId)); }} title={`View application ${app.id}`}>View application</PortalButton>
            </div>
          </article>)}
          {!applications.length ? <p className="card-description p-6">You have not submitted a supervisor application yet.</p> : null}
        </div>
      </section>

      <SupervisorAppointmentGuidance hasSupervisor={!!approvedApplication} onShowFAQChatbot={onShowFAQChatbot} />

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
                <h3 className="section-heading">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="card-label block">App ID</span>
                      <span className="card-value block font-mono mt-1">{activeDetailAp.id}</span>
                    </div>
                    <div>
                      <span className="card-label block">Supervisor</span>
                      <span className="card-value block mt-1">{activeDetailAp.supervisor}</span>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-1">
                    <span className="card-label block">Research Title</span>
                    <span className="card-value block">
                      &ldquo;{activeDetailAp.title}&rdquo;
                    </span>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-1">
                    <span className="card-label block">Research Area</span>
                    <span className="card-value block">
                      {activeDetailAp.researchArea || 'Not recorded'}
                    </span>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-1">
                    <span className="card-label block">Submitted Date</span>
                    <span className="card-value block font-mono">
                      {activeDetailAp.submittedDate || 'Not available'}
                    </span>
                  </div>

                  <div className="h-[1px] bg-slate-200/50" />

                  <div className="space-y-1">
                    <span className="card-label block">Waiting</span>
                    <span className="card-value block">
                      {formatSupervisorWaiting(activeDetailAp)}
                    </span>
                  </div>
                  {activeDetailAp.unavailableUntil && (
                    <div className="card-description border-t border-amber-100 pt-3 text-amber-700">
                      The selected Supervisor is unavailable for new appointments until {activeDetailAp.unavailableUntil}. Your existing workflow remains recorded.
                    </div>
                  )}
                </div>

                {activeDetailAp.rejectionReason && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="card-label text-rose-700">Decision reason</p>
                    <p className="card-description mt-1 text-rose-800">{activeDetailAp.rejectionReason}</p>
                  </div>
                )}

                <SupervisorDocumentsList
                  applicationId={activeDetailAp.applicationId}
                  documents={activeDetailAp.documents}
                  compact
                />

                <WorkflowAuditLog events={activeDetailAp.workflow} />

                {activeDetailAp.workflowStatus
                  && workflowEligible
                  && canStudentCancelSupervisorApplication(activeDetailAp.workflowStatus) && (
                  <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <div>
                      <h4 className="section-label text-amber-900">
                        Cancel Supervisor Request
                      </h4>
                      <p className="card-description mt-1 text-amber-800">
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
                      className="form-control form-control-sm resize-none border-amber-200 focus:border-amber-400"
                    />
                    {cancellationError && (
                      <p className="card-description text-rose-600">{cancellationError}</p>
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
