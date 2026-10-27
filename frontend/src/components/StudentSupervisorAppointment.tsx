import {DecisionDialog} from './DecisionDialog';
import { useReturnToFocusReload } from '../utils/returnToFocus';
import { RecordPage } from './RecordPage';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  FileText,
  Plus, 
} from 'lucide-react';
import { SupervisorAppointmentApplicationPage } from './SupervisorAppointmentApplicationPage';
import { StudentSupervisorApplication, SupervisorApplicationRecord } from '../types';
import {
  cancelSupervisorApplication,
  getMySupervisorApplications,
  toStudentSupervisorApplication,
} from '../services';
import { PageHeader, PortalButton } from './PortalPrimitives';
import { SupervisorRequestDetail, supervisorRequestMetadata, toStudentSupervisorRequestPresentation } from './SupervisorRequestDetail';
import { RequestMetadata } from './RequestDetailPrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { canStudentCancelSupervisorApplication } from '../utils/workflowTracking';
import { SupervisorApplicationWorkflowStatus, SupervisorWorkflowEvent } from '../types';
import { SupervisoryTeamManagement } from './SupervisoryTeamManagement';
import { LecturerResearchWorkspace } from './LecturerResearchWorkspace';
import { SupervisorWorkspaceNavigation } from './SupervisorWorkspaceNavigation';
import { StudentSupervisorApplications } from './StudentSupervisorApplications';
import { partitionSupervisorApplications, supervisorResearchPage } from '../utils/supervisorWorkspace';
import { OperationalIntakeFeedback, useOperationalIntake } from './OperationalIntakeFeedback';

