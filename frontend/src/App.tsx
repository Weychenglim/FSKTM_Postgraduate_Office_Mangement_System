/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navigate, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from './components/AuthLayout';
import { LoginCard } from './components/LoginCard';
import { ForgotPasswordFlow } from './components/ForgotPasswordFlow';
import { AppLayout } from './components/AppLayout';
import { SummaryCard } from './components/SummaryCard';
import { ChecklistCard, ChecklistItem } from './components/ChecklistCard';
import { MarkSubmissionMonitoring } from './components/MarkSubmissionMonitoring';
import { AlertListCard } from './components/AlertListCard';
import { QuickActionsCard } from './components/QuickActionsCard';
import { MarkEntryPeriodConfig } from './components/MarkEntryPeriodConfig';
import { RubricsManagementView } from './components/RubricsManagementView';
import { EvaluationTaskAssignment } from './components/EvaluationTaskAssignment';
import { MarkEntryRecords } from './components/MarkEntryRecords';
import { MarkEntryRecordDetail } from './components/MarkEntryRecordDetail';
import { PanelAppointmentManagement } from './components/PanelAppointmentManagement';
import { SupervisorAppointmentManagement } from './components/SupervisorAppointmentManagement';
import { LecturerMarksEntry } from './components/LecturerMarksEntry';
import { LecturerPanelAppointments } from './components/LecturerPanelAppointments';
import { LecturerSupervisorAppointments } from './components/LecturerSupervisorAppointments';
import { AdministrationDashboard } from './components/AdministrationDashboard';
import { TimelineManagement } from './components/TimelineManagement';
import { FileRepository } from './components/FileRepository';
import { StudentFileSubmission } from './components/StudentFileSubmission';
import { NotificationsAnnouncements } from './components/NotificationsAnnouncements';
import { AnnouncementManagement } from './components/AnnouncementManagement';
import { AcademicFAQEditor } from './components/AcademicFAQEditor';
import { StudentFAQChatbot } from './components/StudentFAQChatbot';
import { LetterTemplateManagement } from './components/LetterTemplateManagement';
import { StudentLetterGeneration } from './components/StudentLetterGeneration';
import { StudentRegistry } from './components/StudentRegistry';
import { StudentDashboard } from './components/StudentDashboard';
import { LecturerDashboard } from './components/LecturerDashboard';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { CoordinatorSupervisorDeferred } from './components/CoordinatorSupervisorDeferred';
import { StudentSupervisorAppointment } from './components/StudentSupervisorAppointment';
import { StudentPanelAppointment } from './components/StudentPanelAppointment';
import { SettingsView } from './components/SettingsView';
import { PortalToast } from './components/PortalPrimitives';
import { 
  Calendar, 
  Sliders, 
  CheckCircle,
  Database,
  Briefcase,
} from 'lucide-react';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { DashboardSummary, DemoUser, EvaluationPeriodOption, NotificationItem } from './types';
import { SIDEBAR_ITEMS } from './constants/navigation';
import {
  APP_ROUTES,
  isKnownAppPath,
  routeForMarkRecord,
  routeForNotificationTarget,
  routeForSidebarItem,
  sidebarItemForPath,
} from './constants/routes';
import { canAccessModule } from './auth/permissions';
import { authApi, getAuthToken, clearAuthToken, getDashboardSummary, getEvaluationPeriods } from './services';
import { NotificationsProvider } from './context/NotificationsContext';
import { MOCK_MARK_RECORDS } from './mocks/marks';
import { defaultLandingPageForUser } from './utils/landingPage';
import { MarkRecordStatusTab } from './utils/markRecords';

