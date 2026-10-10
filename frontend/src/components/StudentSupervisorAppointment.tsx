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
import { PageHeader, PortalButton, PortalConfirmModal } from './PortalPrimitives';
import { WorkflowAuditLog } from './WorkflowAuditLog';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { canStudentCancelSupervisorApplication } from '../utils/workflowTracking';
import { SupervisorApplicationWorkflowStatus, SupervisorWorkflowEvent } from '../types';
import { SupervisorDocumentsList } from './SupervisorDocumentsList';
import { SupervisoryTeamManagement } from './SupervisoryTeamManagement';
import { ResearchAmendments } from './ResearchAmendments';
import { SupervisorAppointmentGuidance } from './StudentAppointmentGuidance';
import { SupervisorWorkspaceNavigation } from './SupervisorWorkspaceNavigation';
import { StudentSupervisorApplications } from './StudentSupervisorApplications';
import { partitionSupervisorApplications } from '../utils/supervisorWorkspace';

interface StudentSupervisorAppointmentProps {
  onShowFAQChatbot?: () => void;
  initialApplicationId?: string;
  routeView?: 'overview' | 'applications' | 'research' | 'newApplication';
  onNavigateToList?: () => void;
  onNavigateToNewApplication?: () => void;
  onNavigateToApplication?: (applicationId: string) => void;
  lifecycleStatus?: string | null;
  researchView?: 'list' | 'detail' | 'profile' | 'new';
  researchRequestId?: string;
  onNavigateToResearchRequest?: (id: string) => void;
  onNavigateToResearchList?: () => void;
  onNavigateToResearchProfile?: () => void;
  onNavigateToResearchNew?: () => void;
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
  researchView = 'list', researchRequestId,
  onNavigateToResearchRequest, onNavigateToResearchList, onNavigateToResearchProfile, onNavigateToResearchNew,
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
    if (!initialApplicationId) { setActiveDetailAp(null); return; }
    if (applications.length === 0) return;
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

  const pending = partitionSupervisorApplications(applications).pending;
  const pageHeader = <>
    <PageHeader title="Supervisor Appointments" subtitle={routeView === 'research' ? 'Review your research profile and manage permitted research changes.' : routeView === 'applications' ? 'Track pending requests and review completed applications.' : 'Your current supervisory team and appointment status.'}
      actions={routeView !== 'research' && !approvedApplication && workflowEligible ? <PortalButton variant="primary" icon={Plus} disabled={loadingApplications || pending.length > 0} onClick={() => { setReplacementApplication(null); handleCreateNewApplication(); }}>New application</PortalButton> : undefined} />
    <SupervisorWorkspaceNavigation role="Student" />
  </>;

  if (routeView !== 'research' && (loadingApplications || applicationsError)) {
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
      {routeView === 'overview' && <>
        <SupervisoryTeamManagement role="Student" view="studentOverview" onRefresh={loadApplications} refreshVersion={researchRefreshVersion} studentActions={approvedApplication ? <>
          <PortalButton size="sm" variant="primary" icon={Eye} onClick={() => onNavigateToApplication?.(String(approvedApplication.id))}>View appointment</PortalButton>
          <PortalButton size="sm" icon={Users} disabled={!workflowEligible} onClick={() => { setReplacementApplication(approvedApplication); onNavigateToNewApplication?.(); }}>Change Supervisor</PortalButton>
        </> : undefined} />
        {pending.length > 0 && <StudentSupervisorApplications applications={applications} compact onViewApplication={onNavigateToApplication} />}
        <SupervisorAppointmentGuidance hasSupervisor={!!approvedApplication} onShowFAQChatbot={onShowFAQChatbot} />
      </>}
      {routeView === 'applications' && <>
        {initialApplicationId && !applications.some(app => String(app.applicationId) === initialApplicationId) ? <EmptyState title="Application not found" description="This application does not exist or is outside your access." /> : null}
        <StudentSupervisorApplications applications={applications} onViewApplication={onNavigateToApplication} />
        <SupervisoryTeamManagement role="Student" view="studentHistory" />
      </>}
      {routeView === 'research' && <ResearchAmendments role="Student" routeView={researchView} routeRequestId={researchRequestId}
        onNavigateToRequest={onNavigateToResearchRequest} onNavigateToList={onNavigateToResearchList} onNavigateToProfile={onNavigateToResearchProfile} onNavigateToNew={onNavigateToResearchNew}
        onChanged={() => setResearchRefreshVersion(value => value + 1)} />}

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