interface StudentSupervisorAppointmentProps {
  onShowFAQChatbot?: () => void;
  initialApplicationId?: string;
  routeView?: 'overview' | 'applications' | 'research' | 'newApplication';
  onNavigateToList?: () => void;
  onNavigateToNewApplication?: () => void;
  onNavigateToApplication?: (applicationId: string) => void;
  backLabel?: string;
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
  backLabel = 'Back to Applications',
  lifecycleStatus,
  researchView = 'list', researchRequestId,
  onNavigateToResearchRequest, onNavigateToResearchList, onNavigateToResearchProfile, onNavigateToResearchNew,
}) => {
  const [params] = useSearchParams();
  const workflowEligible = !lifecycleStatus || lifecycleStatus === 'ACTIVE';
  const [applications, setApplications] = useState<StudentSupervisorApplication[]>([]);
  const [approvedApplication, setApprovedApplication] = useState<SupervisorApplicationRecord | null>(null);
  const [researchRefreshVersion, setResearchRefreshVersion] = useState(0);
  const [researchMetadata, setResearchMetadata] = useState<React.ReactNode>(null);
  const [researchDetailTitle, setResearchDetailTitle] = useState<string | null>(null);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const showApplicationAvailability = !initialApplicationId && (routeView === 'overview' || routeView === 'applications')
    && !approvedApplication && workflowEligible && !(routeView === 'applications' && params.get('view') === 'history');
  const intake = useOperationalIntake('SUPERVISOR_APPLICATION', undefined, showApplicationAvailability && !loadingApplications && !applicationsError);

  const loadApplications = useCallback((strict=false) => {
    setLoadingApplications(true);
    setApplicationsError(null);
    return getMySupervisorApplications()
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
        if(strict)throw reason;
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
  const navigationComplete = useRef(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  useReturnToFocusReload(loadApplications, !loadingApplications && !workspaceBusy && !isCancelling && !isCancelConfirmOpen && !activeDetailAp && !initialApplicationId && routeView !== 'newApplication' && routeView !== 'research');

  useEffect(() => {
    setCancellationReason('');
    setCancellationError(null);
    setIsCancelConfirmOpen(false);
  }, [initialApplicationId]);

  useEffect(() => {
    if (!initialApplicationId) { setActiveDetailAp(null); return; }
    if (applications.length === 0) return;
    const app = applications.find(
      (item) => String(item.applicationId) === String(initialApplicationId),
    );
    if (!app) return;
    navigationComplete.current = false;
    setActiveDetailAp({ ...app, documents: app.documents, submittedDate: app.submittedAt });
  }, [applications, initialApplicationId]);

  const performCancelRequest = async () => {
    if (!activeDetailAp?.applicationId || !activeDetailAp.workflowStatus || !cancellationReason.trim()) return false;
    setIsCancelling(true);
    try {
      const updated=await cancelSupervisorApplication(activeDetailAp.applicationId,cancellationReason.trim());
      const mapped=toStudentSupervisorApplication(updated);
      setApplications(items=>items.map(item=>item.applicationId===mapped.applicationId?mapped:item));
      setActiveDetailAp({...mapped,documents:mapped.documents,submittedDate:mapped.submittedAt});
      return {};
    } finally {setIsCancelling(false);}
  };
  const handleCancelRequest = () => {setCancellationReason('');setIsCancelConfirmOpen(true);};

  const handleCreateNewApplication = () => {
    onNavigateToNewApplication?.();
  };

  const closeActiveDetail = () => {
    setActiveDetailAp(null);
    setCancellationReason('');
    setCancellationError(null);
    setIsCancelConfirmOpen(false);
    if (initialApplicationId) {
      onNavigateToList?.();
    }
  };

  if (routeView === 'newApplication') {
    if (!workflowEligible) {
      return (
        <div className="space-y-6">
          <PageHeader title="Supervisor Application" backLabel="Back to Applications" onBack={onNavigateToList} />
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
      />
    );
  }

  const pending = partitionSupervisorApplications(applications).pending;
  const researchPage = routeView === 'research' && researchView !== 'list' ? supervisorResearchPage(researchView) : null;
  const pageHeader = <>
    <PageHeader title={initialApplicationId ? 'Appointment request' : researchPage?.title ?? 'Supervisor Appointments'} subtitle={researchPage?.subtitle ?? (routeView === 'research' ? 'Review your research profile and manage permitted research changes.' : routeView === 'applications' ? 'Track pending requests and review completed applications.' : 'Your current supervisory team and appointment status.')}
      backLabel={initialApplicationId ? backLabel : researchPage ? 'Back to research changes' : undefined} onBack={initialApplicationId ? onNavigateToList : researchPage ? onNavigateToResearchList : undefined}
      actions={!initialApplicationId && !researchPage ? <>

        {routeView !== 'research' && !approvedApplication && workflowEligible ? <div className="flex min-w-0 flex-col items-start gap-3 sm:items-end">
          {showApplicationAvailability && !loadingApplications && !applicationsError ? <OperationalIntakeFeedback {...intake} onRetry={() => void intake.refresh()} /> : null}
          <PortalButton variant="primary" className="min-h-11" icon={Plus} disabled={loadingApplications || workspaceBusy || pending.length > 0} onClick={handleCreateNewApplication}>New application</PortalButton>
        </div> : null}
      </> : undefined} />
    {!researchPage && !initialApplicationId ? <SupervisorWorkspaceNavigation role="Student" /> : null}
  </>;

  if (initialApplicationId && !activeDetailAp) return <div className="space-y-6">{pageHeader}{loadingApplications ? <LoadingState message="Loading request details…" /> : applicationsError ? <ErrorState message={applicationsError} onRetry={loadApplications} /> : <EmptyState title="Application not found" description="This application does not exist or is outside your access." />}</div>;
  if (researchPage) return <RecordPage metadata={researchMetadata} title={researchView === 'detail' ? researchDetailTitle ?? researchPage.title : researchPage.title} subtitle={researchPage.subtitle} backLabel="Back to research changes" onBack={onNavigateToResearchList ?? (() => {})}>
    <LecturerResearchWorkspace onDetailMetadata={setResearchMetadata} onDetailTitle={setResearchDetailTitle} role="Student" hideHeader routeView={researchView} routeRequestId={researchRequestId} showRefresh={false}
      onNavigateToRequest={onNavigateToResearchRequest} onNavigateToList={onNavigateToResearchList} onNavigateToProfile={onNavigateToResearchProfile} onNavigateToNew={onNavigateToResearchNew}
      onChanged={() => setResearchRefreshVersion(value => value + 1)} />
  </RecordPage>;

  if (routeView !== 'research' && (loadingApplications || applicationsError)) {
    return <div id="student-supervisor-app-workspace" className="space-y-6 text-left font-sans pb-12">
      {pageHeader}
      {loadingApplications ? <LoadingState message="Loading supervisor appointments..." /> : <ErrorState message={applicationsError!} onRetry={loadApplications} />}
    </div>;
  }


  return (
    <div id="student-supervisor-app-workspace" className="space-y-6 text-left font-sans pb-12">
      <DecisionDialog isOpen={isCancelConfirmOpen} decisionKey={activeDetailAp?.applicationId}
        title="Cancel Supervisor request?" context={<>{activeDetailAp?.studentName} · {activeDetailAp?.programme}</>}
        kind="confirmation" tone="danger" message="Cancellation closes this pending request. Its history remains available, and you may submit a new request afterwards."
        confirmLabel="Cancel request" cancelLabel="Keep request" canConfirm={!!cancellationReason.trim()} busy={isCancelling} dirty={!!cancellationReason.trim()}
        successMessage="Supervisor request cancelled." onConfirm={performCancelRequest}
        onClose={()=>{setIsCancelConfirmOpen(false);setCancellationReason('');setCancellationError(null);}}
        onReload={async()=>{await loadApplications(true); if(activeDetailAp?.applicationId){const rows=await getMySupervisorApplications();const fresh=rows.find(row=>String(row.id)===String(activeDetailAp.applicationId));if(!fresh)throw new Error('This request is no longer available.');const mapped=toStudentSupervisorApplication(fresh);setActiveDetailAp({...mapped,documents:mapped.documents,submittedDate:mapped.submittedAt});}}}>
        <label className="form-label block">Cancellation reason<textarea required className="form-control form-control-md mt-2 min-h-28" value={cancellationReason} onChange={event=>setCancellationReason(event.target.value)}/></label>
      </DecisionDialog>


      {!activeDetailAp ? pageHeader : null}
      {routeView === 'overview' && <>
        <SupervisoryTeamManagement role="Student" view="studentOverview" showRefresh={false} onBusyChange={setWorkspaceBusy} refreshVersion={researchRefreshVersion} studentActions={approvedApplication && onNavigateToApplication ? <>
          <PortalButton size="sm" className="min-h-11" variant="primary" icon={FileText} onClick={() => onNavigateToApplication(String(approvedApplication.id))}>View approved application</PortalButton>
        </> : undefined} studentContent={{onShowFAQChatbot, requests: pending.length > 0 ? <StudentSupervisorApplications applications={applications} compact onViewApplication={onNavigateToApplication}/> : undefined}} />
      </>}
      {routeView === 'applications' && !initialApplicationId && <>
        <StudentSupervisorApplications applications={applications} onViewApplication={onNavigateToApplication} />
      </>}
      {routeView === 'research' && <LecturerResearchWorkspace role="Student" showRefresh={false} onBusyChange={setWorkspaceBusy} refreshVersion={researchRefreshVersion} routeView={researchView} routeRequestId={researchRequestId}
        onNavigateToRequest={onNavigateToResearchRequest} onNavigateToList={onNavigateToResearchList} onNavigateToProfile={onNavigateToResearchProfile} onNavigateToNew={onNavigateToResearchNew}
        onChanged={() => setResearchRefreshVersion(value => value + 1)} />}

      {/* ========================================================================= */}
      {/* REQUEST RECORD                                                        */}
      {/* ========================================================================= */}
      {activeDetailAp ? <RecordPage navigationComplete={navigationComplete} title="Appointment request" backLabel={backLabel} onBack={closeActiveDetail} pageKey={initialApplicationId ? undefined : `student-application:${activeDetailAp.id}`} dirty={!!cancellationReason.trim()} busy={isCancelling} metadata={<RequestMetadata {...supervisorRequestMetadata(toStudentSupervisorRequestPresentation(activeDetailAp))} />}>
        <SupervisorRequestDetail request={toStudentSupervisorRequestPresentation(activeDetailAp)} actions={activeDetailAp.workflowStatus
                  && workflowEligible
                  && canStudentCancelSupervisorApplication(activeDetailAp.workflowStatus, activeDetailAp.initiatedByOffice) && (
                  <PortalButton type="button" onClick={handleCancelRequest} disabled={isCancelling} variant="danger">Cancel request</PortalButton>
                )} /></RecordPage> : null}

    </div>
  );
};