// Data mapper to pass true metadata dynamically into MarkEntryRecordDetail
const getRecordDetails = (id: string) => {
  const record = MOCK_MARK_RECORDS.find((r) => r.id === id) || MOCK_MARK_RECORDS[0];
  return {
    recordId: record.id,
    studentId: record.studentId,
    studentName: record.studentName,
    researchTitle: record.researchTitle,
    panelMember: record.panelMember,
    semester: record.semester,
    programme: record.programme,
    totalMark: record.totalMark,
    submittedDate: record.submittedDate,
  };
};

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

  // True while we restore an existing session from a stored token on first load.
  // Prevents the login page from flashing on refresh before /auth/me/ resolves.
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const resetParams = (() => {
    const params = new URLSearchParams(location.search);
    const uid = params.get('uid');
    const token = params.get('token');
    return uid && token ? { uid, token } : null;
  })();

  // On first load, restore the session from the stored JWT so a page refresh
  // (or a new tab) does not bounce the user back to the login screen.
  useEffect(() => {
    let cancelled = false;
    if (!getAuthToken()) {
      setIsRestoringSession(false);
      return;
    }
    authApi
      .getCurrentUser()
      .then((user) => {
        if (!cancelled) setCurrentUser(user);
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

  // Trigger states for modals in the main dashboard workspace
  const [activePortalModal, setActivePortalModal] = useState<'period' | 'rubric' | 'generate' | 'help' | null>(null);
  const [appToastMessage, setAppToastMessage] = useState<string | null>(null);
  const isLecturerWorkspace = currentUser?.role === 'Lecturer';
  const isCoordinatorWorkspace = currentUser?.role === 'Programme Coordinator';
  const isStudentWorkspace = currentUser?.role === 'Student';
  const activeSidebarItem = sidebarItemForPath(pathname);
  const markRecordMatch = matchPath(`${APP_ROUTES.marksRecords}/:recordId`, pathname);
  const supervisorApplicationMatch = matchPath(`${APP_ROUTES.supervisorAppointments}/:applicationId`, pathname);
  const panelRecommendationMatch = matchPath(`${APP_ROUTES.panelAppointments}/recommendations/:recommendationId`, pathname);
  const markRecordId = markRecordMatch?.params.recordId;
  const supervisorApplicationId = supervisorApplicationMatch?.params.applicationId;
  const panelRecommendationId = panelRecommendationMatch?.params.recommendationId;
  const isMarksConfigRoute = pathname === APP_ROUTES.marksConfig;
  const isMarksRubricsRoute = pathname === APP_ROUTES.marksRubrics;
  const isMarksTasksRoute = pathname === APP_ROUTES.marksTasks;
  const isMarksRecordsRoute = pathname === APP_ROUTES.marksRecords;
  const isDashboardTimelineRoute = pathname === APP_ROUTES.dashboardTimeline;

  useEffect(() => {
    if (currentUser?.role !== 'Office Staff/Admin') {
      setMarksDashboardSummary(null);
      setEvaluationPeriods([]);
      return;
    }

    let cancelled = false;
    Promise.all([getDashboardSummary(), getEvaluationPeriods()])
      .then(([dashboardSummary, periods]) => {
        if (cancelled) return;
        setMarksDashboardSummary(dashboardSummary);
        setEvaluationPeriods(periods);
      })
      .catch(() => {
        if (cancelled) return;
        setMarksDashboardSummary(null);
        setEvaluationPeriods([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.role]);

  const openMarkRecords = (statusTab: MarkRecordStatusTab = 'All Records') => {
    setMarksRecordStatusTab(statusTab);
    navigate(APP_ROUTES.marksRecords);
  };

  const activeEvaluationPeriod = evaluationPeriods.find((period) => period.isOpen) || evaluationPeriods[0];
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

  // Setup checklist data
  const checklistTasks: ChecklistItem[] = [
    { id: '1', taskName: 'Configure mark entry period', status: 'COMPLETED', actionLabel: 'Open' },
    { id: '2', taskName: 'Define rubric components', status: 'COMPLETED', actionLabel: 'View' },
    { id: '3', taskName: 'Generate evaluation tasks', status: 'COMPLETED', actionLabel: 'View' },
    { id: '4', taskName: 'Notify panel members', status: 'COMPLETED', actionLabel: 'View' }
  ];

  // Handler when clicking checklist steps
  const handleChecklistAction = (item: ChecklistItem) => {
    if (item.id === '1') {
      navigate(APP_ROUTES.marksConfig);
    } else if (item.id === '2') {
      navigate(APP_ROUTES.marksRubrics);
    } else if (item.id === '3' || item.id === '4') {
      navigate(APP_ROUTES.marksTasks);
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

  // While restoring a session from a stored token, hold a neutral loading screen
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

              <div className="mt-4 text-[11px] text-slate-400 font-medium font-sans">
                Tip: Enter valid credentials or click any character role from the Console to log in.
              </div>
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
          {activeSidebarItem === SIDEBAR_ITEMS.MARKS_ENTRY ? (
            isLecturerWorkspace ? (
              <LecturerMarksEntry onBackToDashboard={() => navigate(APP_ROUTES.dashboard)} />
            ) : isMarksConfigRoute ? (
              <MarkEntryPeriodConfig onBack={() => navigate(APP_ROUTES.marks)} />
            ) : isMarksRubricsRoute ? (
              <RubricsManagementView onBack={() => navigate(APP_ROUTES.marks)} />
            ) : isMarksTasksRoute ? (
              <EvaluationTaskAssignment onBack={() => navigate(APP_ROUTES.marks)} />
            ) : isMarksRecordsRoute ? (
              <MarkEntryRecords 
                onBack={() => navigate(APP_ROUTES.marks)}
                initialStatusTab={marksRecordStatusTab}
                onViewRecordDetail={(recordId) => navigate(routeForMarkRecord(recordId))}
              />
            ) : markRecordId ? (
              <MarkEntryRecordDetail
                onBack={() => navigate(APP_ROUTES.marksRecords)}
                {...getRecordDetails(markRecordId)}
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
                    badgeText={activeEvaluationPeriod?.isOpen ? 'Active' : 'Configured'}
                    badgeType={activeEvaluationPeriod?.isOpen ? 'active' : 'ready'}
                    subtext={activePeriodDates}
                    icon={Calendar}
                    onClick={() => navigate(APP_ROUTES.marksConfig)}
                  />
                  <SummaryCard
                    title="Rubric Components"
                    badgeText="Ready"
                    badgeType="ready"
                    subtext="5 components, 100 marks"
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
                    <AlertListCard />

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
            isStudentWorkspace ? (
              <StudentPanelAppointment onShowFAQChatbot={() => navigate(APP_ROUTES.faq)} />
            ) : isLecturerWorkspace || isCoordinatorWorkspace ? (
              <LecturerPanelAppointments
                currentUser={currentUser}
                initialRecommendationId={panelRecommendationId}
              />
            ) : (
              <PanelAppointmentManagement />
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS ? (
            isStudentWorkspace ? (
              <StudentSupervisorAppointment
                onShowFAQChatbot={() => navigate(APP_ROUTES.faq)}
                initialApplicationId={supervisorApplicationId}
              />
            ) : isCoordinatorWorkspace ? (
              <CoordinatorSupervisorDeferred
                initialApplicationId={supervisorApplicationId}
              />
            ) : isLecturerWorkspace ? (
              <LecturerSupervisorAppointments
                initialApplicationId={supervisorApplicationId}
              />
            ) : (
              <SupervisorAppointmentManagement onNavigateToWorkload={() => navigate(APP_ROUTES.panelAppointments)} />
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.REGISTRY ? (
            <StudentRegistry />
          ) : activeSidebarItem === SIDEBAR_ITEMS.DASHBOARD ? (
            isStudentWorkspace ? (
              <StudentDashboard
                studentName={currentUser.fullName}
                studentId={currentUser.studentId}
                programme={currentUser.department}
                onNavigateToTab={(tab) => navigate(routeForSidebarItem(tab))}
              />
            ) : isCoordinatorWorkspace ? (
              <CoordinatorDashboard
                onNavigateToTab={(tab) => navigate(routeForSidebarItem(tab))}
              />
            ) : isLecturerWorkspace ? (
              <LecturerDashboard
                onNavigateToTab={(tab) => navigate(routeForSidebarItem(tab))}
              />
            ) : isDashboardTimelineRoute ? (
              <TimelineManagement onBack={() => navigate(APP_ROUTES.dashboard)} />
            ) : (
              <AdministrationDashboard 
                onNavigateToTab={(tab) => {
                  navigate(routeForSidebarItem(tab));
                }}
                onNavigateToMarksRecords={openMarkRecords}
                onShowModal={setActivePortalModal}
                onNavigateToTimeline={() => navigate(APP_ROUTES.dashboardTimeline)}
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
        </AppLayout>
      </NotificationsProvider>
    </div>
  );
}
