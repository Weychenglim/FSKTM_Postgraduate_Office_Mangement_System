/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navigate, matchPath, useLocation, useNavigate } from 'react-router';
import { AuthLayout } from './components/AuthLayout';
import { LoginCard } from './components/LoginCard';
import { ForgotPasswordFlow } from './components/ForgotPasswordFlow';
import { AppLayout } from './components/AppLayout';
import { SummaryCard } from './components/SummaryCard';
import { ChecklistCard, ChecklistItem } from './components/ChecklistCard';
import { MarkSubmissionMonitoring } from './components/MarkSubmissionMonitoring';
import { AlertListCard } from './components/AlertListCard';
import { QuickActionsCard } from './components/QuickActionsCard';
import { PortalToast } from './components/PortalPrimitives';
import { 
  Calendar, 
  Sliders, 
  CheckCircle,
  Database,
  Briefcase,
} from 'lucide-react';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { ForcedPasswordChange } from './components/ForcedPasswordChange';
import type { DashboardSummary, DemoUser, EvaluationPeriodOption, NotificationItem, RubricVersion } from './types';
import { SIDEBAR_ITEMS } from './constants/navigation';
import {
  APP_ROUTES,
  isKnownAppPath,
  routeForDashboardTimeline,
  routeForMarkRecord,
  routeForNotificationTarget,
  routeForPanelAssignment,
  routeForPanelRecord,
  routeForPanelRecommendationStart,
  routeForPanelReviewedRequests,
  routeForPanelSubmittedRecommendations,
  routeForPanelWorkload,
  routeForStudentProgress,
  routeForSupervisorApplication,
  routeForSupportingSupervisorRequest,
  routeForSupervisorHistory,
  routeForSupervisorNewApplication,
  routeForSupervisorRequirements,
  routeForSupervisorSupervisee,
  routeForSupervisorWorkload,
  routeForSupervisorResearchRequest,
  routeForSidebarItem,
  sidebarItemForPath,
} from './constants/routes';
import {
  canAccessMarksAdministration,
  canAccessModule,
} from './auth/permissions';
import * as authApi from './services/authApi';
import {
  PASSWORD_CHANGE_REQUIRED_EVENT,
  SESSION_EXPIRED_EVENT,
  clearAuthToken,
} from './services/apiClient';
import { getEvaluationPeriods, getRubricVersions } from './services/marksApi';
import { getDashboardSummary } from './services/timelineApi';
import { NotificationsProvider } from './context/NotificationsContext';
import { defaultLandingPageForUser } from './utils/landingPage';
import { MarkRecordStatusTab } from './utils/markRecords';
import { recordBackSteps, recordReturn, recordSourceLabel } from './utils/recordNavigation';
import {
  buildMarksSetupChecklist,
  formatPeriodStatus,
} from './utils/marksProductionManagement';

const lazyNamed = (
  exportName: string,
  loadModule: () => Promise<Record<string, unknown>>,
) => React.lazy(async () => {
  const module = await loadModule();
  return { default: module[exportName] as React.ComponentType<any> };
});

const MarkEntryPeriodConfig = lazyNamed('MarkEntryPeriodConfig', () => import('./components/MarkEntryPeriodConfig'));
const RubricsManagementView = lazyNamed('RubricsManagementView', () => import('./components/RubricsManagementView'));
const EvaluationTaskAssignment = lazyNamed('EvaluationTaskAssignment', () => import('./components/EvaluationTaskAssignment'));
const MarkEntryRecords = lazyNamed('MarkEntryRecords', () => import('./components/MarkEntryRecords'));
const MarkEntryRecordDetail = lazyNamed('MarkEntryRecordDetail', () => import('./components/MarkEntryRecordDetail'));
const PanelAppointmentManagement = lazyNamed('PanelAppointmentManagement', () => import('./components/PanelAppointmentManagement'));
const SupervisorAppointmentManagement = lazyNamed('SupervisorAppointmentManagement', () => import('./components/SupervisorAppointmentManagement'));
const SupervisorDocumentRequirements = lazyNamed('SupervisorDocumentRequirements', () => import('./components/SupervisorDocumentRequirements'));
const LecturerMarksEntry = lazyNamed('LecturerMarksEntry', () => import('./components/LecturerMarksEntry'));
const LecturerPanelAppointments = lazyNamed('LecturerPanelAppointments', () => import('./components/LecturerPanelAppointments'));
const LecturerSupervisorAppointments = lazyNamed('LecturerSupervisorAppointments', () => import('./components/LecturerSupervisorAppointments'));
const AdministrationDashboard = lazyNamed('AdministrationDashboard', () => import('./components/AdministrationDashboard'));
const TimelineManagement = lazyNamed('TimelineManagement', () => import('./components/TimelineManagement'));
const AcademicSemesterManagement = lazyNamed('AcademicSemesterManagement', () => import('./components/AcademicSemesterManagement'));
const ParticipantLifecycleManagement = lazyNamed('ParticipantLifecycleManagement', () => import('./components/ParticipantLifecycleManagement'));
const WorkflowReconciliationCentre = lazyNamed('WorkflowReconciliationCentre', () => import('./components/WorkflowReconciliationCentre'));
const LecturerCapacityManagement = lazyNamed('LecturerCapacityManagement', () => import('./components/LecturerCapacityManagement'));
const FileRepository = lazyNamed('FileRepository', () => import('./components/FileRepository'));
const StudentFileSubmission = lazyNamed('StudentFileSubmission', () => import('./components/StudentFileSubmission'));
const NotificationsAnnouncements = lazyNamed('NotificationsAnnouncements', () => import('./components/NotificationsAnnouncements'));
const AnnouncementManagement = lazyNamed('AnnouncementManagement', () => import('./components/AnnouncementManagement'));
const AcademicFAQEditor = lazyNamed('AcademicFAQEditor', () => import('./components/AcademicFAQEditor'));
const StudentFAQChatbot = lazyNamed('StudentFAQChatbot', () => import('./components/StudentFAQChatbot'));
const LetterTemplateManagement = lazyNamed('LetterTemplateManagement', () => import('./components/LetterTemplateManagement'));
const StudentLetterGeneration = lazyNamed('StudentLetterGeneration', () => import('./components/StudentLetterGeneration'));
const StudentRegistry = lazyNamed('StudentRegistry', () => import('./components/StudentRegistry'));
const StudentDashboard = lazyNamed('StudentDashboard', () => import('./components/StudentDashboard'));
const LecturerDashboard = lazyNamed('LecturerDashboard', () => import('./components/LecturerDashboard'));
const CoordinatorDashboard = lazyNamed('CoordinatorDashboard', () => import('./components/CoordinatorDashboard'));
const WorkflowReports = lazyNamed('WorkflowReports', () => import('./components/WorkflowReports'));
const StudentProgressDossier = lazyNamed('StudentProgressDossier', () => import('./components/StudentProgressDossier'));
const StaffResearchWorkspace = lazyNamed('StaffResearchWorkspace', () => import('./components/StaffResearchWorkspace'));
const CoordinatorSupervisorApprovals = lazyNamed('CoordinatorSupervisorApprovals', () => import('./components/CoordinatorSupervisorApprovals'));
const StudentSupervisorAppointment = lazyNamed('StudentSupervisorAppointment', () => import('./components/StudentSupervisorAppointment'));
const StudentPanelAppointment = lazyNamed('StudentPanelAppointment', () => import('./components/StudentPanelAppointment'));
const SettingsView = lazyNamed('SettingsView', () => import('./components/SettingsView'));

