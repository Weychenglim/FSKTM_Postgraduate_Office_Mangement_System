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
  routeForSupervisorHistory,
  routeForSupervisorNewApplication,
  routeForSupervisorRequirements,
  routeForSupervisorSupervisee,
  routeForSupervisorWorkload,
  routeForSidebarItem,
  sidebarItemForPath,
} from './constants/routes';
import {
  canAccessMarksAdministration,
  canAccessModule,
} from './auth/permissions';
import * as authApi from './services/authApi';
import { clearAuthToken } from './services/apiClient';
import { getEvaluationPeriods, getRubricVersions } from './services/marksApi';
import { getDashboardSummary } from './services/timelineApi';
import { NotificationsProvider } from './context/NotificationsContext';
import { defaultLandingPageForUser } from './utils/landingPage';
import { MarkRecordStatusTab } from './utils/markRecords';
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
  const supervisorSuperviseeMatch = matchPath(`${APP_ROUTES.supervisorAppointmentSupervisees}/:studentId`, pathname);
  const supervisorSuperviseeStudentId = supervisorSuperviseeMatch?.params.studentId;
  const isSupervisorFixedRoute = (
    isSupervisorWorkloadRoute
    || isSupervisorNewRoute
    || isSupervisorHistoryRoute
    || isSupervisorRequirementsRoute
    || Boolean(supervisorSuperviseeStudentId)
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
    isStudentWorkspace && (isSupervisorWorkloadRoute || isSupervisorHistoryRoute || isSupervisorRequirementsRoute || Boolean(supervisorSuperviseeStudentId));
  const isLecturerUnsupportedSupervisorRoute =
    isLecturerWorkspace && (isSupervisorWorkloadRoute || isSupervisorNewRoute || isSupervisorRequirementsRoute);
  const isCoordinatorUnsupportedSupervisorRoute =
    isCoordinatorWorkspace && isSupervisorFixedRoute;
  const isOfficeUnsupportedSupervisorRoute =
    currentUser?.role === 'Office Staff/Admin'
    && (isSupervisorNewRoute || isSupervisorHistoryRoute || Boolean(supervisorSuperviseeStudentId));
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
    if (currentUser?.role !== 'Office Staff/Admin') {
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
  }, [currentUser?.role]);

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
    setCurrentUser(user);
    navigate(routeForSidebarItem(defaultLandingPageForUser(user)), { replace: true });
  };

  const showAppToast = (message: string) => {
    setAppToastMessage(message);
    window.setTimeout(() => setAppToastMessage(null), 3500);
  };

  const handleLogout = () => {
    void authApi.logout();
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
              />
            </div>
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
                  onNavigateToDossier={(studentId) => navigate(routeForStudentProgress(studentId))}
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
                  onViewRecordDetail={(recordId) => navigate(routeForMarkRecord(recordId))}
                  onNavigateToDossier={(studentId) => navigate(routeForStudentProgress(studentId))}
                />
              ) : markRecordId ? (
                <MarkEntryRecordDetail
                  onBack={() => navigate(APP_ROUTES.marksRecords)}
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
                  onNavigateToList={() => navigate(APP_ROUTES.panelAppointments)}
                  onNavigateToSubmitted={() => navigate(routeForPanelSubmittedRecommendations())}
                  onNavigateToReviewed={() => navigate(routeForPanelReviewedRequests())}
                  onNavigateToAssignment={(studentId) => navigate(routeForPanelAssignment(studentId))}
                  onNavigateToDossier={(studentId) => navigate(routeForStudentProgress(studentId))}
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
                  onNavigateToList={() => navigate(APP_ROUTES.panelAppointments)}
                  onNavigateToWorkload={() => navigate(routeForPanelWorkload())}
                  onNavigateToRecord={(recordId) => navigate(routeForPanelRecord(recordId))}
                  onNavigateToDossier={(studentId) => navigate(routeForStudentProgress(studentId))}
                />
              )
            ) : activeSidebarItem === SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS ? (
              isUnauthorizedSupervisorRequirementsRoute ? (
                <Navigate to={APP_ROUTES.supervisorAppointments} replace />
              ) : isSupervisorRequirementsRoute ? (
                <SupervisorDocumentRequirements
                  onBack={() => navigate(APP_ROUTES.supervisorAppointments)}
                />
              ) : isStudentUnsupportedSupervisorRoute ? (
                <Navigate to={APP_ROUTES.supervisorAppointments} replace />
              ) : isStudentWorkspace ? (
                <StudentSupervisorAppointment
                  lifecycleStatus={currentUser.participantLifecycleStatus}
                  onShowFAQChatbot={() => navigate(APP_ROUTES.faq)}
                  initialApplicationId={supervisorApplicationId}
                  routeView={isSupervisorNewRoute ? 'newApplication' : 'overview'}
                  onNavigateToList={() => navigate(APP_ROUTES.supervisorAppointments)}
                  onNavigateToNewApplication={() => navigate(routeForSupervisorNewApplication())}
                  onNavigateToApplication={(applicationId) => navigate(routeForSupervisorApplication(applicationId))}
                />
              ) : isCoordinatorUnsupportedSupervisorRoute ? (
                <Navigate to={APP_ROUTES.supervisorAppointments} replace />
              ) : isCoordinatorWorkspace ? (
                <CoordinatorSupervisorApprovals
                  initialApplicationId={supervisorApplicationId}
                  onNavigateToDossier={(studentId) => navigate(routeForStudentProgress(studentId))}
                />
              ) : isLecturerUnsupportedSupervisorRoute ? (
                <Navigate to={APP_ROUTES.supervisorAppointments} replace />
              ) : isLecturerWorkspace ? (
                <LecturerSupervisorAppointments
                  initialApplicationId={supervisorApplicationId}
                  routeView={
                    isSupervisorHistoryRoute
                      ? 'history'
                      : supervisorSuperviseeStudentId
                      ? 'superviseeDetail'
                      : 'list'
                  }
                  routeSuperviseeStudentId={supervisorSuperviseeStudentId}
                  onNavigateToList={() => navigate(APP_ROUTES.supervisorAppointments)}
                  onNavigateToHistory={() => navigate(routeForSupervisorHistory())}
                  onNavigateToSupervisee={(studentId) => navigate(routeForSupervisorSupervisee(studentId))}
                  onNavigateToDossier={(studentId) => navigate(routeForStudentProgress(studentId))}
                  onNavigateToPanelRecommendation={(studentId) => navigate(routeForPanelRecommendationStart(studentId))}
                />
              ) : isOfficeUnsupportedSupervisorRoute ? (
                <Navigate to={APP_ROUTES.supervisorAppointments} replace />
              ) : (
                <SupervisorAppointmentManagement
                  routeView={
                    isSupervisorWorkloadRoute
                      ? 'workload'
                      : supervisorApplicationId
                      ? 'detail'
                      : 'list'
                  }
                  routeRecordId={supervisorApplicationId}
                  onNavigateToList={() => navigate(APP_ROUTES.supervisorAppointments)}
                  onNavigateToWorkload={() => navigate(routeForSupervisorWorkload())}
                  onNavigateToRecord={(recordId) => navigate(routeForSupervisorApplication(recordId))}
                  onNavigateToDossier={(studentId) => navigate(routeForStudentProgress(studentId))}
                />
              )
            ) : activeSidebarItem === SIDEBAR_ITEMS.REGISTRY ? (
              <StudentRegistry />
            ) : activeSidebarItem === SIDEBAR_ITEMS.DASHBOARD ? (
              isDashboardWorkflowReconciliationRoute && currentUser.role !== 'Office Staff/Admin' ? (
                <Navigate to={APP_ROUTES.dashboard} replace />
              ) : isDashboardWorkflowReconciliationRoute ? (
                <WorkflowReconciliationCentre
                  onBack={() => navigate(APP_ROUTES.dashboard)}
                  onNavigateToRoute={navigate}
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
                  onBack={() => navigate(APP_ROUTES.dashboard)}
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
              <SettingsView currentUser={currentUser} onLogout={handleLogout} />
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