const ModuleLoadingFallback = () => (
  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
    Loading workspace...
  </div>
);

const formatPeriodDate = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // Authentication session tracking
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);

  // True while we restore an existing session from the refresh cookie on first load.
  // Prevents the login page from flashing on refresh before /auth/me/ resolves.
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const resetParams = (() => {
    const params = new URLSearchParams(location.search);
    const uid = params.get('uid');
    const token = params.get('token');
    return uid && token ? { uid, token } : null;
  })();

  // On first load, exchange the HttpOnly refresh cookie for an in-memory access
  // token before loading the current user.
  useEffect(() => {
    if (pathname === APP_ROUTES.resetPassword) {
      clearAuthToken();
      setIsRestoringSession(false);
      return;
    }

    let cancelled = false;
    authApi
      .restoreSession()
      .then((user) => {
        if (!cancelled && user) setCurrentUser(user);
      })
      .catch(() => {
        // Token is missing/expired/invalid — drop it and show login.
        clearAuthToken();
      })
      .finally(() => {
        if (!cancelled) setIsRestoringSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // The API client clears the token and fires this when the backend rejects it
  // mid-session. Without a listener the user stays in an authenticated shell
  // while every request fails, until they happen to reload.
  useEffect(() => {
    const handleExpiry = () => {
      setSessionNotice('Your session has expired. Please sign in again.');
      setCurrentUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiry);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiry);
  }, []);

  useEffect(() => {
    const handlePasswordChangeRequired = () =>
      setCurrentUser((user) => (user ? { ...user, mustChangePassword: true } : user));
    window.addEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, handlePasswordChangeRequired);
    return () =>
      window.removeEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, handlePasswordChangeRequired);
  }, []);

  const [marksRecordStatusTab, setMarksRecordStatusTab] = useState<MarkRecordStatusTab>('All Records');
  const [marksDashboardSummary, setMarksDashboardSummary] = useState<DashboardSummary | null>(null);
  const [evaluationPeriods, setEvaluationPeriods] = useState<EvaluationPeriodOption[]>([]);
  const [rubricVersions, setRubricVersions] = useState<RubricVersion[]>([]);

  // Trigger states for modals in the main dashboard workspace
  const [activePortalModal, setActivePortalModal] = useState<'help' | null>(null);
  const [appToastMessage, setAppToastMessage] = useState<string | null>(null);
  const isLecturerWorkspace = currentUser?.role === 'Lecturer';
  const isCoordinatorWorkspace = currentUser?.role === 'Programme Coordinator';
  const isStudentWorkspace = currentUser?.role === 'Student';
  const activeSidebarItem = sidebarItemForPath(pathname);
  const markRecordMatch = matchPath(`${APP_ROUTES.marksRecords}/:recordId`, pathname);
  const isSupervisorWorkloadRoute = pathname === APP_ROUTES.supervisorAppointmentWorkload;
  const isSupervisorNewRoute = pathname === APP_ROUTES.supervisorAppointmentNew;
  const isSupervisorHistoryRoute = pathname === APP_ROUTES.supervisorAppointmentHistory;
  const isSupervisorRequirementsRoute = pathname === APP_ROUTES.supervisorAppointmentRequirements;
  const isSupervisorApplicationsRoute = pathname === APP_ROUTES.supervisorAppointmentApplications;
  const isSupervisorSuperviseesRoute = pathname === APP_ROUTES.supervisorAppointmentSupervisees;
  const supervisorResearchMatch = matchPath(`${APP_ROUTES.supervisorResearchChanges}/:requestId`, pathname);
  const isSupervisorResearchRoute = pathname === APP_ROUTES.supervisorResearchChanges || Boolean(supervisorResearchMatch);
  const supervisorResearchView = pathname === APP_ROUTES.supervisorResearchNew ? 'new' : pathname === APP_ROUTES.supervisorResearchProfile ? 'profile' : supervisorResearchMatch ? 'detail' : 'list';
  const supervisorResearchRequestId = supervisorResearchView === 'detail' ? supervisorResearchMatch?.params.requestId : undefined;
  const supervisorSuperviseeMatch = matchPath(`${APP_ROUTES.supervisorAppointmentSupervisees}/:studentId`, pathname);
  const supervisorSuperviseeStudentId = supervisorSuperviseeMatch?.params.studentId;
  const supportingRequestMatch = matchPath(`${APP_ROUTES.supervisorAppointments}/supporting-requests/:nominationId`, pathname);
  const supportingRequestId = supportingRequestMatch?.params.nominationId;
  const isSupervisorFixedRoute = (
    isSupervisorWorkloadRoute
    || isSupervisorNewRoute
    || isSupervisorHistoryRoute
    || isSupervisorRequirementsRoute
    || isSupervisorApplicationsRoute
    || isSupervisorSuperviseesRoute
    || isSupervisorResearchRoute
    || Boolean(supervisorSuperviseeStudentId)
    || Boolean(supportingRequestId)
  );
  const supervisorApplicationMatch = isSupervisorFixedRoute
    ? null
    : matchPath(`${APP_ROUTES.supervisorAppointments}/:applicationId`, pathname);
  const panelRecommendationMatch = matchPath(`${APP_ROUTES.panelAppointments}/recommendations/:recommendationId`, pathname);
  const panelRecordMatch = matchPath(`${APP_ROUTES.panelAppointmentRecords}/:recordId`, pathname);
  const panelAssignmentMatch = matchPath(`${APP_ROUTES.panelAppointmentAssignments}/:studentId`, pathname);
  const markRecordId = markRecordMatch?.params.recordId;
  const supervisorApplicationId = supervisorApplicationMatch?.params.applicationId;
  const panelRecommendationId = panelRecommendationMatch?.params.recommendationId;
  const panelRecordId = panelRecordMatch?.params.recordId;
  const panelAssignmentStudentId = panelAssignmentMatch?.params.studentId;
  const panelRecommendationStudentId = new URLSearchParams(location.search).get('student') ?? undefined;
  const isMarksConfigRoute = pathname === APP_ROUTES.marksConfig;
  const isMarksRubricsRoute = pathname === APP_ROUTES.marksRubrics;
  const isMarksTasksRoute = pathname === APP_ROUTES.marksTasks;
  const isMarksRecordsRoute = pathname === APP_ROUTES.marksRecords;
  const isMarksAdministrationRoute = (
    isMarksConfigRoute
    || isMarksRubricsRoute
    || isMarksTasksRoute
    || isMarksRecordsRoute
    || Boolean(markRecordId)
  );
  const isDashboardTimelineRoute = pathname === APP_ROUTES.dashboardTimeline;
  const isDashboardSemestersRoute = pathname === APP_ROUTES.dashboardSemesters;
  const isDashboardReportsRoute = pathname === APP_ROUTES.dashboardReports;
  const isDashboardParticipantLifecycleRoute = pathname === APP_ROUTES.dashboardParticipantLifecycle;
  const isDashboardWorkflowReconciliationRoute = pathname === APP_ROUTES.dashboardWorkflowReconciliation;
  const isDashboardLecturerCapacityRoute = pathname === APP_ROUTES.dashboardLecturerCapacity;
  const dashboardProgressMatch = matchPath(`${APP_ROUTES.dashboardProgress}/:studentId`, pathname);
  const isDashboardProgressRoute = pathname === APP_ROUTES.dashboardProgress || Boolean(dashboardProgressMatch);
  const isStudentOtherDossierRoute = Boolean(
    isStudentWorkspace
    && dashboardProgressMatch?.params.studentId
    && dashboardProgressMatch.params.studentId !== currentUser?.studentId,
  );
  const dossierStudentId = isStudentWorkspace
    ? currentUser?.studentId
    : dashboardProgressMatch?.params.studentId;
  const isStudentUnsupportedSupervisorRoute =
    isStudentWorkspace && (isSupervisorWorkloadRoute || isSupervisorHistoryRoute || isSupervisorRequirementsRoute || isSupervisorSuperviseesRoute || Boolean(supervisorSuperviseeStudentId) || Boolean(supportingRequestId));
  const isLecturerUnsupportedSupervisorRoute =
    isLecturerWorkspace && (isSupervisorWorkloadRoute || isSupervisorNewRoute || isSupervisorRequirementsRoute || isSupervisorApplicationsRoute || pathname === APP_ROUTES.supervisorResearchNew);
  const isCoordinatorUnsupportedSupervisorRoute =
    isCoordinatorWorkspace && isSupervisorFixedRoute && !isSupervisorSuperviseesRoute && !supervisorSuperviseeStudentId && !supportingRequestId;
  const isOfficeUnsupportedSupervisorRoute =
    currentUser?.role === 'Office Staff/Admin'
    && (isSupervisorNewRoute || isSupervisorHistoryRoute || isSupervisorApplicationsRoute || isSupervisorResearchRoute || Boolean(supportingRequestId));

  const supervisorReturn = (parent: string, label: string) => recordReturn(location.state?.recordReturn, { path: parent + location.search, label }, APP_ROUTES.supervisorAppointments);
  const openSupervisorRecord = (target: string, parent: string, label: string) => {
    const source = pathname === parent || (parent === APP_ROUTES.supervisorAppointments && isSupervisorHistoryRoute)
      ? { path: pathname + location.search, label, historyIndex: window.history.state?.idx }
      : supervisorReturn(parent, label);
    navigate(target + location.search, { state: { recordReturn: source } });
  };
  const returnToSupervisorList = (parent: string, label: string) => {
    const source = supervisorReturn(parent, label);
    const steps = recordBackSteps(window.history.state?.idx, source);
    if (steps) navigate(-steps); else navigate(source.path, { replace: true });
  };
  const dossierReturn = recordReturn(location.state?.dossierReturn, { path: APP_ROUTES.dashboard, label: 'Dashboard' }, '');
  const openDossier = (studentId: string) => navigate(routeForStudentProgress(studentId), { state: {
    dossierReturn: { path: pathname + location.search, label: recordSourceLabel(pathname), historyIndex: window.history.state?.idx },
    recordReturn: location.state?.recordReturn,
  } });
  const returnFromDossier = () => {
    const steps = recordBackSteps(window.history.state?.idx, dossierReturn);
    if (steps) navigate(-steps); else navigate(dossierReturn.path, { replace: true, state: {recordReturn: location.state?.recordReturn} });
  };
  const returnToPanelList = () => {
    const source = recordReturn(location.state?.recordReturn, {path: APP_ROUTES.panelAppointments + location.search, label: 'Panel Appointments'}, APP_ROUTES.panelAppointments);
    const steps = recordBackSteps(window.history.state?.idx, source);
    if (steps) navigate(-steps); else navigate(source.path, {replace: true});
  };
  const openPanelRecord = (path: string) => navigate(path + location.search, { state: {
    recordReturn: { path: pathname + location.search, label: recordSourceLabel(pathname), historyIndex: window.history.state?.idx },
  } });
  const isUnauthorizedSupervisorRequirementsRoute = Boolean(
    isSupervisorRequirementsRoute
    && currentUser
    && currentUser.role !== 'Office Staff/Admin'
  );
  const isPanelNestedRoute = pathname !== APP_ROUTES.panelAppointments && activeSidebarItem === SIDEBAR_ITEMS.PANEL_APPOINTMENTS;
  const isCoordinatorUnsupportedPanelRoute =
    isCoordinatorWorkspace &&
    (
      pathname === APP_ROUTES.panelAppointmentSubmitted ||
      pathname === APP_ROUTES.panelAppointmentReviewed ||
      Boolean(panelAssignmentStudentId)
    );

  useEffect(() => {
    if (currentUser?.role !== 'Office Staff/Admin' || currentUser.mustChangePassword) {
      setMarksDashboardSummary(null);
      setEvaluationPeriods([]);
      setRubricVersions([]);
      return;
    }

    let cancelled = false;
    Promise.all([getDashboardSummary(), getEvaluationPeriods(), getRubricVersions()])
      .then(([dashboardSummary, periods, rubrics]) => {
        if (cancelled) return;
        setMarksDashboardSummary(dashboardSummary);
        setEvaluationPeriods(periods);
        setRubricVersions(rubrics);
      })
      .catch(() => {
        if (cancelled) return;
        setMarksDashboardSummary(null);
        setEvaluationPeriods([]);
        setRubricVersions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.role, currentUser?.mustChangePassword]);

  const openMarkRecords = (statusTab: MarkRecordStatusTab = 'All Records') => {
    setMarksRecordStatusTab(statusTab);
    navigate(APP_ROUTES.marksRecords);
  };

  const activeEvaluationPeriod = (
    evaluationPeriods.find((period) => period.effectiveStatus === 'OPEN')
    || evaluationPeriods.find((period) => period.effectiveStatus === 'SCHEDULED')
    || evaluationPeriods[0]
  );
  const activeRubric = (
    rubricVersions.find((rubric) => rubric.id === activeEvaluationPeriod?.rubricId)
    || rubricVersions.find((rubric) => rubric.isActive)
  );
  const activePeriodDates = activeEvaluationPeriod
    ? [formatPeriodDate(activeEvaluationPeriod.opensAt), formatPeriodDate(activeEvaluationPeriod.closesAt)]
        .filter(Boolean)
        .join(' - ')
    : 'No active period configured';
  const taskTotals = activeEvaluationPeriod?.taskTotals;
  const totalMarkTasks = taskTotals?.total ?? (
    (marksDashboardSummary?.submittedMarkEntries ?? 0)
    + (marksDashboardSummary?.incompleteMarkEntries ?? 0)
  );
  const submittedMarkTasks = taskTotals?.submitted ?? marksDashboardSummary?.submittedMarkEntries ?? 0;
  const incompleteMarkTasks = taskTotals?.incomplete ?? marksDashboardSummary?.incompleteMarkEntries ?? 0;

  const checklistTasks: ChecklistItem[] = buildMarksSetupChecklist(
    evaluationPeriods,
    rubricVersions,
  );

  // Handler when clicking checklist steps
  const handleChecklistAction = (item: ChecklistItem) => {
    if (item.id === 'period') {
      navigate(APP_ROUTES.marksConfig);
    } else if (item.id === 'rubric') {
      navigate(APP_ROUTES.marksRubrics);
    } else if (item.id === 'tasks') {
      navigate(APP_ROUTES.marksTasks);
    } else {
      navigate(APP_ROUTES.marksRecords);
    }
  };

  const handleSuccessfulLogin = (user: DemoUser) => {
    setSessionNotice(null);
    setCurrentUser(user);
    navigate(routeForSidebarItem(defaultLandingPageForUser(user)), { replace: true });
  };

  const showAppToast = (message: string) => {
    setAppToastMessage(message);
    window.setTimeout(() => setAppToastMessage(null), 3500);
  };

  const handleLogout = () => {
    void authApi.logout();
    setSessionNotice(null);
    setCurrentUser(null);
    navigate(APP_ROUTES.login, { replace: true });
  };

  // Leave the reset view and clean the reset params out of the URL bar.
  const handleBackToLogin = () => {
    navigate(APP_ROUTES.login, { replace: true });
  };

  // While restoring a session from the refresh cookie, hold a neutral loading screen
  // instead of flashing the login page (skip it for the reset-password link flow).
  if (isRestoringSession && pathname !== APP_ROUTES.resetPassword) {
    return (
      <div
        id="session-restore-loading"
        className="min-h-screen bg-[#f1f5f9] flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-[#0c1424] animate-spin" />
          <p className="text-xs font-bold tracking-wide">Restoring your session…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (pathname === APP_ROUTES.resetPassword && resetParams) {
      return (
        <div id="application-entry" className="min-h-screen bg-[#f1f5f9]">
          <ResetPasswordPage
            uid={resetParams.uid}
            token={resetParams.token}
            onBackToLogin={handleBackToLogin}
          />
        </div>
      );
    }

    if (pathname === APP_ROUTES.forgotPassword) {
      return (
        <div id="application-entry" className="min-h-screen bg-[#f1f5f9]">
          <ForgotPasswordFlow onBackToLogin={() => navigate(APP_ROUTES.login)} />
        </div>
      );
    }

    if (pathname !== APP_ROUTES.login) {
      return <Navigate to={APP_ROUTES.login} replace />;
    }

    return (
      <div id="application-entry" className="min-h-screen bg-[#f1f5f9]">
        <AuthLayout>
          <div className="w-full flex justify-center items-center">
            <div className="w-full flex justify-center flex-col items-center">
              <LoginCard
                onForgotPasswordClick={() => navigate(APP_ROUTES.forgotPassword)}
                onLoginSuccess={handleSuccessfulLogin}
                notice={sessionNotice}
              />
              {appToastMessage && <p role="status" className="mt-4 text-sm text-slate-700">{appToastMessage}</p>}
            </div>
          </div>
        </AuthLayout>
      </div>
    );
  }

  if (currentUser.mustChangePassword) {
    return (
      <div id="application-entry" className="min-h-screen bg-[#f1f5f9]">
        <AuthLayout>
          <div className="w-full flex justify-center items-center">
            <ForcedPasswordChange
              userName={currentUser.fullName}
              onChanged={() => setCurrentUser({ ...currentUser, mustChangePassword: false })}
              onLogout={handleLogout}
            />
          </div>
        </AuthLayout>
      </div>
    );
  }

  const defaultAuthenticatedRoute = routeForSidebarItem(defaultLandingPageForUser(currentUser));
  if (
    pathname === APP_ROUTES.root
    || pathname === APP_ROUTES.login
    || pathname === APP_ROUTES.forgotPassword
    || pathname === APP_ROUTES.resetPassword
    || !isKnownAppPath(pathname)
  ) {
    return <Navigate to={defaultAuthenticatedRoute} replace />;
  }

  if (!canAccessModule(currentUser.role, activeSidebarItem)) {
    return <Navigate to={defaultAuthenticatedRoute} replace />;
  }
  if (
    isMarksAdministrationRoute
    && !canAccessMarksAdministration(currentUser.role)
  ) {
    return <Navigate to={defaultAuthenticatedRoute} replace />;
  }

  return (
    <div id="application-entry" className="min-h-screen bg-[#f1f5f9]">
      {/* ==================== FRONTEND: PORTAL DASHBOARD WORKSPACE ==================== */}
      <NotificationsProvider>
        <PortalToast message={appToastMessage} />
        <AppLayout
          activeItem={activeSidebarItem}
          onNavigate={(target) => {
            setMarksRecordStatusTab('All Records');
            navigate(routeForSidebarItem(target));
          }}
          onLogout={handleLogout}
          onNotificationsTrigger={() => {
            navigate(APP_ROUTES.notifications);
          }}
          userName={currentUser.fullName}
          userRole={currentUser.role}
          activeModal={activePortalModal}
          setActiveModal={setActivePortalModal}
        >
          <React.Suspense fallback={<ModuleLoadingFallback />}>
            {activeSidebarItem === SIDEBAR_ITEMS.MARKS_ENTRY ? (
              isLecturerWorkspace ? (
                <LecturerMarksEntry
                  onBackToDashboard={() => navigate(APP_ROUTES.dashboard)}
                  onNavigateToDossier={openDossier}
                  onNavigateToRequirements={() => navigate(routeForSupervisorRequirements())}
                />
              ) : isMarksConfigRoute ? (
                <MarkEntryPeriodConfig
                  onBack={() => navigate(APP_ROUTES.marks)}
                  onManageSemesters={() => navigate(APP_ROUTES.dashboardSemesters)}
                />
              ) : isMarksRubricsRoute ? (
                <RubricsManagementView onBack={() => navigate(APP_ROUTES.marks)} />
              ) : isMarksTasksRoute ? (
                <EvaluationTaskAssignment onBack={() => navigate(APP_ROUTES.marks)} />
              ) : isMarksRecordsRoute ? (
                <MarkEntryRecords 
                  onBack={() => navigate(APP_ROUTES.marks)}
                  initialStatusTab={marksRecordStatusTab}
                  onViewRecordDetail={(recordId) => navigate(routeForMarkRecord(recordId), { state: { recordReturn: { path: pathname + location.search, label: 'Mark Entry Records', historyIndex: window.history.state?.idx } } })}
                  onNavigateToDossier={openDossier}
                />
              ) : markRecordId ? (
                <MarkEntryRecordDetail
                  onBack={() => { const source = recordReturn(location.state?.recordReturn, { path: APP_ROUTES.marksRecords, label: 'Mark Entry Records' }, APP_ROUTES.marks); const steps = recordBackSteps(window.history.state?.idx, source); if (steps) navigate(-steps); else navigate(source.path, { replace: true }); }}
                  recordId={markRecordId}
                />
              ) : (
                /* Main Dashboard Marks Entry View workspace */
                <div id="marks-entry-workspace" className="space-y-8 animate-fade-in">
                  
                  {/* Header Title section */}
                  <div id="page-metadata-block" className="text-left">
                    <h1 id="main-view-title" className="page-title">
                      Marks & Evaluation Management
                    </h1>
                    <p id="main-view-subtitle" className="page-subtitle">
                      Configure mark entry setup, generate evaluation tasks, and monitor submission progress.
                    </p>
                  </div>

                  {/* 4 Summary Cards Grid */}
                  <div id="summary-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <SummaryCard
                      title="Mark Entry Period"
                      badgeText={activeEvaluationPeriod ? formatPeriodStatus(activeEvaluationPeriod.effectiveStatus) : 'Not configured'}
                      badgeType={activeEvaluationPeriod?.isOpen ? 'active' : 'ready'}
                      subtext={activePeriodDates}
                      icon={Calendar}
                      onClick={() => navigate(APP_ROUTES.marksConfig)}
                    />
                    <SummaryCard
                      title="Rubric Components"
                      badgeText={activeRubric?.isReady ? 'Ready' : 'Needs work'}
                      badgeType={activeRubric?.isReady ? 'ready' : 'generated'}
                      subtext={activeRubric
                        ? `${activeRubric.components.filter((component) => component.isActive ?? component.status === 'ACTIVE').length} components, ${activeRubric.componentTotal} / ${activeRubric.targetMark} marks`
                        : 'No active rubric configured'}
                      icon={Sliders}
                      onClick={() => navigate(APP_ROUTES.marksRubrics)}
                    />
                    <SummaryCard
                      title="Evaluation Tasks"
                      badgeText={`${totalMarkTasks} Tasks`}
                      badgeType="generated"
                      subtext={`${taskTotals?.supervisor ?? marksDashboardSummary?.supervisorMarkTasks ?? 0} supervisor, ${taskTotals?.panel ?? marksDashboardSummary?.panelMarkTasks ?? 0} panel, ${taskTotals?.backup ?? marksDashboardSummary?.backupMarkTasks ?? 0} backup`}
                      icon={CheckCircle}
                      onClick={() => navigate(APP_ROUTES.marksTasks)}
                    />
                    <SummaryCard
                      title="Submitted Marks"
                      badgeText={`${submittedMarkTasks} / ${totalMarkTasks}`}
                      badgeType="ratio"
                      subtext={`${incompleteMarkTasks} submissions pending`}
                      icon={Database}
                      onClick={() => openMarkRecords('Submitted')}
                    />
                  </div>

                  {/* Core layout grid (Left column: 65%, Right column: 35%) */}
                  <div id="core-layout-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left column content: Setup checklists and Progress Monitoring */}
                    <div id="left-column-layout" className="lg:col-span-8 space-y-8">
                      
                      {/* Setup Checklist */}
                      <ChecklistCard 
                        items={checklistTasks} 
                        onItemAction={handleChecklistAction} 
                      />

                      {/* Submission Monitoring */}
                      <MarkSubmissionMonitoring onViewRecords={openMarkRecords} />
                    </div>

                    {/* Right column content: Urgent alerts list, Quick Actions, Database sync */}
                    <div id="right-column-layout" className="lg:col-span-4 space-y-8">
                      
                      {/* Attention Needed items */}
                      <AlertListCard
                        periods={evaluationPeriods}
                        rubrics={rubricVersions}
                        onViewRecords={openMarkRecords}
                        onManageRubrics={() => navigate(APP_ROUTES.marksRubrics)}
                      />

                      {/* Quick Actions buttons with Database state indicators */}
                      <QuickActionsCard
                        onConfigurePeriod={() => navigate(APP_ROUTES.marksConfig)}
                        onManageRubrics={() => navigate(APP_ROUTES.marksRubrics)}
                        onGenerateTasks={() => navigate(APP_ROUTES.marksTasks)}
                        onViewRecords={() => openMarkRecords('All Records')}
                      />
                    </div>

                  </div>

                </div>
              )
            ) : activeSidebarItem === SIDEBAR_ITEMS.PANEL_APPOINTMENTS ? (
              isStudentWorkspace && isPanelNestedRoute ? (
                <Navigate to={APP_ROUTES.panelAppointments} replace />
              ) : isStudentWorkspace ? (
                <StudentPanelAppointment onShowFAQChatbot={() => navigate(APP_ROUTES.faq)} />
              ) : isCoordinatorUnsupportedPanelRoute ? (
                <Navigate to={APP_ROUTES.panelAppointments} replace />
              ) : isLecturerWorkspace || isCoordinatorWorkspace ? (
                <LecturerPanelAppointments
                  currentUser={currentUser}
                  initialRecommendationId={panelRecommendationId}
                  initialSuperviseeId={panelRecommendationStudentId}
                  routeView={
                    pathname === APP_ROUTES.panelAppointmentSubmitted
                      ? 'submitted'
                      : pathname === APP_ROUTES.panelAppointmentReviewed
                      ? 'reviewed'
                      : panelAssignmentStudentId
                      ? 'assignmentDetail'
                      : 'list'
                  }
                  routeAssignmentStudentId={panelAssignmentStudentId}
                  onNavigateToList={returnToPanelList}
                  onNavigateToSubmitted={() => navigate(routeForPanelSubmittedRecommendations())}
                  onNavigateToReviewed={() => navigate(routeForPanelReviewedRequests())}
                  onNavigateToAssignment={(studentId) => openPanelRecord(routeForPanelAssignment(studentId))}
                  onNavigateToDossier={openDossier}
                />
              ) : (
                <PanelAppointmentManagement
                  routeView={
                    pathname === APP_ROUTES.panelAppointmentWorkload
                      ? 'workload'
                      : panelRecordId
                      ? 'detail'
                      : 'list'
                  }
                  routeRecordId={panelRecordId}
                  onNavigateToList={returnToPanelList}
                  onNavigateToWorkload={() => navigate(routeForPanelWorkload())}
                  onNavigateToRecord={(recordId) => openPanelRecord(routeForPanelRecord(recordId))}
                  onNavigateToDossier={openDossier}
                  onOpenCapacity={() => navigate(APP_ROUTES.dashboardLecturerCapacity)}
                />
              )
            ) : activeSidebarItem === SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS ? (
              isUnauthorizedSupervisorRequirementsRoute ? (
                <Navigate to={APP_ROUTES.supervisorAppointments} replace />
              ) : isSupervisorRequirementsRoute ? (
                <SupervisorDocumentRequirements
                  onBack={() => navigate(APP_ROUTES.supervisorAppointments)}
                />
              ) : isSupervisorResearchRoute && (isCoordinatorWorkspace || currentUser.role === 'Office Staff/Admin') ? (
                <StaffResearchWorkspace role={currentUser.role} routeView={supervisorResearchView} routeRequestId={supervisorResearchRequestId}
                  onNavigateToList={() => { if (supervisorResearchView === 'list') returnToSupervisorList(APP_ROUTES.supervisorAppointments, 'Supervisor Appointments'); else returnToSupervisorList(APP_ROUTES.supervisorResearchChanges, 'Research changes'); }}
                  onNavigateToRequest={(id) => openSupervisorRecord(routeForSupervisorResearchRequest(id), APP_ROUTES.supervisorResearchChanges, 'Research changes')}
                  onNavigateToProfile={() => openSupervisorRecord(APP_ROUTES.supervisorResearchProfile, APP_ROUTES.supervisorResearchChanges, 'Research changes')}
                  onNavigateToNew={() => openSupervisorRecord(APP_ROUTES.supervisorResearchNew, APP_ROUTES.supervisorResearchChanges, 'Research changes')}
                />
              ) : isStudentUnsupportedSupervisorRoute ? (
                <Navigate to={APP_ROUTES.supervisorAppointments} replace />
              ) : isStudentWorkspace ? (
                <StudentSupervisorAppointment
                  lifecycleStatus={currentUser.participantLifecycleStatus}
                  onShowFAQChatbot={() => navigate(APP_ROUTES.faq)}
                  initialApplicationId={supervisorApplicationId}
                  routeView={isSupervisorNewRoute ? 'newApplication' : isSupervisorResearchRoute ? 'research' : isSupervisorApplicationsRoute || supervisorApplicationId ? 'applications' : 'overview'}
                  onNavigateToList={() => returnToSupervisorList(APP_ROUTES.supervisorAppointmentApplications, 'Applications')}
                  onNavigateToNewApplication={() => openSupervisorRecord(routeForSupervisorNewApplication(), APP_ROUTES.supervisorAppointmentApplications, 'Applications')}
                  onNavigateToApplication={(applicationId) => openSupervisorRecord(routeForSupervisorApplication(applicationId), APP_ROUTES.supervisorAppointmentApplications, 'Applications')}
                  researchView={supervisorResearchView}
                  researchRequestId={supervisorResearchRequestId}
                  onNavigateToResearchList={() => returnToSupervisorList(APP_ROUTES.supervisorResearchChanges, 'Research changes')}
                  onNavigateToResearchProfile={() => openSupervisorRecord(APP_ROUTES.supervisorResearchProfile, APP_ROUTES.supervisorResearchChanges, 'Research changes')}
                  onNavigateToResearchNew={() => openSupervisorRecord(APP_ROUTES.supervisorResearchNew, APP_ROUTES.supervisorResearchChanges, 'Research changes')}
                  onNavigateToResearchRequest={(id) => openSupervisorRecord(routeForSupervisorResearchRequest(id), APP_ROUTES.supervisorResearchChanges, 'Research changes')}
                />
              ) : isCoordinatorUnsupportedSupervisorRoute ? (
                <Navigate to={APP_ROUTES.supervisorAppointments} replace />
              ) : isCoordinatorWorkspace ? (
                <CoordinatorSupervisorApprovals
                  onNavigateToList={() => returnToSupervisorList(supervisorSuperviseeStudentId ? APP_ROUTES.supervisorAppointmentSupervisees : APP_ROUTES.supervisorAppointments, supervisorSuperviseeStudentId ? 'Supervisory teams' : 'Appointment requests')}
                  onNavigateToApplication={(id) => openSupervisorRecord(routeForSupervisorApplication(id), isSupervisorSuperviseesRoute ? APP_ROUTES.supervisorAppointmentSupervisees : APP_ROUTES.supervisorAppointments, isSupervisorSuperviseesRoute ? 'Supervisory teams' : 'Appointment requests')}
                  backLabel={`Back to ${supervisorReturn(APP_ROUTES.supervisorAppointments, 'Appointment requests').label}`}
                  initialSupportingId={supportingRequestId}
                  onNavigateToSupportingRequest={(id) => openSupervisorRecord(routeForSupportingSupervisorRequest(id), APP_ROUTES.supervisorAppointments, 'Appointment requests')}
                  workspaceView={isSupervisorSuperviseesRoute || supervisorSuperviseeStudentId ? 'teams' : 'requests'}
                  routeTeamStudentId={supervisorSuperviseeStudentId}
                  onNavigateToTeam={(id) => openSupervisorRecord(routeForSupervisorSupervisee(id), APP_ROUTES.supervisorAppointmentSupervisees, 'Supervisory teams')}
                  initialApplicationId={supervisorApplicationId}
                  onNavigateToDossier={openDossier}
                />
              ) : isLecturerUnsupportedSupervisorRoute ? (
                <Navigate to={APP_ROUTES.supervisorAppointments} replace />
              ) : isLecturerWorkspace ? (
                <LecturerSupervisorAppointments
                  lecturerId={currentUser.id}
                  initialApplicationId={supervisorApplicationId}
                  initialSupportingId={supportingRequestId}
                  onNavigateToRequest={(id, kind) => openSupervisorRecord(kind === 'supporting' ? routeForSupportingSupervisorRequest(id) : routeForSupervisorApplication(id), APP_ROUTES.supervisorAppointments, 'Appointment requests')}
                  routeView={
                    isSupervisorHistoryRoute
                      ? 'history'
                      : isSupervisorResearchRoute
                      ? 'research'
                      : isSupervisorSuperviseesRoute
                      ? 'supervisees'
                      : supervisorSuperviseeStudentId
                      ? 'superviseeDetail'
                      : 'list'
                  }
                  routeSuperviseeStudentId={supervisorSuperviseeStudentId}
                  onNavigateToList={() => returnToSupervisorList(APP_ROUTES.supervisorAppointments, 'Appointment requests')}
                  onNavigateToHistory={() => navigate(routeForSupervisorHistory())}
                  onNavigateToSupervisee={(studentId) => openSupervisorRecord(routeForSupervisorSupervisee(studentId), APP_ROUTES.supervisorAppointmentSupervisees, 'My supervisees')}
                  onNavigateToSupervisees={() => returnToSupervisorList(APP_ROUTES.supervisorAppointmentSupervisees, 'My supervisees')}
                  researchView={supervisorResearchView}
                  researchRequestId={supervisorResearchRequestId}
                  onNavigateToResearchList={() => returnToSupervisorList(APP_ROUTES.supervisorResearchChanges, 'Research changes')}
                  onNavigateToResearchProfile={() => openSupervisorRecord(APP_ROUTES.supervisorResearchProfile, APP_ROUTES.supervisorResearchChanges, 'Research changes')}
                  onNavigateToResearchRequest={(id) => openSupervisorRecord(routeForSupervisorResearchRequest(id), APP_ROUTES.supervisorResearchChanges, 'Research changes')}
                  onNavigateToDossier={openDossier}
                  onNavigateToPanelRecommendation={(studentId) => navigate(routeForPanelRecommendationStart(studentId))}
                />
              ) : isOfficeUnsupportedSupervisorRoute ? (
                <Navigate to={APP_ROUTES.supervisorAppointments} replace />
              ) : (
                <SupervisorAppointmentManagement
                  routeView={
                    isSupervisorWorkloadRoute
                      ? 'workload'
                      : supervisorSuperviseeStudentId ? 'teamDetail'
                      : isSupervisorSuperviseesRoute ? 'teams'
                      : supervisorApplicationId
                      ? 'detail'
                      : 'list'
                  }
                  routeRecordId={supervisorApplicationId}
                  routeTeamStudentId={supervisorSuperviseeStudentId}
                  onNavigateToTeam={(id) => openSupervisorRecord(routeForSupervisorSupervisee(id), APP_ROUTES.supervisorAppointmentSupervisees, 'Supervisory teams')}
                  onNavigateToTeams={() => returnToSupervisorList(APP_ROUTES.supervisorAppointmentSupervisees, 'Supervisory teams')}
                  onNavigateToRequirements={() => navigate(routeForSupervisorRequirements())}
                  onNavigateToList={() => returnToSupervisorList(APP_ROUTES.supervisorAppointments, 'Appointment records')}
                  onNavigateToWorkload={() => navigate(routeForSupervisorWorkload())}
                  onNavigateToRecord={(recordId) => openSupervisorRecord(routeForSupervisorApplication(recordId), APP_ROUTES.supervisorAppointments, 'Appointment records')}
                  onNavigateToDossier={openDossier}
                  onOpenCapacity={() => navigate(APP_ROUTES.dashboardLecturerCapacity)}
                />
              )
            ) : activeSidebarItem === SIDEBAR_ITEMS.REGISTRY ? (
              <StudentRegistry
                readOnly={currentUser.role !== 'Office Staff/Admin'}
                onOpenParticipantLifecycle={() => navigate(APP_ROUTES.dashboardParticipantLifecycle)}
              />
            ) : activeSidebarItem === SIDEBAR_ITEMS.DASHBOARD ? (
              isDashboardLecturerCapacityRoute && currentUser.role !== 'Office Staff/Admin' ? (
                <Navigate to={APP_ROUTES.dashboard} replace />
              ) : isDashboardLecturerCapacityRoute ? (
                <LecturerCapacityManagement onBack={() => navigate(APP_ROUTES.dashboard)} />
              ) : isDashboardWorkflowReconciliationRoute && currentUser.role !== 'Office Staff/Admin' ? (
                <Navigate to={APP_ROUTES.dashboard} replace />
              ) : isDashboardWorkflowReconciliationRoute ? (
                <WorkflowReconciliationCentre
                  onBack={() => navigate(APP_ROUTES.dashboard)}
                  onNavigateToRoute={navigate}
                  onOpenCapacity={() => navigate(APP_ROUTES.dashboardLecturerCapacity)}
                />
              ) : isDashboardParticipantLifecycleRoute && currentUser.role !== 'Office Staff/Admin' ? (
                <Navigate to={APP_ROUTES.dashboard} replace />
              ) : isDashboardParticipantLifecycleRoute ? (
                <ParticipantLifecycleManagement
                  onBack={() => navigate(APP_ROUTES.dashboard)}
                  onOpenReconciliation={() => navigate(APP_ROUTES.dashboardWorkflowReconciliation)}
                />
              ) : isStudentOtherDossierRoute ? (
                <Navigate to={APP_ROUTES.dashboardProgress} replace />
              ) : isDashboardProgressRoute && !dossierStudentId ? (
                <Navigate to={APP_ROUTES.dashboard} replace />
              ) : isDashboardProgressRoute ? (
                <StudentProgressDossier
                  studentId={dossierStudentId}
                  currentUserRole={currentUser.role}
                  onBack={returnFromDossier}
                  backLabel={`Back to ${dossierReturn.label}`}
                  onNavigateToRoute={navigate}
                />
              ) : isDashboardReportsRoute && isStudentWorkspace ? (
                <Navigate to={APP_ROUTES.dashboard} replace />
              ) : isDashboardReportsRoute ? (
                <WorkflowReports
                  currentUserRole={currentUser.role}
                  onBack={() => navigate(APP_ROUTES.dashboard)}
                  onNavigateToRoute={navigate}
                  onOpenReconciliation={() => navigate(APP_ROUTES.dashboardWorkflowReconciliation)}
                />
              ) : (isDashboardTimelineRoute || isDashboardSemestersRoute) && currentUser.role !== 'Office Staff/Admin' ? (
                <Navigate to={APP_ROUTES.dashboard} replace />
              ) : isStudentWorkspace ? (
                <StudentDashboard
                  studentName={currentUser.fullName}
                  studentId={currentUser.studentId}
                  programme={currentUser.department}
                  lifecycleStatus={currentUser.participantLifecycleStatus}
                  onNavigateToTab={(tab) => navigate(routeForSidebarItem(tab))}
                  onNavigateToRoute={navigate}
                />
              ) : isCoordinatorWorkspace ? (
                <CoordinatorDashboard
                  onNavigateToTab={(tab) => navigate(routeForSidebarItem(tab))}
                  onNavigateToRoute={navigate}
                />
              ) : isLecturerWorkspace ? (
                <LecturerDashboard
                  lifecycleStatus={currentUser.participantLifecycleStatus}
                  onNavigateToTab={(tab) => navigate(routeForSidebarItem(tab))}
                  onNavigateToRoute={navigate}
                />
              ) : isDashboardSemestersRoute ? (
                <AcademicSemesterManagement
                  onBack={() => navigate(APP_ROUTES.dashboard)}
                  onManageParticipants={() => navigate(APP_ROUTES.dashboardParticipantLifecycle)}
                  onOpenReconciliation={() => navigate(APP_ROUTES.dashboardWorkflowReconciliation)}
                  onOpenCapacity={() => navigate(APP_ROUTES.dashboardLecturerCapacity)}
                />
              ) : isDashboardTimelineRoute ? (
                <TimelineManagement
                  onBack={() => navigate(APP_ROUTES.dashboard)}
                  onManageSemesters={() => navigate(APP_ROUTES.dashboardSemesters)}
                />
              ) : (
                <AdministrationDashboard 
                  onNavigateToTab={(tab) => {
                    navigate(routeForSidebarItem(tab));
                  }}
                  onNavigateToRoute={navigate}
                  onNavigateToMarksRecords={openMarkRecords}
                  onNavigateToTimeline={() => navigate(routeForDashboardTimeline())}
                />
              )
            ) : activeSidebarItem === SIDEBAR_ITEMS.FILE_MANAGEMENT ? (
              isStudentWorkspace ? (
                <StudentFileSubmission />
              ) : (
                <FileRepository />
              )
            ) : activeSidebarItem === SIDEBAR_ITEMS.FAQ_CHATBOT ? (
              isStudentWorkspace ? (
                <StudentFAQChatbot />
              ) : (
                <AcademicFAQEditor />
              )
            ) : activeSidebarItem === SIDEBAR_ITEMS.LETTER_GENERATION ? (
              isStudentWorkspace ? (
                <StudentLetterGeneration
                  studentName={currentUser.fullName}
                  studentId={currentUser.studentId}
                  programme={currentUser.department}
                />
              ) : (
                <LetterTemplateManagement />
              )
            ) : activeSidebarItem === SIDEBAR_ITEMS.ANNOUNCEMENTS ? (
              <AnnouncementManagement />
            ) : activeSidebarItem === SIDEBAR_ITEMS.NOTIFICATIONS ? (
              <NotificationsAnnouncements
                onBack={() => navigate(APP_ROUTES.dashboard)}
                onOpenWorkflowRecord={(notification: NotificationItem) => {
                  navigate(routeForNotificationTarget(notification));
                }}
              />
            ) : activeSidebarItem === SIDEBAR_ITEMS.SETTINGS ? (
              <SettingsView currentUser={currentUser} onLogout={handleLogout} onUserUpdated={(updated) => setCurrentUser((existing) => existing?.id === updated.id ? updated : existing)} onPasswordChanged={() => {
                setCurrentUser(null);
                navigate(APP_ROUTES.login, { replace: true });
                showAppToast('Password updated. Please sign in again.');
              }} />
            ) : (
              /* Placeholder message for other sidebar routes */
              <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center max-w-xl mx-auto my-12 shadow-sm">
                <div className="w-16 h-16 bg-[#eff6ff] text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  {activeSidebarItem} Overview Desk
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  You have routed to the <strong>{activeSidebarItem}</strong> workflow module inside the FSKTM administrative center. To fulfill layout reference checks, please toggle back to the <strong>Marks Entry</strong> tab.
                </p>
                <button
                  onClick={() => navigate(APP_ROUTES.marks)}
                  className="mt-6 px-5 py-2.5 bg-brand-navy text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-850 transition"
                >
                  Return to Marks Entry
                </button>
              </div>
            )}
          </React.Suspense>
        </AppLayout>
      </NotificationsProvider>
    </div>
  );
}
